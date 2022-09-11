import { ContainerType, ListCompositeType } from '@chainsafe/ssz';
import { PublicKey, SecretKey, Signature } from '@chainsafe/bls/blst-native';
import { digest } from '@chainsafe/as-sha256';
import { ISyncStoreVerifer } from '../isync-store.js';
import {
  RandomBytesGenerator,
  isUint8ArrayEq,
  concatUint8Array,
} from '../../utils.js';
import { DummyUpdateRaw, DummyUpdate } from './types.js';
import { hashHeader, fromRawUpdate } from './utils.js';
import { getUpdateSSZ } from './ssz.js';

export class DummyStoreVerifier implements ISyncStoreVerifer<DummyUpdate> {
  genesisSyncCommittee: Uint8Array[];
  genesisPeriod: number;
  updateSSZ: ContainerType<any>;

  constructor(
    protected size: number = 100,
    committeeSize: number = 10,
    genesisSeed: string = 'seedme',
  ) {
    this.updateSSZ = getUpdateSSZ(committeeSize);

    // generate genesis committee using genesis seed
    const randomBytesGenerator = new RandomBytesGenerator(genesisSeed + '0');
    const genesisCommitteePK = randomBytesGenerator
      .generateArray(32, committeeSize)
      .map(entropy => SecretKey.fromKeygen(entropy));
    this.genesisSyncCommittee = genesisCommitteePK.map(pk =>
      pk.toPublicKey().toBytes(),
    );
    this.genesisPeriod = 0;
  }

  getCommitteeHash(committee: Uint8Array[]): Uint8Array {
    return digest(concatUint8Array(committee));
  }

  syncUpdateVerifyGetCommittee(
    prevCommittee: Uint8Array[],
    update: DummyUpdate,
  ): false | Uint8Array[] {
    // verify if the aggregate signature is valid
    const headerHash = hashHeader(update.header);
    const committeeKeys = prevCommittee.map(pk => PublicKey.fromBytes(pk));
    try {
      const isAggregateSignatureValid = Signature.fromBytes(
        update.aggregateSignature,
      ).verifyAggregate(committeeKeys, headerHash);
      if (!isAggregateSignatureValid) return false;
      return update.header.nextCommittee;
    } catch (e) {
      // console.error(`Signature Validation Failed ${e}`);
      return false;
    }
  }

  syncUpdateVerify(
    prevCommittee: Uint8Array[],
    currentCommittee: Uint8Array[],
    update: DummyUpdate,
  ): boolean {
    // verify if the current committee is same as update next committee
    const isCurrentCommitteeSame = currentCommittee.every((c, i) =>
      isUint8ArrayEq(c, update.header.nextCommittee[i]),
    );
    if (!isCurrentCommitteeSame) return false;

    // verify if the aggregate signature is valid
    const headerHash = hashHeader(update.header);
    const committeeKeys = prevCommittee.map(pk => PublicKey.fromBytes(pk));
    try {
      const isAggregateSignatureValid = Signature.fromBytes(
        update.aggregateSignature,
      ).verifyAggregate(committeeKeys, headerHash);
      return isAggregateSignatureValid;
    } catch (e) {
      // console.error(`Signature Validation Failed ${e}`);
      return false;
    }
  }

  getGenesisSyncCommittee(): Uint8Array[] {
    return this.genesisSyncCommittee;
  }

  getCurrentPeriod(): number {
    return this.genesisPeriod + this.size;
  }

  getGenesisPeriod(): number {
    return this.genesisPeriod;
  }

  updatesFromBytes(bytesUpdates: Uint8Array, maxItems: number): DummyUpdate[] {
    const updatesBuffer = new ListCompositeType(
      this.updateSSZ,
      maxItems,
    ).deserialize(bytesUpdates) as DummyUpdateRaw[];
    return updatesBuffer.map(u => fromRawUpdate(u));
  }
}
