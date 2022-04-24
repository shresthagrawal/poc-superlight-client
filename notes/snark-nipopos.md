
```ts

type Block = {
    prevBlockHash: blockHash;
    currentBlockHash: blockHash;
    stateRoot: stateHash;
    validatorCount: number;
    validatorRoot: validatorHash; 
};

type Signature = {
    signature: bytes;
    publicKey: address;
    validatorMerkleProof: bytes[];
}
  

function snarkCircuit(
    gensisBlock: publicVariableBlock,
    lastBlock: publicVariableBlock,
    justifiedBlocks: privateVariableBlock[],
    justifiedBlockSigatures: privateVariableSignature[][],
) {

    check(genesisBlock.blockHash === justifiedBlocks[0].blockHash); // O(1)
    check(lastBlock.blockHash === justifiedBlocks[-1].blockHash); // O(1)

    for(int i = 1; i < justifiedBlocks.length; i++) {
        let lastBlock = justifiedBlocks[i - 1];
        let currectBlock = justifiedBlocks[i];
        let currentBlockSignatures = justifiedBlockSigatures[i];
        check(currentBlockSignatures.length > (2/3 *  lastBlock.validatorCount)); // O(1)
        for(int j = 0; j < currentBlockSignatures.length; j++) {
            let sig = currentBlockSignatures[j];
            check(sig.b1 === lastBlock.blockHash); // O(1)
            check(sig.b2 === currectBlock.blockHash); // O(1)
            check(blsRecover(sig.signature) === sig.publicKey); // O(1)
            check(generateMerkleRoot(sig.merkleProof, sig.publicKey) === lastBlock.validatorHash); // O(log(V))
        }
    }
}

function progressiveSnarkCircuit(
    gensisBlock: publicVariableBlock,
    newBlock: publicVariableBlock,
    currentBlock: privateVariableBlock,
    proofUntilCurrentBlock: privateProof,
    newJustifiedBlockSigatures: privateVariableSignature[],
) {
    check(isProofCorrect(genesisBlock, currentBlock, proofUntilCurrentBlock)); // O(1)
    check(newJustifiedBlockSigatures.length > (2/3 *  currectBlock.validatorCount)); // O(1)
    for(int j = 0; j < newJustifiedBlockSigatures.length; j++) {
        let sig = newJustifiedBlockSigatures[j];
        check(sig.b1 === currectBlock.blockHash); // O(1)
        check(sig.b2 === newBlock.blockHash); // O(1)
        check(blsRecover(sig.signature) === sig.publicKey); // O(1)
        check(generateMerkleRoot(sig.merkleProof, sig.publicKey) === currectBlock.validatorHash); // O(log(V))
    }
}
```


1. Whats the time complexity of the above circuit?

    Time Complexity => O(N * V * log(V))    
    N: number of blocks  
    V: number of validators  

2. How effiecient is it to create a prover for such a circuit? 
    
    We should test it using Circom (https://github.com/iden3/circomlib/tree/master/circuits)  
    Contact someone who has more experience 

