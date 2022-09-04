import { GetProof } from 'web3-eth';

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

export type Access = { address: Address, storageKeys: Bytes32[] };
export type AccessProof = { access: Access, proof: GetProof };
