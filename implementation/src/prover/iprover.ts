import { AsyncOrSync } from 'ts-essentials';
import { Peaks } from '../merkle-mountain-range';

export interface IProver<T> {
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

  getSyncUpdate(period: number): AsyncOrSync<T>;

  getSyncUpdateWithNextCommittee(
    period: number,
  ): AsyncOrSync<{ update: T; syncCommittee: Uint8Array[] }>;

  getSyncUpdatesWithNextCommittees(
    startPeriod: number,
    maxCount: number
  ): AsyncOrSync<{ update: T; syncCommittee: Uint8Array[] }[]>;
}
