import { BeaconStoreVerifier } from '../src/store/beacon-store.js';
import { ProverClient } from '../src/prover/prover-client.js';
import { Prover } from '../src/prover/prover.js';
import { SuperlightClient } from '../src/client/superlight-client.js';
import { LightClient } from '../src/client/light-client.js';
import { Benchmark } from '../src/benchmark.js';

// Before running this script two prover servers must be started
// On port 3678 a dishonest node
// On port 3679 a honest node
const proverUrls = [
  'http://localhost:3678', // dishonest
  'http://localhost:3679', // honest
];

async function main() {
  const beaconStoreVerifer = new BeaconStoreVerifier();

  // Superlight Client
  const benchmarkSL = new Benchmark();
  const beaconProversSL = proverUrls.map(
    url => new ProverClient(beaconStoreVerifer, url, benchmarkSL),
  );
  const superLightClient = new SuperlightClient(
    beaconStoreVerifer,
    beaconProversSL,
  );

  benchmarkSL.startBenchmark();
  const resultSL = await superLightClient.sync();
  const resultSLBenchmark = benchmarkSL.stopBenchmark();
  console.log(
    `\nSuperlighClient found [${resultSL.map(r => r.index)}] as honest provers`,
  );
  console.log(`TimeToSync: ${resultSLBenchmark.timeToSync} ms`);
  console.log(`BytesDownloaded: ${resultSLBenchmark.bytesDownloaded} bytes`);
  console.log(`Interactions: ${resultSLBenchmark.interactions}\n`);

  // Light Client
  const benchmarkL = new Benchmark();
  const beaconProversL = proverUrls.map(
    url => new ProverClient(beaconStoreVerifer, url, benchmarkL),
  );
  const lightClient = new LightClient(beaconStoreVerifer, beaconProversL);

  benchmarkL.startBenchmark();
  const resultL = await lightClient.sync();
  const resultLBenchmark = benchmarkL.stopBenchmark();
  console.log(
    `\nLightclient found ${resultL.index} as the first honest prover`,
  );
  console.log(`TimeToSync: ${resultLBenchmark.timeToSync} ms`);
  console.log(`BytesDownloaded: ${resultLBenchmark.bytesDownloaded} bytes`);
  console.log(`Interactions: ${resultLBenchmark.interactions}`);
}

main().catch(err => console.error(err));
