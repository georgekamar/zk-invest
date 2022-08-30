 # ZK-Invest: Anonymously invest in a project or strategy

-- Built in the context of Harmony's Zero Knowledge Univesity


Zk-Invest is a platform that allows users to anonymously invest in any sort of project or investment strategy, and receive the strategy/project tokens in exchange for their investment. It is forked from Tornado Cash Nova, removing the L1/L2 bridging functionality due to the complexity of deployment post-censorship of the project.

Any user can create his project or invest in other people's (or his own) projects, by first sending an amount of ERC20 to the shielded pool (currently deployed ERC20 is WETH), and then sending investments to the projects of his choice.

The main smart contract is currently deployed on [Ethereum's Goerli Testnet](https://goerli.etherscan.io/address/0x8FF6660eC2F6785B9895E6eDbe447aa6BF196B4d) and the front-end is deployed on [Vercel](https://zk-invest.vercel.app).

These are the addresses of the deployed verifiers, the OwnableERC1155 Token, the hasher and the ZKInvest contract on Goerli Testnet.


```
verifier2: 0x55Ea1dbcD66B55Ca4a6B26bc9569C3dA16390471
verifier16: 0x23BD33cba2fe2436416dF4CDF4687809b4503d6a
projectTokenTransferVerifier: 0x827866C042a58F67b33BD0d9C9128eE7A307401D
hasher: 0x2b1040c24a106913bBD3149981c07f1643fe93c4
ownableERC1155: 0x3D08c0C140B366281DF2609689F929079DA18E95
ZK Invest implementation address: 0x8FF6660eC2F6785B9895E6eDbe447aa6BF196B4d
  ```


 # Project Logic

Intro - Tornado Nova:
The project's logic is based on the same as tornado-cash nova: users own valid amounts of notes that are hashed as  commitments and stored in a Merkle Tree. The users prove that they are the owners of these commitments by submitting a zero-knowledge proof of their knowledge of all the inputs of these commitments (amount, random number), as well as their knowledge of the private key that translates into the public key used as a hash input to that commitment. Users spend their amounts by nullifying their commitments and adding them to a list of nullifyers on-chain, preventing double spending of their commitments. Once spent, new commitments with the difference of the amounts is created and inserted into the Merkle Tree. To send tokens to another user within the pool, a user simply creates a commitment with the recipient's public address, and encrypts it using that same address for it to be only decryptable by the recipient.

Zk Invest:
In Zk Invest, additional Zero Knowledge logic is required to solve the following problems: if a user creates a transaction to invest in a project, he would have to use the project's address in his commitment as the recipient public key. Once that transaction is in the Merkle Tree, who is to guarantee he will receive his tokens in exchange ? If the smart contract were to be that neutral third party, it would defeat anonymity since everything is public, and if smart contracts can generate zero-knowledge proofs, everyone can see them. For the project owner to know who he has to pay, a fourth input was added to the commitment hasher: the source address, which of course is completely optional (if one were to make a donation for instance). In addition, since different kinds of tokens need to be sent around, tokenID also needs to be in the commitment hasher. To enforce that the project owner would pay his investors in tokens, two things were done:
1- A zero-knowledge circuit using the commitment hashes of both the received investment and the sent tokens was created, with a constraint enforcing that the source address of the investment be the same as the recipient address of the tokens
2- Before that proof is generated and the token commitments are sent to the investor, the investment commitments are not inserted in the Merkle Tree, and the nullifiers are not inserted in the nullifiers array. Instead the commitments and the nullifiers are mapped to one another and marked as pending on the contract.

For the implementation of the tokens, I implemented an Ownable ERC1155 token that was set to be owned by the ZK Investment Contract during deployment. The ERC1155 Standard allows the management (minting, transferring and burning) of different types of tokens, both fungible and non-fungible, within one contract. In my design, to preserve anonymity further, project tokens are only minted upon withdrawal, enabling users who receive them to freely trade them within the pool without even showing a balance on the contract.
