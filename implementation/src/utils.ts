import { toHexString } from '@chainsafe/ssz';
import { SecretKey } from '@chainsafe/bls';

export function logFloor(x: number, base: number = 2) {
  return Math.floor(Math.log(x) / Math.log(base));
}

export function concatUint8Array(data: Uint8Array[]) {
  const l = data.reduce((l, d) => l + d.length, 0);
  let result = new Uint8Array(l);
  let offset = 0;
  data.forEach(d => {
    result.set(d, offset);
    offset += d.length;
  });
  return result;
}

export function isUint8ArrayEq(a: Uint8Array, b: Uint8Array): boolean {
  return toHexString(a) === toHexString(b);
}

export function generateRandomSyncCommittee(): Uint8Array[] {
  let res = [];
  // TODO: change 512 to constant
  for (let i = 0; i < 512; i++) {
    res.push(SecretKey.fromKeygen().toPublicKey().toBytes());
  }
  return res;
}
