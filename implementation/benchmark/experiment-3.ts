import * as fs from 'fs';
import * as path from 'path';
import { getProverUrls, benchmarkLight } from './utils.js';

// This config should match the prover config
const proverCount = 8;
const committeeSize = 512;
const trials = 5;
const herokuAppRandomID = 'chocolate';
const batchSizes = [20, 50, 100, 200, 500];
const chainSizes = [30, 20, 15, 10, 7.5, 7.5 / 2, 7.5 / 4].map(v =>
  Math.floor(365 * v),
);

const benchmarkOutput = `../../results/experiment-3.json`;
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
  for (let trial = 0; trial < trials; trial++) {
    for (let chainSize of chainSizes) {
      for (let batchSize of batchSizes) {
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
}

main().catch(err => console.error(err));
