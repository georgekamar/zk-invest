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


  // [DEPRECATED] GOERLI Ethereum Testnet Deployment Addresses: [DEPRECATED]
  //
  // WETH token: 0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6
  // multisig: 0x8ECe2A05e0AdA6c70BA4a580EFf87f23D964723c
  // verifier2: 0x55Ea1dbcD66B55Ca4a6B26bc9569C3dA16390471
  // verifier16: 0x23BD33cba2fe2436416dF4CDF4687809b4503d6a
  // projectTokenTransferVerifier: 0x827866C042a58F67b33BD0d9C9128eE7A307401D
  // hasher: 0x2b1040c24a106913bBD3149981c07f1643fe93c4
  // ownableERC1155: 0x3D08c0C140B366281DF2609689F929079DA18E95
  // ZK Invest implementation address: 0x8FF6660eC2F6785B9895E6eDbe447aa6BF196B4d


  // GOERLI Ethereum Testnet Deployment Addresses:

  // WETH token: 0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6
  // multisig: 0x8ECe2A05e0AdA6c70BA4a580EFf87f23D964723c
  // verifier2: 0x93d4011df17710d634274735A6bc7ab217Ff5320
  // verifier16: 0xa058794dC57010F33abd95A50fD85De23D144b55
  // projectTokenTransferVerifier: 0xBcEfd604eb61b24AE0b1422f4A17b2c2d3e7e5e4
  // hasher: 0x80e45BDE393EB31c635b4D0D0aE1c46C59D924D4
  // ownableERC1155: 0x22A14825dE24DFe3e57319CEE160013C00D30EE7
  // ZkInvest: 0xFa1dF689cE3cE4c49eD2DC5afdb3C7179F11436A


  // WETH (Goerli)
  // const token = '0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6';

  const multisig = process.env.PUBLIC_KEY
  const testAccount = process.env.SECOND_PUBLIC_KEY

  // MintableToken (local)
  const MintableToken = await ethers.getContractFactory('MintableToken')
  const token = await MintableToken.deploy();
  const deployedToken = await token.deployed();
  console.log(`MintableToken: ${token.address}`);

  await deployedToken.mint(multisig, utils.parseEther('10000'))
  console.log('Minted 10000 tokens to multisig ' + multisig);
  await deployedToken.mint(testAccount, utils.parseEther('10000'))
  console.log('Minted 10000 tokens to testAccount ' + testAccount);
  await deployedToken.approve(multisig, utils.parseEther('10'));
  await deployedToken.transferFrom(multisig, testAccount, utils.parseEther('10'));
  console.log('Transferred 10 tokens from ' + multisig + ' to ' + testAccount);

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
      token.address,
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
    token.address,
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


  await ownableERC1155.changeOwner(zkInvest.address);
  console.log('Ownable ERC1155 owner changed to ZK Invest address');

  // const CrossChainUpgradeableProxy = await ethers.getContractFactory('CrossChainUpgradeableProxy')
  // const proxy = await CrossChainUpgradeableProxy.deploy(tornadoImpl.address, govAddress, [], amb, l1ChainId)
  // await proxy.deployed()
  // console.log(`proxy address: ${proxy.address}`)

  // const tornadoPool = await Pool.attach(proxy.address)

  await zkInvest.initialize(
    // utils.parseEther(MINIMUM_WITHDRAWAL_AMOUNT),
    utils.parseEther(MAXIMUM_DEPOSIT_AMOUNT),
  )

  console.log(
    // `Proxy initialized with MINIMUM_WITHDRAWAL_AMOUNT=${MINIMUM_WITHDRAWAL_AMOUNT} ETH and MAXIMUM_DEPOSIT_AMOUNT=${MAXIMUM_DEPOSIT_AMOUNT} ETH`,
    `Pool initialized with MAXIMUM_DEPOSIT_AMOUNT=${MAXIMUM_DEPOSIT_AMOUNT} ETH`,
  )

  await zkInvest.initializeProjects();

  console.log('Projects Initialized');

}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
