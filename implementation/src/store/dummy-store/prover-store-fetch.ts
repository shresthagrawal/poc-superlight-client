import { handleHTTPSRequest, getRandomInt } from '../../utils.js';
import { ResourceURL } from './types.js';
import { DummyStoreProver } from './prover-store.js';
import { getChainInfoSSZ } from './ssz.js';

export class DummyStoreFetchProver extends DummyStoreProver {
  constructor(
    protected resourceURL: ResourceURL,
    protected honest: boolean = true,
    protected maxChainSize: number = 100,
    protected committeeSize: number = 10,
    protected seed: string = 'seedme',
  ) {
    super(honest, maxChainSize, committeeSize, seed);
  }

  async init() {
    const ssz = getChainInfoSSZ(this.maxChainSize, this.committeeSize);
    const { data } = await handleHTTPSRequest(
      'GET',
      this.resourceURL.honest,
      true,
    );
    this.honestCommitteeChain = ssz.deserialize(data as Buffer);
    if (!this.honest) {
      const { data } = await handleHTTPSRequest(
        'GET',
        this.resourceURL.dishonest!,
        true,
      );
      this.dishonestCommitteeChain = ssz.deserialize(data as Buffer);

      this.dishonestyIndex = getRandomInt(this.maxChainSize);
      console.log(`Dishonesty index ${this.dishonestyIndex}`);
    }
    console.log('ChainInfo fetched!');
  }
}
