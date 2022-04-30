import { init } from '@chainsafe/bls';
import { DummyStoreVerifier } from '../src/store/dummy-store';
import { ProverClient } from '../src/prover/prover-client';
import { Prover } from '../src/prover/prover';
import { SuperlightClient } from '../src/client/superlight-client';
import { LightClient } from '../src/client/light-client';

// Before running this script two prover servers must be started
// On port 3678 a dishonest node
// On port 3679 a honest node
const proverUrls = [
  'http://localhost:3678', // dishonest
  'http://localhost:3679', // honest
];

async function main() {
  await init('blst-native');

  const storeVerifier = new DummyStoreVerifier();
  const beaconProvers = proverUrls.map(
    url => new ProverClient(storeVerifier, url),
  );

  const superLightClient = new SuperlightClient(storeVerifier, beaconProvers);
  console.time('SuperLightClient Sync Time');
  const resultSL = await superLightClient.sync();
  console.timeEnd('SuperLightClient Sync Time');
  console.log(
    `SuperlighClient found [${resultSL.map(
      r => r.index,
    )}] as honest provers \n`,
  );

  const lightClient = new LightClient(storeVerifier, beaconProvers);

  console.time('LightClient Sync Time');
  const resultL = await lightClient.sync();
  console.timeEnd('LightClient Sync Time');
  console.log(`Lightclient found ${resultL.index} as the first honest prover`);
}

main().catch(err => console.error(err));
