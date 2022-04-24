import { ssz, altair } from '@chainsafe/lodestar-types';
import { defaultChainConfig, createIBeaconConfig } from '@chainsafe/lodestar-config';
import { PublicKey } from "@chainsafe/bls";
import { computeSyncPeriodAtSlot } from '@chainsafe/lodestar-light-client/lib/utils/clock';
import { assertValidLightClientUpdate } from '@chainsafe/lodestar-light-client/lib/validation';
import { SyncCommitteeFast } from '@chainsafe/lodestar-light-client/lib/types';
import { ISyncStore } from './isync-store';
import { BEACON_GENESIS_ROOT } from './constants';
import * as SyncUpdatesJson from './data/beacon-sync-updates.json';
import * as GenesisSnapshotJson from './data/beacon-genesis-snapshot.json';

// TODO: fix types
export class MainnetBeaconChainStore implements ISyncStore<any> {
  startPeriod: number;
  syncUpdates: altair.LightClientUpdate[];
  syncCommittees: Uint8Array[][];

  constructor(
    syncUpdatesJson: any[] = SyncUpdatesJson,
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
    this.syncCommittees = [
      Array.from(genesisSnapshot.currentSyncCommittee.pubkeys) as Uint8Array[],
      ...this.syncUpdates.map(
        u => Array.from(u.nextSyncCommittee.pubkeys) as Uint8Array[],
      ),
    ];
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
}

function deserializePubkeys(pubkeys: Uint8Array[]): PublicKey[] {
  return pubkeys.map(pk => PublicKey.fromBytes(pk));
}

// This function is ovveride of the original function in 
// @chainsafe/lodestar-light-client/lib/utils/utils
// this was required as the light client doesn't have access 
// to aggregated signatures
function deserializeSyncCommittee(syncCommittee: Uint8Array[]): SyncCommitteeFast {
  const pubkeys = deserializePubkeys(syncCommittee.pubkeys);
  return {
    pubkeys,
    aggregatePubkey: PublicKey.aggregate(pubkeys),
  };
}

// TODO: fix types
export function beaconSyncUpdateVerify(syncCommittee: Uint8Array[], update: any): boolean {
  const beaconConfig = createIBeaconConfig(defaultChainConfig, BEACON_GENESIS_ROOT);
  const syncCommitteeFast = deserializeSyncCommittee(syncCommittee);
  try {
    assertValidLightClientUpdate(beaconConfig, syncCommitteeFast, update);
    return true;
  } catch(e) {
    return false;
  }
}

export function getBeaconGenesisSyncCommittee(): Uint8Array[] {
  const genesisSnapshot =
    ssz.altair.LightClientSnapshot.fromJson(genesisSnapshotJson);
  return Array.from(genesisSnapshot.currentSyncCommittee.pubkeys) as Uint8Array[];
}
