/* eslint-disable indent, no-undef */
require('@nomiclabs/hardhat-ethers')
require('@nomiclabs/hardhat-waffle')
require('@nomiclabs/hardhat-etherscan')
require('dotenv').config()

task('hasher', 'Compile Poseidon hasher', () => {
  require('./scripts/compileHasher')
})

const config = {
  solidity: {
    compilers: [
      {
        version: '0.4.24',
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
      {
        version: '0.6.2',
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
      {
        version: '0.7.5',
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
            details: {
              yul: true,
              yulDetails: {
                stackAllocation: true,
                optimizerSteps: "dhfoDgvulfnTUtnIf"
              }
            }
          },
        },
      },
      {
        version: '0.7.6',
        settings: {
          optimizer: {
            enabled: true,
            runs: 1,
            details: {
              yul: true,
              yulDetails: {
                stackAllocation: true,
                optimizerSteps: "dhfoDgvulfnTUtnIf"
              }
            }
          },
        },
      },
    ],
  },
  networks: {
    // hardhat: {
    //   forking: {
    //     url: `https://eth-mainnet.alchemyapi.io/v2/${process.env.ALCHEMY_KEY}`,
    //     blockNumber: 13685625,
    //   },
    //   chainId: 1,
    //   initialBaseFeePerGas: 5,
    //   loggingEnabled: false,
    //   allowUnlimitedContractSize: false,
    //   blockGasLimit: 50000000,
    // },
    // rinkeby: {
    //   url: `https://rinkeby.infura.io/v3/${process.env.INFURA_API_KEY}`,
    //   accounts: process.env.PRIVATE_KEY
    //     ? [process.env.PRIVATE_KEY]
    //     : {
    //         mnemonic: 'test test test test test test test test test test test junk',
    //       },
    // },
    hardhat: {
      ...(
        (
          process.env.PRIVATE_KEY ||
          process.env.SECOND_PRIVATE_KEY
        ) &&
        {
          accounts: [
            ...(process.env.PRIVATE_KEY ? [{
              privateKey: process.env.PRIVATE_KEY,
              balance: '10000000000000000000000'
            }] : []),
            ...(process.env.SECOND_PRIVATE_KEY ? [{
              privateKey: process.env.SECOND_PRIVATE_KEY,
              balance: '10000000000000000000000'
            }] : []),
          ]
        }
      )
    },
    harmony_devnet: {
      url: process.env.HARMONY_DEVNET_RPC || 'https://api.s0.ps.hmny.io/',
      accounts: process.env.PRIVATE_KEY
        ? [process.env.PRIVATE_KEY]
        : {
            mnemonic: 'test test test test test test test test test test test junk',
          }
    },
    xdai: {
      url: process.env.ETH_RPC || 'https://rpc.xdaichain.com/',
      accounts: process.env.PRIVATE_KEY
        ? [process.env.PRIVATE_KEY]
        : {
            mnemonic: 'test test test test test test test test test test test junk',
          },
      gasPrice: 25000000000,
    },
    bsc: {
      url: process.env.ETH_RPC || 'https://bsc-dataseed.binance.org/',
      accounts: process.env.PRIVATE_KEY
        ? [process.env.PRIVATE_KEY]
        : {
            mnemonic: 'test test test test test test test test test test test junk',
          },
    },
    mainnet: {
      url: `https://eth-mainnet.alchemyapi.io/v2/${process.env.ALCHEMY_KEY}`,
      accounts: process.env.PRIVATE_KEY
        ? [process.env.PRIVATE_KEY]
        : {
            mnemonic: 'test test test test test test test test test test test junk',
          },
    },
    goerli: {
      url: `https://goerli.infura.io/v3/${process.env.INFURA_API_KEY}`,
      accounts: process.env.PRIVATE_KEY
        ? [process.env.PRIVATE_KEY]
        : {
            mnemonic: 'test test test test test test test test test test test junk',
          },
    }
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_KEY,
  },
  mocha: {
    timeout: 600000000,
  },
  typechain: {
    outDir: 'src/types',
  },
}

module.exports = config
