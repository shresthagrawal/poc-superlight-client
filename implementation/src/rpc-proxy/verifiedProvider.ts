import Web3 from 'web3';
import { GetProof } from 'web3-eth';
import { BlockNumber } from 'web3-core';
// import { Trie } from '@ethereumjs/trie';
import rlp from 'rlp';
import { fromHexString } from '@chainsafe/ssz';
import { Address, Bytes32 } from './types';
import VM from '@ethereumjs/vm';
import {
  Address as AddressE,
  Account,
  toType,
  bufferToHex,
  toBuffer,
  TypeOutput,
  setLengthLeft,
  zeros
} from 'ethereumjs-util';
import Common, { Chain, Hardfork } from '@ethereumjs/common';
import { Block } from '@ethereumjs/block';

// const toBuffer = (val: string) => Buffer.from(fromHexString(val));
const bigIntStrToHex = (n: string) => '0x' + BigInt(n).toString(16);
const ZERO_ADDR = '0x0000000000000000000000000000000000000000';
const GAS_LIMIT = '0xfffffffffffff'; // this is some arbitary number

export interface RpcTx {
  from?: string;
  to?: string;
  gas?: string;
  gasPrice?: string;
  value?: string;
  data?: string;
}

export const INTERNAL_ERROR = -32603;

export class VerifiedProvider {
  web3: Web3;
  common: Common;
  public isSynced: boolean = false;
  public stateRoot: string | null = null;
  public blockNumber: number | null = null;

  // TODO: add support for multiple provider URL
  constructor(providerURL: string) {
    this.web3 = new Web3(providerURL);
    this.common = new Common({
      chain: Chain.Mainnet,
      hardfork: Hardfork.ArrowGlacier,
    });
  }

  async sync() {
    this.stateRoot =
      '0x818fbece206e5cb57d213229412f00f74c8fddcfff1003d136e2080710d33833';
    this.blockNumber = 15070720;
    this.isSynced = true;
    console.log(`Provider synced`);
  }

  private async getVerifiedRoot(blockNumber: BlockNumber) {
    if (blockNumber === this.blockNumber && this.stateRoot)
      return this.stateRoot;
    throw new Error('incomplete implementation');
  }

  // Only verifies the account proof
  // TODO: add verification for state proof
  private async verifyProof(
    address: Address,
    stateRoot: string,
    proof: GetProof,
  ): Promise<boolean> {
    // TODO: fix me!!
    // const valueRaw = {
    //   nonce: parseInt(proof.nonce),
    //   balance: '0x' + BigInt(proof.balance).toString(16),
    //   storageHash: proof.storageHash,
    //   codeHash: proof.codeHash,
    // };
    // const value = rlp.encode(Object.values(valueRaw));
    // const key = Web3.utils.keccak256(address);

    // const valueProof = await Trie.verifyProof(
    //   toBuffer(stateRoot),
    //   toBuffer(key),
    //   proof.accountProof.map(a => toBuffer(a)),
    // );

    // return !!valueProof && valueProof.equals(value);
    return true;
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

  async getBalance(
    address: Address,
    blockNumber: BlockNumber,
  ): Promise<Bytes32> {
    const { balance } = await this.getProof(address, [], blockNumber);
    return bigIntStrToHex(balance);
  }

  async getAccount(
    address: Address,
    blockNumber: BlockNumber,
  ): Promise<Account> {
    const {
      nonce,
      balance,
      storageHash: stateRoot,
      codeHash,
    } = await this.getProof(address, [], blockNumber);
    const accData = {
      nonce: bigIntStrToHex(nonce),
      balance: bigIntStrToHex(balance),
      stateRoot,
      codeHash,
    };
    return Account.fromAccountData(accData);
  }

  async getCode(
    address: Address,
    blockNumber: BlockNumber,
    codeHash?: Bytes32
  ): Promise<string> {
    const code = await this.web3.eth.getCode(address, blockNumber);
    // TODO: check the keccak256 of the code matches the codehash
    return code;
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
    // console.log(accessList);

    // TODO: based on the blocknumber get the verified state root
    const vm = await VM.create({ common: this.common });
    // (vm.evm as any).on('step', function (data: any) {
    //   console.log(`PC: ${data.pc.toString(16)}\t Opcode: ${data.opcode.name}\tStack: ${data.stack}`);
    // })

    await vm.stateManager.checkpoint();
    // TODO: use Promise.all to speed this up
    for (let access of accessList) {
      // console.log('a0', access.address, access.storageKeys, blockNumber);
      const proof = await this.getProof(
        access.address,
        access.storageKeys,
        blockNumber,
      );
      // console.log('a1');
      // console.log(proof);
      const { nonce, balance, storageHash: stateRoot, codeHash, storageProof: storageAccesses } = proof;
      const code = await this.getCode(access.address, blockNumber, codeHash);
      // console.log('a2');
      const address = AddressE.fromString(access.address);
      // console.log('a3');

      for (let storageAccess of storageAccesses) {
        // console.log('a');
        await vm.stateManager.putContractStorage(address, setLengthLeft(toBuffer(storageAccess.key), 32), setLengthLeft(toBuffer(storageAccess.value), 32));
        // console.log('b');
      }

      // console.log(code);
      if(code !== '0x')
        await vm.stateManager.putContractCode(address, toBuffer(code));
      // console.log('c');

      const account = Account.fromAccountData({
        nonce: bigIntStrToHex(nonce),
        balance: bigIntStrToHex(balance),
        stateRoot,
        codeHash,
      });

      // console.log('d');
      await vm.stateManager.putAccount(address, account);
      // console.log('e');

    }
    await vm.stateManager.commit();
    // await vm.eei.flush();

    return vm;
  }

  private async getBlock(blockNumber: BlockNumber) {
    // TODO get the blockhash for the blocknumber
    // TODO check of the blockhash 
    const blockInfo = await this.web3.eth.getBlock(blockNumber);
    return Block.fromBlockData({
      header: {
        number: blockInfo.number,
        coinbase: blockInfo.miner,
        timestamp: blockInfo.timestamp,
        difficulty: bigIntStrToHex(blockInfo.difficulty.toString()),
        gasLimit: blockInfo.gasLimit,
        baseFeePerGas: blockInfo.baseFeePerGas!
      }
    }, { common: this.common });
  } 

  async call(transaction: RpcTx, blockNumber: BlockNumber) {
    const vm = await this.getVM(transaction, blockNumber);
    const block = await this.getBlock(blockNumber);
    const { from, to, gas: gasLimit, gasPrice, value, data } = transaction;
    try {
      const runCallOpts = {
        block,
        caller: from ? AddressE.fromString(from) : undefined,
        to: to ? AddressE.fromString(to) : undefined,
        gasLimit: toType(gasLimit, TypeOutput.BN),
        gasPrice: toType(gasPrice, TypeOutput.BN),
        value: toType(value, TypeOutput.BN),
        data: data ? toBuffer(data) : undefined,
      };
      const out = await vm.runCall(runCallOpts);
      // console.log(out);
      return bufferToHex(out.execResult.returnValue);
    } catch (error: any) {
      throw {
        code: INTERNAL_ERROR,
        message: error.message.toString(),
      };
    }
  }
}