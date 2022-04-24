import { assertValidLightClientUpdate } from '@chainsafe/lodestar-light-client/lib/validation';
import { SyncCommitteeFast } from '@chainsafe/lodestar-light-client/lib/types';
import { deserializeSyncCommittee } from '@chainsafe/lodestar-light-client/lib/utils/utils';
import * as SyncUpdates from '../store/data/beacon-sync-updates.json';
import { ssz } from "@chainsafe/lodestar-types";
import { createIBeaconConfig, IBeaconConfig, IChainForkConfig, defaultChainConfig } from "@chainsafe/lodestar-config";
import {fromHexString, JsonPath, toHexString} from "@chainsafe/ssz";
import { init } from "@chainsafe/bls";

async function main() {
    await init("herumi");
    const genesisRoot = fromHexString("0x4b363db94e286120d76eb905340fdd4e54bfe9f06bf33ff6cf5ad27f511bfe95");
    const first = ssz.altair.LightClientUpdate.fromJson(SyncUpdates[0]);
    console.log(first.nextSyncCommittee);
    // const second = ssz.altair.LightClientUpdate.fromJson(SyncUpdates[1]);
    // const beaconConfig = createIBeaconConfig(defaultChainConfig, genesisRoot);
    // // console.log(first.nextSyncCommittee);
    // const currentSyncCommittee = deserializeSyncCommittee(first.nextSyncCommittee)
    // // console.log(currentSyncCommittee);
    // assertValidLightClientUpdate(beaconConfig, currentSyncCommittee, second);
}

main();