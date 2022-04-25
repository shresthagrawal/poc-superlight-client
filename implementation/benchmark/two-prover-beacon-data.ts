import { init } from '@chainsafe/bls';
import { MainnetBeaconChainStore } from '../src/store/beacon-store';
import { SuperlightSync } from '../src/server/superlight-sync';

async function main() {
  await init('herumi');

  const defaultStore = new MainnetBeaconChainStore();
  const superlighSync = new SuperlightSync(defaultStore);

  console.log(
    superlighSync.getNode(
      '0x58b5276027f3a0d056339f7a8dce455a21c99d41957e09b8a61d455b2449bfcf',
      '0xb3f2ae8e6b00dd8227315c4626c3e4c235284a9fec119b16989f323e5c086ae8',
    ),
  );
}
