import { init } from '@chainsafe/bls';
import * as fs from 'fs';
import * as path from 'path';
import { getProverUrls, benchmarkLight, benchmarkSuperlight } from './utils';

// This config should match the prover config
const proverCount = 8;
const committeeSize = 512;
const trials = 0;//5;
const herokuAppRandomID = 'chocolate';
const treeDegrees = [
  2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000,
];
const batchSizesOLC = [20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000];
const batchSizesLC = [5, 10, 20, 50, 100, 200, 500];
const chainSizesOLC = [10, 20, 30].map(v => Math.floor(v * 365));
const chainSizesSLC = [10, 20, 30].map(v => Math.floor(v * 365));
const chainSizesLC = [5, 10, 15].map(v => Math.floor(v * 365));

const benchmarkOutput = `../../results/experiment-1.json`;
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

  for (let chainSize of chainSizesLC) {
    for (let batchSize of batchSizesLC) {
      const _batchSize = batchSize < chainSize ? batchSize : chainSize;
      const result = await benchmarkLight(
        chainSize,
        _batchSize,
        0,
        chainConfig,
      );
      benchmarks.push(result);
      fs.writeFileSync(absBenchmarkOutput, JSON.stringify(benchmarks, null, 2));
      if (batchSize > chainSize) break;
    }
  }

  for (let trial = 0; trial < trials; trial++) {
    for (let chainSize of chainSizesOLC) {
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
    }
  }

  for (let trial = 0; trial < trials; trial++) {
    for (let chainSize of chainSizesSLC) {
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
