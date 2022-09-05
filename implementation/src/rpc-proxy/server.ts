import Web3 from 'web3';
import * as dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import bodyParser from 'body-parser';
import {
    JSONRPCServer,
    createJSONRPCErrorResponse,
    JSONRPCServerMiddleware
} from 'json-rpc-2.0';
import { VerifiedProvider } from './verifiedProvider';

const RPC_URL = process.env.RPC_URL || '';

async function getApp() {
    const server = new JSONRPCServer();
    const app = express();
    // TODO: REMOVE
    const web3 = new Web3(RPC_URL);
    const block = await web3.eth.getBlock("latest");
    // TODO: fix the blockNumber and blockHash
    const provider = new VerifiedProvider(RPC_URL, block.number, block.hash);

    server.addMethod('eth_getBalance', async ([address, blockNumber]: [string, string]) => {
        return await provider.getBalance(address, blockNumber);
    });

    server.addMethod('eth_blockNumber', async () => {
        return await provider.getBlockNumber();
    });

    server.addMethod('eth_chainId', async () => {
        return await provider.getChainId();
    });

    server.addMethod('eth_getTransactionCount', async ([address, blockNumber]: [string, string]) => {
        return await provider.getTransactionCount(address, blockNumber);
    });

    const exceptionMiddleware: JSONRPCServerMiddleware<void> = async (next, request, serverParams) => {
        try {
            return await next(request, serverParams);
        } catch (error) {
            console.log(error);
            throw error;
        }
    };

    server.applyMiddleware(exceptionMiddleware);

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

async function main() {
    const app = await getApp();
    app.listen(80);
}

main();
