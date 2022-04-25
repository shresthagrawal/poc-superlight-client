import { init } from '@chainsafe/bls';
import {
  BeaconStoreProver,
  BeaconStoreVerifier,
} from '../src/store/beacon-store';
import { SuperlightProver } from '../src/prover/superlight-sync';
import { SuperlightClient } from '../src/client/superlight-client';
import { generateRandomSyncCommittee } from '../src/utils';

async function main() {
  await init('blst-native');

  const beaconStoreProverH = new BeaconStoreProver();

  const committee = generateRandomSyncCommittee();
  const beaconStoreProverD = new BeaconStoreProver([{ index: 3, committee }]);

  const honestBeaconProver = new SuperlightProver(beaconStoreProverH);
  const dishonestBeaconProver = new SuperlightProver(beaconStoreProverD);

  const beaconStoreVerifer = new BeaconStoreVerifier();
  const superLightClient = new SuperlightClient(beaconStoreVerifer, [
    dishonestBeaconProver,
    honestBeaconProver,
  ]);
  const result = await superLightClient.sync();
  console.log(result);
}

main().catch(err => console.error(err));
