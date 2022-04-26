import { init } from '@chainsafe/bls';
import {
  BeaconStoreProver,
  BeaconStoreVerifier,
} from '../src/store/beacon-store';
import { Prover } from '../src/prover/prover';
import { SuperlightClient } from '../src/client/superlight-client';
import { generateRandomSyncCommittee } from '../src/utils';

async function main() {
  await init('blst-native');

  const beaconStoreProverH = new BeaconStoreProver();

  const committee = generateRandomSyncCommittee();
  const beaconStoreProverD = new BeaconStoreProver([{ index: 3, committee }]);

  const honestBeaconProver = new Prover(beaconStoreProverH);
  const dishonestBeaconProver = new Prover(beaconStoreProverD);

  const beaconStoreVerifer = new BeaconStoreVerifier();
  const superLightClient = new SuperlightClient(beaconStoreVerifer, [
    dishonestBeaconProver,
    honestBeaconProver,
  ]);
  const result = await superLightClient.sync();
  console.log(result);
}

main().catch(err => console.error(err));
