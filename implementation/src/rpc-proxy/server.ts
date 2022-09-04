import * as dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import bodyParser from 'body-parser';
import { JSONRPCServer } from 'json-rpc-2.0';
import { VerifiedProvider } from './verifiedProvider';

const RPC_URL = process.env.RPC_URL || '';

function getApp() {
    const server = new JSONRPCServer();
    const app = express();
    const provider = new VerifiedProvider(RPC_URL);
    provider.sync();

    server.addMethod('eth_getBalance', async ([address, blockNumber]: [string, string]) => {
        try {
            return await provider.getBalance(address, blockNumber);
        } catch(e) {
            console.error(e);
            return;
        }
    });

    app.use(bodyParser.json());
    app.post('/', (req, res) => {
      const jsonRPCRequest = req.body;
      server.receive(jsonRPCRequest).then((jsonRPCResponse) => {
        if (jsonRPCResponse) {
          res.json(jsonRPCResponse);
        } else {
          res.sendStatus(204);
        }
      });
    });

    return app;
}

function main() {
    const app = getApp();
    app.listen(80);
}

main();