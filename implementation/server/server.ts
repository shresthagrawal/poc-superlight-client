import * as express from 'express';
import { MainnetBeaconChainStore } from './sync-store'; 
import { SuperlightSync } from './superlight-sync'; 

const defaultStore = new MainnetBeaconChainStore();
const superlighSync = new SuperlightSync(defaultStore);

export default function getApp() {
  const app = express();

  app.get('/', function (req, res) {
    return res.json({"success": true});
  });

  return app;
}