import { init } from '@chainsafe/bls';
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
const size = 365 * 10;
const committeeSize = 512;
const trial = 1;
const herokuAppRandomID = 'chocolate';
const treeDegrees = [2, 3, 5, 10, 50, 75, 100, 200, 300, 400, 500, 750, 1000, 3650];
const batchSizes = [1, 2, 5, 10, 25, 50, 100, 250, 500];


const benchmarkOutput = `../../results/dummy-data-varying-n.json`;
const absBenchmarkOutput = path.join(__dirname, benchmarkOutput);
let benchmarks: any[] = [];
if (fs.existsSync(absBenchmarkOutput)) benchmarks = require(benchmarkOutput);

const HonestProverUrl = `https://${herokuAppRandomID}-honest-node-1.herokuapp.com`;
const DishonestProverUrls = Array(7)
  .fill(null)
  .map(
    (_, i) =>
      `https://${herokuAppRandomID}-dishonest-node-${i + 1}.herokuapp.com`,
  );

async function benchmarkSuperlight(treeDegree: number) {
  const proverUrls = shuffle([HonestProverUrl, ...DishonestProverUrls]);
  const verifier = new DummyStoreVerifier(size, committeeSize);

  const benchmarkSL = new Benchmark();
  const beaconProversSL = proverUrls.map(
    url => new ProverClient(verifier, url, benchmarkSL),
  );
  await Promise.all(beaconProversSL.map(p => p.setConfig(size, treeDegree)));
 
  const superLightClient = new SuperlightClient(
    verifier,
    beaconProversSL,
    treeDegree,
  );
  benchmarkSL.startBenchmark();
  const resultSL = await superLightClient.sync();
  const resultSLBenchmark = benchmarkSL.stopBenchmark();

  const result = {
    type: 'superlight',
    trial,
    ...resultSLBenchmark,
    proverCount,
    isDummy: true,
    chainSize: size,
    committeeSize,
    treeDegree,
    interactivityData: treeDegree * 32, // this is approzimate!!
  };
  console.log(result);
  return result;
}

async function benchmarkLight(batchSize: number) {
  const proverUrls = shuffle([HonestProverUrl, ...DishonestProverUrls]);
  const verifier = new DummyStoreVerifier(size, committeeSize);

  const benchmarkL = new Benchmark();
  const beaconProversL = proverUrls.map(
    url => new ProverClient(verifier, url, benchmarkL),
  );
  const lightClient = new LightClient(verifier, beaconProversL, batchSize);

  benchmarkL.startBenchmark();
  const resultL = await lightClient.sync();
  const resultLBenchmark = benchmarkL.stopBenchmark();
  
  const result = {
    type: 'light',
    trial,
    ...resultLBenchmark,
    proverCount: proverUrls.length,
    isDummy: true,
    chainSize: size,
    committeeSize,
    batchSize,
    interactivityData: batchSize * 24680, // this is approzimate!!
  };
  console.log(result);
  return result;
}

async function main() {
  await init('blst-native');
  for (let treeDegree of treeDegrees) {
    const result = await benchmarkSuperlight(treeDegree);
    benchmarks.push(result);
    fs.writeFileSync(
      absBenchmarkOutput,
      JSON.stringify(benchmarks, null, 2),
    );
  }

  for (let batchSize of batchSizes) {
    const result = await benchmarkLight(batchSize);
    benchmarks.push(result);
    fs.writeFileSync(
      absBenchmarkOutput,
      JSON.stringify(benchmarks, null, 2),
    );
  }
}

main().catch(err => console.error(err));
