import Web3 from 'web3';
import * as ethers from 'ethers';
import abi from './abi.json';
import erc20 from './erc20.abi.json';

const token = '0xcAfE001067cDEF266AfB7Eb5A286dCFD277f3dE5';
const multiCall = '0x5e227ad1969ea493b43f840cff78d08a6fc17796';

const contractERC20 = new ethers.utils.Interface(erc20);
const contractMulticall = new ethers.utils.Interface(abi); 

const dataBalanceOf = contractERC20.encodeFunctionData('balanceOf', ['0x369E32aed1Dc5c33C85ab20977fB645A803E4A70']);

const data = contractMulticall.encodeFunctionData(
  'aggregate',
  [[{target: token, callData: dataBalanceOf}]]
);

console.log(data);
