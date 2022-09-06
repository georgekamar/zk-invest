# ZK-Invest: Anonymously invest in a project or strategy

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
