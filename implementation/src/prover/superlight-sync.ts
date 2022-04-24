import { digest } from '@chainsafe/as-sha256';
import { ISuperlightProver } from './isuperlight-prover';
import { MerkleMountainRange } from '../merkle-mountain-range';
import { concatUint8Array } from '../utils';
import { ISyncStore } from '../store/isync-store';

export class SuperlightSync<T> implements ISuperlightProver<T> {
  protected mmr: MerkleMountainRange;
  startPeriod: number;
  latestPeriod: number;

  constructor(protected store: ISyncStore<T>, n = 2) {
    const { startPeriod, syncCommittees } = store.getAllSyncCommittees();
    this.startPeriod = startPeriod;
    this.latestPeriod = startPeriod + syncCommittees.length - 1;
    this.mmr = new MerkleMountainRange(digest, n);
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
      root,
      proof,
    };
  }

  getMMRInfo(): { rootHash: Uint8Array; treeInfos: { root: Uint8Array; size: number }[] } {
    const rootHash = this.mmr.getRootHash();
    const treeInfos = this.mmr.getTreeInfo();
    return {
      rootHash,
      treesInfos,
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
      children: node.children,
    };
  }

  getSyncUpdate(period: number | 'latest'): T {
    if (period === 'latest') period = this.latestPeriod;
    return this.store.getSyncUpdate(period);
  }
}
