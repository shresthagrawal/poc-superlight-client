import axios from 'axios';
import { altair } from '@lodestar/types';
import * as bellatrix from '@lodestar/types/bellatrix';
import { toHexString } from '@chainsafe/ssz';
import { SuperlightClient } from '../client/superlight-client.js';
import { BeaconStoreVerifier } from '../store/beacon-store.js';
import { ProverClient } from '../prover/prover-client.js';
import { Benchmark } from '../benchmark.js';
import { Bytes32, ExecutionInfo } from './types.js';
import { VerifiedProvider } from './verified-provider.js';

export class ClientManager {
  // TODO: make it generic to any client
  client: SuperlightClient<altair.LightClientUpdate>;
  store: BeaconStoreVerifier;
  provers: ProverClient<altair.LightClientUpdate>[];
  provider: VerifiedProvider | null = null;

  constructor(
    proverURLs: string[],
    protected beaconChainAPIURL: string,
    protected providerURL: string,
    protected chainId: number,
    n: number = 2,
  ) {
    // TODO: fix the genesis data and current period
    this.store = new BeaconStoreVerifier();
    const benchmark = new Benchmark();
    this.provers = proverURLs.map(
      url => new ProverClient(this.store, url, benchmark),
    );
    this.client = new SuperlightClient(this.store, this.provers, n);
  }

  async sync(): Promise<VerifiedProvider> {
    // all honest provers have the same latest committee
    // const honestProverInfos = await this.client.sync();
    // const period = await this.store.getCurrentPeriod();

    // for (const proverInfo of honestProverInfos) {
    //   const update = await this.provers[proverInfo.index].getSyncUpdate(
    //     period,
    //     1,
    //   );
    // }
    // TODO: get the latest sync committee

    const res = await axios.get(`${this.beaconChainAPIURL}/eth/v1/beacon/light_client/optimistic_update/`);
    const updateJSON = res.data.data;
    // TODO: check the update agains the latest sync commttee

    const { blockhash, blockNumber } = await this.getConcensusBlock(updateJSON.attested_header.slot, updateJSON.attested_header.body_root);
    this.provider = new VerifiedProvider(this.providerURL, blockNumber, blockhash, this.chainId);
    return this.provider;
  }

  async getConcensusBlock(slot: bigint, expectedBlockRoot: Bytes32): Promise<ExecutionInfo> {
    const res = await axios.get(
      `${this.beaconChainAPIURL}/eth/v2/beacon/blocks/${slot}`,
    );
    const blockJSON = res.data.data.message.body;
    const block = bellatrix.ssz.BeaconBlockBody.fromJson(blockJSON);
    const blockRoot = toHexString(bellatrix.ssz.BeaconBlockBody.hashTreeRoot(block));
    if(blockRoot !== expectedBlockRoot) {
      throw Error(`block provided by the beacon chain api doesn't match the expected block root`);
    }

    return {
      blockhash: blockJSON.execution_payload.block_hash,
      blockNumber: blockJSON.execution_payload.block_number
    }
  }
}
