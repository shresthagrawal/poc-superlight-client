import { concatUint8Array, isUint8ArrayEq, smallHexStr } from '../utils.js';
import { ISyncStoreVerifer } from '../store/isync-store.js';
import { IProver } from '../prover/iprover.js';

export type ProverInfo = {
  syncCommittee: Uint8Array[];
  index: number;
};

export class LightClient<T> {
  constructor(
    protected store: ISyncStoreVerifer<T>,
    protected provers: IProver<T>[],
    protected batchSize: number = 5,
  ) {}

  // Returns the last valid sync committee
  async syncProver(
    prover: IProver<T>,
    startPeriod: number,
    currentPeriod: number,
    startCommittee: Uint8Array[],
  ): Promise<{ syncCommittee: Uint8Array[]; period: number }> {
    for (let period = startPeriod; period < currentPeriod; period += 1) {
      const update = await prover.getSyncUpdate(period, this.batchSize);
      const validOrCommittee = this.store.syncUpdateVerifyGetCommittee(
        startCommittee,
        update,
      );

      if (!(validOrCommittee as boolean)) {
        console.log(`Found invalid update at period(${period})`);
        return {
          syncCommittee: startCommittee,
          period,
        };
      }

      startCommittee = validOrCommittee as Uint8Array[];
    }
    return {
      syncCommittee: startCommittee,
      period: currentPeriod,
    };
  }

  // returns the prover info containing the current sync
  // committee and prover index of the first honest prover
  async sync(): Promise<ProverInfo> {
    // get the tree size by currentPeriod - genesisPeriod
    const currentPeriod = this.store.getCurrentPeriod();
    let startPeriod = this.store.getGenesisPeriod();
    let startCommittee = this.store.getGenesisSyncCommittee();
    console.log(
      `Sync started using ${this.provers.length} Provers from period(${startPeriod}) to period(${currentPeriod})`,
    );

    for (let i = 0; i < this.provers.length; i++) {
      const prover = this.provers[i];
      console.log(`Validating Prover(${i})`);
      const { syncCommittee, period } = await this.syncProver(
        prover,
        startPeriod,
        currentPeriod,
        startCommittee,
      );
      if (period === currentPeriod) {
        return {
          index: i,
          syncCommittee,
        };
      }
      startPeriod = period;
      startCommittee = syncCommittee;
    }
    throw new Error('no honest prover found');
  }
}
