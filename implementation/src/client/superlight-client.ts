import { digest } from '@chainsafe/as-sha256';
import { concatUint8Array  } from '../utils';
import { MerkleVerify } from '../merkle-tree';
import { MerkleMountainVerify } from '../merkle-mounatain-verify';
import { ISyncUpdateVerify } from '../store/isync-store';
import { ISuperlightProver } from '../prover/isuperlight-prover';

export class SuperlightSync<T> {
  constructor(
    genesisSyncCommittee: Uint8Array[],
    protected provers: ISuperlightProver<T>[],
    protected syncUpdateVerify: ISyncUpdateVerify<T>,
  ) {}

  async suffixMonologue() {
    // ask the prover of the larger tree to prove 
    // min(k + 1, difference in tree sizes) updates
    // sequentially starting from the last period 
    // of the smaller tree

    // if the prover can't provide the updates 
    // or the updates are incorrect the prover 
    // looses 

    // if the updates are correct and the difference
    // in tree sizes is greater than k then the 
    // prover wins

    // if the difference in k then its a draw 
  }

  async treeVsTree() {
    // open the children of the nodes

    // if you reach the leaf then ask 
    // for the previous leaf to either 
    // parties with a merkle proof

    // also ask both parties update 
    // for the previous leaf signing 
    // the next leaf

    // check the update is correct

    // if its not a leaf simply recurrively 
    // call the treeVsTree
  }

  async treeVsPeaks() {
    // for each peak get the corresponding 
    // peak from the tree

    // for the first different peak run tree 
    // vs tree

    // if all the peaks are same then do 
    // suffix monologue
  }


  async peaksVsPeaks() {
    // check the first peak of disagreement

    // if the peaks are of equal size do a 
    // tree vs tree beisection game

    // if not run tree vs peaks
  }

  async tournament(commitedLatestUpdates: T[]): T {
    // get all the mmr info for each prover 
    
    // filter provers if mmr info  in incorrect
    
    // get the sync committee for latest update 
    // with the merkle proof

    // filter provers if the merkle proof is not
    // correct
  
    // filter provers if the update is not correct

    // sort the provers based on the mmr size

    // compare the mmrs of each tree by
    // running peak vs peaks

    // keep track of all the winners 

    // return the biggest winner among the winners
  }

  // returns the latest correct blockheader
  async sync(): T {
    // provers get latest update

    // check if the updates are same

    // if all of them are same simply return
    // the update 

    // if not do a tournament
  }
}