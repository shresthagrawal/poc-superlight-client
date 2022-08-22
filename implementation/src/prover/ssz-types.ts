import * as _ from 'lodash';
import {
  ContainerType,
  VectorCompositeType,
  ByteVectorType,
  BooleanType,
  UintNumberType,
  ListCompositeType,
} from '@chainsafe/ssz';

// these params can be adjusted
const MAX_DEPT = 1000;
const MAX_DEGREE = 100000;
const MAX_CHAINSIZE = 100000;
const MAX_COMMITTEE_SIZE = 1000;

export const CommitteeSSZ = new ListCompositeType(
  new ByteVectorType(48),
  MAX_COMMITTEE_SIZE,
);
const HashSSZ = new ByteVectorType(32);
const ChildrenSSZ = new ListCompositeType(HashSSZ, MAX_DEGREE);
const ProofSSZ = new ListCompositeType(ChildrenSSZ, MAX_DEPT);
const PeakSSZ = new ContainerType({
  rootHash: HashSSZ,
  size: new UintNumberType(8),
});
const PeaksSSZ = new ListCompositeType(PeakSSZ, MAX_DEGREE);

export const LeafWithProofSSZ = new ContainerType({
  syncCommittee: CommitteeSSZ,
  rootHash: HashSSZ,
  proof: ProofSSZ,
});
export const MMRInfoSSZ = new ContainerType({
  peaks: PeaksSSZ,
  rootHash: HashSSZ,
});
export const NodeSSZ = new ContainerType({
  isLeaf: new BooleanType(),
  children: ChildrenSSZ,
});
export const LeafHashesSSZ = new ListCompositeType(HashSSZ, MAX_CHAINSIZE);

function deepTypecast<T>(
  obj: any,
  checker: (val: any) => boolean,
  caster: (val: T) => any,
): any {
  return _.forEach(obj, (val: any, key: any, obj: any) => {
    obj[key] = checker(val)
      ? caster(val)
      : _.isObject(val)
      ? deepTypecast(val, checker, caster)
      : val;
  });
}

export const deepBufferToUint8Array = (obj: any) =>
  deepTypecast(
    obj,
    (val: any) => Buffer.isBuffer(val),
    (val: any) => new Uint8Array(val),
  );
