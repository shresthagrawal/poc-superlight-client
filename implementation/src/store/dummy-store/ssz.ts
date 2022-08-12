import {
  ContainerType,
  VectorCompositeType,
  ByteVectorType,
  UintNumberType,
} from '@chainsafe/ssz';

export function getUpdateSSZ(committeeSize: number) {
  const BLSPubkey = new ByteVectorType(48);
  const CommitteeSSZ = new VectorCompositeType(BLSPubkey, committeeSize);
  const DummyHeaderSSZ = new ContainerType({
    nextCommittee: CommitteeSSZ,
    epoch: new UintNumberType(8),
  });
  return new ContainerType({
    header: DummyHeaderSSZ,
    aggregateSignature: new ByteVectorType(96),
  });
}