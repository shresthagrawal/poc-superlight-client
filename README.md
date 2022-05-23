### Superlight Client For Ethereum Proof of Stake

This is a PoC implementation for **Superlight Client for Ethereum**. The light client specified by the Ethereum PoS Consesnsus takes linear storage/time complexity w.r.t to the chain size to sync. The superlight client proposed in this repo can sync to the latest header in poly log complexity which is exponentially better that the state of art. This is acheived based on interactive bisections games. 

This repo serves as an implementation for the Bachelors Thesis by Shresth Agrawal. The protocol implemented in this repo is an extention to an unpublished work by Dionysis Zindros called **"Proofs of Proof of Stake in Sublinear Complexity"**. 

#### Benchmarks
The benchmark tries to compare light client implementation with the super light client implementation in terms of time to sync, data downloaded and interactions. 

Following were the benchmark setup:
* 14 provers out of which 13 malicious provers and 1 honest prover
* prover servers deployed to heroku free tier dynos with shared CPU and 512mb RAM
* clients running on MacBook Pro 6-Core Intel Core i9 Processor 32 GB RAM with 40 Mbps internet speed
* for each setup 10 trials were made
* every malicious prover would override the sync committee of the honest chain starting from some period chosen randomly on boot
* for dummy data all provers had the same seed to generate the same honest chain

Benchmarks on BeaconChain data with 155 sync committee periods, 8 provers

|Implementation| Time To Sync | Data Downloaded | Interactions |
|--------------|--------------|-----------------|--------------|
|Light Client | 110.72 ± 7.00s | 16.83 ± 0.21MB | 159.60 ± 1.96 |
|Superlight Client | 62.63 ± 0.85s | 2.29 ± 0.00MB | 163.00 ± 0.00 |



Benchmarks on dummy data with 1024 sync committee periods, 512 sync committee size, 8 provers

|Implementation| Time To Sync | Data Downloaded | Interactions |
|--------------|--------------|-----------------|--------------|
|Light Client | 803.42 ± 3.69s | 106.58 ± 0.22MB | 1027.60 ± 2.11 |
|Superlight Client | 92.95 ± 1.97s | 2.27 ± 0.00MB | 205.00 ± 0.00 |

> Notice that the data downloaded by Superlight Client for dummy chain is smaller than that of Beacon chain even though the dummy chain has a higher size. This is because the Beacon implementation uses the Beacon chain update data type proposed in the Sync Committee specs. This data structure consists of params which are not there in the dummy chain. 


#### Repository Structure
* `data/`: consists of python scripts to fetch beacon chain sync committee data, plot participation of sync committee, and plot results from benchmarks  
* `implementation/`: implementation for superlight client written in TS nodejs  
    * `src/client`: consists of implementation for superlight client and light client  
    * `src/prover`: consists of implemenetation for provers
    * `benchmark/`: consists of multiple scripts to compare light client vs super light clients. The final benchmarking only uses `multiple-server.ts`
    * `deployment/`: consists of bash scripts that were used to deploy and configure multiple provers in heroku
* `notes/`: rough pseudo code and notes 
* `paper/`: latex source for thesis paper

#### Replicating the benchmarks
0. Clone the github repo, and open a terminal in the implementation folder
1. Setup prover servers on Heroku
    * You need to have a heroku account (free tier should be good)
    * Run `bash deployemnt/create-app.sh` to create 14 heroku servers
    * Run `bash deployment/deploy-app.sh` to deploy the code to each heroku servers
    * Choose which config you would like to benchark. Then run `bash deployment/set-config-{your-config}.sh` to set the config for all the heroku servers
    * If the dummy chain is used it might take time to generate the dummy data. You can check if the servers are up by running `bash deployment/ping-app.sh`
2. Setup to run client locally
    * Run `yarn install` to install the dependencies 
    * Run `yarn build` to build the project locally
3. Run the benchmark script
    * Based on the config you choose you should modify `proverCount, isDummy, size, committeeSize, trials` in the `benchmark/multiple-server.ts`
    * You need to build the project again, run `yarn build`
    * Run `yarn benchmark` to run the benchmark script
    * The results of the benchmark should be stored in the `results` folder. The file name is based on the config you choose.

