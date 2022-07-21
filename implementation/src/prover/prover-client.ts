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

  protected async getRequest(url: string, retry: number = 5): Promise<any> {
    try {
      const res = await axios.get(url);
      this.benchmark.increment(parseInt(res.headers['content-length']));
      return res.data;
    } catch(e) {
      console.error(`Errror while fetching, retry left ${retry}`, e);
      if (retry > 0) {
        await wait(500);
        return await this.getRequest(url, retry - 1);
      } else 
        throw e;
    }
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

  async getSyncUpdate(period: number | 'latest'): Promise<T> {
    const data = await this.getRequest(
      `${this.serverUrl}/sync-update/${period}`,
    );
    return this.store.updateFromJson(data);
  }

  async getSyncUpdateWithNextCommittee(period: number): Promise<{
    update: T;
    syncCommittee: Uint8Array[];
  }> {
    const data = await this.getRequest(
      `${this.serverUrl}/sync-update/${period}?nextCommittee=true`,
    );
    return {
      update: this.store.updateFromJson(data.update),
      syncCommittee: data.syncCommittee.map((c: string) => fromHexString(c)),
    };
  }

  async getSyncUpdatesWithNextCommittees(startPeriod: number, maxCount: number): Promise<{
    update: T;
    syncCommittee: Uint8Array[];
  }[]> {
    const data = await this.getRequest(
      `${this.serverUrl}/sync-updates?startPeriod=${startPeriod}&maxCount=${maxCount}`,
    );
    return data.map((d: any) => ({
      update: this.store.updateFromJson(d.update),
      syncCommittee: d.syncCommittee.map((c: string) => fromHexString(c)),
    }));
  }
}
