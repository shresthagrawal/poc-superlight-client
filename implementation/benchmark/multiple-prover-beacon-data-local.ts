import { init } from '@chainsafe/bls';
import {
  BeaconStoreProver,
  BeaconStoreVerifier,
} from '../src/store/beacon-store';
import { Prover } from '../src/prover/prover';
import { SuperlightClient } from '../src/client/superlight-client';
import { LightClient } from '../src/client/light-client';
import { shuffle } from '../src/utils';

const dishonestProverCount = 4;
const n = 2;
const batchSize = 1;

async function main() {
  await init('blst-native');

  const beaconStoreProverH = new BeaconStoreProver(true);
  const honestBeaconProver = new Prover(beaconStoreProverH, n);

  const distHonestProvers = new Array(dishonestProverCount)
    .fill(null)
    .map((_, i) => {
      const beaconStoreProverD = new BeaconStoreProver(false);
      const dishonestBeaconProver = new Prover(beaconStoreProverD, n);
      return dishonestBeaconProver;
    });

  const allProvers = shuffle([honestBeaconProver, ...distHonestProvers]);
  console.log(allProvers.map(p => p.store.honest));

  const beaconStoreVerifer = new BeaconStoreVerifier();
  const superLightClient = new SuperlightClient(beaconStoreVerifer, allProvers, n);
  console.time('SuperLightClient Sync Time');
  const resultSL = await superLightClient.sync();
  console.timeEnd('SuperLightClient Sync Time');
  console.log(
    `SuperlighClient found [${resultSL.map(
      r => r.index,
    )}] as honest provers \n`,
  );

  const lightClient = new LightClient(beaconStoreVerifer, allProvers, batchSize);

  console.time('LightClient Sync Time');
  const resultL = await lightClient.sync();
  console.timeEnd('LightClient Sync Time');
  console.log(`Lightclient found ${resultL.index} as the first honest prover`);
}

main().catch(err => console.error(err));
