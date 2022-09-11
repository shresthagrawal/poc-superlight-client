import { init } from '@chainsafe/bls';
import { Worker, isMainThread, workerData, parentPort } from 'worker_threads';
import * as fs from 'fs';
import * as path from 'path';
import { DummyStoreVerifier } from '../src/store/dummy-store';
import { BeaconStoreVerifier } from '../src/store/beacon-store';
import { ProverClient } from '../src/prover/prover-client';
import { Prover } from '../src/prover/prover';
import { SuperlightClient } from '../src/client/superlight-client';
import { LightClient } from '../src/client/light-client';
import { Benchmark } from '../src/benchmark';
import { shuffle } from '../src/utils';

// This config should match the prover config
const proverCount = 8;
const isDummy = true;
const size = 1024;
const committeeSize = 512;
const trials = 2;
const treeDegree = 2;
const batchSize = 1;
const herokuAppRandomID = 'chocolate';

const benchmarkOutput = `../../results/${
  isDummy ? 'dummy' : 'beacon'
}-data-${proverCount}-${committeeSize}-${size}-${treeDegree}-${batchSize}.json`;
const absBenchmarkOutput = path.join(__dirname, benchmarkOutput);
let benchmarks: any[] = [];
if (fs.existsSync(absBenchmarkOutput)) benchmarks = require(benchmarkOutput);

const HonestProverUrl = `https://${herokuAppRandomID}-honest-node-1.herokuapp.com`;
const DishonestProverUrls = Array(13)
  .fill(null)
  .map(
    (_, i) =>
      `https://${herokuAppRandomID}-dishonest-node-${i + 1}.herokuapp.com`,
  );

async function benchmark(trial: number) {
  const result = [];
  // two times shuffling is required
  // first to randomly get provers
  // second to shufle the placement of honest prover
  const dishonestUrls = shuffle(DishonestProverUrls).slice(0, proverCount - 1);
  const proverUrls = shuffle([HonestProverUrl, ...dishonestUrls]);

  const verifier = isDummy
    ? new DummyStoreVerifier(size, committeeSize)
    : new BeaconStoreVerifier();

  // Superlight Client
  const benchmarkSL = new Benchmark();
  const beaconProversSL = proverUrls.map(
    url => new ProverClient(verifier, url, benchmarkSL),
  );
  const superLightClient = new SuperlightClient(
    verifier,
    beaconProversSL,
    treeDegree,
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
  result.push({
    type: 'superlight',
    trial,
    ...resultSLBenchmark,
    proverCount: proverUrls.length,
    isDummy,
    chainSize: size,
    committeeSize,
    treeDegree,
  });

  // Light Client
  const benchmarkL = new Benchmark();
  const beaconProversL = proverUrls.map(
    url => new ProverClient(verifier, url, benchmarkL),
  );
  const lightClient = new LightClient(verifier, beaconProversL, batchSize);

  benchmarkL.startBenchmark();
  const resultL = await lightClient.sync();
  const resultLBenchmark = benchmarkL.stopBenchmark();
  console.log(
    `\nLightclient found ${resultL.index} as the first honest prover`,
  );
  console.log(`TimeToSync: ${resultLBenchmark.timeToSync} ms`);
  console.log(`BytesDownloaded: ${resultLBenchmark.bytesDownloaded} bytes`);
  console.log(`Interactions: ${resultLBenchmark.interactions}`);
  result.push({
    type: 'light',
    trial,
    ...resultLBenchmark,
    proverCount: proverUrls.length,
    isDummy,
    chainSize: size,
    committeeSize,
    batchSize,
  });
  return result;
}

async function main() {
  const workerPromises = Array(trials)
    .fill(null)
    .map(
      (_, i) =>
        new Promise<void>((resolve, reject) => {
          const worker = new Worker(__filename, { workerData: i });
          worker.on('message', data => {
            benchmarks.push(...data);
            fs.writeFileSync(
              absBenchmarkOutput,
              JSON.stringify(benchmarks, null, 2),
            );
            return resolve();
          });
          worker.on('error', reject);
          worker.on('exit', code => {
            if (code !== 0)
              reject(new Error(`Worker stopped with exit code ${code}`));
          });
        }),
    );
  await Promise.all(workerPromises);
}

async function worker() {
  await init('blst-native');
  const result = await benchmark(workerData);
  parentPort!.postMessage(result);
}

if (isMainThread) {
  main().catch(err => console.error(err));
} else {
  worker().catch(err => console.error(err));
}
