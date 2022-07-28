import { digest } from '@chainsafe/as-sha256';
import { IProver } from './iprover';
import { MerkleMountainRange, Peaks } from '../merkle-mountain-range';
import { concatUint8Array } from '../utils';
import { ISyncStoreProver } from '../store/isync-store';

export class Prover<T> implements IProver<T> {
  protected mmr: MerkleMountainRange;
  startPeriod: number;
  latestPeriod: number;
  leaves: Uint8Array[];

  constructor(public store: ISyncStoreProver<T>, protected n = 2) {
    const { startPeriod, hashes } = store.getAllSyncCommitteeHashes();
    this.startPeriod = startPeriod;
    this.latestPeriod = startPeriod + hashes.length - 1;
    this.leaves = hashes;

    this.mmr = new MerkleMountainRange(digest, n);
    this.mmr.init(this.leaves);
  }

  setN(n: number) {
    if (this.n === n) return;

    this.n = n;
    this.mmr = new MerkleMountainRange(digest, n);
    this.mmr.init(this.leaves);
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
