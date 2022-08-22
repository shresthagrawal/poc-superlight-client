import { init } from '@chainsafe/bls';
import * as fs from 'fs';
import * as path from 'path';
import { DummyStoreVerifier } from '../src/store/dummy-store';
import { BeaconStoreVerifier } from '../src/store/beacon-store';
import { ProverClient } from '../src/prover/prover-client';
import { Prover } from '../src/prover/prover';
import { SuperlightClient } from '../src/client/superlight-client';
import { Benchmark } from '../src/benchmark';
import { shuffle } from '../src/utils';

// This config should match the prover config
const proverCount = 8;
const committeeSize = 512;
const trial = 4;
const herokuAppRandomID = 'chocolate';
const treeDegrees = [
  2, 3, 5, 10, 25, 50, 75, 100, 150, 200, 300, 500, 1000, 2500, 3650, 5475,
  10950,
];
const chainSizes = [30, 15, 7.5, 7.5 / 2, 7.5 / 4].map(c =>
  Math.floor(c * 365),
);

const benchmarkOutput = `../../results/dummy-data-sl-chainsize.json`;
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

async function benchmarkSuperlight(
  chainSize: number,
  treeDegree: number,
  trialIndex: number,
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
    trial: trialIndex,
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

async function main() {
  await init('blst-native');

  for (let i = 0; i < trial; i++) {
    for (let chainSize of chainSizes) {
      for (let treeDegree of treeDegrees) {
        if (treeDegree > chainSize) continue;
        const result = await benchmarkSuperlight(chainSize, treeDegree, i);
        benchmarks.push(result);
        fs.writeFileSync(
          absBenchmarkOutput,
          JSON.stringify(benchmarks, null, 2),
        );
      }
    }
  }
}

main().catch(err => console.error(err));
