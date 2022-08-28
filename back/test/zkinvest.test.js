const hre = require('hardhat')
const { ethers, waffle } = hre
const { loadFixture } = waffle
const { expect } = require('chai')
const { utils, BigNumber } = ethers

const Utxo = require('../src/utxo')
const { createProject, transactionWithProject, acceptInvestment, cancelInvestment, transaction, registerAndTransact, prepareTransaction, buildMerkleTree } = require('../src/index')
const { toFixedHex, poseidonHash } = require('../src/utils')
const { Keypair } = require('../src/keypair')
// const { encodeDataForBridge } = require('./utils')

const MERKLE_TREE_HEIGHT = 5
// const l1ChainId = 1
// const MINIMUM_WITHDRAWAL_AMOUNT = utils.parseEther(process.env.MINIMUM_WITHDRAWAL_AMOUNT || '0.05')
const MAXIMUM_DEPOSIT_AMOUNT = utils.parseEther(process.env.MAXIMUM_DEPOSIT_AMOUNT || '1')

describe('ZK Invest Tests', function () {
  this.timeout(30000)

  async function deploy(contractName, ...args) {
    const Factory = await ethers.getContractFactory(contractName)
    const instance = await Factory.deploy(...args)
    return instance.deployed()
  }

  async function fixture() {
    require('../scripts/compileHasher')
    // const [sender, gov, l1Unwrapper, multisig] = await ethers.getSigners()
    const [sender, multisig] = await ethers.getSigners()
    const verifier2 = await deploy('Verifier2')
    const verifier16 = await deploy('Verifier16')
    const projectTokenTransferVerifier = await deploy('ProjectTokenTransferVerifier')
    const hasher = await deploy('Hasher')

    // const token = await deploy('PermittableToken', 'Wrapped ETH', 'WETH', 18, 1)
    const token = await deploy('MintableToken')
    await token.mint(sender.address, utils.parseEther('10000'))

    const tokensUri = 'https://speedtest.net';

    const projectTokensContract = await deploy('OwnableERC1155', tokensUri)
    // await projectTokensContract.mint(sender.address, utils.parseEther('10000'))

    // const amb = await deploy('MockAMB', gov.address, l1ChainId)
    // const omniBridge = await deploy('MockOmniBridge', amb.address)

    // const tokensUri = 'https://speedtest.net';

    /** @type {ZkInvest} */
    const zkInvest = await deploy(
      'ZkInvest',
      [
        verifier2.address,
        verifier16.address,
        projectTokenTransferVerifier.address
      ],
      MERKLE_TREE_HEIGHT,
      hasher.address,
      token.address,
      projectTokensContract.address,
      // omniBridge.address,
      // l1Unwrapper.address,
      // gov.address,
      multisig.address,
      // tokensUri
    )

    await zkInvest.deployed();

    projectTokensContract.changeOwner(zkInvest.address);

    const { data } = await zkInvest.initialize(
      MAXIMUM_DEPOSIT_AMOUNT,
    )

    // const proxy = await deploy(
    //   'CrossChainUpgradeableProxy',
    //   zkInvestImpl.address,
    //   gov.address,
    //   data,
    //   amb.address,
    //   l1ChainId,
    // )
    // const zkInvest = zkInvest.attach(proxy.address)

    await token.approve(zkInvest.address, utils.parseEther('10000'))

    return { zkInvest, token, projectTokensContract, multisig }
  }

  it('Alice registers project with 1 token=0.01eth -> Bob deposits 0.1eth into shielded pool -> Bob invests 0.03eth in Alice\'s Project -> Alice accepts Bob\'s investment -> Bob receives 3 tokens -> Bob invests 0.02eth more -> Bob cancels his investment -> Alice tries to accept Bob\'s investment but fails -> Bob withdraws his remaining 0.07eth from the shielded pool', async () => {
      // [assignment] complete code here
      let { zkInvest, token, projectTokensContract } = await loadFixture(fixture)
      const sender = (await ethers.getSigners())[0]

      const aliceKeypair = new Keypair() // contains private and public keys
      const aliceAddress = aliceKeypair.address();

      const initialZkInvestPoolBalance = await token.balanceOf(zkInvest.address)
      // const initialOmniBridgeBalance = await token.balanceOf(omniBridge.address)

      zkInvest = zkInvest.connect(sender);
      await createProject({
        zkInvest,
        account: {
          owner: sender.address,
          publicKey: aliceKeypair.address(),
        },
        title: "The Alice Project",
        description: "Alice's Project",
        tokenValue: utils.parseEther('0.01')
      })

      const bobKeypair = new Keypair() // contains private and public keys
      const bobAddress = bobKeypair.address() // contains only public key

      const bobDepositAmount = utils.parseEther('0.1')
      const bobDepositUtxo = new Utxo({ amount: bobDepositAmount, keypair: bobKeypair })

      await transaction({ zkInvest, inputs: [], outputs: [bobDepositUtxo] })

      // const { args, extData } = await prepareTransaction({
      //   zkInvest,
      //   outputs: [bobDepositUtxo],
      // })
      //
      // const onTokenBridgedData = encodeDataForBridge({
      //   proof: args,
      //   extData,
      // })
      //
      // const onTokenBridgedTx = await zkInvest.populateTransaction.onTokenBridged(
      //   token.address,
      //   bobDepositUtxo.amount,
      //   onTokenBridgedData,
      // )
      // // emulating bridge. first it sends tokens to omnibridge mock then it sends to the pool
      // await token.transfer(omniBridge.address, bobDepositAmount)
      // const transferTx = await token.populateTransaction.transfer(zkInvest.address, bobDepositAmount)
      //
      // await omniBridge.execute([
      //   { who: token.address, callData: transferTx.data }, // send tokens to pool
      //   { who: zkInvest.address, callData: onTokenBridgedTx.data }, // call onTokenBridgedTx
      // ])

      // Bob invests in Alice's project
      const projectSendAmount = utils.parseEther('0.03')
      const projectSendUtxo = new Utxo({ amount: projectSendAmount, srcPubKey: bobKeypair.pubkey, srcEncryptionAddress: bobKeypair.address(), keypair: Keypair.fromString(aliceAddress) })
      const bobChangeUtxo = new Utxo({
        amount: bobDepositAmount.sub(projectSendAmount),
        keypair: bobDepositUtxo.keypair,
      })
      await transactionWithProject({ zkInvest, inputs: [bobDepositUtxo], outputs: [projectSendUtxo, bobChangeUtxo] })

      // Alice parses chain to detect incoming funds
      let filter = zkInvest.filters.NewPendingCommitment()
      let fromBlock = await ethers.provider.getBlock()
      let events = await zkInvest.queryFilter(filter, fromBlock.number)

      let projectReceiveUtxo;
      try {
        projectReceiveUtxo = Utxo.decrypt(aliceKeypair, events[0].args.encryptedOutput, events[0].args.index)
      } catch (e) {
        // we try to decrypt another output here because it shuffles outputs before sending to blockchain
        projectReceiveUtxo = Utxo.decrypt(aliceKeypair, events[1].args.encryptedOutput, events[1].args.index)
      }
      expect(projectReceiveUtxo.amount).to.be.equal(projectSendAmount)

      // Alice accepts investment
      // const projectToken = await zkInvest.projectTokens(await zkInvest.projectOwnerToToken(utils.computeAddress(aliceKeypair.pubkey)));
      const projectToken = await zkInvest.projectTokens(await zkInvest.projectOwnerToToken(sender.address));
      const bobAcceptInvestmentUtxo = new Utxo({
        amount: projectReceiveUtxo.amount.div(projectToken.value),
        tokenId: projectToken.id,
        srcPubKey: aliceKeypair.pubkey,
        srcEncryptionAddress: aliceKeypair.address(),
        keypair: Keypair.fromString(projectReceiveUtxo.srcEncryptionAddress)//{pubkey: projectReceiveUtxo.srcPubKey}
      })

      await acceptInvestment({
        zkInvest,
        utxoReceived: projectReceiveUtxo,
        utxoSent: bobAcceptInvestmentUtxo,
        projectTokenValue: projectToken.value
      })

      // Bob parses chain to detect his received tokens
      filter = zkInvest.filters.NewCommitment()
      fromBlock = await ethers.provider.getBlock()
      events = await zkInvest.queryFilter(filter, fromBlock.number)

      let bobReceiveInvestmentTokenAmount = BigNumber.from(0);
      let bobUtxos = [];
      let bobTokenUtxos = [];
      events.forEach((event, i) => {
        try{
          let bobReceiveInvestmentTokensUtxo = Utxo.decrypt(bobKeypair, event.args.encryptedOutput, event.args.index);
          bobUtxos.push(bobReceiveInvestmentTokensUtxo);
          if(bobReceiveInvestmentTokensUtxo.tokenId.eq(projectToken.id)){
            bobReceiveInvestmentTokenAmount = bobReceiveInvestmentTokenAmount.add(bobReceiveInvestmentTokensUtxo.amount);
            bobTokenUtxos.push(bobReceiveInvestmentTokensUtxo);
          }
        }catch(e){
        }
      });

      expect(bobReceiveInvestmentTokenAmount.mul(projectToken.value)).to.be.equal(projectReceiveUtxo.amount)

      // Bob invests again in Alice's project
      const projectSendAmount2 = utils.parseEther('0.02')
      const projectSendUtxo2 = new Utxo({ amount: projectSendAmount2, srcPubKey: bobKeypair.pubkey, srcEncryptionAddress: bobKeypair.address(), keypair: Keypair.fromString(aliceAddress) })
      const bobChangeUtxo2 = new Utxo({
        amount: bobChangeUtxo.amount.sub(projectSendAmount2),
        keypair: bobDepositUtxo.keypair,
      })

      await transactionWithProject({ zkInvest, inputs: [bobChangeUtxo], outputs: [projectSendUtxo2, bobChangeUtxo2] })
      expect(bobChangeUtxo.amount).to.be.equal(bobChangeUtxo2.amount.add(projectSendAmount2))

      // Bob parses chain to see his pending commitments
      filter = zkInvest.filters.NewPendingCommitment()
      fromBlock = await ethers.provider.getBlock()
      events = await zkInvest.queryFilter(filter, fromBlock.number)
      let bobPendingUtxos = [];
      events.forEach((event, i) => {
        try{
          let bobPendingUtxo = Utxo.decrypt(bobKeypair, event.args.encryptedOutput, event.args.index);
          bobPendingUtxos.push(bobPendingUtxo);
        }catch(e){
        }
      });

      // Bob decides to cancel his last investment before Alice accepts
      await cancelInvestment({ zkInvest, outputs: bobPendingUtxos});

      // Alice parses chain and tries to accept investment but fails
      let alicePendingUtxo;
      events.forEach((event, i) => {
        try{
          alicePendingUtxo = Utxo.decrypt(aliceKeypair, event.args.encryptedOutput, event.args.index);
        }catch(e){
        }
      });
      const bobAcceptInvestmentUtxo2 = new Utxo({
        amount: alicePendingUtxo.amount.div(projectToken.value),
        tokenId: projectToken.id,
        srcPubKey: aliceKeypair.pubkey,
        srcEncryptionAddress: aliceKeypair.address(),
        keypair: Keypair.fromString(alicePendingUtxo.srcEncryptionAddress)//{pubkey: projectReceiveUtxo.srcPubKey}
      })

      let isError = false;
      try{
        await acceptInvestment({
          zkInvest,
          utxoReceived: alicePendingUtxo,
          utxoSent: bobAcceptInvestmentUtxo2,
          projectTokenValue: projectToken.value
        })
      }catch(e){
        isError = true;
      }
      expect(isError).to.be.true;

      // Bob withdraws all remaining funds from the shielded pool
      const bobEthAddress = '0xfeDE000000000000000000000000000000000000'
      const bobChangeUtxo3 = new Utxo({
        amount: utils.parseEther('0'),
        keypair: bobKeypair,
      })
      await transaction({
        zkInvest,
        inputs: [bobChangeUtxo],
        outputs: [bobChangeUtxo3],
        recipient: bobEthAddress
      })

      expect(await token.balanceOf(bobEthAddress)).to.be.equal(utils.parseEther('0.07'));

      const bobProjectTokenChangeUtxo = new Utxo({
        amount: utils.parseEther('0'),
        keypair: bobKeypair,
        tokenId: projectToken.id
      })

      await transaction({
        zkInvest,
        inputs: bobTokenUtxos,
        outputs: [bobProjectTokenChangeUtxo],
        recipient: bobEthAddress
      })

      expect(await projectTokensContract.balanceOf(bobEthAddress, projectToken.id)).to.be.equal(bobReceiveInvestmentTokenAmount);

      // const recipientBalance = await token.balanceOf(recipient)
      // expect(recipientBalance).to.be.equal(aliceWithdrawAmount)
      // const omniBridgeBalance = await token.balanceOf(omniBridge.address)
      // expect(omniBridgeBalance).to.be.equal(initialOmniBridgeBalance)
      // const zkInvestBalance = await token.balanceOf(zkInvest.address)
      // expect(zkInvestBalance).to.be.equal(initialZkInvestPoolBalance.add(aliceDepositAmount).sub(aliceWithdrawAmount))

      }

  })

})
