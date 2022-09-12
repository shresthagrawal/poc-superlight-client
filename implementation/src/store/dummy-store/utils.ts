import { digest } from '@chainsafe/as-sha256';
import { SecretKey, Signature } from '@chainsafe/bls/blst-native';
import { ContainerType } from '@chainsafe/ssz';
import {
  DummyHeader,
  DummyUpdate,
  DummyUpdateRaw,
  CommitteeChainInfo,
} from './types.js';
import {
  RandomBytesGenerator,
  concatUint8Array,
  numberToUint8Array,
  isUint8ArrayEq,
  getRandomInt,
} from '../../utils.js';
import { getUpdateSSZ } from './ssz.js';

export function hashHeader(header: DummyHeader): Uint8Array {
  return digest(
    concatUint8Array([
      ...header.nextCommittee,
      numberToUint8Array(header.epoch),
    ]),
  );
}

export function fromRawUpdate(update: DummyUpdateRaw): DummyUpdate {
  return {
    header: {
      epoch: update.header.epoch,
      nextCommittee: update.header.nextCommittee.map(u => new Uint8Array(u)),
    },
    aggregateSignature: new Uint8Array(update.aggregateSignature),
  };
}

export function generateChain(
  seed: string | false,
  maxChainSize: number,
  committeeSize: number,
): CommitteeChainInfo {
  const ssz = getUpdateSSZ(committeeSize);
  // generate committee using seed
  const randomBytesGenerator = new RandomBytesGenerator(seed || '');
  const nextCommitteePK = () =>
    seed
      ? randomBytesGenerator
          .generateArray(32, committeeSize)
          .map(entropy => SecretKey.fromKeygen(entropy))
      : new Array(committeeSize).fill(null).map(i => SecretKey.fromKeygen());
  // TODO: fix type
  const getCommitteeFromPK = (cPK: any[]) =>
    cPK.map(pk => pk.toPublicKey().toBytes());
  const getCommitteeHash = (c: Uint8Array[]) => digest(concatUint8Array(c));

  let currentCommitteePK = nextCommitteePK();
  const genesisCommittee = getCommitteeFromPK(currentCommitteePK);
  const syncCommitteeHashes = [getCommitteeHash(genesisCommittee)];

  const syncUpdatesRaw = new Array(maxChainSize).fill(null).map((_, i) => {
    console.log(
      `(${seed || 'dishonest'}) Creating syncUpdates for period ${i}`,
    );
    const nextSyncCommitteePK = nextCommitteePK();
    const nextCommittee = getCommitteeFromPK(nextSyncCommitteePK);
    syncCommitteeHashes.push(getCommitteeHash(nextCommittee));

    const header = {
      nextCommittee,
      epoch: i,
    };

    // generate correct signature for honest updates
    const headerHash = hashHeader(header);
    const signatures = currentCommitteePK.map(pk => pk.sign(headerHash));
    const aggregateSignature = Signature.aggregate(signatures).toBytes();

    currentCommitteePK = nextSyncCommitteePK;
    const update = {
      header,
      aggregateSignature,
    };
    return ssz.serialize(update);
  });

  return {
    syncUpdatesRaw,
    genesisCommittee,
    syncCommitteeHashes,
  };
}
