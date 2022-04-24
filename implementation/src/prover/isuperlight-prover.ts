import { AsyncOrSync } from 'ts-essentials';

export interface ISuperlightProver<T> {
  getLeafWithProof(period: number | 'latest'): AsyncOrSync<{
    syncCommittee: Uint8Array[];
    rootHash: Uint8Array;
    proof: Uint8Array[][];
  }>;

  getMMRInfo(): AsyncOrSync<{ rootHash: Uint8Array; treeInfos: { root: Uint8Array; size: number }[] }>;

  getNode(
    treeRoot: Uint8Array,
    nodeHash: Uint8Array,
  ): AsyncOrSync<{ isLeaf: boolean; children?: Uint8Array[] }>;

  getSyncUpdate(period: number | 'latest'): AsyncOrSync<T>;
}