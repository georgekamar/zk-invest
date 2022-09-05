/* global network */
import crypto from 'crypto';
import { BigNumber, utils, provider } from 'ethers';
import { poseidon } from 'circomlib';

const Buffer = require('buffer/').Buffer;

const poseidonHash = (items) => BigNumber.from(poseidon(items).toString())
const poseidonHash2 = (a, b) => poseidonHash([a, b])

const FIELD_SIZE = BigNumber.from(
  '21888242871839275222246405745257275088548364400416034343698204186575808495617',
)

/** Generate random number of specified byte length */
const randomBN = (nbytes = 31) => BigNumber.from(crypto.randomBytes(nbytes))

function getExtDataHash({
  recipient,
  extAmount,
  publicTokenId,
  relayer,
  fee,
  encryptedOutput1,
  encryptedOutput2
}) {
  const abi = new utils.AbiCoder()

  const encodedData = abi.encode(
    [
      'tuple(address recipient,int256 extAmount,uint256 publicTokenId,address relayer,uint256 fee,bytes encryptedOutput1,bytes encryptedOutput2)',
    ],
    [
      {
        recipient: toFixedHex(recipient, 20),
        extAmount: toFixedHex(extAmount),
        publicTokenId: toFixedHex(publicTokenId),
        relayer: toFixedHex(relayer, 20),
        fee: toFixedHex(fee),
        encryptedOutput1: encryptedOutput1,
        encryptedOutput2: encryptedOutput2
      },
    ],
  )
  const hash = utils.keccak256(encodedData)
  return BigNumber.from(hash).mod(FIELD_SIZE)
}

/** BigNumber to hex string of specified length */
function toFixedHex(number, length = 32) {
  let result =
    '0x' +
    (number instanceof Buffer
      ? number.toString('hex')
      : BigNumber.from(number).toHexString().replace('0x', '')
    ).padStart(length * 2, '0')
  if (result.indexOf('-') > -1) {
    result = '-' + result.replace('-', '')
  }
  return result
}

/** Convert value into buffer of specified byte length */
const toBuffer = (value, length) => (
  Buffer.from(
    BigNumber.from(value)
      .toHexString()
      .slice(2)
      .padStart(length * 2, '0'),
    'hex',
  )
)

function shuffle(array) {
  let currentIndex = array.length
  let randomIndex

  // While there remain elements to shuffle...
  while (0 !== currentIndex) {
    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex)
    currentIndex--

    // And swap it with the current element.
    ;[array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]]
  }

  return array
}

async function getSignerFromAddress(address) {
  await network.provider.request({
    method: 'hardhat_impersonateAccount',
    params: [address],
  })

  return await provider.getSigner(address)
}

function encryptUtxo(utxoData, keypair, destPubAddress) {
  const bytes = Buffer.concat([
    toBuffer(utxoData.amount, 31),
    toBuffer(utxoData.tokenId, 31),
    toBuffer(utxoData.srcPubKey, 32),
    toBuffer(utxoData.srcEncryptionAddress, 64),
    toBuffer(utxoData.blinding, 31),
    ...(destPubAddress ? [toBuffer(destPubAddress, 64)] : [])
  ])
  return keypair.encrypt(bytes)
}

function calculateBalances(utxos){
  let balances = {};
  for(var i=0; i<utxos.length; i++){
    let tokenId = utxos[i].tokenId.toString();
    if(balances?.[tokenId]){
      balances[tokenId] = balances[tokenId].add(utxos[i].amount);
    }else{
      balances[tokenId] = utxos[i].amount;
    }
  }
  return balances;
}

function addBalances(balances1, balances2){
  let newBalances = {};
  for(let tokenId of Object.keys(balances1 || {})){
    if(balances2?.[tokenId]){
      newBalances[tokenId] = balances1[tokenId].add(balances2[tokenId]);
    }else{
      newBalances[tokenId] = balances1[tokenId];
    }
  }
  for(let tokenId2 of Object.keys(balances2 || {})){
    if(!newBalances?.[tokenId2]){
      newBalances[tokenId2] = balances2[tokenId2];
    }
  }
  return newBalances;
}

function subBalances(balances1, balances2){
  let newBalances = {};
  for(let tokenId of Object.keys(balances1 || {})){
    if(balances2?.[tokenId]){
      newBalances[tokenId] = balances1[tokenId].sub(balances2[tokenId]);
    }else{
      newBalances[tokenId] = balances1[tokenId];
    }
  }
  for(let tokenId of Object.keys(balances2 || {})){
    if(!newBalances?.[tokenId]){
      newBalances[tokenId] = balances2[tokenId].mul(BigNumber.from(-1));
    }
  }
  return newBalances;
}

function utxosToNullify(utxos, amount){
  let toNullify = [];
  let balance = BigNumber.from(0);
  const sortedUtxos = utxos.sort((a, b) => b.amount.sub(a.amount));
  for(let utxo of sortedUtxos){
    balance = balance.add(utxo.amount);
    toNullify.push(utxo);
    if(balance.gte(amount)){
      break;
    }
  }
  return toNullify;
}

module.exports = {
  FIELD_SIZE,
  randomBN,
  toFixedHex,
  toBuffer,
  poseidonHash,
  poseidonHash2,
  getExtDataHash,
  shuffle,
  getSignerFromAddress,
  encryptUtxo,
  calculateBalances,
  addBalances,
  subBalances,
  utxosToNullify
}
