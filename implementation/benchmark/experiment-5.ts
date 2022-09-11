import { init } from '@chainsafe/bls';
import * as fs from 'fs';
import * as path from 'path';
import { getProverUrls, benchmarkLight, benchmarkSuperlight } from './utils';

// This config should match the prover config
const proverCount = 8;
const committeeSize = 512;
const trials = 1;
const herokuAppRandomID = 'chocolate';
const treeDegrees = [20000];
const batchSizesOLC = [20000];
const chainSizes = [10].map(v => Math.floor(v * 365));

const benchmarkOutput = `../../results/experiment-5.json`;
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
      for (let batchSize of batchSizesOLC) {
        const _batchSize = batchSize < chainSize ? batchSize : chainSize;
        const result = await benchmarkLight(
          chainSize,
          _batchSize,
          trial,
          chainConfig,
          true,
        );
        benchmarks.push(result);
        fs.writeFileSync(
          absBenchmarkOutput,
          JSON.stringify(benchmarks, null, 2),
        );
        if (batchSize > chainSize) break;
      }

      for (let treeDegree of treeDegrees) {
        const _treeDegree = treeDegree < chainSize ? treeDegree : chainSize;
        const result = await benchmarkSuperlight(
          chainSize,
          _treeDegree,
          trial,
          chainConfig,
        );
        benchmarks.push(result);
        fs.writeFileSync(
          absBenchmarkOutput,
          JSON.stringify(benchmarks, null, 2),
        );
        if (treeDegree > chainSize) break;
      }
    }
  }
}

main().catch(err => console.error(err));
