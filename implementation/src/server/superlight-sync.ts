import { digest } from '@chainsafe/as-sha256';
import { fromHexString, toHexString } from '@chainsafe/ssz';
import { MerkleMountainRange } from '../merkle-mountain-range';
import { concatUint8Array } from '../utils';
import { ISyncStore } from '../store/isync-store';

export class SuperlightSync<T> {
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
    syncCommittee: string[];
    root: string;
    proof: string[][];
  } {
    if (period === 'latest') period = this.latestPeriod;
    const syncCommittee = this.store.getSyncCommittee(period);
    const mmrIndex = period - this.startPeriod;
    const { rootHash, proof } = this.mmr.generateProof(mmrIndex);
    return {
      syncCommittee: syncCommittee.map(toHexString),
      root: toHexString(rootHash),
      proof: proof.map(l => l.map(toHexString)),
    };
  }

  getMMRInfo(): { root: string; trees: { root: string; size: number }[] } {
    const rootHash = this.mmr.getRootHash();
    const treeInfo = this.mmr.getTreeInfo();
    return {
      root: toHexString(rootHash),
      trees: treeInfo.map(i => ({
        root: toHexString(i.rootHash),
        size: i.size,
      })),
    };
  }

  getNode(
    treeRootHex: string,
    nodeHashHex: string,
  ): { isLeaf: boolean; children?: string[] } {
    const treeRoot = fromHexString(treeRootHex);
    const nodeHash = fromHexString(nodeHashHex);
    const tree = this.mmr.getTree(treeRoot);
    const node = tree.getNode(nodeHash);
    return {
      isLeaf: node.isLeaf,
      children: node.children && node.children.map(c => toHexString(c.hash)),
    };
  }

  getSyncUpdate(period: number | 'latest'): T {
    if (period === 'latest') period = this.latestPeriod;
    return this.store.getSyncUpdate(period);
  }
}
