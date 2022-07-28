import axios from 'axios';
import { fromHexString, toHexString } from '@chainsafe/ssz';
import { IProver } from './iprover';
import { Peaks } from '../merkle-mountain-range';
import { ISyncStoreVerifer } from '../store/isync-store';
import { Benchmark } from '../benchmark';
import { wait } from '../utils';

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
      const res = await axios({
        method,
        url,
        responseType: isBuffer ? 'arraybuffer' : undefined,
      });

      this.benchmark.increment(parseInt(res.headers['content-length']));
      return res.data;
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
    );
    return {
      syncCommittee: data.syncCommittee.map((c: string) => fromHexString(c)),
      rootHash: fromHexString(data.rootHash),
      proof: data.proof.map((l: string[]) =>
        l.map((c: string) => fromHexString(c)),
      ),
    };
  }

  async getMMRInfo(): Promise<{
    rootHash: Uint8Array;
    peaks: Peaks;
  }> {
    const data = await this.getRequest(`${this.serverUrl}/sync-committee/mmr`);
    return {
      rootHash: fromHexString(data.rootHash),
      peaks: data.peaks.map((p: { size: number; rootHash: string }) => ({
        size: p.size,
        rootHash: fromHexString(p.rootHash),
      })),
    };
  }

  async getNode(
    treeRoot: Uint8Array,
    nodeHash: Uint8Array,
  ): Promise<{ isLeaf: boolean; children?: Uint8Array[] }> {
    const data = await this.getRequest(
      `${this.serverUrl}/sync-committee/mmr/${toHexString(
        treeRoot,
      )}/node/${toHexString(nodeHash)}`,
    );
    return {
      isLeaf: data.isLeaf,
      children:
        data.children && data.children.map((c: string) => fromHexString(c)),
    };
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
