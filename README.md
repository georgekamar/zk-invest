# ZK-Invest: An Anonymous Decentralized Investment Platform Based on Zero-Knowledge

-- Built in the context of Harmony's Zero Knowledge Univesity


Zk-Invest is a platform that allows users to anonymously invest in any sort of project or investment strategy, and receive the strategy/project tokens in exchange for their investment. It is forked from Tornado Cash Nova, removing the L1/L2 bridging functionality due to the complexity of deployment post-censorship of the project.

Any user can create his project or invest in other people's (or his own) projects, by first sending an amount of ERC20 to the shielded pool (currently deployed ERC20 is WETH), and then sending investments to the projects of his choice.

The main smart contract is currently deployed on [Ethereum's Goerli Testnet](https://goerli.etherscan.io/address/0xFa1dF689cE3cE4c49eD2DC5afdb3C7179F11436A) and the front-end is deployed on [Vercel](https://zk-invest.vercel.app).

These are the addresses of the deployed verifiers, the OwnableERC1155 Token, the hasher and the ZKInvest contract on Goerli Testnet.


```
verifier2: 0x93d4011df17710d634274735A6bc7ab217Ff5320
verifier16: 0xa058794dC57010F33abd95A50fD85De23D144b55
projectTokenTransferVerifier: 0xBcEfd604eb61b24AE0b1422f4A17b2c2d3e7e5e4
hasher: 0x80e45BDE393EB31c635b4D0D0aE1c46C59D924D4
ownableERC1155: 0x22A14825dE24DFe3e57319CEE160013C00D30EE7
ZK Invest implementation address: 0xFa1dF689cE3cE4c49eD2DC5afdb3C7179F11436A
```

# Project Logic

### Intro - Tornado Nova:

The project's logic is based on tornado-cash nova's: users own valid amounts of notes that are hashed as commitment hashes and stored in a Merkle Tree. The users prove that they are the owners of a note by submitting a zero-knowledge proof of their knowledge of all the inputs of its commitment hash (amount, random number), as well as their knowledge of the private key that is used to derive the public key input of that commitment hash. Users spend their amounts by nullifying their commitments and adding them to a list of nullifiers on-chain, preventing double spending of their commitments. Once spent, new commitments with the difference of the amounts are created and inserted into the Merkle Tree. To send tokens to another user within the pool, a user simply creates a commitment with the recipient's public address, and encrypts it using that same address for it to only be decryptable by the recipient.

### ZK-Invest:

In ZK-Invest, additional Zero Knowledge logic is required to solve the following problems: if a user creates a transaction to invest in a project, he would have to use the project's address in his commitment as the recipient public key. Once that transaction is in the Merkle Tree, who is to guarantee he will receive his tokens in exchange ? If the smart contract were to be that neutral third party, it would defeat anonymity since everything is public and smart contract generated zero-knowledge proofs cannot really be zero-knowledge. For the project owner to know who he has to pay, a fourth input was added to the commitment hasher: the source address, which of course is completely optional (if one were to make a donation for instance). In addition, since different kinds of tokens need to be sent around, tokenID also needs to be in the commitment hasher. To enforce that the project owner would pay his investors in tokens, two things were done:

1- A zero-knowledge circuit using the commitment hashes of both the received investment and the sent tokens was created, with a constraint enforcing that the source address of the investment be the same as the recipient address of the tokens.

2- Before that proof is generated and the token commitments are sent to the investor, the investment commitments are not inserted in the Merkle Tree, and the nullifiers are not inserted in the nullifiers array. Instead the commitments and the nullifiers are mapped to one another and marked as pending on the contract.

For the implementation of the tokens, an Ownable ERC1155 token was implemented and is set to be owned by the ZK Investment Contract on contract initialization. The ERC1155 Standard allows the management (minting, transferring and burning) of different types of tokens, both fungible and non-fungible, within one contract. In this design, to preserve anonymity further, project tokens are only minted upon withdrawal, enabling users who receive them to freely trade them within the pool without even showing a balance on the contract.

### To be improved

##### Transacting with a project (invest)

Currently, pending transactions from two output commitments are created on `transactWithProject`, and the nullifiers from the commitments used to create those outputs are marked as pending as well. This means that these not-yet-nullified commitments cannot be used in the meantime, even if the sum of their commitments is greater than the sum invested and that one of the output commitments is destined as "change" to the investor. In other words, an amount greater than the sum invested could be pending until the investment is accepted, unnecessarily locking a user's valid funds in the process. To solve this, if no exact commitment amounts exist in the user's commitments, a "breakup" transaction is created on the frontend previous to the project transaction to ensure there exists a valid commitment hash of the exact investment amount in the Merkle Tree that can be used alone to create the outputs. This solution often costs an extra transaction, and could be replaced with a better design of `transactWithProject`. Instead of creating two pending output commitments, `transactWithProject` could insert one of them in the tree, actually nullify the inputs, and make only the investment commitment pending and cancellable. This would slightly change the logic of the `acceptInvestment` and `cancelInvestment` functions as well accordingly.

##### Encrypting destined transaction

When a user accepts an investment from an investor, they submit a ZK proof that the commitment they are creating has the correct amount of tokens and that those tokens will only be "ownable" by the investor themself. However, there is currently no way to prove that the investor will encrypt the transaction using the investor's public key, making it very hard for the investor to retrieve their commitment should a malicious project owner decide not to make their transaction decryptable. The investor will know there exists a commitment of "x" amount in the tree that is destined to them, but will have to try all combinations of the random number hash input to prove they "own" that commitment. Only the existence of an encryption/decryption library in circom could solve this problem in the current project's high-level logic.

##### Project token deposit and transfer

No feature to deposit project tokens into the shielded pool is implemented and was beyond the scope of this project in the context of ZKU's Final Project, but implementing such a feature would not be challenging. Transferring tokens within the shielded pool is possible by transacting with the contract, but implementing the feature on the frontend was outside the scope of this project in the context of ZKU's Final Project, it also would not be challenging to implement.

##### Project investment from outside the shielded pool

The smart contract does not currently support directly investing in a project from a wallet. Users must first deposit into the shielded pool before being able to invest. This is due to the fact that pending commitments are not inserted in the Merkle tree, and cancelling investments simply "erase" the pending commitments and nullifiers, reverting their "nullification". If an amount was sent to the contract in such a transaction, reverting it would imply implementing a mechanism to either send the amount back to that address, or insert a commitment of corresponding amount in the tree. Alternatively, this could be implemented on the frontend by sending two transactions to the blockchain: one for the deposit and one for the investment.

##### Divisibility of project investment

To prove that a user who accepts an investment will send the correct amount of tokens to the investor, a naive constraint is added in circom that multiplies the inputted token value by the  token amount to be sent and ensures it is equal to the inputted investment amount. Float manipulation being subject to overflow errors and lack of precision, the frontend ensures that the division of the investment amount by the token value leaves no remainder to avoid aforementioned problems. This isn't the best user experience and a solution could be found to this, either by automatically calculating the remainder on the frontend and not including it in the investment, or by finding a more robust constraint in circom that could flawlessly handle floats.

# Run Locally

## Clone the repository

`git clone https://github.com/georgekamar/zku-final-project`

## Run the tests on the back

```
cd back
yarn
yarn build
yarn test
```

## Deploy to localhost hardhat network

Run hardhat network
`npx hardhat node`

Deploy contracts locally
`npx hardhat run ./scripts/deployPool_local.js --network localhost`

This will run the hardhat local network and deploy the contracts on it.

More on the back-end [in the `/back` directory](/back/README.md)

## Connect the front end

First `cd ../front` from the `back` directory, or `cd front` from the root directory. Then:

```
yarn
yarn build
yarn start
```

The browser should open a new window on http://localhost:3000. Connect Metamask and switch to localhost network. Be sure to change your env variables accordingly ([see `/front/.env.example`](/front/.env.example)).

More on the front-end [in the `/front` directory](/front/README.md)
