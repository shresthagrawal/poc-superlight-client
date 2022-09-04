import Web3 from 'web3';
import { GetProof } from 'web3-eth';
import { BlockNumber } from 'web3-core';
import { Trie } from '@ethereumjs/trie';
import rlp from 'rlp';
import { fromHexString } from '@chainsafe/ssz';
import { Common, Chain, Hardfork } from '@ethereumjs/common';
import {
  Address as AddressEthereumJs,
  Account,
  toType,
  bufferToHex,
  toBuffer,
  TypeOutput,
  setLengthLeft,
  zeros,
  isTruthy
} from '@ethereumjs/util';
import { Address, Bytes32, RpcTx, Access, AccessProof } from './types';
import { ZERO_ADDR, GAS_LIMIT, INTERNAL_ERROR } from './constants';
import { VM } from '@ethereumjs/vm';
import chunk from 'lodash.chunk';
import flatten from 'lodash.flatten';

// const toBuffer = (val: string) => Buffer.from(fromHexString(val));
const bigIntStrToHex = (n: string) => '0x' + BigInt(n).toString(16);

export class VerifiedProvider {
  web3: Web3;
  common: Common;
  public isSynced: boolean = false;
  public stateRoot: string | null = null;
  public blockNumber: number | null =  null;

  constructor(
    providerURL: string
  ) {
    this.web3 = new Web3(providerURL);
    this.common = new Common({
      chain: Chain.Mainnet,
      hardfork: Hardfork.ArrowGlacier,
    });
  }

  async sync() {
    this.stateRoot = '0x818fbece206e5cb57d213229412f00f74c8fddcfff1003d136e2080710d33833';
    this.blockNumber = 15070720;
    this.isSynced = true;
    console.log(`Provider synced`);
  }

  async getBalance(address: Address, blockNumber: BlockNumber) {
    const proof = await this.getProof(address, [], blockNumber);
    return '0x' + BigInt(proof.balance).toString(16);
  }

  private async getVerifiedRoot(blockNumber: BlockNumber) {
    if(blockNumber === this.blockNumber && this.stateRoot)
        return this.stateRoot;
    throw new Error('incomplete implementation');
  }

  async getCode(
    address: Address,
    blockNumber: BlockNumber,
    codeHash?: Bytes32
  ): Promise<string> {
    const code = await this.web3.eth.getCode(address, blockNumber);
    // TODO: if the codeHash is provided check the keccak256 or else
    // get the code hash using getProof
    return code;
  }

  private async getAccessProofs(
    blockNumber: BlockNumber,
    accesses: Access[]
  ): Promise<AccessProof[]> {
    // TODO: split requests into multiple smaller batches 
    const batch = new this.web3.BatchRequest();
    const promises = accesses.map((access) => {
      return new Promise<AccessProof>((resolve, reject) => {
        // Type error ignored due to https://github.com/ChainSafe/web3.js/issues/4655
        // @ts-ignore
        const request = this.web3.eth.getProof.request(
          access.address,
          access.storageKeys,
          blockNumber,
          (error: Error, proof: GetProof) => {
            if (error) reject(error);
            resolve({ access, proof });
          }
        );
        batch.add(request);
      });
    });
    batch.execute();
    return Promise.all(promises);
  }

  private async getBatchAccessProofs(
    blockNumber: BlockNumber,
    accesses: Access[],
    batchSize: number
  ): Promise<AccessProof[]> {
    const batches = chunk(accesses, batchSize);
    const proofs = batches.map((batch) => {
      return this.getAccessProofs(blockNumber, batch);
    });
    return flatten(await Promise.all(proofs));
  }

