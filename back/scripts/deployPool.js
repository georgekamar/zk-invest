const { ethers } = require('hardhat')
const { utils } = ethers
// const prompt = require('prompt-sync')()

const MERKLE_TREE_HEIGHT = 23
const { MINIMUM_WITHDRAWAL_AMOUNT, MAXIMUM_DEPOSIT_AMOUNT } = process.env

async function main() {
  require('./compileHasher')
  // const govAddress = '0xBAE5aBfa98466Dbe68836763B087f2d189f4D28f'
  // const omniBridge = '0x59447362798334d3485c64D1e4870Fde2DDC0d75'
  // const amb = '0x162e898bd0aacb578c8d5f8d6ca588c13d2a383f'
  // const token = '0xCa8d20f3e0144a72C6B5d576e9Bd3Fd8557E2B04' // WBNB
  // const l1Unwrapper = '0x8845F740F8B01bC7D9A4C82a6fD4A60320c07AF1' // WBNB -> BNB
  // const l1ChainId = 56

  // WETH (Goerli)
  const token = '0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6';

  const multisig = process.env.PUBLIC_KEY;

  // GOERLI Ethereum Testnet Deployment Addresses:

  // WETH token: 0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6
  // multisig: 0x8ECe2A05e0AdA6c70BA4a580EFf87f23D964723c
  // verifier2: 0x93d4011df17710d634274735A6bc7ab217Ff5320
  // verifier16: 0xa058794dC57010F33abd95A50fD85De23D144b55
  // projectTokenTransferVerifier: 0xBcEfd604eb61b24AE0b1422f4A17b2c2d3e7e5e4
  // hasher: 0x80e45BDE393EB31c635b4D0D0aE1c46C59D924D4
  // ownableERC1155: 0x22A14825dE24DFe3e57319CEE160013C00D30EE7
  // ZkInvest: 0xFa1dF689cE3cE4c49eD2DC5afdb3C7179F11436A

  const Verifier2 = await ethers.getContractFactory('Verifier2')
  const verifier2 = await Verifier2.deploy()
  await verifier2.deployed()
  console.log(`verifier2: ${verifier2.address}`)

  const Verifier16 = await ethers.getContractFactory('Verifier16')
  const verifier16 = await Verifier16.deploy()
  await verifier16.deployed()
  console.log(`verifier16: ${verifier16.address}`)

  const ProjectTokenTransferVerifier = await ethers.getContractFactory('ProjectTokenTransferVerifier')
  const projectTokenTransferVerifier = await ProjectTokenTransferVerifier.deploy()
  await projectTokenTransferVerifier.deployed()
  console.log(`projectTokenTransferVerifier: ${projectTokenTransferVerifier.address}`)

  const Hasher = await await ethers.getContractFactory('Hasher')
  const hasher = await Hasher.deploy()
  await hasher.deployed()
  console.log(`hasher: ${hasher.address}`)

  const tokensUri = 'https://zk-invest.vercel.app/project-tokens-erc1155-metadata.json';

  const OwnableERC1155 = await await ethers.getContractFactory('OwnableERC1155')
  const ownableERC1155 = await OwnableERC1155.deploy(tokensUri)
  await ownableERC1155.deployed()
  console.log(`ownableERC1155: ${ownableERC1155.address}`)

  const Pool = await ethers.getContractFactory('ZkInvest')
  console.log(
    `constructor args:\n${JSON.stringify([
      verifier2.address,
      verifier16.address,
      projectTokenTransferVerifier.address,
      MERKLE_TREE_HEIGHT,
      hasher.address,
      token,
      ownableERC1155.address,
      // omniBridge,
      // l1Unwrapper,
      // govAddress,
      // l1ChainId,
      multisig,
      // tokensUri
    ]).slice(1, -1)}\n`,
  )

  //const tornadoImpl = prompt('Deploy tornado pool implementation and provide address here:\n')
  const zkInvest = await Pool.deploy(
    [
      verifier2.address,
      verifier16.address,
      projectTokenTransferVerifier.address
    ],
    MERKLE_TREE_HEIGHT,
    hasher.address,
    token,
    ownableERC1155.address,
    // omniBridge,
    // l1Unwrapper,
    // govAddress,
    // l1ChainId,
    multisig
    // tokensUri
  )
  await zkInvest.deployed()
  console.log(`ZK Invest implementation address: ${zkInvest.address}`)


  await ownableERC1155.changeOwner(zkInvest.address, {
    gasLimit: 2e6
  });
  console.log('Ownable ERC1155 owner changed to ZK Invest address');

  // const CrossChainUpgradeableProxy = await ethers.getContractFactory('CrossChainUpgradeableProxy')
  // const proxy = await CrossChainUpgradeableProxy.deploy(tornadoImpl.address, govAddress, [], amb, l1ChainId)
  // await proxy.deployed()
  // console.log(`proxy address: ${proxy.address}`)

  // const zkInvest = await Pool.attach('0xFa1dF689cE3cE4c49eD2DC5afdb3C7179F11436A')
  await zkInvest.initialize(
    // utils.parseEther(MINIMUM_WITHDRAWAL_AMOUNT),
    utils.parseEther(MAXIMUM_DEPOSIT_AMOUNT),
    {
      gasLimit: 2e6
    }
  )
  console.log(
    // `Proxy initialized with MINIMUM_WITHDRAWAL_AMOUNT=${MINIMUM_WITHDRAWAL_AMOUNT} ETH and MAXIMUM_DEPOSIT_AMOUNT=${MAXIMUM_DEPOSIT_AMOUNT} ETH`,
    `Pool initialized with MAXIMUM_DEPOSIT_AMOUNT=${MAXIMUM_DEPOSIT_AMOUNT} ETH`,
  )

  await zkInvest.initializeProjects({
    gasLimit: 2e6
  });

  console.log('Projects Initialized');

}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
