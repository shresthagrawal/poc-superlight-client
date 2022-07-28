export interface ISyncStoreProver<T> {
  getAllSyncCommitteeHashes(): {
    startPeriod: number;
    hashes: Uint8Array[];
  };

  getSyncCommittee(period: number): Uint8Array[];

  getSyncUpdate(period: number): T;

  updatesToBytes(update: T[], maxItems: number): Uint8Array;
}

export interface ISyncStoreVerifer<T> {
  syncUpdateVerifyGetCommittee(
    prevCommittee: Uint8Array[],
    update: T,
  ): false | Uint8Array[];

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
