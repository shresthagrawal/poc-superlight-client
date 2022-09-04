
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