// import { BaseStateManager, StateManager, AccountFields} from '@ethereumjs/statemanager';
// import { Address, Account, toBuffer, bufferToHex } from '@ethereumjs/util';
// import { DefaultStateManagerOpts } from '@ethereumjs/statemanager/dist/statemanager';
// import { StorageDump } from '@ethereumjs/statemanager/dist/interface';
// import { Cache } from '@ethereumjs/statemanager/dist/cache';
// import { VerifiedProvider } from './verifiedProvider';
// import { BlockNumber } from 'web3-core';

// const bigIntStrToHex = (n: string) => '0x' + BigInt(n).toString(16);

// export class VerifiedStateManager implements StateManager {
//   blockNumber: BlockNumber;

//   constructor(
//     protected provider: VerifiedProvider
//   ) {}

//   async setBlockNumber(blockNumber: BlockNumber) {
//     this.blockNumber = blockNumber;
//   }

//   async _getAccountStorage(address: Address, key: Buffer) {
//     const proof = await this.web3.eth.getProof(address.toString(), [bufferToHex(key)], 'latest');
//     if(!proof.storageProof.length)
//       throw new Error('No storageProof returned');
//     return proof.storageProof[0].value;
//   }

//   async _getContractCode(address: Address) {
//     const code = await this.web3.eth.getCode(address.toString(), 'latest');
//     return code;
//   }

//   accountExists(address: Address): Promise<boolean> {
//     console.log('accountExists called');
//     throw new Error('not implemented');
//   }

//   async getAccount(address: Address, blockNumber: BlockNumber): Promise<Account> {
//     const { nonce, balance, storageHash: stateRoot, codeHash } = await this.provider.getProof(address, this.blockNumber);
//     const accData = {nonce: bigIntStrToHex(nonce), balance: bigIntStrToHex(balance), stateRoot, codeHash};
//     return Account.fromAccountData(accData);
//   }

//   async getAccount(address: Address): Promise<Account> {
//     console.log('getAccount called', address.toString());
//      = await this._getAccount(address);
//     const accData = {nonce: BigIntStrToHex(nonce), balance: BigIntStrToHex(balance), stateRoot, codeHash};
//     return Account.fromAccountData(accData);
//   }

//   async putAccount(address: Address, account: Account) {
//     console.log('putAccount called: needs implementation');
//     // throw new Error('not implemented');
//   }

//   accountIsEmpty(address: Address): Promise<boolean> {
//     console.log('accountIsEmpty called');
//     throw new Error('not implemented');
//   }

//   deleteAccount(address: Address): Promise<void> {
//     console.log('deleteAccount called');
//     throw new Error('not implemented');
//   }

//   modifyAccountFields(address: Address, accountFields: AccountFields): Promise<void> {
//     console.log('modifyAccountFields called');
//     throw new Error('not implemented');
//   }

//   putContractCode(address: Address, value: Buffer): Promise<void> {
//     console.log('putContractCode called');
//     throw new Error('not implemented');
//   }

//   async getContractCode(address: Address): Promise<Buffer> {
//     console.log('getContractCode called');
//     const code = await this._getContractCode(address);
//     return toBuffer(code);
//   }

//   async getContractStorage(address: Address, key: Buffer): Promise<Buffer> {
//     console.log('getContractStorage called');
//     const value = await this._getAccountStorage(address, key);
//     return toBuffer(value);
//   }

//   putContractStorage(address: Address, key: Buffer, value: Buffer): Promise<void> {
//     console.log('putContractStorage called');
//     throw new Error('not implemented');
//   }

//   clearContractStorage(address: Address): Promise<void> {
//     console.log('clearContractStorage called');
//     throw new Error('not implemented');
//   }

//   async checkpoint() {
//     console.log('checkpoint called: needs implementation');
//     // throw new Error('not implemented');
//   }

//   async commit() {
//     console.log('commit called: needs implementation');
//     // throw new Error('not implemented');
//   }

//   revert(): Promise<void> {
//     console.log('revert called');
//     throw new Error('not implemented');
//   }

//   getStateRoot(): Promise<Buffer> {
//     console.log('getStateRoot called');
//     throw new Error('not implemented');
//   }

//   setStateRoot(stateRoot: Buffer): Promise<void> {
//     throw new Error('setStateRoot is not implemented use setBlockNumber');
//   }

//   // getProof?(address: Address, storageSlots: Buffer[]): Promise<Proof> 
//   // verifyProof?(proof: Proof): Promise<boolean> {
//   hasStateRoot(root: Buffer): Promise<boolean> {
//     console.log('hasStateRoot called');
//     throw new Error('not implemented');
//   }

//   copy(): StateManager {
//     console.log('copy called');
//     throw new Error('not implemented');
//   }

//   async flush() {
//     console.log('flush called: needs implementation')
//     // throw new Error('not implemented');
//   }

//   dumpStorage(address: Address): Promise<StorageDump> {
//     console.log('dumpStorage called')
//     throw new Error('not implemented');
//   }
// }