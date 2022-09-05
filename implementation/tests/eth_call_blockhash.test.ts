// TODO: currently its just a demo script, make it a test 
import * as dotenv from 'dotenv';
dotenv.config();

import Web3 from 'web3';
import { VerifiedProvider } from '../src/rpc-proxy/verifiedProvider';
import { Interface } from '@ethersproject/abi';
import multiCallAbi from './multicall.abi.json';

const multiCallI = new Interface(multiCallAbi);
const multiCallAddr = '0x5e227ad1969ea493b43f840cff78d08a6fc17796';


const RPC_URL = process.env.RPC_URL || '';

async function main() {
  const web3 = new Web3(RPC_URL);
  const blockNumber = await web3.eth.getBlockNumber();
  const block = await web3.eth.getBlock(blockNumber);
  const provider = new VerifiedProvider(RPC_URL, blockNumber, block.hash);
  const Tx = {
    to: multiCallAddr,
    data: multiCallI.encodeFunctionData('getBlockHash', [blockNumber - 5])
  };

  try {
    console.time('TruestedProvider Time')
    const expectedRes = await web3.eth.call(Tx, blockNumber);
    console.timeEnd('TruestedProvider Time')
    console.time('VerifiedProvider Time')
    const res = await provider.call(Tx, blockNumber);
    console.timeEnd('VerifiedProvider Time')
    console.log(expectedRes, res);
    console.log(expectedRes === res);
  } catch(e) {
    console.error(e);
  }
}

main();
