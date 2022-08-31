// This is a simple proxy for PRC and BlockExplorer to check which 
// check requests are made by metamask 
import * as dotenv from 'dotenv';
dotenv.config();

import * as fs from 'fs';
import * as path from 'path';
import express from 'express';
import bodyParser from 'body-parser';
import proxy from 'express-http-proxy'; 

const RPC_URL = process.env.RPC_URL || '';
const BLOCK_EXPLORER_URL = process.env.BLOCK_EXPLORER_URL || '';
const RPCCalls: any[] = [];
const RPCOut = '../../tests/testRPCCalls.json';
const absRPCOut = path.join(__dirname, RPCOut);

function getApp() {
  const requests: {[method: string]: number} = {};
  const app = express();
  app.use(bodyParser.json());
  app.use('/rpc', proxy(RPC_URL, {
    userResDecorator: (proxyRes, proxyResData, userReq) => {
      // console.log(userReq.body);
      const key = `rpc_${userReq.body.method}`;
      if(!(key in requests))
        requests[key] = 0;
      requests[key] += 1;
      // console.log(JSON.stringify(userReq.body.params), '0x' + proxyResData.toString('hex'));
      console.log(userReq.body.params);
      RPCCalls.push(userReq.body);
      fs.writeFileSync(
        absRPCOut,
        JSON.stringify(RPCCalls, null, 2),
      );
      return proxyResData;
    }
  }));

  app.use('/explorer', proxy(BLOCK_EXPLORER_URL, {
    userResDecorator: (proxyRes, proxyResData, userReq) => {
      const key = `explorer_${userReq.originalUrl}`;
      if(!(key in requests))
        requests[key] = 0;
      requests[key] += 1;
      console.log(requests);
      return proxyResData;
    }
  }));

  return app;
}

function main() {
  const app = getApp();
  app.listen(80);
}

main();