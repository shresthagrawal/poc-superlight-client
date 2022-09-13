import { concatUint8Array, isUint8ArrayEq, smallHexStr } from '../utils.js';
import { ISyncStoreVerifer } from '../store/isync-store.js';
import { IProver } from '../prover/iprover.js';

export type ProverInfo = {
  syncCommitteeHash: Uint8Array;
  syncCommittee?: Uint8Array[];
  index: number;
};

export class OptimisticLightClient<T> {
  constructor(
    protected store: ISyncStoreVerifer<T>,
    protected provers: IProver<T>[],
    protected batchSize: number = 5,
  ) {}

  async getCommittee(
    period: number,
    proverIndex: number,
    expectedCommitteeHash: Uint8Array | null,
  ): Promise<Uint8Array[]> {
    if (period === this.store.getGenesisPeriod())
      return this.store.getGenesisSyncCommittee();
    if (!expectedCommitteeHash)
      throw new Error('expectedCommitteeHash required');
    const committee = await this.provers[proverIndex].getLeaf(period);
    const committeeHash = this.store.getCommitteeHash(committee);
    if (!isUint8ArrayEq(committeeHash, expectedCommitteeHash as Uint8Array))
      throw new Error('prover responded with an incorrect committee');
    return committee;
  }

  async checkCommitteeHashAt(
    proverIndex: number,
    expectedCommitteeHash: Uint8Array,
    period: number,
    prevCommittee: Uint8Array[],
  ): Promise<boolean> {
    const update = await this.provers[proverIndex].getSyncUpdate(period - 1, 1);
    const validOrCommittee = this.store.syncUpdateVerifyGetCommittee(
      prevCommittee,
      update,
    );
    if (!(validOrCommittee as boolean)) return false;
    const committeeHash = this.store.getCommitteeHash(
      validOrCommittee as Uint8Array[],
    );
    return isUint8ArrayEq(committeeHash, expectedCommitteeHash);
  }

  async fight(
    proverInfo1: ProverInfo,
    proverInfo2: ProverInfo,
    period: number,
    prevCommitteeHash: Uint8Array | null,
  ): Promise<boolean> {
    let is1Correct = false;
    let is2Correct = false;

    if (period === this.store.getGenesisPeriod()) {
      const genesisCommittee = this.store.getGenesisSyncCommittee();
      const genesisCommitteeHash =
        this.store.getCommitteeHash(genesisCommittee);

      is1Correct = isUint8ArrayEq(
        proverInfo1.syncCommitteeHash,
        genesisCommitteeHash,
      );
      is2Correct = isUint8ArrayEq(
        proverInfo2.syncCommitteeHash,
        genesisCommitteeHash,
      );
    } else {
      // TODO: handle if one of the prover lies
      const prevCommittee = await this.getCommittee(
        period - 1,
        proverInfo1.index,
        prevCommitteeHash,
      );
      is1Correct = await this.checkCommitteeHashAt(
        proverInfo1.index,
        proverInfo1.syncCommitteeHash,
        period,
        prevCommittee,
      );
      is2Correct = await this.checkCommitteeHashAt(
        proverInfo2.index,
        proverInfo2.syncCommitteeHash,
        period,
        prevCommittee,
      );
    }

    if (is1Correct && !is2Correct) return true;
    else if (is2Correct && !is1Correct) return false;
    else if (!is2Correct && !is1Correct) {
      // If both of them are correct we can return either
      // true or false. The one honest prover will defeat
      // this prover later
      return false;
    } else throw new Error('both updates can not be correct at the same time');
  }

  async tournament(
    proverInfos: ProverInfo[],
    period: number,
    lastCommitteeHash: Uint8Array | null,
  ) {
    let winners = [proverInfos[0]];
    for (let i = 1; i < proverInfos.length; i++) {
      // Consider one of the winner for thi current round
      const currWinner = winners[0];
      const currProver = proverInfos[i];
      if (
        isUint8ArrayEq(
          currWinner.syncCommitteeHash,
          currProver.syncCommitteeHash,
        )
      ) {
        // if the prover has the same syncCommitteeHash as the current
        // winners simply add it to list of winners
        console.log(
          `Prover(${currProver.index}) added to the existing winners list`,
        );
        winners.push(currProver);
      } else {
        console.log(
          `Fight between Prover(${currWinner.index}) and Prover(${currProver.index})`,
        );
        const areCurrentWinnersHonest = await this.fight(
          currWinner,
          currProver,
          period,
          lastCommitteeHash,
        );
        // If the winner lost discard all the existing winners
        if (!areCurrentWinnersHonest) {
          console.log(
            `Prover(${currProver.index}) defeated all existing winners`,
          );
          winners = [currProver];
        }
      }
    }
    return winners;
  }

  // returns the prover info containing the current sync
  // committee and prover index of the first honest prover
  async sync(): Promise<ProverInfo> {
    // get the tree size by currentPeriod - genesisPeriod
    const currentPeriod = this.store.getCurrentPeriod();
    let startPeriod = this.store.getGenesisPeriod();
    console.log(
      `Sync started using ${this.provers.length} Provers from period(${startPeriod}) to period(${currentPeriod})`,
    );

    let lastCommitteeHash: Uint8Array | null = null;
    let proverInfos: ProverInfo[] = this.provers.map((_, i) => ({
      index: i,
      syncCommitteeHash: new Uint8Array(),
    }));

    for (let period = startPeriod; period < currentPeriod; period++) {
      const committeeHashes: Uint8Array[] = await Promise.all(
        proverInfos.map(pi =>
          this.provers[pi.index].getLeafHash(period, this.batchSize),
        ),
      );

      let foundConflict = false;
      for (let j = 0; j < committeeHashes.length; j++) {
        if (!isUint8ArrayEq(committeeHashes[j], committeeHashes[0])) {
          foundConflict = true;
          break;
        }
      }

      proverInfos = proverInfos.map((pi, i) => ({
        ...pi,
        syncCommitteeHash: committeeHashes[i],
      }));

      if (foundConflict) {
        proverInfos = await this.tournament(
          proverInfos,
          period,
          lastCommitteeHash,
        );
        if (proverInfos.length < 2) break;
      }
      lastCommitteeHash = proverInfos[0].syncCommitteeHash;
    }

    // TODO: improve this; this might fail if a malicious prover behaves honestly until the last step
    const committee = await this.provers[proverInfos[0].index].getLeaf(
      'latest',
    );
    proverInfos[0].syncCommittee = committee;
    return proverInfos[0];
  }
}

// ask everyone for hashes
// if all the hash is correct then its great
// else do a tournament on the period
//
