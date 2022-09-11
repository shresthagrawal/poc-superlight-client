import axios from 'axios';
import { altair } from '@lodestar/types';
import { SuperlightClient } from '../client/superlight-client.js';
import { BeaconStoreVerifier } from '../store/beacon-store.js';
import { ProverClient } from '../prover/prover-client.js';
import { Benchmark } from '../benchmark.js';
import { Bytes32 } from './types.js';

export class ClientManager {
  // TODO: make it generic to any client
  client: SuperlightClient<altair.LightClientUpdate>;
  store: BeaconStoreVerifier;
  provers: ProverClient<altair.LightClientUpdate>[];

  constructor(
    proverURLs: string[],
    protected beaconChainAPIURL: string,
    n: number = 2,
  ) {
    // TODO: fix the genesis data and current period
    this.store = new BeaconStoreVerifier();
    const benchmark = new Benchmark();
    this.provers = proverURLs.map(url => new ProverClient(this.store, url, benchmark));
    this.client = new SuperlightClient(this.store, this.provers, n);
  }

  async syncWithExecutionInfo(): Promise<{ blockhash: string, blockNumber: bigint}> {
    // all honest provers have the same latest committee
    const honestProverInfos = await this.client.sync();
    const period = await this.store.getCurrentPeriod();

    for(const proverInfo of honestProverInfos) {
      const update = await this.provers[proverInfo.index].getSyncUpdate(period, 1);
    }

    throw new Error('nothing');
  }

  // https://lodestar-goerli.chainsafe.io/eth/v1/beacon/light_client/optimistic_update/
  // https://lodestar-goerli.chainsafe.io/eth/v2/beacon/blocks/3848988
  async getConcensusBlock(slot: bigint, blockRoot: Bytes32) {
    const res = await axios.get(
      `${this.beaconChainAPIURL}/eth/v2/beacon/blocks/${slot}`
    );
    console.log(res.data.message);
    // console.log(bellatrix);
    // const block = bellatrix.BeaconBlockBody.fromJson(res.data.message);
    // console.log(block.hash());

    // const 
  }

}
