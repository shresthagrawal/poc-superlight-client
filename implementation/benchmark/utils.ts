import { DummyStoreVerifier } from '../src/store/dummy-store';
import { ProverClient } from '../src/prover/prover-client';
import { Prover } from '../src/prover/prover';
import { SuperlightClient } from '../src/client/superlight-client';
import { LightClient } from '../src/client/light-client';
import { OptimisticLightClient } from '../src/client/optimistic-light-client';
import { Benchmark } from '../src/benchmark';
import { shuffle } from '../src/utils';

export type ChainConfig = {
  honestProverUrl: string;
  dishonestProverUrls: string[];
  committeeSize: number;
  proverCount: number;
};

export async function benchmarkSuperlight(
  chainSize: number,
  treeDegree: number,
  trial: number,
  chainConfig: ChainConfig,
) {
  const proverUrls = shuffle([
    chainConfig.honestProverUrl,
    ...chainConfig.dishonestProverUrls,
  ]);
  const verifier = new DummyStoreVerifier(chainSize, chainConfig.committeeSize);

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
    proverCount: proverUrls.length,
    isDummy: true,
    chainSize,
    committeeSize: chainConfig.committeeSize,
    treeDegree,
    interactivityData: treeDegree * 32, // this is approzimate!!
  };
  console.log(result);
  return result;
}

export async function benchmarkLight(
  chainSize: number,
  batchSize: number,
  trial: number,
  chainConfig: ChainConfig,
  optimistic: boolean = false,
) {
  const proverUrls = shuffle([
    chainConfig.honestProverUrl,
    ...chainConfig.dishonestProverUrls,
  ]);
  const verifier = new DummyStoreVerifier(chainSize, chainConfig.committeeSize);

  const benchmarkL = new Benchmark();
  const beaconProversL = proverUrls.map(
    url => new ProverClient(verifier, url, benchmarkL),
  );
  await Promise.all(beaconProversL.map(p => p.setConfig(chainSize, 2)));

  const lightClient = new (optimistic ? OptimisticLightClient : LightClient)(
    verifier,
    beaconProversL,
    batchSize,
  );

  benchmarkL.startBenchmark();
  const resultL = await lightClient.sync();
  const resultLBenchmark = benchmarkL.stopBenchmark();

  const result = {
    type: optimistic ? 'optimisticlight' : 'light',
    trial,
    ...resultLBenchmark,
    proverCount: proverUrls.length,
    isDummy: true,
    chainSize,
    committeeSize: chainConfig.committeeSize,
    batchSize,
    interactivityData: batchSize * 24680, // this is approzimate!!
  };
  console.log(result);
  return result;
}

export function getProverUrls(
  herokuAppRandomID: string,
  dishonestProverCount: number,
) {
  const honestProverUrl = `https://${herokuAppRandomID}-honest-node-1.herokuapp.com`;
  const dishonestProverUrls = Array(dishonestProverCount)
    .fill(null)
    .map(
      (_, i) =>
        `https://${herokuAppRandomID}-dishonest-node-${i + 1}.herokuapp.com`,
    );
  return {
    honestProverUrl,
    dishonestProverUrls,
  };
}
