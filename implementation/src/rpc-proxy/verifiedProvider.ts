import Web3 from 'web3';
import { GetProof } from 'web3-eth';
import { BlockNumber } from 'web3-core';
import { Trie } from '@ethereumjs/trie';
import rlp from 'rlp';
import { fromHexString } from '@chainsafe/ssz';
import { Address } from './types';


const RPC_URL = process.env.RPC_URL || '';
const toBuffer = (val: string) => Buffer.from(fromHexString(val));

export class VerifiedProvider {
    web3: Web3;
    public isSynced: boolean = false;
    public stateRoot: string | null = null;
    public blockNumber: number | null =  null;

    constructor() {
        this.web3 = new Web3(RPC_URL);
    }

    async sync() {
        this.stateRoot = '0x818fbece206e5cb57d213229412f00f74c8fddcfff1003d136e2080710d33833';
        this.blockNumber = 15070720;
        this.isSynced = true;
        console.log(`Provider synced`);
    }

    async getBalance(address: Address, blockNumber: BlockNumber) {
        const proof = await this.web3.eth.getProof(address, [], blockNumber);
        const stateRoot = await this.getVerifiedRoot(blockNumber);
        const isCorrect = await this.verifyProof(address, stateRoot, proof);
        // TODO: if proof fails uses some other RPC?
        if(!isCorrect) 
            throw new Error('Invalid RPC Proof');
        return '0x' + BigInt(proof.balance).toString(16);
    }


    private async getVerifiedRoot(blockNumber: BlockNumber) {
        if(blockNumber === this.blockNumber && this.stateRoot)
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
      const valueRaw = {
        nonce: parseInt(proof.nonce),
        balance: '0x' + BigInt(proof.balance).toString(16),
        storageHash: proof.storageHash,
        codeHash: proof.codeHash,
      };
      const value = rlp.encode(Object.values(valueRaw));
      const key = Web3.utils.keccak256(address);

      const valueProof = await Trie.verifyProof(
        toBuffer(stateRoot),
        toBuffer(key),
        proof.accountProof.map(a => toBuffer(a)),
      );

      return !!valueProof && valueProof.equals(value);
    }
}