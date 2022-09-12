import type { GetProof } from 'web3-eth';
import type { BlockNumber } from 'web3-core';
import type { Method } from 'web3-core-method';
import type { JsonTx } from '@ethereumjs/tx';
export type { GetProof, BlockNumber, Method };

export type Bytes = string;
export type Bytes32 = string;
export type AddressHex = string;
export type ChainId = number;
export type HexString = string;

export type ExecutionInfo = {
  blockhash: string;
  blockNumber: bigint;
}

export interface RPCTx {
  from?: string;
  to?: string;
  gas?: string;
  gasPrice?: string;
  value?: string;
  data?: string;
}

export type AccountRequest = {
  type: 'account';
  blockNumber: bigint;
  addressHex: AddressHex;
  storageSlots: Bytes32[];
};

export type CodeRequest = {
  type: 'code';
  blockNumber: bigint;
  addressHex: AddressHex;
};

export type AccountResponse = GetProof;
export type CodeResponse = string;

export type Request = AccountRequest | CodeRequest;
export type Response = AccountResponse | CodeResponse;

export type RequestMethodCallback = (error: Error, data: Response) => void;

export type JSONRPCBlock = {
  number: string; // the block number. null when pending block.
  hash: string; // hash of the block. null when pending block.
  parentHash: string; // hash of the parent block.
  mixHash?: string; // bit hash which proves combined with the nonce that a sufficient amount of computation has been carried out on this block.
  nonce: string; // hash of the generated proof-of-work. null when pending block.
  sha3Uncles: string; // SHA3 of the uncles data in the block.
  logsBloom: string; // the bloom filter for the logs of the block. null when pending block.
  transactionsRoot: string; // the root of the transaction trie of the block.
  stateRoot: string; // the root of the final state trie of the block.
  receiptsRoot: string; // the root of the receipts trie of the block.
  miner: string; // the address of the beneficiary to whom the mining rewards were given.
  difficulty: string; // integer of the difficulty for this block.
  totalDifficulty: string; // integer of the total difficulty of the chain until this block.
  extraData: string; // the “extra data” field of this block.
  size: string; // integer the size of this block in bytes.
  gasLimit: string; // the maximum gas allowed in this block.
  gasUsed: string; // the total used gas by all transactions in this block.
  timestamp: string; // the unix timestamp for when the block was collated.
  transactions: Array<JSONRPCTx | string>; // Array of transaction objects, or 32 Bytes transaction hashes depending on the last given parameter.
  uncles: string[]; // Array of uncle hashes
  baseFeePerGas?: string; // If EIP-1559 is enabled for this block, returns the base fee per gas
};

export type JSONRPCTx = {
  blockHash: string | null; // DATA, 32 Bytes - hash of the block where this transaction was in. null when it's pending.
  blockNumber: string | null; // QUANTITY - block number where this transaction was in. null when it's pending.
  from: string; // DATA, 20 Bytes - address of the sender.
  gas: string; // QUANTITY - gas provided by the sender.
  gasPrice: string; // QUANTITY - gas price provided by the sender in wei. If EIP-1559 tx, defaults to maxFeePerGas.
  maxFeePerGas?: string; // QUANTITY - max total fee per gas provided by the sender in wei.
  maxPriorityFeePerGas?: string; // QUANTITY - max priority fee per gas provided by the sender in wei.
  type: string; // QUANTITY - EIP-2718 Typed Transaction type
  accessList?: JsonTx['accessList']; // EIP-2930 access list
  chainId?: string; // Chain ID that this transaction is valid on.
  hash: string; // DATA, 32 Bytes - hash of the transaction.
  input: string; // DATA - the data send along with the transaction.
  nonce: string; // QUANTITY - the number of transactions made by the sender prior to this one.
  to: string | null; /// DATA, 20 Bytes - address of the receiver. null when it's a contract creation transaction.
  transactionIndex: string | null; // QUANTITY - integer of the transactions index position in the block. null when it's pending.
  value: string; // QUANTITY - value transferred in Wei.
  v: string; // QUANTITY - ECDSA recovery id
  r: string; // DATA, 32 Bytes - ECDSA signature r
  s: string; // DATA, 32 Bytes - ECDSA signature s
};
