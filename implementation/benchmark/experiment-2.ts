import * as fs from 'fs';
import * as path from 'path';
import { getProverUrls, benchmarkSuperlight } from './utils';

// This config should match the prover config
const proverCount = 8;
const committeeSize = 512;
const trials = 5;
const herokuAppRandomID = 'chocolate';
const treeDegrees = [2, 5];
const chainSizes = [30, 15, 7.5, 7.5 / 2, 7.5 / 4].map(v =>
  Math.floor(365 * v),
);

const benchmarkOutput = `../../results/experiment-2.json`;
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
