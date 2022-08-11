import { PublicKey, SecretKey, Signature } from '@chainsafe/bls';
import { ISyncStoreProver, ISyncStoreVerifer } from './isync-store';
import {
  RandomBytesGenerator,
  concatUint8Array,
  numberToUint8Array,
  isUint8ArrayEq,
  getRandomInt,
} from '../utils';
import { digest } from '@chainsafe/as-sha256';
import {
  ContainerType,
  VectorCompositeType,
  ByteVectorType,
  UintNumberType,
  ListCompositeType,
} from '@chainsafe/ssz';

type Committee = Uint8Array[];

type DummyHeader = {
  nextCommittee: Committee;
  epoch: number;
};

type DummyUpdate = {
  header: DummyHeader;
  aggregateSignature: Uint8Array;
};

type DummyUpdateRaw = {
  header: {
    nextCommittee: ArrayBufferLike[];
    epoch: number;
  };
  aggregateSignature: ArrayBufferLike;
};

type CommitteeChainInfo = {
  syncUpdatesRaw: Uint8Array[];
  genesisCommittee: Uint8Array[];
  syncCommitteeHashes: Uint8Array[];
};

function hashHeader(header: DummyHeader): Uint8Array {
  return digest(
    concatUint8Array([
      ...header.nextCommittee,
      numberToUint8Array(header.epoch),
    ]),
  );
}

function fromRawUpdate(update: DummyUpdateRaw): DummyUpdate {
  return {
    header: {
      epoch: update.header.epoch,
      nextCommittee: update.header.nextCommittee.map(u => new Uint8Array(u)),
    },
    aggregateSignature: new Uint8Array(update.aggregateSignature),
  };
}

function getUpdateSSZ(committeeSize: number) {
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

export class DummyStoreProver implements ISyncStoreProver<DummyUpdate> {
  startPeriod: number = 0;
  honestCommitteeChain: CommitteeChainInfo;
  dishonestCommitteeChain: CommitteeChainInfo | null = null; // set to null if the prover is honest
  dishonestyIndex: number = -1; // default set to -1 which implies honest prover
  updateSSZ: ContainerType<any>;

  constructor(
    protected honest: boolean = true,
    protected maxChainSize: number = 100,
    committeeSize: number = 10,
    seed: string = 'seedme',
  ) {
    this.updateSSZ = getUpdateSSZ(committeeSize);

    this.honestCommitteeChain = this.getCommitteeChain(
      seed,
      maxChainSize,
      committeeSize,
      this.updateSSZ,
    );
    if (!honest) {
      this.dishonestCommitteeChain = this.getCommitteeChain(
        seed + 'dishonest',
        maxChainSize,
        committeeSize,
        this.updateSSZ,
      );
      this.dishonestyIndex = getRandomInt(maxChainSize);
      console.log(`Dishonesty index ${this.dishonestyIndex}`);
    }
  }

  private getCommitteeChain(
    seed: string,
    maxChainSize: number,
    committeeSize: number,
    ssz: ContainerType<any>,
  ): {
    syncUpdatesRaw: Uint8Array[];
    genesisCommittee: Uint8Array[];
    syncCommitteeHashes: Uint8Array[];
  } {
    // generate committee using seed
    const randomBytesGenerator = new RandomBytesGenerator(seed);
    const nextCommitteePK = () =>
      randomBytesGenerator
        .generateArray(32, committeeSize)
        .map(entropy => SecretKey.fromKeygen(entropy));
    const getCommitteeFromPK = (cPK: SecretKey[]) =>
      cPK.map(pk => pk.toPublicKey().toBytes());
    const getCommitteeHash = (c: Uint8Array[]) => digest(concatUint8Array(c));

    let currentCommitteePK = nextCommitteePK();
    const genesisCommittee = getCommitteeFromPK(currentCommitteePK);
    const syncCommitteeHashes = [getCommitteeHash(genesisCommittee)];

    const syncUpdatesRaw = new Array(maxChainSize).fill(null).map((_, i) => {
      console.log(`(${seed}) Creating syncUpdates for period ${i}`);
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

  private get syncCommitteeHashes() {
    return this.dishonestCommitteeChain
      ? [
          ...this.honestCommitteeChain.syncCommitteeHashes.slice(
            0,
            this.dishonestyIndex,
          ),
          ...this.dishonestCommitteeChain.syncCommitteeHashes.slice(
            this.dishonestyIndex,
          ),
        ]
      : this.honestCommitteeChain.syncCommitteeHashes;
  }

  private get genesisCommittee() {
    return this.dishonestCommitteeChain && this.dishonestyIndex === 0
      ? this.dishonestCommitteeChain.genesisCommittee
      : this.honestCommitteeChain.genesisCommittee;
  }

  getSyncUpdate(period: number): DummyUpdate {
    const rawUpdate =
      this.dishonestCommitteeChain && this.dishonestyIndex <= period
        ? this.dishonestCommitteeChain.syncUpdatesRaw[period]
        : this.honestCommitteeChain.syncUpdatesRaw[period];
    return fromRawUpdate(this.updateSSZ.deserialize(rawUpdate) as DummyUpdateRaw);
  }

  getAllSyncCommitteeHashes(): {
    startPeriod: number;
    hashes: Uint8Array[];
  } {
    return {
      startPeriod: this.startPeriod,
      hashes: this.syncCommitteeHashes,
    };
  }

  getSyncCommittee(period: number): Uint8Array[] {
    if (period === 0) return this.genesisCommittee;
    return this.getSyncUpdate(period - 1).header.nextCommittee;
  }

  updatesToBytes(update: DummyUpdate[], maxItems: number): Uint8Array {
    return new ListCompositeType(this.updateSSZ, maxItems).serialize(update);
  }

  updateChainSize(chainSize: number) {
    if(!this.dishonestCommitteeChain)
      return;
    this.dishonestyIndex = getRandomInt(chainSize);
    console.log(`Dishonesty index updated ${this.dishonestyIndex}`);
  }
}

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
    const randomBytesGenerator = new RandomBytesGenerator(genesisSeed);
    const genesisCommitteePK = randomBytesGenerator
      .generateArray(32, committeeSize)
      .map(entropy => SecretKey.fromKeygen(entropy));
    this.genesisSyncCommittee = genesisCommitteePK.map(pk =>
      pk.toPublicKey().toBytes(),
    );
    this.genesisPeriod = 0;
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