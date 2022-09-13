import { AsyncOrSync } from 'ts-essentials';
import { Peaks } from '../merkle-mountain-range.js';

export interface IProver<T> {
  getLeafWithProof(period: number | 'latest'): AsyncOrSync<{
    syncCommittee: Uint8Array[];
    rootHash: Uint8Array;
    proof: Uint8Array[][];
  }>;

  getLeaf(period: number | 'latest'): AsyncOrSync<Uint8Array[]>;

  _getLeafHashes(
    startPeriod: number,
    maxCount: number,
  ): AsyncOrSync<Uint8Array[]>;

  getLeafHash(period: number, cacheCount: number): AsyncOrSync<Uint8Array>;

  getMMRInfo(): AsyncOrSync<{
    rootHash: Uint8Array;
    peaks: Peaks;
  }>;

  getNode(
    treeRoot: Uint8Array,
    nodeHash: Uint8Array,
  ): AsyncOrSync<{ isLeaf: boolean; children?: Uint8Array[] }>;

  _getSyncUpdates(startPeriod: number, maxCount: number): AsyncOrSync<T[]>;

  getSyncUpdate(period: number, cacheCount: number): AsyncOrSync<T>;
}
