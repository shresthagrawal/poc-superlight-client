export interface ISyncStore<T> {
  getAllSyncCommittees(): {
    startPeriod: number;
    syncCommittees: Uint8Array[][];
  };

  getSyncCommittee(period: number): Uint8Array[];

  getSyncUpdate(period: number): T;
}

export type ISyncUpdateVerify<T> = (syncCommittee: Uint8Array[], update: T) => boolean;