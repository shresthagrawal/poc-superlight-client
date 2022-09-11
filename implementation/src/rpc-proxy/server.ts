import * as dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import axios from 'axios';
import bodyParser from 'body-parser';
import {
  JSONRPCServer,
  createJSONRPCErrorResponse,
  JSONRPCServerMiddleware,
} from 'json-rpc-2.0';
import Web3 from 'web3';
import { ClientManager } from './client-manager';
import { VerifiedProvider } from './verified-provider';
import { RPCTx } from './types';
import { INTERNAL_ERROR } from './constants';

const RPC_URL = process.env.RPC_URL || '';
const BEACON_CHAIN_API_URL = process.env.BEACON_CHAIN_API_URL || '';

async function getApp() {
  const server = new JSONRPCServer();
  const app = express();
  // TODO: use a light/super client to sync and get the latest blockHeader
  const cm = new ClientManager([], BEACON_CHAIN_API_URL);
  console.log(await cm.getConcensusBlock(BigInt(3854999), "0x2a23f5d7c89dac223cc3a86b363f3a25a682de847a93686d11b751f5d6d3f26e"));

  const web3 = new Web3(RPC_URL);
  const block = await web3.eth.getBlock('latest');
  const chainId = await web3.eth.getChainId();

  const provider = new VerifiedProvider(RPC_URL, block.number, block.hash, chainId);

  server.addMethod(
    'eth_getBalance',
    async ([address, blockNumber]: [string, string]) => {
      return await provider.getBalance(address, blockNumber);
    },
  );

  server.addMethod('eth_blockNumber', () => {
    return provider.blockNumber();
  });

  server.addMethod('eth_chainId', () => {
    return provider.chainId();
  });

  server.addMethod(
    'eth_getTransactionCount',
    async ([address, blockNumber]: [string, string]) => {
      return await provider.getTransactionCount(address, blockNumber);
    },
  );

  server.addMethod(
    'eth_getCode',
    async ([address, blockNumber]: [string, string]) => {
      return await provider.getCode(address, blockNumber);
    },
  );

  server.addMethod(
    'eth_getBlockByNumber',
    async ([blockNumber, includeTx]: [string, boolean]) => {
      return await provider.getBlockByNumber(blockNumber, includeTx);
    },
  );

  server.addMethod(
    'eth_getBlockByHash',
    async ([blockHash, includeTx]: [string, boolean]) => {
      return await provider.getBlockByHash(blockHash, includeTx);
    },
  );

  server.addMethod('eth_call', async ([tx, blockNumber]: [RPCTx, string]) => {
    return await provider.call(tx, blockNumber);
  });

  server.addMethod(
    'eth_estimateGas',
    async ([tx, blockNumber]: [RPCTx, string]) => {
      return await provider.estimateGas(tx, blockNumber);
    },
  );

  server.addMethod('eth_sendRawTransaction', async ([tx]: [string]) => {
    return await provider.sendRawTransaction(tx);
  });

  server.addMethod('net_version', async () => {
    return BigInt(provider.chainId()).toString();
  });

  const exceptionMiddleware: JSONRPCServerMiddleware<void> = async (
    next,
    request,
    serverParams,
  ) => {
    try {
      console.log(`RPC Request ${request.method}`);
      return await next(request, serverParams);
    } catch (error) {
      console.log(error);
      if (error.code) {
        return error;
      } else {
        return {
          message: error.message,
          code: INTERNAL_ERROR,
        };
      }
    }
  };

  server.applyMiddleware(exceptionMiddleware);

  app.use(bodyParser.json());
  app.post('/', async (req, res) => {
    const jsonRPCRequest = req.body;
    server.receive(jsonRPCRequest).then(jsonRPCResponse => {
      if (jsonRPCResponse) {
        console.log(jsonRPCResponse);
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
