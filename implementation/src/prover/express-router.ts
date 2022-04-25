import * as express from 'express';
import { BeaconChainStoreProver } from '../store/beacon-store';
import { SuperlightSync } from './superlight-sync';
import { fromHexString, toHexString } from '@chainsafe/ssz';

const defaultStore = new BeaconChainStoreProver();
const superlighSync = new SuperlightSync(defaultStore);

export default function getApp() {
  const app = express();

  app.get('/', function (req, res) {
    return res.json({ success: true });
  });

  return app;
}
