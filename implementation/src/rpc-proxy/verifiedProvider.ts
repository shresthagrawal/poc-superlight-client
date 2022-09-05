import Web3 from 'web3';
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
  isTruthy,
} from '@ethereumjs/util';
import {
  Address,
  Bytes32,
  RpcTx,
  Request,
  AccountRequest,
  CodeRequest,
  Response,
  AccountResponse,
  CodeResponse,
  RequestMethodCallback,
  Bytes,
  ChainId,
  GetProof,
  BlockNumber,
  Method,
  HexString
} from './types';
import {
  ZERO_ADDR,
  GAS_LIMIT,
  INTERNAL_ERROR,
  REQUEST_BATCH_SIZE,
  EMPTY_ACCOUNT_EXTCODEHASH,
  MAX_BLOCK_HISTORY
} from './constants';
import { VM } from '@ethereumjs/vm';
import { BlockHeader } from '@ethereumjs/block';
import { Blockchain } from '@ethereumjs/blockchain';
import chunk from 'lodash.chunk';
import flatten from 'lodash.flatten';

// const toBuffer = (val: string) => Buffer.from(fromHexString(val));
const bigIntStrToHex = (n: string) => '0x' + BigInt(n).toString(16);

export class VerifiedProvider {
  web3: Web3;
  common: Common;

  private blockHashes: {[blockNumber: number]: Bytes32} = {};
  private blockHeaders: {[blockHash: string]: BlockHeader} = {};
  private latestBlockNumber: number;
  private oldestBlockNumber: number;
  public chainId: number;

  private requestTypeToMethod: Record<Request['type'], (request: Request, callback: RequestMethodCallback) => Method> = {
    // Type errors ignored due to https://github.com/ChainSafe/web3.js/issues/4655
    // @ts-ignore
    'account': (request: AccountRequest, callback) => this.web3.eth.getProof.request(
      request.address,
      request.storageSlots,
      request.blockNumber,
      callback
    ),
    // @ts-ignore
    'code': (request: CodeRequest, callback) => this.web3.eth.getCode.request(
      request.address,
      request.blockNumber,
      callback
    ),
  }

  constructor(
    providerURL: string,
    blockNumber: number,
    blockHash: Bytes32, 
  ) {
    this.web3 = new Web3(new Web3.providers.HttpProvider(providerURL, {
      keepAlive: true,
    }));
    this.common = new Common({
      chain: Chain.Mainnet,
      hardfork: Hardfork.ArrowGlacier,
    });
    this.chainId = Number(this.common.chainId());
    this.latestBlockNumber = blockNumber;
    this.oldestBlockNumber = blockNumber;
    this.blockHashes[blockNumber] = blockHash;
  }

  async getBalance(address: Address, blockNumber: BlockNumber) {
    const stateRoot = this.getStateRoot(blockNumber);
    // TODO:
    //       2. create a request to get account
    //       3. verify the account proof and return the balance
    return '0x0';
  }

  async getBlockNumber(): Promise<HexString> {
    return this.web3.utils.numberToHex(this.latestBlockNumber);
  }

  async getChainId(): Promise<HexString> {
    return this.web3.utils.numberToHex(this.chainId);
  }

  async getTransactionCount(address: Address, blockNumber: BlockNumber): Promise<HexString> {
    // TODO: fixme
    const tempBlockNumber = blockNumber === 'latest' ? this.latestBlockNumber : blockNumber;
    const stateRoot = await this.getStateRoot(tempBlockNumber);
    // TODO: use fetchRequest() instead
    const proof = await this.web3.eth.getProof(
      address,
      [],
      tempBlockNumber
    );
    const isAccountCorrect = await this.verifyProof(address, stateRoot, proof);
    // TODO: if proof fails uses some other RPC?
    if (!isAccountCorrect) throw new Error('Invalid RPC proof');
    return proof.nonce;
  }

  private constructRequestMethod(request: Request, callback: (error: Error, data: Response) => void): Method {
    return this.requestTypeToMethod[request.type](request, callback);
  }

  private async fetchRequests(requests: Request[]): Promise<Response[]> {
    const batch = new this.web3.BatchRequest();
    const promises = requests.map((request) => {
      return new Promise<Response>((resolve, reject) => {
        // Type error ignored due to https://github.com/ChainSafe/web3.js/issues/4655
        const method = this.constructRequestMethod(
          request,
          (error: Error, data: Response) => {
            if (error) reject(error);
            resolve(data);
          }
        );
        batch.add(method);
      });
    });
    batch.execute();
    return Promise.all(promises);
  }

