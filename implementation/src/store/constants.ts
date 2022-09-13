import { fromHexString } from '@chainsafe/ssz';

export const BEACON_GENESIS_VALIDATOR_ROOT = '0x4b363db94e286120d76eb905340fdd4e54bfe9f06bf33ff6cf5ad27f511bfe95';
export const BEACON_SYNC_COMMITTEE_SIZE = 512;
export const BEACON_SYNC_SUPER_MAJORITY = Math.ceil(BEACON_SYNC_COMMITTEE_SIZE * 2/3);