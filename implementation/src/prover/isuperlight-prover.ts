import { AsyncOrSync } from 'ts-essentials';
import { Peaks } from '../merkle-mountain-range';

export interface ISuperlightProver<T> {
  getLeafWithProof(period: number | 'latest'): AsyncOrSync<{
    syncCommittee: Uint8Array[];
    rootHash: Uint8Array;
    proof: Uint8Array[][];
  }>;

  getMMRInfo(): AsyncOrSync<{
    rootHash: Uint8Array;
    peaks: Peaks;
  }>;

  getNode(
    treeRoot: Uint8Array,
    nodeHash: Uint8Array,
  ): AsyncOrSync<{ isLeaf: boolean; children?: Uint8Array[] }>;

  getSyncUpdate(period: number | 'latest'): AsyncOrSync<T>;
}