  private async fetchRequestsInBatches(
    requests: Request[],
    batchSize: number
  ): Promise<Response[]> {
    const batchedRequests = chunk(requests, batchSize);
    const responses = batchedRequests.map(requestBatch => this.fetchRequests(requestBatch));
    return flatten(await Promise.all(responses));
  }

  private async getVM(tx: RpcTx, blockNumber: BlockNumber, stateRoot: Bytes32): Promise<VM> {
    const _tx = {
      ...tx,
      from: tx.from ? tx.from : ZERO_ADDR,
      gas: tx.gas ? tx.gas : GAS_LIMIT,
    };

    const { accessList } = await this.web3.eth.createAccessList(
      _tx,
      blockNumber,
    );
    accessList.push({ address: _tx.from, storageKeys: [] });
    if (_tx.to && !accessList.some(a => a.address.toLowerCase() === _tx.to)) {
      accessList.push({ address: _tx.to, storageKeys: [] });
    }

    // TODO: based on the blocknumber get the verified state root
    const blockchain = await Blockchain.create({ common: this.common });
    // path the blockchain to return the correct blockhash
    (blockchain as any).getBlock = async (blockId: number) => { 
      const _hash = toBuffer(await this.getBlockHash(blockId));
      return {
        hash: () => _hash
      }
    };
    const vm = await VM.create({ common: this.common, blockchain });

    await vm.stateManager.checkpoint();

    const requests = flatten(accessList.map((access) => {
        return [
          {
            type: 'account',
            blockNumber,
            storageSlots: access.storageKeys,
            address: access.address,
          },
          {
            type: 'code',
            blockNumber,
            address: access.address,
          }, 
        ]
      }
    )) as Request[];
    const responses = chunk(
      await this.fetchRequestsInBatches(
        requests, REQUEST_BATCH_SIZE
    ), 2) as [AccountResponse, CodeResponse][];

    for (const [accountProof, code] of responses) {
      const { nonce, balance, codeHash, storageProof: storageAccesses } = accountProof;
      const address = AddressEthereumJs.fromString(accountProof.address);
      const isAccountCorrect = await this.verifyProof(accountProof.address, stateRoot, accountProof);
      const isCodeCorrect = await this.verifyCodeHash(code, codeHash);
      // TODO: if proof fails uses some other RPC?
      if (!isAccountCorrect || !isCodeCorrect) throw new Error('Invalid RPC proof');

      const account = Account.fromAccountData({
        nonce: BigInt(nonce),
        balance: BigInt(balance),
        codeHash,
      });

      await vm.stateManager.putAccount(address, account);

      for (let storageAccess of storageAccesses) {
        await vm.stateManager.putContractStorage(
          address,
          setLengthLeft(toBuffer(storageAccess.key), 32),
          setLengthLeft(toBuffer(storageAccess.value), 32),
        );
      }

      if (code !== '0x')
        await vm.stateManager.putContractCode(address, toBuffer(code));
    }
    await vm.stateManager.commit();
    return vm;
  }

  private async getBlockHash(blockNumber: BlockNumber) {
    // TODO: handle cases like 'pending', 'finalized'
    if(blockNumber === 'latest') {
      return this.blockHashes[this.latestBlockNumber];
    } else {
      const _blockNumber = parseInt(blockNumber.toString());
      if(_blockNumber > this.latestBlockNumber)
        throw new Error('BlockNumber requested cannot be in future');

      if(_blockNumber + MAX_BLOCK_HISTORY < this.latestBlockNumber)
        throw new Error(`BlockNumber requested cannot be older than ${MAX_BLOCK_HISTORY}blocks`);

      while(this.oldestBlockNumber > _blockNumber) {
        const hash = this.blockHashes[this.oldestBlockNumber]
        const header = await this.getBlockHeaderByHash(hash);
        this.oldestBlockNumber-= 1;
        this.blockHashes[this.oldestBlockNumber] = bufferToHex(header.parentHash);
      }

      return this.blockHashes[_blockNumber];
    }
  }

