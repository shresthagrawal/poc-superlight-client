export type Committee = Uint8Array[];

export type DummyHeader = {
  nextCommittee: Committee;
  epoch: number;
};

export type DummyUpdate = {
  header: DummyHeader;
  aggregateSignature: Uint8Array;
};

export type DummyUpdateRaw = {
  header: {
    nextCommittee: ArrayBufferLike[];
    epoch: number;
  };
  aggregateSignature: ArrayBufferLike;
};

export type CommitteeChainInfo = {
  syncUpdatesRaw: Uint8Array[];
  genesisCommittee: Uint8Array[];
  syncCommitteeHashes: Uint8Array[];
};
