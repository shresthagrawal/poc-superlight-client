import { init } from '@chainsafe/bls';
import * as fs from 'fs';
import * as path from 'path';
import { getProverUrls, benchmarkLight, benchmarkSuperlight } from './utils';

// This config should match the prover config
const proverCount = 8;
const committeeSize = 512;
const trials = 5;
const herokuAppRandomID = 'chocolate';
const treeDegrees = [
  2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000,
].reverse();
const batchSizes = [
  10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000,
].reverse();
const chainSizes = [30 * 365];

const benchmarkOutput = `../../results/experiment-0.json`;
const absBenchmarkOutput = path.join(__dirname, benchmarkOutput);
let benchmarks: any[] = [];
if (fs.existsSync(absBenchmarkOutput)) benchmarks = require(benchmarkOutput);

const { honestProverUrl, dishonestProverUrls } = getProverUrls(
  herokuAppRandomID,
  proverCount - 1,
);

const chainConfig = {
  honestProverUrl,
  dishonestProverUrls,
  committeeSize,
  proverCount,
};

async function main() {
  await init('blst-native');

  for (let trial = 0; trial < trials; trial++) {
    for (let chainSize of chainSizes) {
      for (let batchSize of batchSizes) {
        if (batchSize > chainSize) continue;
        const result = await benchmarkLight(
          chainSize,
          batchSize,
          trial,
          chainConfig,
          true,
        );
        benchmarks.push(result);
        fs.writeFileSync(
          absBenchmarkOutput,
          JSON.stringify(benchmarks, null, 2),
        );
      }
    }

    for (let chainSize of chainSizes) {
      for (let treeDegree of treeDegrees) {
        if (treeDegree > chainSize) continue;
        const result = await benchmarkSuperlight(
          chainSize,
          treeDegree,
          trial,
          chainConfig,
        );
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
