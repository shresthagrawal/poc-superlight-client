// This benchmark is similar to two-prover-dummy-data-server
// other than this benchmark tests the clients with different
// batch size for sync updates downloaded.
// Note: the batch size for superlight client is the degree of
// the MMR, also referred to n in the code.

import { init } from '@chainsafe/bls';
import { DummyStoreVerifier } from '../src/store/dummy-store';
import { ProverClient } from '../src/prover/prover-client';
import { Prover } from '../src/prover/prover';
import { SuperlightClient } from '../src/client/superlight-client';
import { LightClient } from '../src/client/light-client';
import { Benchmark } from '../src/benchmark';

// Before running this script two prover servers must be started
// On port 3678 a dishonest node
// On port 3679 a honest node
const proverUrls = [
  'http://localhost:3678', // dishonest
  'http://localhost:3679', // honest
];

// tree degrees / batch sizes
const n = [20, 40, 60, 80, 100];
const chainSizes = [20, 40, 60, 80, 100];

const committeeSize = 10;

async function main() {
  await init('blst-native');

  const lightClientResults = [];
  const superlightClientResults = [];

  for(let chainSize of chainSizes) {
    const dummyStoreVerifier = new DummyStoreVerifier(chainSize, committeeSize);

    const benchmarkSL = new Benchmark();
    const beaconProversSL = proverUrls.map(
      url => new ProverClient(dummyStoreVerifier, url, benchmarkSL),
    );

    const benchmarkL = new Benchmark();
    const beaconProversL = proverUrls.map(
      url => new ProverClient(dummyStoreVerifier, url, benchmarkL),
    );

    for (let _n of n) {
      // only benchmark of the _n is less than equal to chainSize
      if(_n > chainSize)
        continue;

      // Superlight Client
      await Promise.all(beaconProversSL.map(p => p.setConfig(chainSize, _n)));

      const superLightClient = new SuperlightClient(
        dummyStoreVerifier,
        beaconProversSL,
        _n,
      );
      benchmarkSL.startBenchmark();
      const resultSL = await superLightClient.sync();
      const resultSLBenchmark = benchmarkSL.stopBenchmark();
      console.log(
        `\nSuperlighClient found [${resultSL.map(
          r => r.index,
        )}] as honest provers`,
      );
      superlightClientResults.push({
        ...resultSLBenchmark,
        chainSize,
        treeDegree: _n
      });

      // Light Client
      const lightClient = new LightClient(dummyStoreVerifier, beaconProversL, _n);

      benchmarkL.startBenchmark();
      const resultL = await lightClient.sync();
      const resultLBenchmark = benchmarkL.stopBenchmark();
      console.log(
        `\nLightclient found ${resultL.index} as the first honest prover`,
      );
      lightClientResults.push({
        ...resultLBenchmark,
        chainSize,
        batchSize: _n
      });
    }
  }

  console.log(
    `ChainSize: ${superlightClientResults.map(r => r.chainSize)}`,
  );
  console.log(
    `n: ${superlightClientResults.map(r => r.treeDegree)}\n`,
  );

  console.log('Superlight Client');
  console.log(
    `TimeToSync: ${superlightClientResults.map(r => r.timeToSync)} ms`,
  );
  console.log(
    `BytesDownloaded: ${superlightClientResults.map(
      r => r.bytesDownloaded,
    )} bytes`,
  );
  console.log(
    `Interactions: ${superlightClientResults.map(r => r.interactions)}\n`,
  );

  console.log('Light Client');
  console.log(`TimeToSync: ${lightClientResults.map(r => r.timeToSync)} ms`);
  console.log(
    `BytesDownloaded: ${lightClientResults.map(r => r.bytesDownloaded)} bytes`,
  );
  console.log(`Interactions: ${lightClientResults.map(r => r.interactions)}\n`);
}

main().catch(err => console.error(err));
