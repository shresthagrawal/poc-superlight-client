import { init } from '@chainsafe/bls';
import { DummyStoreProver, DummyStoreVerifier } from '../src/store/dummy-store';
import { Prover } from '../src/prover/prover';
import { SuperlightClient } from '../src/client/superlight-client';
import { LightClient } from '../src/client/light-client';

const chainSize = 1000;
const committeeSize = 100;
const n = 2;
const batchSize = 1;

async function main() {
  await init('blst-native');

  const beaconStoreProverH = new DummyStoreProver(
    true,
    chainSize,
    committeeSize,
  );
  const beaconStoreProverD = new DummyStoreProver(
    false,
    chainSize,
    committeeSize,
  );

  const honestBeaconProver = new Prover(beaconStoreProverH, n);
  const dishonestBeaconProver = new Prover(beaconStoreProverD, n);

  const beaconStoreVerifer = new DummyStoreVerifier(chainSize, committeeSize);
  const superLightClient = new SuperlightClient(beaconStoreVerifer, [
    dishonestBeaconProver,
    honestBeaconProver,
  ], n);
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
  ], batchSize);

  console.time('LightClient Sync Time');
  const resultL = await lightClient.sync();
  console.timeEnd('LightClient Sync Time');
  console.log(`Lightclient found ${resultL.index} as the first honest prover`);
}

main().catch(err => console.error(err));
