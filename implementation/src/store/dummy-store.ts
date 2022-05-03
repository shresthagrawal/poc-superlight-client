import { PublicKey, SecretKey, Signature } from '@chainsafe/bls';
import { ISyncStoreProver, ISyncStoreVerifer } from './isync-store';
import {
  getRandomBytesArray,
  concatUint8Array,
  numberToUint8Array,
  isUint8ArrayEq,
  getRandomInt,
} from '../utils';
import { digest } from '@chainsafe/as-sha256';
import { fromHexString, toHexString } from '@chainsafe/ssz';

export type Committee = Uint8Array[];

export type Dummyheader = {
  nextCommittee: Committee;
  epoch: number;
};

export type DummyUpdate = {
  header: Dummyheader;
  aggregateSignature: Uint8Array;
};

function hashHeader(header: Dummyheader): Uint8Array {
  return digest(
    concatUint8Array([
      ...header.nextCommittee,
      numberToUint8Array(header.epoch),
    ]),
  );
}

export class DummyStoreProver implements ISyncStoreProver<DummyUpdate> {
  startPeriod: number;
  syncUpdates: DummyUpdate[];
  syncCommittees: Uint8Array[][];

  constructor(
    honest: boolean = true,
    size: number = 100,
    committeeSize: number = 10,
    seed: string = 'seedme',
  ) {
    // generate committee using seed
    const allCommitteePK = getRandomBytesArray(
      seed,
      32,
      committeeSize * (size + 1),
    ).map(entropy => SecretKey.fromKeygen(entropy));
    let currentCommitteePK = allCommitteePK.slice(0, committeeSize);

    // index staring which the store will be dishonest
    const dishonestyIndex = honest ? 0 : getRandomInt(size);

    // generate dummy sync updates
    this.syncUpdates = new Array(size).fill(null).map((_, i) => {
      if (honest || i < dishonestyIndex) {
        console.log(`Creating honest syncUpdates for period ${i}`);
        const nextSyncCommitteePK = allCommitteePK.slice(
          committeeSize * (i + 1),
          committeeSize * (i + 2),
        );
        const nextCommittee = nextSyncCommitteePK.map(pk =>
          pk.toPublicKey().toBytes(),
        );
        const header = {
          nextCommittee,
          epoch: i,
        };
        const headerHash = hashHeader(header);
        // generate correct signature for honest updates
        const signatures = currentCommitteePK.map(pk => pk.sign(headerHash));
        const aggregateSignature = Signature.aggregate(signatures).toBytes();
        currentCommitteePK = nextSyncCommitteePK;
        return {
          header,
          aggregateSignature,
        };
      } else {
        console.log(`Creating malicious syncUpdates for period ${i}`);
        // generate malicious keys
        const nextSyncCommitteePK = new Array(committeeSize)
          .fill(null)
          .map(i => SecretKey.fromKeygen());
        const nextCommittee = nextSyncCommitteePK.map(pk =>
          pk.toPublicKey().toBytes(),
        );
        const header = {
          nextCommittee,
          epoch: i,
        };
        // for dishonest updates store 0 signature
        return {
          header,
          aggregateSignature: new Uint8Array(96),
        };
      }
    });
    // set sync committees based on sync updates
    const genesisCommittee = allCommitteePK
      .slice(0, committeeSize)
      .map(pk => pk.toPublicKey().toBytes());
    this.syncCommittees = [
      genesisCommittee,
      ...this.syncUpdates.map(update => update.header.nextCommittee),
    ];

    this.startPeriod = 0;
  }

  getAllSyncCommittees(): {
    startPeriod: number;
    syncCommittees: Uint8Array[][];
  } {
    return {
      startPeriod: this.startPeriod,
      syncCommittees: this.syncCommittees,
    };
  }

  getSyncCommittee(period: number): Uint8Array[] {
    return this.syncCommittees[period];
  }

  getSyncUpdate(period: number): DummyUpdate {
    return this.syncUpdates[period];
  }

  updateToJson(update: DummyUpdate): any {
    return {
      header: {
        nextCommittee: update.header.nextCommittee.map(c => toHexString(c)),
        epoch: update.header.epoch,
      },
      aggregateSignature: toHexString(update.aggregateSignature),
    };
  }
}

export class DummyStoreVerifier implements ISyncStoreVerifer<DummyUpdate> {
  genesisSyncCommittee: Uint8Array[];
  genesisPeriod: number;

  constructor(
    protected size: number = 100,
    committeeSize: number = 10,
    genesisSeed: string = 'seedme',
  ) {
    // generate genesis committee using genesis seed
    const genesisCommitteePK = getRandomBytesArray(
      genesisSeed,
      32,
      committeeSize,
    ).map(entropy => SecretKey.fromKeygen(entropy));
    this.genesisSyncCommittee = genesisCommitteePK.map(pk =>
      pk.toPublicKey().toBytes(),
    );
    this.genesisPeriod = 0;
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

  updateFromJson(jsonUpdate: any): DummyUpdate {
    return {
      header: {
        nextCommittee: jsonUpdate.header.nextCommittee.map((c: string) =>
          fromHexString(c),
        ),
        epoch: jsonUpdate.header.epoch,
      },
      aggregateSignature: fromHexString(jsonUpdate.aggregateSignature),
    };
  }
}
