#ZK-Invest: Anonymously invest in a project or strategy

-- Built in the context of Harmony's Zero Knowledge Univesity


Zk-Invest is a platform that allows users to anonymously invest in any sort of project or investment strategy, and receive the strategy/project tokens in exchange for their investment. It is forked from Tornado Cash Nova, removing the L1/L2 bridging functionality due to the complexity of deployment post-censorship of the project.

Any user can create his project or invest in other people's (or his own) projects, by first sending an amount of ERC20 to the shielded pool (currently deployed ERC20 is WETH), and then sending investments to the projects of his choice.

The main smart contract is currently deployed on [Ethereum's Goerli Testnet](https://goerli.etherscan.io/address/0x8FF6660eC2F6785B9895E6eDbe447aa6BF196B4d) and the front-end is deployed on [Vercel](https://zk-invest.vercel.app).

These are the addresses of the deployed verifiers, the OwnableERC1155 Token, the hasher and the ZKInvest contract on Goerli Testnet.

```
  // verifier2: 0x55Ea1dbcD66B55Ca4a6B26bc9569C3dA16390471
  // verifier16: 0x23BD33cba2fe2436416dF4CDF4687809b4503d6a
  // projectTokenTransferVerifier: 0x827866C042a58F67b33BD0d9C9128eE7A307401D
  // hasher: 0x2b1040c24a106913bBD3149981c07f1643fe93c4
  // ownableERC1155: 0x3D08c0C140B366281DF2609689F929079DA18E95
  // ZK Invest implementation address: 0x8FF6660eC2F6785B9895E6eDbe447aa6BF196B4d
  ```
