import * as express from 'express';
import { init } from '@chainsafe/bls';
import { BeaconStoreProver } from '../store/beacon-store';
import { DummyStoreProver } from '../store/dummy-store';
import { Prover } from './prover';
import { fromHexString, toHexString } from '@chainsafe/ssz';

const isHonest = process.env.HONEST !== 'false';
const isDummy = process.env.DUMMY === 'true';
const seed = process.env.seed || 'seedme';
const chainSize = parseInt(process.env.CHAIN_SIZE || '100');
const committeeSize = parseInt(process.env.COMMITTEE_SIZE || '10');

export default async function getApp() {
  await init('blst-native');
  const store = isDummy
    ? new DummyStoreProver(isHonest, chainSize, committeeSize, seed)
    : new BeaconStoreProver(isHonest);
  const prover = new Prover(store);
  const app = express();

  app.get('/sync-committee/mmr/leaf/:period', function (req, res) {
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
    const treeRoot = fromHexString(req.params.treeRoot);
    const nodeHash = fromHexString(req.params.nodeHash);
    const { isLeaf, children } = prover.getNode(treeRoot, nodeHash);
    return res.json({
      isLeaf,
      children: children && children.map(c => toHexString(c)),
    });
  });

  app.get('/sync-update/:period', function (req, res) {
    const period =
      req.params.period === 'latest' ? 'latest' : parseInt(req.params.period);
    const nextCommittee = req.query.nextCommittee == 'true';
    if (nextCommittee) {
      if (period === 'latest')
        return res.status(400).json({ error: 'Invalid period recieved' });
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

  return app;
}
