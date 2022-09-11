import { digest } from '@chainsafe/as-sha256';
import { IProver } from './iprover.js';
import { MerkleMountainRange, Peaks } from '../merkle-mountain-range.js';
import { concatUint8Array } from '../utils.js';
import { ISyncStoreProver } from '../store/isync-store.js';

export class Prover<T> implements IProver<T> {
  protected mmr: MerkleMountainRange;
  startPeriod: number;
  chainSize: number;
  leafHashes: Uint8Array[];

  constructor(public store: ISyncStoreProver<T>, protected treeDegree = 2) {
    const { startPeriod, hashes: leafHashes } =
      store.getAllSyncCommitteeHashes();
    this.startPeriod = startPeriod;
    this.chainSize = leafHashes.length - 1;
    this.leafHashes = leafHashes;

    this.mmr = new MerkleMountainRange(digest, treeDegree);
    this.mmr.init(leafHashes);
  }

  setConfig(chainSize: number, treeDegree: number) {
    this.treeDegree = treeDegree;
    this.chainSize = chainSize;

    if (this.store.updateChainSize) this.store.updateChainSize(chainSize);

    this.leafHashes = this.store.getAllSyncCommitteeHashes().hashes;
    this.mmr = new MerkleMountainRange(digest, treeDegree);
    this.mmr.init(this.leafHashes.slice(0, chainSize + 1));
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

  getLeaf(period: number | 'latest'): Uint8Array[] {
    if (period === 'latest') period = this.latestPeriod;
    return this.store.getSyncCommittee(period);
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

  _getSyncUpdates(startPeriod: number, maxCount: number): T[] {
    const count =
      startPeriod + maxCount - 1 >= this.latestPeriod
        ? this.latestPeriod - startPeriod
        : maxCount;
    return Array(count)
      .fill(0)
      .map((_, i) => this.store.getSyncUpdate(startPeriod + i));
  }

  getSyncUpdate(period: number, cacheCount: number): T {
    return this.store.getSyncUpdate(period);
  }

  _getLeafHashes(startPeriod: number, maxCount: number): Uint8Array[] {
    const count =
      startPeriod + maxCount - 1 > this.latestPeriod
        ? this.latestPeriod - startPeriod + 1
        : maxCount;
    return this.leafHashes.slice(startPeriod, startPeriod + maxCount);
  }

  getLeafHash(period: number, cacheCount: number): Uint8Array {
    return this.leafHashes[period];
  }
}
