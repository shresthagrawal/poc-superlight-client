import { GetProof } from 'web3-eth';
import { BlockNumber } from 'web3-core';

export type Bytes32 = string;
export type Address = string;

export interface RpcTx {
  from?: string;
  to?: string;
  gas?: string;
  gasPrice?: string;
  value?: string;
  data?: string;
}

export type AccountRequest = {
  type: 'account';
  blockNumber: BlockNumber;
  address: Address;
  storageSlots: Bytes32[];
}

export type CodeRequest = {
  type: 'code';
  blockNumber: BlockNumber;
  address: Address;
}

export type AccountResponse = GetProof;
export type CodeResponse = string;

export type Request = AccountRequest | CodeRequest;
export type Response = AccountResponse | CodeResponse;

export type RequestMethodCallback = (error: Error, data: Response) => void;
