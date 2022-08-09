import axios from 'axios';
import { toHexString } from '@chainsafe/ssz';
import { IProver } from './iprover';
import { Peaks } from '../merkle-mountain-range';
import { ISyncStoreVerifer } from '../store/isync-store';
import { Benchmark } from '../benchmark';
import { wait, handleHTTPRequest } from '../utils';
import {
  LeafWithProofSSZ,
  MMRInfoSSZ,
  NodeSSZ,
  deepBufferToUint8Array,
} from './ssz-types';

export class ProverClient<T> implements IProver<T> {
  constructor(
    protected store: ISyncStoreVerifer<T>,
    protected serverUrl: string,
    protected benchmark: Benchmark,
  ) {}

  protected async request(
    method: 'GET' | 'POST',
    url: string,
    isBuffer: boolean = false,
    retry: number = 5,
  ): Promise<any> {
    try {
      const { data, bytesRead, bytesWritten } = await handleHTTPRequest(method, url, isBuffer);
      this.benchmark.increment(bytesRead + bytesWritten);
      return data;
    } catch (e) {
      console.error(`Error while fetching, retry left ${retry}`, e);
      if (retry > 0) {
        await wait(500);
        return await this.request(method, url, isBuffer, retry - 1);
      } else throw e;
    }
  }

  protected async getRequest(
    url: string,
    isBuffer: boolean = false,
    retry: number = 5,
  ): Promise<any> {
    return this.request('GET', url, isBuffer, retry);
  }

  protected async postRequest(
    url: string,
    isBuffer: boolean = false,
    retry: number = 5,
  ): Promise<any> {
    return this.request('POST', url, isBuffer, retry);
  }

  async getLeafWithProof(period: number | 'latest'): Promise<{
    syncCommittee: Uint8Array[];
    rootHash: Uint8Array;
    proof: Uint8Array[][];
  }> {
    const data = await this.getRequest(
      `${this.serverUrl}/sync-committee/mmr/leaf/${period}`,
      true,
    );
    const leafWithProof = LeafWithProofSSZ.deserialize(data);
    return deepBufferToUint8Array(leafWithProof);
  }

  async getMMRInfo(): Promise<{
    rootHash: Uint8Array;
    peaks: Peaks;
  }> {
    const data = await this.getRequest(
      `${this.serverUrl}/sync-committee/mmr`,
      true,
    );
    const mmrInfo = MMRInfoSSZ.deserialize(data);
    return deepBufferToUint8Array(mmrInfo);
  }

  async getNode(
    treeRoot: Uint8Array,
    nodeHash: Uint8Array,
  ): Promise<{ isLeaf: boolean; children?: Uint8Array[] }> {
    const data = await this.getRequest(
      `${this.serverUrl}/sync-committee/mmr/${toHexString(
        treeRoot,
      )}/node/${toHexString(nodeHash)}`,
      true,
    );
    const nodeInfo = NodeSSZ.deserialize(data);
    return deepBufferToUint8Array(nodeInfo);
  }

  async getSyncUpdates(startPeriod: number, maxCount: number): Promise<T[]> {
    const data = await this.getRequest(
      `${this.serverUrl}/sync-updates?startPeriod=${startPeriod}&maxCount=${maxCount}`,
      true,
    );
    return this.store.updatesFromBytes(data, maxCount);
  }

  async setN(n: number) {
    const data = await this.postRequest(`${this.serverUrl}/tree-degree?n=${n}`);
    if (!data.success) throw new Error('set tree-degree failed');
  }
}
