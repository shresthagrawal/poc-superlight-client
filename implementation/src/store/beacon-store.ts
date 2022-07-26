import { ssz, altair } from '@chainsafe/lodestar-types';
import { digest } from '@chainsafe/as-sha256';
import {
  defaultChainConfig,
  createIBeaconConfig,
  IBeaconConfig,
} from '@chainsafe/lodestar-config';
import { PublicKey } from '@chainsafe/bls';
import { computeSyncPeriodAtSlot } from '@chainsafe/lodestar-light-client/lib/utils/clock';
import { assertValidLightClientUpdate } from '@chainsafe/lodestar-light-client/lib/validation';
import { SyncCommitteeFast } from '@chainsafe/lodestar-light-client/lib/types';
import { ISyncStoreProver, ISyncStoreVerifer } from './isync-store';
import { BEACON_GENESIS_ROOT } from './constants';
import * as GenesisSnapshotJson from './data/beacon-genesis-snapshot.json';
import {
  isUint8ArrayEq,
  isCommitteeSame,
  getRandomInt,
  generateRandomSyncCommittee,
  concatUint8Array,
} from '../utils';

const currentBeaconPeriod = computeSyncPeriodAtSlot(
  defaultChainConfig,
  parseInt(GenesisSnapshotJson.currentSlot),
);

// TODO: fix types
type BeaconUpdate = any;

export class BeaconStoreProver implements ISyncStoreProver<BeaconUpdate> {
  startPeriod: number;
  syncUpdates: altair.LightClientUpdate[];
  syncCommittees: Uint8Array[][];

  constructor(
    // This is required for testing purpose to make dishonest clients
    public honest: boolean = true,
    syncUpdatesJson: any[] = require('./data/beacon-sync-updates.json'),
    genesisSnapshotJson: any = GenesisSnapshotJson,
  ) {
    this.syncUpdates = syncUpdatesJson.map(u =>
      ssz.altair.LightClientUpdate.fromJson(u),
    );
    const genesisSnapshot =
      ssz.altair.LightClientSnapshot.fromJson(genesisSnapshotJson);
    this.startPeriod = computeSyncPeriodAtSlot(
      defaultChainConfig,
      genesisSnapshot.header.slot,
    );

    // The nextSyncCommittee from the last update is not considered
    // as that is the sync committee in the upcomming period
    // The current/latest SyncCommittee is one in nextSyncCommittee
    // of the second last updates
    this.syncCommittees = [
      Array.from(genesisSnapshot.currentSyncCommittee.pubkeys) as Uint8Array[],
      ...this.syncUpdates
        .slice(0, -1)
        .map(u => Array.from(u.nextSyncCommittee.pubkeys) as Uint8Array[]),
    ];

    // If the beacon-store is not honest then override sync committees
    if (!honest) {
      const size = this.syncUpdates.length;
      // The index staring which the sync committees should be incorrect
      const startIndex = getRandomInt(size);
      const committee = generateRandomSyncCommittee();
      console.log(`Overriding starting from ${startIndex}`);
      for (let i = startIndex; i < size; i++) {
        this.syncCommittees[i] = committee;
        if (i > 0) {
          this.syncUpdates[i - 1].nextSyncCommittee = {
            pubkeys: committee,
            aggregatePubkey: PublicKey.aggregate(
              committee.map(c => PublicKey.fromBytes(c)),
            ).toBytes(),
          };
        }
      }
    }
  }

  getAllSyncCommitteeHashes(): {
    startPeriod: number;
    hashes: Uint8Array[];
  } {
    return {
      startPeriod: this.startPeriod,
      hashes: this.syncCommittees.map(c => digest(concatUint8Array(c))),
    };
  }

  getSyncCommittee(period: number): Uint8Array[] {
    const index = period - this.startPeriod;
    if (index < 0)
      throw new Error(
        'requested period should not be lower than the genesis period',
      );
    return this.syncCommittees[index];
  }

  getSyncUpdate(period: number) {
    const index = period - this.startPeriod;
    if (index < 0)
      throw new Error(
        'requested period should not be lower than the genesis period',
      );
    return this.syncUpdates[index];
  }

  updateToJson(update: BeaconUpdate) {
    return ssz.altair.LightClientUpdate.toJson(update);
  }
}

// TODO: fix types
export class BeaconStoreVerifier implements ISyncStoreVerifer<BeaconUpdate> {
  beaconConfig: IBeaconConfig;
  genesisSyncCommittee: Uint8Array[];
  genesisPeriod: number;

  constructor(
    protected currentPeriod = currentBeaconPeriod,
    genesisSnapshotJson: any = GenesisSnapshotJson,
  ) {
    this.beaconConfig = createIBeaconConfig(
      defaultChainConfig,
      BEACON_GENESIS_ROOT,
    );

    const genesisSnapshot =
      ssz.altair.LightClientSnapshot.fromJson(genesisSnapshotJson);
    this.genesisSyncCommittee = Array.from(
      genesisSnapshot.currentSyncCommittee.pubkeys,
    ) as Uint8Array[];

    this.genesisPeriod = computeSyncPeriodAtSlot(
      defaultChainConfig,
      genesisSnapshot.header.slot,
    );
  }

  private deserializePubkeys(pubkeys: Uint8Array[]): PublicKey[] {
    return pubkeys.map(pk => PublicKey.fromBytes(pk));
  }

  // This function is ovveride of the original function in
  // @chainsafe/lodestar-light-client/lib/utils/utils
  // this was required as the light client doesn't have access
  // to aggregated signatures
  private deserializeSyncCommittee(
    syncCommittee: Uint8Array[],
  ): SyncCommitteeFast {
    const pubkeys = this.deserializePubkeys(syncCommittee);
    return {
      pubkeys,
      aggregatePubkey: PublicKey.aggregate(pubkeys),
    };
  }

  syncUpdateVerify(
    prevCommittee: Uint8Array[],
    currentCommittee: Uint8Array[],
    update: BeaconUpdate,
  ): boolean {
    // check if update.nextSyncCommittee is currentCommittee
    const isUpdateValid = isCommitteeSame(
      update.nextSyncCommittee.pubkeys,
      currentCommittee,
    );
    if (!isUpdateValid) return false;

    const prevCommitteeFast = this.deserializeSyncCommittee(prevCommittee);
    try {
      // check if the update has valid signatures
      assertValidLightClientUpdate(
        this.beaconConfig,
        prevCommitteeFast,
        update,
      );
      return true;
    } catch (e) {
      return false;
    }
  }

  getGenesisSyncCommittee(): Uint8Array[] {
    return this.genesisSyncCommittee;
  }

  getCurrentPeriod(): number {
    return this.currentPeriod;
  }

  getGenesisPeriod(): number {
    return this.genesisPeriod;
  }

  updateFromJson(jsonUpdate: any) {
    return ssz.altair.LightClientUpdate.fromJson(jsonUpdate);
  }
}
