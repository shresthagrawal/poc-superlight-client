import * as express from 'express';
import { init } from '@chainsafe/bls';
import { BeaconStoreProver } from '../store/beacon-store';
import { DummyStoreProver } from '../store/dummy-store';
import { ISyncStoreProver } from '../store/isync-store';
import { Prover } from './prover';
import { fromHexString, toHexString } from '@chainsafe/ssz';

const isHonest = process.env.HONEST !== 'false';
const isDummy = process.env.DUMMY === 'true';
const seed = process.env.seed || 'seedme';
const chainSize = parseInt(process.env.CHAIN_SIZE || '100');
const committeeSize = parseInt(process.env.COMMITTEE_SIZE || '10');

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
    setImmediate(() => {
      this.store = isDummy
        ? new DummyStoreProver(isHonest, chainSize, committeeSize, seed)
        : new BeaconStoreProver(isHonest);
      this.prover = new Prover(this.store);
      this.initCompleted = true;
    })
  }

  getProver() {
    if(!this.prover)
      throw new Error('prover not initialized');
    return this.prover as Prover<any>;
  }

  getStore() {
    if(!this.store)
      throw new Error('store not initialized');
    return this.store as ISyncStoreProver<any>;
  }
}

export default async function getApp() {
  const app = express();
  const ps =  new ProverSetup();
  ps.init();

  app.get('/sync-committee/mmr/leaf/:period', function (req, res) {
    if(!ps.initCompleted)
      return res.status(400).json({ error: 'Prover not initialised' });
    const prover = ps.getProver();
    const period =
      req.params.period === 'latest' ? 'latest' : parseInt(req.params.period);
    const { syncCommittee, rootHash, proof } = prover.getLeafWithProof(period);
    return res.json({
      syncCommittee: syncCommittee.map(s => toHexString(s)),
      rootHash: toHexString(rootHash),
      proof: proof.map(l => l.map(p => toHexString(p))),
    });
  });

  app.get('/sync-committee/mmr', function (req, res) {
    if(!ps.initCompleted)
      return res.status(400).json({ error: 'Prover not initialised' });
    const prover = ps.getProver();
    const { rootHash, peaks } = prover.getMMRInfo();
    return res.json({
      rootHash: toHexString(rootHash),
      peaks: peaks.map(p => ({
        rootHash: toHexString(p.rootHash),
        size: p.size,
      })),
    });
  });

  app.get('/sync-committee/mmr/:treeRoot/node/:nodeHash', function (req, res) {
    if(!ps.initCompleted)
      return res.status(400).json({ error: 'Prover not initialised' });
    const prover = ps.getProver();
    const treeRoot = fromHexString(req.params.treeRoot);
    const nodeHash = fromHexString(req.params.nodeHash);
    const { isLeaf, children } = prover.getNode(treeRoot, nodeHash);
    return res.json({
      isLeaf,
      children: children && children.map(c => toHexString(c)),
    });
  });

  app.get('/sync-update/:period', function (req, res) {
    if(!ps.initCompleted)
      return res.status(400).json({ error: 'Prover not initialised' });
    const prover = ps.getProver();
    const store = ps.getStore();
    const period =
      req.params.period === 'latest' ? 'latest' : parseInt(req.params.period);
    const nextCommittee = req.query.nextCommittee == 'true';
    if (period === 'latest')
      return res.status(400).json({ error: 'Invalid period recieved' });
    if (nextCommittee) {
      const { update, syncCommittee } =
        prover.getSyncUpdateWithNextCommittee(period);
      return res.json({
        update: store.updateToJson(update),
        syncCommittee: syncCommittee.map(c => toHexString(c)),
      });
    } else {
      const update = prover.getSyncUpdate(period);
      return res.json(store.updateToJson(update));
    }
  });

  app.get('/sync-updates', function (req, res) {
    if(!ps.initCompleted)
      return res.status(400).json({ error: 'Prover not initialised' });
    const prover = ps.getProver();
    const store = ps.getStore();
    if (!req.query.startPeriod || !req.query.maxCount)
      return res.status(400).json({ error: 'startPeriod or maxCount not provided' });
    const startPeriod = parseInt(req.query.startPeriod as string);
    const maxCount = parseInt(req.query.maxCount as string);
    const updatesAndCommittees =
        prover.getSyncUpdatesWithNextCommittees(startPeriod, maxCount);
    return updatesAndCommittees.map(u => res.json({
      update: store.updateToJson(u.update),
      syncCommittee: u.syncCommittee.map(c => toHexString(c)),
    }));
  });

  return app;
}
