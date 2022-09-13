// TODO: currently its just a demo script, make it a test
import * as dotenv from 'dotenv';
dotenv.config();

import Web3 from 'web3';
import { VerifiedProvider } from '../src/rpc-proxy/verified-provider.js';

const RPC_URL = process.env.RPC_URL || '';

const Tx = {
  to: '0xb27308f9f90d607463bb33ea1bebb41c27ce5ab6',
  gas: '0x1e8480',
  data: '0xcdca175300000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000005f5e10000000000000000000000000000000000000000000000000000000000000000422260fac5e5542a773aa44fbcfedf7c193bc2c5990001f4a0b86991c6218b36c1d19d4a2e9eb0ce3606eb48000bb8c944e90c64b2c07662a292be6244bdf05cda44a7000000000000000000000000000000000000000000000000000000000000',
};

async function main() {
  const web3 = new Web3(RPC_URL);
  const currentblockNumber = await web3.eth.getBlockNumber();
  const block = await web3.eth.getBlock(currentblockNumber);
  const provider = new VerifiedProvider(
    RPC_URL,
    currentblockNumber,
    block.hash,
  );
  const blockNumber = currentblockNumber - 5; // to test the rolling back feature
  try {
    console.time('TruestedProvider Time');
    const expectedRes = await web3.eth.call(Tx, blockNumber);
    console.timeEnd('TruestedProvider Time');
    console.time('VerifiedProvider Time');
    const res = await provider.call(Tx, blockNumber);
    console.timeEnd('VerifiedProvider Time');
    console.log(expectedRes, res);
    console.log(expectedRes === res);
  } catch (e) {
    console.error(e);
  }
}

main();
