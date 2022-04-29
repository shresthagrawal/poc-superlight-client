import * as express from 'express';
import { BeaconStoreProver } from '../store/beacon-store';
import { Prover } from './prover';
import { fromHexString, toHexString } from '@chainsafe/ssz';


export default function getApp() {
  const store = new BeaconStoreProver();
  const prover = new Prover(store);
  const app = express();

  app.get('/sync-committee/mmr/leaf/:period', function (req, res) {
    const period = req.params.period === 'latest' ? 'latest' : parseInt(req.params.period);
    const { syncCommittee, rootHash, proof } = prover.getLeafWithProof(period);
    return res.json({ 
      syncCommittee: syncCommittee.map(s => toHexString(s)),
      rootHash: toHexString(rootHash),
      proof: proof.map(l => l.map(p => toHexString(p)))
    });
  });

  app.get('/sync-committee/mmr', function (req, res) {
    const { rootHash, peaks } = prover.getMMRInfo();
    return res.json({ 
      rootHash: toHexString(rootHash),
      peaks: peaks.map(p => ({
        rootHash: toHexString(p.rootHash),
        size: p.size
      }))
    });
  });

  app.get('/sync-committee/mmr/:treeRoot/node/:nodeHash', function (req, res) {
    const treeRoot = fromHexString(req.params.treeRoot);
    const nodeHash = fromHexString(req.params.nodeHash);
    const { isLeaf, children } = prover.getNode(treeRoot, nodeHash);
    return res.json({ 
      isLeaf,
      children: children && children.map(c => toHexString(c))
    });
  });

  app.get('/sync-update/:period', function (req, res) {
    const period = req.params.period === 'latest' ? 'latest' : parseInt(req.params.period);
    const nextCommittee = req.query.nextCommittee == 'true';
    if(nextCommittee) {
      if (period === 'latest')
        return res.status(400).json({ error: 'Invalid period recieved'})
      const { update, syncCommittee } = prover.getSyncUpdateWithNextCommittee(period);
      return res.json({
        update: store.updateToJson(update),
        syncCommittee: syncCommittee.map(c => toHexString(c))
      })
    } else {
      const update = prover.getSyncUpdate(period);
      return res.json(store.updateToJson(update));
    }
  });

  return app;
}
