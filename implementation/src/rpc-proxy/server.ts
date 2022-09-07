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
import { RPCTx } from './types';
import { INTERNAL_ERROR } from './constants';

const RPC_URL = process.env.RPC_URL || '';

async function getApp() {
    const server = new JSONRPCServer();
    const app = express();
    // TODO: use a light/super client to sync and get the latest blockHeader
    const web3 = new Web3(RPC_URL);
    const block = await web3.eth.getBlock("latest");

    const provider = new VerifiedProvider(RPC_URL, block.number, block.hash);

    server.addMethod('eth_getBalance', async ([address, blockNumber]: [string, string]) => {
        return await provider.getBalance(address, blockNumber);
    });

    server.addMethod('eth_blockNumber', async () => {
        return await provider.blockNumber();
    });

    server.addMethod('eth_chainId', async () => {
        return await provider.chainId();
    });

    server.addMethod('eth_getTransactionCount', async ([address, blockNumber]: [string, string]) => {
        return await provider.getTransactionCount(address, blockNumber);
    });

    server.addMethod('eth_getCode', async ([address, blockNumber]: [string, string]) => {
        return await provider.getCode(address, blockNumber);
    });

    server.addMethod('eth_getBlockByNumber', async ([blockNumber, includeTx]: [string, boolean]) => {
        return await provider.getBlockByNumber(blockNumber, includeTx);
    });

    server.addMethod('eth_getBlockByHash', async ([blockHash, includeTx]: [string, boolean]) => {
        return await provider.getBlockByHash(blockHash, includeTx);
    });

    server.addMethod('eth_call', async ([tx, blockNumber]: [RPCTx, string]) => {
        return await provider.call(tx, blockNumber);
    });

    server.addMethod('eth_estimateGas', async ([tx, blockNumber]: [RPCTx, string]) => {
        return await provider.estimateGas(tx, blockNumber);
    });

    server.addMethod('eth_sendRawTransaction', async ([tx]: [string]) => {
        return await provider.sendRawTransaction(tx);
    });

    const exceptionMiddleware: JSONRPCServerMiddleware<void> = async (next, request, serverParams) => {
        try {
            return await next(request, serverParams);
        } catch (error) {
            console.log(error);
            if(error.code) {
                return error;
            } else {
                return {
                    message: error.message,
                    code: INTERNAL_ERROR
                };
            }
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
