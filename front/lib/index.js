/* eslint-disable no-console */
const MerkleTree = require('fixed-merkle-tree')
const { ethers } = require('hardhat')
const { BigNumber } = ethers
const { toFixedHex, poseidonHash2, getExtDataHash, FIELD_SIZE, shuffle, encryptUtxo } = require('./utils')
const Utxo = require('./utxo')
const { Keypair } = require('./keypair')

const { prove } = require('./prover')
const MERKLE_TREE_HEIGHT = 5

async function buildMerkleTree({ zkInvest }) {
  const filter = zkInvest.filters.NewCommitment()
  const events = await zkInvest.queryFilter(filter, 0)

  const leaves = events.sort((a, b) => a.args.index - b.args.index).map((e) => toFixedHex(e.args.commitment))
  return new MerkleTree(MERKLE_TREE_HEIGHT, leaves, { hashFunction: poseidonHash2 })
}

async function getProjectTokenTransferProof({
  utxoReceived,
  encryptedOutput,
  utxoSent,
  projectTokenValue
}) {

  let input = {
    commitmentReceived: utxoReceived.getCommitment(),
    commitmentSent: utxoSent.getCommitment(),
    tokenValue: projectTokenValue,
    sentTokenId: utxoSent.tokenId,
    //private
    receivedTokenId: utxoReceived.tokenId,
    receivedSrcPubKey: utxoReceived.srcPubKey,
    receivedAmount: utxoReceived.amount,
    receivedPubKey: utxoReceived.keypair.pubkey,
    receivedBlinding: utxoReceived.blinding,
    sentAmount: utxoSent.amount,
    sentBlinding: utxoSent.blinding,
    sentSrcPubKey: utxoSent.srcPubKey
  }

  const proof = await prove(input, `./artifacts/circuits/projectTokenTransfer`)

  const args = {
    proof,
    commitmentReceived: toFixedHex(utxoReceived.getCommitment()),
    commitmentSent: toFixedHex(utxoSent.getCommitment()),
    tokenValue: toFixedHex(projectTokenValue),
    sentTokenId: toFixedHex(utxoSent.tokenId)
  }
  // console.log('Solidity args', args)

  return {
    args
  }

}

async function getProof({
  inputs,
  outputs,
  tree,
  extAmount,
  fee,
  publicTokenId,
  recipient,
  relayer,
  isInvestment
}) {
  inputs = shuffle(inputs)
  outputs = shuffle(outputs)

  let inputMerklePathIndices = []
  let inputMerklePathElements = []

  for (const input of inputs) {
    if (input.amount > 0) {
      input.index = tree.indexOf(toFixedHex(input.getCommitment()))
      if (input.index < 0) {
        throw new Error(`Input commitment ${toFixedHex(input.getCommitment())} was not found`)
      }
      inputMerklePathIndices.push(input.index)
      inputMerklePathElements.push(tree.path(input.index).pathElements)
    } else {
      inputMerklePathIndices.push(0)
      inputMerklePathElements.push(new Array(tree.levels).fill(0))
    }
  }

  const extData = {
    recipient: toFixedHex(recipient, 20),
    extAmount: toFixedHex(extAmount),
    publicTokenId: toFixedHex(publicTokenId),
    relayer: toFixedHex(relayer, 20),
    fee: toFixedHex(fee),
    encryptedOutput1: outputs[0].encrypt(),
    encryptedOutput2: outputs[1].encrypt(),
    // isL1Withdrawal,
    // l1Fee,
  }

  let cancellable;
  if(isInvestment){
    cancellable = {
      encryptedOutput1: encryptUtxo(outputs[0], Keypair.fromString(outputs[0].srcEncryptionAddress), outputs[0].keypair.address()),
      encryptedOutput2: encryptUtxo(outputs[1], Keypair.fromString(outputs[1].srcEncryptionAddress), outputs[1].keypair.address())
    }
  }

  const extDataHash = getExtDataHash(extData)
  let input = {
    root: tree.root(),
    inputNullifier: inputs.map((x) => x.getNullifier()),
    outputCommitment: outputs.map((x) => x.getCommitment()),
    publicAmount: BigNumber.from(extAmount).sub(fee).add(FIELD_SIZE).mod(FIELD_SIZE).toString(),
    publicTokenId,
    extDataHash,

    // data for 2 transaction inputs
    inAmount: inputs.map((x) => x.amount),
    inTokenId: inputs.map((x) => x.tokenId),
    inSrcPubkey: inputs.map((x) => x.srcPubKey),
    inPrivateKey: inputs.map((x) => x.keypair.privkey),
    inBlinding: inputs.map((x) => x.blinding),
    inPathIndices: inputMerklePathIndices,
    inPathElements: inputMerklePathElements,

    // data for 2 transaction outputs
    outAmount: outputs.map((x) => x.amount),
    outTokenId: outputs.map((x) => x.tokenId),
    outSrcPubkey: outputs.map((x) => x.srcPubKey),
    outBlinding: outputs.map((x) => x.blinding),
    outPubkey: outputs.map((x) => x.keypair.pubkey),
  }

  const proof = await prove(input, `./artifacts/circuits/transaction${inputs.length}`)

  const args = {
    proof,
    root: toFixedHex(input.root),
    inputNullifiers: inputs.map((x) => toFixedHex(x.getNullifier())),
    outputCommitments: outputs.map((x) => toFixedHex(x.getCommitment())),
    publicAmount: toFixedHex(input.publicAmount),
    publicTokenId: toFixedHex(publicTokenId),
    extDataHash: toFixedHex(extDataHash),
  }

  return {
    extData,
    args,
    cancellable
  }
}

