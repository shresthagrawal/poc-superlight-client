import axios from 'axios';
import * as altair from '@lodestar/types/altair';
import { IProver } from './iprover.js';
import { Peaks } from '../merkle-mountain-range.js';

type Update = altair.LightClientUpdate;

// This prover can only be used by a light client
export class BeaconAPIProver implements IProver<Update> {
  cachedSyncUpdate: Map<number, Update> = new Map();

  constructor(protected serverURL: string) {}

  getLeafWithProof(period: number | 'latest'): {
    syncCommittee: Uint8Array[];
    rootHash: Uint8Array;
    proof: Uint8Array[][];
  } {
    throw new Error('method not implemented');
  }

  getLeaf(period: number | 'latest'): Uint8Array[] {
    throw new Error('method not implemented');
  }

  _getLeafHashes(
    startPeriod: number,
    maxCount: number,
  ): Uint8Array[] {
    throw new Error('method not implemented');
  }

  getLeafHash(period: number, cacheCount: number): Uint8Array {
    throw new Error('method not implemented');
  }

  getMMRInfo(): {
    rootHash: Uint8Array;
    peaks: Peaks;
  } {
    throw new Error('method not implemented');
  }

  getNode(
    treeRoot: Uint8Array,
    nodeHash: Uint8Array,
  ): { isLeaf: boolean; children?: Uint8Array[] } {
    throw new Error('method not implemented');
  }

  async _getSyncUpdates(startPeriod: number, maxCount: number): Promise<Update[]> {
    // TODO: handle when currentPeriod > startPeriod + maxCount
    const res = await axios.get(
      `${this.serverURL}/eth/v1/beacon/light_client/updates?start_period=${startPeriod}&count=${maxCount}`
    );
    return res.data.data.map((u: any) => altair.ssz.LightClientUpdate.fromJson(u))
  }

  async getSyncUpdate(period: number, cacheCount: number): Promise<Update> {
    if (!this.cachedSyncUpdate.has(period)) {
      const vals = await this._getSyncUpdates(period, cacheCount);
      for (let i = 0; i < cacheCount; i++) {
        this.cachedSyncUpdate.set(period + i, vals[i]);
      }
    }
    return this.cachedSyncUpdate.get(period)!;
  }
} 