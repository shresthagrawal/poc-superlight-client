import { init } from '@chainsafe/bls';
import { DummyStoreVerifier } from '../src/store/dummy-store';
import { BeaconStoreVerifier } from '../src/store/beacon-store';
import { ProverClient } from '../src/prover/prover-client';
import { Prover } from '../src/prover/prover';
import { SuperlightClient } from '../src/client/superlight-client';
import { LightClient } from '../src/client/light-client';
import { Benchmark } from '../src/benchmark';
import { shuffle } from '../src/utils';
import * as fs from 'fs';
import * as path from 'path';

const benchmarkOutput = './benchmark-results.json';
const absBenchmarkOutput = path.join(__dirname, benchmarkOutput);
let benchmarks: any[] = [];
if (fs.existsSync(absBenchmarkOutput)) benchmarks = require(benchmarkOutput);


const HonestProverUrl = 'http://localhost:3679';

const DishonestProverUrls = [
  'http://localhost:3678', // dishonest
  // 'http://localhost:3679', // honest
];

const proverCounts = [
  2
];

const isDummy = true;
const size = 100;
const committeeSize = 10;
const trials = 10;

async function benchmark(proverUrls: string [], trial: number) {
  const verifier = isDummy ? new DummyStoreVerifier(size, committeeSize) : new BeaconStoreVerifier();

  // Superlight Client
  const benchmarkSL = new Benchmark();
  const beaconProversSL = proverUrls.map(
    url => new ProverClient(verifier, url, benchmarkSL),
  );
  const superLightClient = new SuperlightClient(
    verifier,
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
  benchmarks.push({
    type: 'superlight',
    trial,
    ...resultSLBenchmark 
  });

  // Light Client
  const benchmarkL = new Benchmark();
  const beaconProversL = proverUrls.map(
    url => new ProverClient(verifier, url, benchmarkL),
  );
  const lightClient = new LightClient(verifier, beaconProversL);

  benchmarkL.startBenchmark();
  const resultL = await lightClient.sync();
  const resultLBenchmark = benchmarkL.stopBenchmark();
  console.log(
    `\nLightclient found ${resultL.index} as the first honest prover`,
  );
  console.log(`TimeToSync: ${resultLBenchmark.timeToSync} ms`);
  console.log(`BytesDownloaded: ${resultLBenchmark.bytesDownloaded} bytes`);
  console.log(`Interactions: ${resultLBenchmark.interactions}`);
  benchmarks.push({
    type: 'light',
    trial,
    ...resultLBenchmark 
  });

  fs.writeFileSync(absBenchmarkOutput, JSON.stringify(benchmarks, null, 2));
}

async function main() {
  await init('blst-native');

  const trialPromises = proverCounts.map(async pc => {
    // two times shuffling is required
    // first to randomly get provers
    // second to shufle the placement of honest prover
    const dishonestUrls = shuffle(DishonestProverUrls).slice(0, pc - 1);
    const allUrls = shuffle([HonestProverUrl, ...dishonestUrls]);
    return (new Array(trials)).fill(null).map((_, i) => benchmark(allUrls, i)); 
  }).flat();

  await Promise.all(trialPromises);
}

main().catch(err => console.error(err));
