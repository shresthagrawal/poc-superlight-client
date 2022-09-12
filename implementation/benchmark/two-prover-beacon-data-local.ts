import {
  BeaconStoreProver,
  BeaconStoreVerifier,
} from '../src/store/beacon-store.js';
import { Prover } from '../src/prover/prover.js';
import { SuperlightClient } from '../src/client/superlight-client.js';
import { LightClient } from '../src/client/light-client.js';

async function main() {
  const beaconStoreProverH = new BeaconStoreProver(true);
  const beaconStoreProverD = new BeaconStoreProver(false);

  const honestBeaconProver = new Prover(beaconStoreProverH);
  const dishonestBeaconProver = new Prover(beaconStoreProverD);

  const beaconStoreVerifer = new BeaconStoreVerifier();
  const superLightClient = new SuperlightClient(beaconStoreVerifer, [
    dishonestBeaconProver,
    honestBeaconProver,
  ]);
  console.time('SuperLightClient Sync Time');
  const resultSL = await superLightClient.sync();
  console.timeEnd('SuperLightClient Sync Time');
  console.log(
    `SuperlighClient found [${resultSL.map(
      r => r.index,
    )}] as honest provers \n`,
  );

  const lightClient = new LightClient(beaconStoreVerifer, [
    dishonestBeaconProver,
    honestBeaconProver,
  ]);

  console.time('LightClient Sync Time');
  const resultL = await lightClient.sync();
  console.timeEnd('LightClient Sync Time');
  console.log(`Lightclient found ${resultL.index} as the first honest prover`);
}

main().catch(err => console.error(err));
