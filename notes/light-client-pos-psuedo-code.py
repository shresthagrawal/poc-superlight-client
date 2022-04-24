
# Assuming randomNumbers and epochPie is correct
# We need to check if the epochBlocks are correct
def verify(randomNumbers, epochPie, epochBlocks, lastEpoch):
    for i in range(lastEpoch):
        blockCreators = electBlockCreators(randomNumbers[i], epochPie[i])
        for j in range(epochBlockSize):
            currBlock = epochBlocks[i][j]
            # Block should have correct blockhash
            require(currBlock.blockHash is generateBlockHash(currBlock))
            # Block should be connected with previous block
            if(currBlock.blockNumber is not geneis):
                lastBlock = epochBlocks[i - 1][epochBlockSize] if j is 0 else epochBlocks[i][j - 1]
                require(currBlock.lastBlockHash is lastBlock.blockHash)
            # Block should be created by correct blockcreator
            require(epochBlocks[i][j].blockCreator is blockCreators[j])

