// import { init } from '@chainsafe/bls';
import * as fs from 'fs';
import * as path from 'path';
import { DummyStoreVerifier } from '../src/store/dummy-store';
import { BeaconStoreVerifier } from '../src/store/beacon-store';
import { ProverClient } from '../src/prover/prover-client';
import { Prover } from '../src/prover/prover';
import { SuperlightClient } from '../src/client/superlight-client';
import { LightClient } from '../src/client/light-client';
import { OptimisticLightClient } from '../src/client/optimistic-light-client';
import { Benchmark } from '../src/benchmark';
import { shuffle } from '../src/utils';

// This config should match the prover config
const proverCount = 8;
const committeeSize = 512;
const trial = 1;
const herokuAppRandomID = 'chocolate';
const treeDegrees = [
  2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000,
].reverse();
const batchSizes = [
  1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000,
].reverse();
const chainSizes = [30 * 365];

const benchmarkOutput = `../../results/slc-vs-olc.json`;
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

async function benchmarkSuperlight(chainSize: number, treeDegree: number) {
  const proverUrls = shuffle([HonestProverUrl, ...DishonestProverUrls]);
  const verifier = new DummyStoreVerifier(chainSize, committeeSize);

  const benchmarkSL = new Benchmark();
  const beaconProversSL = proverUrls.map(
    url => new ProverClient(verifier, url, benchmarkSL),
  );
  await Promise.all(
    beaconProversSL.map(p => p.setConfig(chainSize, treeDegree)),
  );

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
    chainSize,
    committeeSize,
    treeDegree,
    interactivityData: treeDegree * 32, // this is approzimate!!
  };
  console.log(result);
  return result;
}

async function benchmarkLight(
  chainSize: number,
  batchSize: number,
  optimistic: boolean = false,
) {
  const proverUrls = shuffle([HonestProverUrl, ...DishonestProverUrls]);
  const verifier = new DummyStoreVerifier(chainSize, committeeSize);

  const benchmarkL = new Benchmark();
  const beaconProversL = proverUrls.map(
    url => new ProverClient(verifier, url, benchmarkL),
  );
  await Promise.all(beaconProversL.map(p => p.setConfig(chainSize, 2)));

  const lightClient = new (optimistic ? OptimisticLightClient : LightClient)(
    verifier,
    beaconProversL,
    batchSize,
  );

  benchmarkL.startBenchmark();
  const resultL = await lightClient.sync();
  const resultLBenchmark = benchmarkL.stopBenchmark();

  const result = {
    type: optimistic ? 'optimisticlight' : 'light',
    trial,
    ...resultLBenchmark,
    proverCount: proverUrls.length,
    isDummy: true,
    chainSize,
    committeeSize,
    batchSize,
    interactivityData: batchSize * 24680, // this is approzimate!!
  };
  console.log(result);
  return result;
}

async function main() {
  // await init('blst-native');

  for (let chainSize of chainSizes) {
    for (let batchSize of batchSizes) {
      if (batchSize > chainSize) continue;
      const result = await benchmarkLight(chainSize, batchSize, true);
      benchmarks.push(result);
      fs.writeFileSync(absBenchmarkOutput, JSON.stringify(benchmarks, null, 2));
    }
  }

  for (let chainSize of chainSizes) {
    for (let treeDegree of treeDegrees) {
      if (treeDegree > chainSize) continue;
      const result = await benchmarkSuperlight(chainSize, treeDegree);
      benchmarks.push(result);
      fs.writeFileSync(absBenchmarkOutput, JSON.stringify(benchmarks, null, 2));
    }
  }

  // for (let chainSize of chainSizes) {
  //   for (let batchSize of batchSizes) {
  //     if (batchSize > chainSize) continue;
  //     const result = await benchmarkLight(chainSize, batchSize);
  //     benchmarks.push(result);
  //     fs.writeFileSync(absBenchmarkOutput, JSON.stringify(benchmarks, null, 2));
  //   }
  // }
}

main().catch(err => console.error(err));
