RPC Functions required to make Metamask work
============================================

Here is a quick update from the rpc-proxy implementation.

* I did a quick test where I created a simple RPC proxy which would intercept, log the requests and then forward it to infura. I added this RPC to my Metamask and performed simple actions (open metamask to check balance, transfer eth, swap ERC20 using UniswapV3, etc)
* I found that following methods were used (ordered by frequecy, most number of calls on the top)  
    1. `eth_call`
    2. `eth_blockNumber`
    3. `eth_getBlockByNumber`
    4. `eth_chainId`
    5. `eth_getTransactionReceipt`
    6. `eth_getTransactionCount`
    7. `net_version`
    8. `eth_estimateGas`
    9. `eth_getCode`
    10. `eth_sendRawTransaction`
    11. `eth_getBlockByHash`
* Out of these methods, it is relatively straightforward to build verified RPC for the following methods 
    2. `eth_blockNumber` (we know the latest block number by sync)
    3. `eth_getBlockByNumber` (merkle inclusion to historical block header)
    4. `eth_chainId` (constant for RPC)
    6. `eth_getTransactionCount` (can be verified using `eth_getProof`)
    7. `net_version` (constant for RPC)
    9. `eth_getCode` (can be verified using `eth_getProof`)
    11. `eth_getBlockByHash` (sufficient to verify the hash matches the hash of the block)
* Following are rather tricky to build
    1. `eth_call`
    5. `eth_getTransactionReceipt`
    8. `eth_estimateGas`
    10. `eth_sendRawTransaction`
* We can build verified RPC for `eth_call` and `eth_estimateGas` by running the VM locally and providing it verified storage access. This can be done using [EthereumJsVM](https://github.com/ethereumjs/ethereumjs-monorepo/tree/master/packages/vm) and creating a custom StateManager. The actual usage to VM would be very similar to the way its used orginally in the RPC code ([`eth_call`](https://github.com/ethereumjs/ethereumjs-monorepo/blob/master/packages/client/lib/rpc/modules/eth.ts#L434), [`eth_estimateGas`](https://github.com/ethereumjs/ethereumjs-monorepo/blob/master/packages/client/lib/rpc/modules/eth.ts#L492)).
* For `eth_sendRawTransaction` I don't know if there is anything that has to be verified. For `eth_getTransactionReceipt` we would need to verify the merkle inclusion of the recipt to the recipt root in the execution block. I wasn't able to find any easy way to access the merkle proof for the recipt trie. For the first version we can ignore `eth_sendRawTransaction` and `eth_getTransactionReceipt` which would limit the RPC to readonly operations. 

(the number after the RPC is the count on number of rpc requests made my metamask a small interval)
eth_chainId: 7
    -> is constant, can be simply proxied and verified agains the local constant
net_version: 2
    -> same as eth_chainId
eth_blockNumber: 19
    -> the sync should provide the latest blocknumber
eth_getBlockByNumber: 9
    -> get the rpc result for eth_getBlockByNumber
    -> hash the block
    (for latest)
    -> the sync should provide the latest EC blockhash, simply match the hashes
    (for history)
    -> the sync should provide the CL block which should have access to historical blockhashes
    -> perform the merkle inclusion to the CL block
eth_call: 320
    -> TBD
eth_estimateGas: 1
    -> TBD
eth_getCode: 1
    -> getProof code can be used
eth_getTransactionCount: 2
    -> getProof nonce can be used
eth_sendRawTransaction: 1
    -> need to prodcast using libp2p (not required for now?)
    -> what is a txHash??
eth_getTransactionReceipt: 5
    -> not sure
eth_getBlockByHash: 1
    -> get the rpc result
    -> hash the block
    -> verify the hash
    -> is it sufficient to verify the hash?


Questions:
-> eth_call and eth_estimateGas checkout
-> what is a txHash??
-> eth_getTransactionReceipt not sure



export interface StateAccess {
  accountExists(address: Address): Promise<boolean> //?
  getAccount(address: Address): Promise<Account> // OK
  putAccount(address: Address, account: Account): Promise<void> // ignored
  accountIsEmpty(address: Address): Promise<boolean> // OK
  deleteAccount(address: Address): Promise<void> // ignored
  modifyAccountFields(address: Address, accountFields: AccountFields): Promise<void> // ignored
  putContractCode(address: Address, value: Buffer): Promise<void> // ignored
  getContractCode(address: Address): Promise<Buffer> // OK
  getContractStorage(address: Address, key: Buffer): Promise<Buffer> // OK
  putContractStorage(address: Address, key: Buffer, value: Buffer): Promise<void> // ignored
  clearContractStorage(address: Address): Promise<void> // ignored
  checkpoint(): Promise<void>
  commit(): Promise<void>
  revert(): Promise<void>
  getStateRoot(): Promise<Buffer> // OK
  setStateRoot(stateRoot: Buffer): Promise<void> // ignored
  getProof?(address: Address, storageSlots: Buffer[]): Promise<Proof>
  verifyProof?(proof: Proof): Promise<boolean>
  hasStateRoot(root: Buffer): Promise<boolean>
}
