export interface ISyncStoreProver<T> {
  getAllSyncCommittees(): {
    startPeriod: number;
    syncCommittees: Uint8Array[][];
  };

  getSyncCommittee(period: number): Uint8Array[];

  getSyncUpdate(period: number): T;

  updateToJson(update: T): any;
}

export interface ISyncStoreVerifer<T> {
  syncUpdateVerify(
    prevCommittee: Uint8Array[],
    currentCommittee: Uint8Array[],
    update: T,
  ): boolean;

  getGenesisSyncCommittee(): Uint8Array[];

  getCurrentPeriod(): number;

  getGenesisPeriod(): number;

  updateFromJson(jsonUpdate: any): T;
}
