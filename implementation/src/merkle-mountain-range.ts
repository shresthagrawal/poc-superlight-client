import { MerkleTree, HashFunction } from './merkle-tree';
import { logFloor, concatUint8Array } from './utils';
import { toHexString } from '@chainsafe/ssz';

export class MerkleMountainRange {
  protected merkleTrees: MerkleTree[] = [];
  protected lookupMap: { [rootHex: string]: MerkleTree } = {};
  protected rootHash: Uint8Array;

  constructor(protected hashFn: HashFunction, protected n: number = 2) {}

  init(leaves: Uint8Array[]) {
    const l = leaves.length;
    if (!l) throw new Error(`there should be atleast one leaf`);

    let leftL = l;
    const rootHashes = [];
    while (leftL > 0) {
      const merkleTree = new MerkleTree(this.hashFn, this.n);
      const possibleTreeL = this.n ** logFloor(leftL, this.n);
      merkleTree.init(leaves.slice(l - leftL, l - leftL + possibleTreeL));
      const root = merkleTree.getRoot();
      this.merkleTrees.push(merkleTree);
      rootHashes.push(root.hash);
      this.lookupMap[toHexString(root.hash)] = merkleTree;
      leftL -= possibleTreeL;
    }
    this.rootHash = this.hashFn(concatUint8Array(rootHashes));
  }

  getTree(treeRoot: Uint8Array) {
    return this.lookupMap[toHexString(treeRoot)];
  }

  getRootHash() {
    return this.rootHash;
  }

  getTreeInfo(): { rootHash: Uint8Array; size: number }[] {
    return this.merkleTrees.map(t => ({
      rootHash: t.getRoot().hash,
      size: t.size,
    }));
  }

  generateProof(index: number): {
    rootHash: Uint8Array;
    proof: Uint8Array[][];
  } {
    let i = index;
    for (let t of this.merkleTrees) {
      if (t.size <= i) i -= t.size;
      else {
        return {
          rootHash: t.getRoot().hash,
          proof: t.generateProof(i),
        };
      }
    }
    throw new Error('index out of range');
  }
}

export function merkleMountainVerify(
  root: Uint8Array,
  treeRoots: Uint8Array[],
  hashFn: HashFunction 
): boolean {
  return isUint8ArrayEq(root, hashFn(concatUint8Array(treeRoots)));
}
