import { AsyncOrSync } from 'ts-essentials';

export interface ISyncStoreProver<T> {
  init?(): AsyncOrSync<void>;

  getAllSyncCommitteeHashes(): {
    startPeriod: number;
    hashes: Uint8Array[];
  };

  getSyncCommittee(period: number): Uint8Array[];

  getSyncUpdate(period: number): T;

  updatesToBytes(update: T[], maxItems: number): Uint8Array;

  // optional function to update chain size
  updateChainSize?(chainSize: number): void;
}

export interface ISyncStoreVerifer<T> {
  syncUpdateVerifyGetCommittee(
    prevCommittee: Uint8Array[],
    update: T,
  ): false | Uint8Array[];

  getCommitteeHash(committee: Uint8Array[]): Uint8Array;

  // same as syncUpdateVerifyGetCommittee but checks if the
  // currentCommittee is same as the committee from the update
  syncUpdateVerify(
    prevCommittee: Uint8Array[],
    currentCommittee: Uint8Array[],
    update: T,
  ): boolean;

  getGenesisSyncCommittee(): Uint8Array[];

  getCurrentPeriod(): number;

  getGenesisPeriod(): number;

  updatesFromBytes(bytesUpdate: Uint8Array, maxItems: number): T[];
}
