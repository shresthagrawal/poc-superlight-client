import * as express from 'express';
import { init } from '@chainsafe/bls';
import { BeaconStoreProver } from '../store/beacon-store';
import { DummyStoreProver, DummyStoreFetchProver } from '../store/dummy-store';
import { ISyncStoreProver } from '../store/isync-store';
import { Prover } from './prover';
import { fromHexString } from '@chainsafe/ssz';
import {
  LeafWithProofSSZ,
  MMRInfoSSZ,
  NodeSSZ,
  LeafHashesSSZ,
  CommitteeSSZ,
} from './ssz-types';

const isHonest = process.env.HONEST !== 'false';
const isDummy = process.env.DUMMY === 'true';
const seed = process.env.seed || 'seedme';
const chainSize = parseInt(process.env.CHAIN_SIZE || '365');
const committeeSize = parseInt(process.env.COMMITTEE_SIZE || '10');
const treeDegree = parseInt(process.env.treeDegree || '2');
const honestResourceURL = process.env.HONEST_URL || '';
const dishonestResourceURL = process.env.DISHONEST_URL || '';
const fetchChainInfo = process.env.FETCH_CHAIN === 'true';

// This is a hack to make sure the server is setup first and
// the blocking operation of generating the dummy chain is
// done after the server is ready. This is required as the
// Heroku fails to deploy if the port is not binded in 60s.
class ProverSetup {
  initCompleted: boolean = false;
  prover: Prover<any> | null = null;
  store: ISyncStoreProver<any> | null = null;

  async init() {
    await init('blst-native');
    setImmediate(async () => {
      this.store = fetchChainInfo
        ? new DummyStoreFetchProver(
            { honest: honestResourceURL, dishonest: dishonestResourceURL },
            isHonest,
            chainSize,
            committeeSize,
            seed,
          )
        : isDummy
        ? new DummyStoreProver(isHonest, chainSize, committeeSize, seed)
        : new BeaconStoreProver(isHonest);
      if (this.store.init) await this.store.init();
      this.prover = new Prover(this.store, treeDegree);
      this.initCompleted = true;
    });
  }

  getProver() {
    if (!this.prover) throw new Error('prover not initialized');
    return this.prover as Prover<any>;
  }

  getStore() {
    if (!this.store) throw new Error('store not initialized');
    return this.store as ISyncStoreProver<any>;
  }
}

export default async function getApp() {
  const app = express();
  const ps = new ProverSetup();
  ps.init();

  app.get('/sync-committee/mmr/leaf/:period', function (req, res) {
    if (!ps.initCompleted)
      return res.status(400).json({ error: 'Prover not initialised' });
    const prover = ps.getProver();
    const period =
      req.params.period === 'latest' ? 'latest' : parseInt(req.params.period);
    const proof = req.query.proof === 'true';
    res.set('Content-Type', 'application/octet-stream');
    if (proof) {
      const leafWithProof = prover.getLeafWithProof(period);
      res.end(LeafWithProofSSZ.serialize(leafWithProof));
    } else {
      const leaf = prover.getLeaf(period);
      res.end(CommitteeSSZ.serialize(leaf));
    }
  });

  app.get('/sync-committee/mmr/leafHashes', function (req, res) {
    if (!ps.initCompleted)
      return res.status(400).json({ error: 'Prover not initialised' });
    const prover = ps.getProver();
    const startPeriod = parseInt(req.query.startPeriod as string);
    const maxCount = parseInt(req.query.maxCount as string);
    const leaves = prover.getLeafHashes(startPeriod, maxCount);
    res.set('Content-Type', 'application/octet-stream');
    res.end(LeafHashesSSZ.serialize(leaves));
  });

  app.get('/sync-committee/mmr', function (req, res) {
    if (!ps.initCompleted)
      return res.status(400).json({ error: 'Prover not initialised' });
    const prover = ps.getProver();
    const mmrInfo = prover.getMMRInfo();
    res.set('Content-Type', 'application/octet-stream');
    res.end(MMRInfoSSZ.serialize(mmrInfo));
  });

  app.get('/sync-committee/mmr/:treeRoot/node/:nodeHash', function (req, res) {
    if (!ps.initCompleted)
      return res.status(400).json({ error: 'Prover not initialised' });
    const prover = ps.getProver();
    const treeRoot = fromHexString(req.params.treeRoot);
    const nodeHash = fromHexString(req.params.nodeHash);
    const node = prover.getNode(treeRoot, nodeHash);
    res.set('Content-Type', 'application/octet-stream');
    res.end(
      NodeSSZ.serialize({
        isLeaf: node.isLeaf,
        children: node.children || [],
      }),
    );
  });

  app.get('/sync-updates', function (req, res) {
    if (!ps.initCompleted)
      return res.status(400).json({ error: 'Prover not initialised' });
    const prover = ps.getProver();
    const store = ps.getStore();
    if (!req.query.startPeriod || !req.query.maxCount)
      return res
        .status(400)
        .json({ error: 'startPeriod or maxCount not provided' });
    const startPeriod = parseInt(req.query.startPeriod as string);
    const maxCount = parseInt(req.query.maxCount as string);
    const updates = prover.getSyncUpdates(startPeriod, maxCount);
    const updatesBytes = store.updatesToBytes(updates, maxCount);
    res.set('Content-Type', 'application/octet-stream');
    res.end(updatesBytes);
  });

  app.post('/config', function (req, res) {
    if (!ps.initCompleted)
      return res.status(400).json({ error: 'Prover not initialised' });
    const prover = ps.getProver();
    const store = ps.getStore();
    if (!req.query.treeDegree || !req.query.chainSize)
      return res
        .status(400)
        .json({ error: 'treeDegree or chainSize not specified' });
    const _treeDegree = parseInt(req.query.treeDegree as string);
    const _chainSize = parseInt(req.query.chainSize as string);

    if (_treeDegree > _chainSize || _chainSize > chainSize)
      return res.status(400).json({ error: 'invalid treeDegree or chainSize' });

    prover.setConfig(_chainSize, _treeDegree);

    return res.json({
      success: true,
    });
  });

  return app;
}
