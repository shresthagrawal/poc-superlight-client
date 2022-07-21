import { digest } from '@chainsafe/as-sha256';
import { IProver } from './iprover';
import { MerkleMountainRange, Peaks } from '../merkle-mountain-range';
import { concatUint8Array } from '../utils';
import { ISyncStoreProver } from '../store/isync-store';

export class Prover<T> implements IProver<T> {
  protected mmr: MerkleMountainRange;
  startPeriod: number;
  latestPeriod: number;

  constructor(public store: ISyncStoreProver<T>, n = 2) {
    this.mmr = new MerkleMountainRange(digest, n);

    const { startPeriod, syncCommittees } = store.getAllSyncCommittees();
    this.startPeriod = startPeriod;
    this.latestPeriod = startPeriod + syncCommittees.length - 1;
    const leaves = syncCommittees.map(c => digest(concatUint8Array(c)));
    this.mmr.init(leaves);
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

  getSyncUpdate(period: number): T {
    return this.store.getSyncUpdate(period);
  }

  getSyncUpdateWithNextCommittee(period: number): {
    update: T;
    syncCommittee: Uint8Array[];
  } {
    return {
      update: this.store.getSyncUpdate(period),
      syncCommittee: this.store.getSyncCommittee(period + 1),
    };
  }

  getSyncUpdatesWithNextCommittees(startPeriod: number, maxCount: number): {
    update: T;
    syncCommittee: Uint8Array[];
  }[] {
    const count = startPeriod + maxCount - 1 >= this.latestPeriod ? this.latestPeriod - startPeriod : maxCount;
    return Array(count).fill(0).map((_, i) => ({
      update: this.store.getSyncUpdate(startPeriod + i),
      syncCommittee: this.store.getSyncCommittee(startPeriod + i + 1),
    }));
  }
}
