import { concatUint8Array, isUint8ArrayEq, smallHexStr } from '../utils';
import { ISyncStoreVerifer } from '../store/isync-store';
import { IProver } from '../prover/iprover';

export type ProverInfo = {
  syncCommittee: Uint8Array[];
  index: number;
};

export class LightClient<T> {
  constructor(
    protected store: ISyncStoreVerifer<T>,
    protected provers: IProver<T>[],
    protected n: number = 2,
  ) {}

  // Returns the latest sync committee
  // or null if prover was found dishonest
  async syncProver(
    prover: IProver<T>,
    genesisPeriod: number,
    currentPeriod: number,
  ): Promise<Uint8Array[] | null> {
    let currentCommittee = this.store.getGenesisSyncCommittee();
    for (let period = genesisPeriod; period < currentPeriod; period++) {
      const { update, syncCommittee: nextSyncCommittee } =
        await prover.getSyncUpdateWithNextCommittee(period);
      const isUpdateValid = this.store.syncUpdateVerify(
        currentCommittee,
        nextSyncCommittee,
        update,
      );
      if (!isUpdateValid) {
        console.log(`Found invalid update at period(${period})`);
        return null;
      }
      currentCommittee = nextSyncCommittee;
    }
    return currentCommittee;
  }

  // returns the prover info containing the current sync
  // committee and prover index of the first honest prover
  async sync(): Promise<ProverInfo> {
    // get the tree size by currentPeriod - genesisPeriod
    const currentPeriod = this.store.getCurrentPeriod();
    const genesisPeriod = this.store.getGenesisPeriod();
    console.log(
      `Sync started using ${this.provers.length} Provers from period(${genesisPeriod}) to period(${currentPeriod})`,
    );

    for (let i = 0; i < this.provers.length; i++) {
      const prover = this.provers[i];
      console.log(`Validating Prover(${i})`);
      const syncCommittee = await this.syncProver(
        prover,
        genesisPeriod,
        currentPeriod,
      );
      if (syncCommittee) {
        return {
          index: i,
          syncCommittee,
        };
      }
    }
    throw new Error('no honest prover found');
  }
}