async function prepareTransaction({
  zkInvest,
  inputs = [],
  outputs = [],
  fee = 0,
  recipient = 0,
  relayer = 0,
  isInvestment = false
}) {

  let publicTokenId = (inputs?.length > 0) ? inputs[0].tokenId : outputs[0].tokenId;

  if (inputs.length > 16 || outputs.length > 2) {
    throw new Error('Incorrect inputs/outputs count')
  }
  while (inputs.length !== 2 && inputs.length < 16) {
    inputs.push(new Utxo({tokenId: publicTokenId}))
  }
  while (outputs.length < 2) {
    outputs.push(new Utxo({tokenId: publicTokenId}))
  }

  let extAmount = BigNumber.from(fee)
    .add(outputs.reduce((sum, x) => sum.add(x.amount), BigNumber.from(0)))
    .sub(inputs.reduce((sum, x) => sum.add(x.amount), BigNumber.from(0)))

  const { args, extData, cancellable } = await getProof({
    inputs,
    outputs,
    tree: await buildMerkleTree({ zkInvest }),
    extAmount,
    fee,
    publicTokenId,
    recipient,
    relayer,
    isInvestment
  })

  return {
    args,
    extData,
    cancellable
  }
}

async function transaction({ zkInvest, ...rest }) {
  const { args, extData } = await prepareTransaction({
    zkInvest,
    ...rest,
  })

  const receipt = await zkInvest.transact(args, extData, {
    gasLimit: 2e6,
  })

  return await receipt.wait()
}

async function registerAndTransact({ zkInvest, account, ...rest }) {
  const { args, extData } = await prepareTransaction({
    zkInvest,
    ...rest,
  })

  const receipt = await zkInvest.registerAndTransact(account, args, extData, {
    gasLimit: 2e6,
  })
  await receipt.wait()
}

async function createProject({ zkInvest, account, title, description, tokenValue }) {
    const receipt = await zkInvest.createProject(account, title, description, tokenValue, {
      gasLimit: 2e6
    });
    await receipt.wait();
}


async function transactionWithProject({ zkInvest, ...rest }) {
  const { args, extData, cancellable } = await prepareTransaction({
    zkInvest,
    ...rest,
    isInvestment: true
  })

  const receipt = await zkInvest.transactWithProject(args, extData, cancellable, {
    gasLimit: 2e6,
  })
  return await receipt.wait()
}

async function acceptInvestment({ zkInvest, utxoReceived, utxoSent, projectTokenValue }) {
  const { args } = await getProjectTokenTransferProof({
    zkInvest,
    utxoReceived,
    utxoSent,
    projectTokenValue
  })
  let emptyUtxo = new Utxo();
  let encryptedOutputs = {
    encryptedOutput1: utxoSent.encrypt(),
    encryptedOutput2: emptyUtxo.encrypt()
  };

  const receipt = await zkInvest.acceptInvestment(args, encryptedOutputs, emptyUtxo.getCommitment(), {
    gasLimit: 2e6,
  })
  return await receipt.wait()
}

async function cancelInvestment({ zkInvest, ...rest }) {
  const { args } = await prepareTransaction({
    zkInvest,
    ...rest,
  })

  const receipt = await zkInvest.cancelInvestment(args, {
    gasLimit: 2e6,
  })
  return await receipt.wait()
}


module.exports = {
  createProject,
  transactionWithProject,
  acceptInvestment,
  cancelInvestment,
  transaction,
  registerAndTransact,
  prepareTransaction,
  buildMerkleTree
}
