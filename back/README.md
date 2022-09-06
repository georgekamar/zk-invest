# ZK-Invest Contracts & Circuits


## Usage

```shell
yarn
yarn download
yarn build
yarn test
```

## Building the circuits

`yarn circuit` downloads the power of tau file and builds the circom circuits. To use a smaller power of tau file (15 or 16), the variables in the build scripts should be replaced, and the merkle tree height parameter should be changed in the scripts (`transaction2.circom`,  `transaction16.circom`), and in the test files (`MERKLE_TREE_HEIGHT` variable). Tornadocash used a powers of tau file of 2^15 maximum constraints, and a merkle tree height of 5. Don't forget to change it back for deployment.

In the `circuits` directory,  `transaction${x}.circom` implement the template in `transaction.circom` and are the circuits used to generate the proofs for most transactions (deposit, withdraw, invest, cancel investment). The `projectTokenTransfer.circom` circuit is used to generate the proof for needed to accept an investment.

## Compiling the contracts

`yarn compile` compiles the contracts after the circuits are built.

In the `contracts` directory, `ZkInvest` in `ZkInvest.sol` is the main contract, which implements the contract in `TornadoPool.sol`. In `/tokens/OwnableERC1155.sol` is the contract that implements the ERC1155 project tokens, it is an ownable contract owned by `ZkInvest`, allowing it to mint tokens to certain addresses.

## Running the tests

`yarn test` runs the MerkleTree test file, as well as the ZK-Invest test file, which simulates an interaction between Alice, a project owner, and Bob, an investor.

## Deploying locally

First, open a terminal window and run `npx hardhat node` to start the local hardhat network.

Then, run `npx hardhat run ./scripts/deployPool_local.sh --network local` to deploy the contracts used in the project, including a Mintable ERC20 Token contract to be used as the main transaction token in the project. The script uses the `PUBLIC_KEY` and the `SECOND_PUBLIC_KEY` environment variables (see `/back/.env.example`), which correspond to the two accounts in the hardhat configuration file (`/back/hardhat.config.js`), that use the `PRIVATE_KEY` and `SECOND_PRIVATE KEY` environment variables for the accounts.

To deploy to a testnet or a mainnet, modify the `token` variable in `/back/deployPool.sh` to be the address of the used token on the corresponding network, then run the above command using the `deployPool.sh` script instead of `deployPool_local.sh`, and using any network instead of `local`. Make sure the chosen network is configured in the hardhat configuration first.
