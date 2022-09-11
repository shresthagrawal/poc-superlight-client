import { Worker, isMainThread, workerData, parentPort } from 'worker_threads';
import * as fs from 'fs';
import * as path from 'path';
import { generateChain } from './utils.js';
import { getChainInfoSSZ } from './ssz.js';

const seed = 'seedme';
const maxChainSize = 365 * 30;
const committeeSize = 512;
const count = 8;

const ssz = getChainInfoSSZ(maxChainSize, committeeSize);

async function worker(i: number) {
  const chainInfo = generateChain(seed + i, maxChainSize, committeeSize);
  const chainInfoRaw = ssz.serialize(chainInfo);
  const resultPath = path.join(
    __dirname,
    `../../../../src/store/data/dummy-chain-${maxChainSize}-${seed + i}`,
  );
  fs.writeFileSync(resultPath, chainInfoRaw, { flag: 'w' });
  parentPort!.postMessage(true);
}

async function main() {
  const workerPromises = Array(count)
    .fill(null)
    .map(
      (_, i) =>
        new Promise<void>((resolve, reject) => {
          const worker = new Worker(__filename, { workerData: i });
          worker.on('message', () => {
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

if (isMainThread) {
  main().catch(err => console.error(err));
} else {
  worker(workerData).catch(err => console.error(err));
}
