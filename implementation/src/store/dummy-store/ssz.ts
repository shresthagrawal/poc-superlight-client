import {
  ContainerType,
  VectorCompositeType,
  ByteVectorType,
  UintNumberType,
} from '@chainsafe/ssz';

export const BLSPubkeySSZ = new ByteVectorType(48);
export const HashSSZ = new ByteVectorType(32);

export function getUpdateSSZ(committeeSize: number) {
  const CommitteeSSZ = new VectorCompositeType(BLSPubkeySSZ, committeeSize);
  const DummyHeaderSSZ = new ContainerType({
    nextCommittee: CommitteeSSZ,
    epoch: new UintNumberType(8),
  });
  return new ContainerType({
    header: DummyHeaderSSZ,
    aggregateSignature: new ByteVectorType(96),
  });
}

export function getChainInfoSSZ(chainSize: number, committeeSize: number) {
  const CommitteeSSZ = new VectorCompositeType(BLSPubkeySSZ, committeeSize);
  const syncUpdateSSZ = new ByteVectorType(104 + 48 * committeeSize);

  return new ContainerType({
    syncUpdatesRaw: new VectorCompositeType(syncUpdateSSZ, chainSize),
    genesisCommittee: CommitteeSSZ,
    syncCommitteeHashes: new VectorCompositeType(HashSSZ, chainSize + 1),
  });
}
