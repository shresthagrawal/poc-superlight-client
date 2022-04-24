import { ssz, altair } from '@chainsafe/lodestar-types';
import { computeSyncPeriodAtSlot } from '@chainsafe/lodestar-light-client/lib/utils/clock';
import { defaultChainConfig } from '@chainsafe/lodestar-config';
import { ISyncStore } from './isync-store';
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
