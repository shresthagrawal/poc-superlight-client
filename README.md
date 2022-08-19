### Superlight Client For Proof of Stake Ethereum

This is a PoC implementation for **Superlight Client for PoS Ethereum**. The light client specified by the Ethereum PoS Consesnsus takes linear storage/time complexity w.r.t to the chain size to sync. The superlight client proposed in this repo can sync to the latest header in poly log complexity which is exponentially better that the state of art. This is acheived based on interactive bisections games.

#### Benchmarks
The benchmark tries to compare the canonical light client, the optimistic light client and the superlight client implementation in terms of time to sync, data downloaded and interactions. 


#### Repository Structure
* `data/`: consists of python scripts to fetch beacon chain sync committee data, plot participation of sync committee, and plot results from benchmarks  
* `implementation/`: implementation for superlight client written in TS nodejs  
    * `src/client`: consists of implementation for superlight client and light client  
    * `src/prover`: consists of implemenetation for provers
    * `benchmark/`: consists of multiple scripts to compare light client vs super light clients. The final benchmarking only uses `multiple-server.ts`
    * `deployment/`: consists of bash scripts that were used to deploy and configure multiple provers in heroku