  private async getStateRoot(blockNumber: BlockNumber) {
    const hash = await this.getBlockHash(blockNumber);
    const header = await this.getBlockHeaderByHash(hash);
    return bufferToHex(header.stateRoot);
  }

  private async getBlockHeaderByHash(blockHash: Bytes32) {
    if(!this.blockHeaders[blockHash]) {
      const blockInfo = await this.web3.eth.getBlock(blockHash);
      const header = BlockHeader.fromHeaderData({
        parentHash: blockInfo.parentHash,
        uncleHash: blockInfo.sha3Uncles,
        coinbase: blockInfo.miner,
        stateRoot: blockInfo.stateRoot,
        transactionsTrie: blockInfo.transactionsRoot,
        receiptTrie: blockInfo.receiptsRoot,
        logsBloom: blockInfo.logsBloom,
        difficulty: BigInt(blockInfo.difficulty),
        number: BigInt(blockInfo.number),
        gasLimit: BigInt(blockInfo.gasLimit),
        gasUsed: BigInt(blockInfo.gasUsed),
        timestamp: BigInt(blockInfo.timestamp),
        extraData: blockInfo.extraData,
        mixHash: (blockInfo as any).mixHash, // some reason the types are not up to date :( 
        nonce: blockInfo.nonce,
        baseFeePerGas: blockInfo.baseFeePerGas ? BigInt(blockInfo.baseFeePerGas): undefined
      });
      if(!header.hash().equals(toBuffer(blockHash))) {
        throw new Error('Invalid block or blockHash');
      }
      this.blockHeaders[blockHash] = header;
    }
    return this.blockHeaders[blockHash];
  }


  async call(transaction: RpcTx, blockNumber: BlockNumber) {
    const hash = await this.getBlockHash(blockNumber);
    const header = await this.getBlockHeaderByHash(hash);
    const vm = await this.getVM(
      transaction,
      blockNumber,
      bufferToHex(header.stateRoot),
    );
    const { from, to, gas: gasLimit, gasPrice, value, data } = transaction;
    try {
      const runCallOpts = {
        caller: isTruthy(from) ? AddressEthereumJs.fromString(from) : undefined,
        to: isTruthy(to) ? AddressEthereumJs.fromString(to) : undefined,
        gasLimit: toType(gasLimit, TypeOutput.BigInt),
        gasPrice: toType(gasPrice, TypeOutput.BigInt),
        value: toType(value, TypeOutput.BigInt),
        data: isTruthy(data) ? toBuffer(data) : undefined,
        block: { header },
      };
      const { execResult } = await vm.evm.runCall(runCallOpts);
      return bufferToHex(execResult.returnValue);
    } catch (error: any) {
      throw {
        code: INTERNAL_ERROR,
        message: error.message.toString(),
      };
    }
  }

  private verifyCodeHash(code: Bytes, codeHash: Bytes32): boolean {
    return (
      (code === '0x' && codeHash === EMPTY_ACCOUNT_EXTCODEHASH) ||
      Web3.utils.keccak256(code) === codeHash
    );
  }

  private async verifyProof(
    address: Address,
    stateRoot: string,
    proof: GetProof,
  ): Promise<boolean> {
    const trie = new Trie();
    const key = Web3.utils.keccak256(address);
    const expectedAccountRLP = await trie.verifyProof(
      toBuffer(stateRoot),
      toBuffer(key),
      proof.accountProof.map(a => toBuffer(a)),
    );
    const account = Account.fromAccountData({
      nonce: BigInt(proof.nonce),
      balance: BigInt(proof.balance),
      stateRoot: proof.storageHash,
      codeHash: proof.codeHash,
    });
    const isAccountValid =
      !!expectedAccountRLP && expectedAccountRLP.equals(account.serialize());
    if (!isAccountValid) return false;

    for (const sp of proof.storageProof) {
      const key = Web3.utils.keccak256(
        bufferToHex(setLengthLeft(toBuffer(sp.key), 32)),
      );
      const expectedStorageRLP = await trie.verifyProof(
        toBuffer(proof.storageHash),
        toBuffer(key),
        sp.proof.map(a => toBuffer(a)),
      );
      const isStorageValid =
        (!expectedStorageRLP && sp.value === '0x0') ||
        (!!expectedStorageRLP &&
          expectedStorageRLP.equals(rlp.encode(sp.value)));
      if (!isStorageValid) return false;
    }

    return true;
  }
}
