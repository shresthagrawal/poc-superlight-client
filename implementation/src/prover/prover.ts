import { digest } from '@chainsafe/as-sha256';
import { IProver } from './iprover';
import { MerkleMountainRange, Peaks } from '../merkle-mountain-range';
import { concatUint8Array } from '../utils';
import { ISyncStoreProver } from '../store/isync-store';

export class Prover<T> implements IProver<T> {
  protected mmr: MerkleMountainRange;
  startPeriod: number;
  chainSize: number;

  constructor(public store: ISyncStoreProver<T>, protected treeDegree = 2) {
    const { startPeriod, hashes } = store.getAllSyncCommitteeHashes();
    this.startPeriod = startPeriod;
    this.chainSize = hashes.length - 1;

    this.mmr = new MerkleMountainRange(digest, treeDegree);
    this.mmr.init(hashes);
  }

  setConfig(chainSize: number, treeDegree: number) {
    this.treeDegree = treeDegree;
    this.chainSize = chainSize;
  
    if(this.store.updateChainSize)
      this.store.updateChainSize(chainSize);

    this.mmr = new MerkleMountainRange(digest, treeDegree);
    const { hashes } = this.store.getAllSyncCommitteeHashes();
    this.mmr.init(hashes.slice(0, chainSize + 1));
  }

  get latestPeriod() {
    return this.startPeriod + this.chainSize;
  }

  getLeafWithProof(period: number | 'latest'): {
    syncCommittee: Uint8Array[];
    rootHash: Uint8Array;
    proof: Uint8Array[][];
  } {
    if (period === 'latest') period = this.latestPeriod;
    const syncCommittee = this.store.getSyncCommittee(period);
    const mmrIndex = period - this.startPeriod;
    const { rootHash, proof } = this.mmr.generateProof(mmrIndex);
    return {
      syncCommittee,
      rootHash,
      proof,
    };
  }

  getMMRInfo(): {
    rootHash: Uint8Array;
    peaks: Peaks;
  } {
    const rootHash = this.mmr.getRootHash();
    const peaks = this.mmr.getPeaks();
    return {
      rootHash,
      peaks,
    };
  }

  getNode(
    treeRoot: Uint8Array,
    nodeHash: Uint8Array,
  ): { isLeaf: boolean; children?: Uint8Array[] } {
    const tree = this.mmr.getTree(treeRoot);
    const node = tree.getNode(nodeHash);
    return {
      isLeaf: node.isLeaf,
      children: node.children && node.children.map(c => c.hash),
    };
  }

  getSyncUpdates(startPeriod: number, maxCount: number): T[] {
    const count =
      startPeriod + maxCount - 1 >= this.latestPeriod
        ? this.latestPeriod - startPeriod
        : maxCount;
    return Array(count)
      .fill(0)
      .map((_, i) => this.store.getSyncUpdate(startPeriod + i));
  }
}
