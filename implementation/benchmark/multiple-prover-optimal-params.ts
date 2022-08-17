import * as dotenv from 'dotenv';
dotenv.config();

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
const committeeSize = 512;
const trials = parseInt(process.env.TRIALS || '10');
const herokuAppRandomID = 'chocolate';
const treeDegree = parseInt(process.env.TREE_DEGREE || '2');
const batchSize = parseInt(process.env.BATCH_SIZE || '10');
const chainSize = parseInt(process.env.CHAIN_SIZE || '3650');
const isSuperlight = process.env.SUPERLIGHT === 'true';

const benchmarkOutput = `../../results/dummy-data-optimal-params.json`;
const absBenchmarkOutput = path.join(__dirname, benchmarkOutput);
let benchmarks: any[] = [];
if (fs.existsSync(absBenchmarkOutput)) benchmarks = require(benchmarkOutput);

const HonestProverUrl = `http://${herokuAppRandomID}-honest-node-1.herokuapp.com`;
const DishonestProverUrls = Array(7)
  .fill(null)
  .map(
    (_, i) =>
      `http://${herokuAppRandomID}-dishonest-node-${i + 1}.herokuapp.com`,
  );

async function benchmarkSuperlight(
  chainSize: number,
  treeDegree: number,
  trial: number,
) {
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
  trial: number,
) {
  const proverUrls = shuffle([HonestProverUrl, ...DishonestProverUrls]);
  const verifier = new DummyStoreVerifier(chainSize, committeeSize);

  const benchmarkL = new Benchmark();
  const beaconProversL = proverUrls.map(
    url => new ProverClient(verifier, url, benchmarkL),
  );
  await Promise.all(beaconProversL.map(p => p.setConfig(chainSize, 2)));

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
    chainSize,
    committeeSize,
    batchSize,
    interactivityData: batchSize * 24680, // this is approzimate!!
  };
  console.log(result);
  return result;
}

async function main() {
  await init('blst-native');

  for (let i = 0; i < trials; i++) {
    const result = isSuperlight
      ? await benchmarkSuperlight(chainSize, treeDegree, i)
      : await benchmarkLight(chainSize, batchSize, i);
    benchmarks.push(result);
    fs.writeFileSync(absBenchmarkOutput, JSON.stringify(benchmarks, null, 2));
  }
}

main().catch(err => console.error(err));