  private async getVM(tx: RpcTx, blockNumber: BlockNumber): Promise<VM> {
    const _tx = {
      ...tx,
      from: tx.from ? tx.from : ZERO_ADDR,
      gas: tx.gas ? tx.gas : GAS_LIMIT,
    };

    const { accessList } = await this.web3.eth.createAccessList(
      _tx,
      blockNumber,
    );
    accessList.push({address: _tx.from, storageKeys: []});
    if(_tx.to && !accessList.some(a => a.address.toLowerCase() === _tx.to)) {
      accessList.push({address: _tx.to, storageKeys: []});
    }

    // TODO: based on the blocknumber get the verified state root
    const vm = await VM.create({ common: this.common });

    await vm.stateManager.checkpoint();

    const accessProofs = await this.getBatchAccessProofs(blockNumber, accessList, 100);
    for (let { access, proof } of accessProofs) {
      const { nonce, balance, codeHash, storageProof: storageAccesses } = proof;
      const code = await this.getCode(access.address, blockNumber, codeHash);
      const address = AddressEthereumJs.fromString(access.address);

      const account = Account.fromAccountData({
        nonce: bigIntStrToHex(nonce),
        balance: bigIntStrToHex(balance),
        codeHash,
      });

      await vm.stateManager.putAccount(address, account);

      for (let storageAccess of storageAccesses) {
        await vm.stateManager.putContractStorage(address, setLengthLeft(toBuffer(storageAccess.key), 32), setLengthLeft(toBuffer(storageAccess.value), 32));
      }

      if(code !== '0x')
        await vm.stateManager.putContractCode(address, toBuffer(code));
    }
    await vm.stateManager.commit();
    return vm;
  }

  async getBlock(blockNumber: BlockNumber) {
    // TODO check the correctness of blockInfo
    const blockInfo = await this.web3.eth.getBlock(blockNumber);
    return blockInfo;
  }

  private async getVMBlock(blockNumber: BlockNumber) {
    const blockInfo = await this.getBlock(blockNumber);
    // TODO: fix cliqueSigner and prevRandao
    return {
      header: {
        number: BigInt(blockInfo.number),
        cliqueSigner: () => AddressEthereumJs.zero(),
        prevRandao: zeros(32),
        coinbase: AddressEthereumJs.fromString(blockInfo.miner),
        timestamp: BigInt(blockInfo.timestamp),
        difficulty: BigInt(blockInfo.difficulty.toString()),
        gasLimit: BigInt(blockInfo.gasLimit),
        baseFeePerGas: BigInt(blockInfo.baseFeePerGas!)
      }
    };
  } 

  async call(transaction: RpcTx, blockNumber: BlockNumber) {
    const vm = await this.getVM(transaction, blockNumber);
    const block = await this.getVMBlock(blockNumber);
    const { from, to, gas: gasLimit, gasPrice, value, data } = transaction
    try {
      const runCallOpts = {
        caller: isTruthy(from) ? AddressEthereumJs.fromString(from) : undefined,
        to: isTruthy(to) ? AddressEthereumJs.fromString(to) : undefined,
        gasLimit: toType(gasLimit, TypeOutput.BigInt),
        gasPrice: toType(gasPrice, TypeOutput.BigInt),
        value: toType(value, TypeOutput.BigInt),
        data: isTruthy(data) ? toBuffer(data) : undefined,
        block
      }
      const { execResult } = await vm.evm.runCall(runCallOpts)
      return bufferToHex(execResult.returnValue)
    } catch (error: any) {
      throw {
        code: INTERNAL_ERROR,
        message: error.message.toString(),
      }
    }
  }

  async getProof(
    address: Address,
    storageKeys: Bytes32[],
    blockNumber: BlockNumber,
  ): Promise<GetProof> {
    const proof = await this.web3.eth.getProof(address, storageKeys, blockNumber);
    // TODO: fix me
    // const stateRoot = await this.getVerifiedRoot(blockNumber);
    // const isCorrect = await this.verifyProof(address, stateRoot, proof);
    // TODO: if proof fails uses some other RPC?
    // if (!isCorrect) throw new Error('Invalid RPC Proof');
    return proof;
  }

  // Only verifies the account proof
  // TODO: add verification for state proof
  // private async verifyProof(
  //   address: Address,
  //   stateRoot: string,
  //   proof: GetProof,
  // ): Promise<boolean> {
  //   const valueRaw = {
  //     nonce: parseInt(proof.nonce),
  //     balance: '0x' + BigInt(proof.balance).toString(16),
  //     storageHash: proof.storageHash,
  //     codeHash: proof.codeHash,
  //   };
  //   const value = rlp.encode(Object.values(valueRaw));
  //   const key = Web3.utils.keccak256(address);

  //   const valueProof = await Trie.verifyProof(
  //     toBuffer(stateRoot),
  //     toBuffer(key),
  //     proof.accountProof.map(a => toBuffer(a)),
  //   );

  //   return !!valueProof && valueProof.equals(value);
  // }
}
