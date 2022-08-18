import * as dotenv from 'dotenv';
dotenv.config();

import { init } from '@chainsafe/bls';
import * as fs from 'fs';
import * as path from 'path';
// import { DummyStoreVerifier } from '../src/store/dummy-store';
// import { BeaconStoreVerifier } from '../src/store/beacon-store';
// import { ProverClient } from '../src/prover/prover-client';
// import { Prover } from '../src/prover/prover';
// import { SuperlightClient } from '../src/client/superlight-client';
// import { LightClient } from '../src/client/light-client';
// import { Benchmark } from '../src/benchmark';
// import { shuffle } from '../src/utils';
import { benchmarkSuperlight, benchmarkLight, getProverUrls } from './utils';

// This config should match the prover config
const proverCount = 8;
const committeeSize = 512;
const trials = parseInt(process.env.TRIALS || '10');
const herokuAppRandomID = 'chocolate';
const treeDegree = parseInt(process.env.TREE_DEGREE || '2');
const batchSize = parseInt(process.env.BATCH_SIZE || '10');
const chainSize = parseInt(process.env.CHAIN_SIZE || '3650');
const codeClient = process.env.CLIENTCODE ? process.env.CLIENTCODE : 'lc';

const benchmarkOutput = `../../results/dummy-data-optimal-params.json`;
const absBenchmarkOutput = path.join(__dirname, benchmarkOutput);
let benchmarks: any[] = [];
if (fs.existsSync(absBenchmarkOutput)) benchmarks = require(benchmarkOutput);

// const HonestProverUrl = `http://nipopows.com/popos/honest-node-1`;
// const DishonestProverUrls = Array(7)
//     .fill(null)
//     .map(
//         (_, i) =>
//             `http://nipopows.com/popos/dishonest-node-${i + 1}`,
//     );

// const HonestProverUrl = `http://${herokuAppRandomID}-honest-node-1.herokuapp.com`;
// const DishonestProverUrls = Array(7)
//     .fill(null)
//     .map(
//         (_, i) =>
//             `http://${herokuAppRandomID}-dishonest-node-${i + 1}.herokuapp.com`,
//     );

const { honestProverUrl, dishonestProverUrls } = getProverUrls(
    herokuAppRandomID,
    proverCount - 1,
);

const chainConfig = {
    honestProverUrl,
    dishonestProverUrls,
    committeeSize,
    proverCount
}

async function main() {
    await init('blst-native');

    for (let i = 0; i < trials; i++) {
        const result = codeClient == 'slc'
            ? await benchmarkSuperlight(chainSize, treeDegree, i, chainConfig)
            : codeClient == 'olc'
                ? await benchmarkLight(chainSize, batchSize, i, chainConfig, true)
                : await benchmarkLight(chainSize, batchSize, i, chainConfig);
        benchmarks.push(result);
        fs.writeFileSync(absBenchmarkOutput, JSON.stringify(benchmarks, null, 2));
    }
}

main().catch(err => console.error(err));
