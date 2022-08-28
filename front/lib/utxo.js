const { ethers } = require('hardhat')
const { BigNumber } = ethers
const { randomBN, poseidonHash, poseidonHash2, encryptUtxo } = require('./utils')
const { Keypair } = require('./keypair')

const EMPTY_PUB_ADDRESS = '0x00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000';
const EMPTY_PUB_KEY = '0x0000000000000000000000000000000000000000000000000000000000000000';

class Utxo {
  /** Initialize a new UTXO - unspent transaction output or input. Note, a full TX consists of 2/16 inputs and 2 outputs
   *
   * @param {BigNumber | BigInt | number | string} amount UTXO amount
   * @param {BigNumber | BigInt | number | string} tokenId Token to transact, -1 is default
   * @param {BigNumber | BigInt | number | string} srcPubKey Source Address, 0x0 is default
   * @param {BigNumber | BigInt | number | string} blinding Blinding factor
   * @param {Keypair} keypair
   * @param {number|null} index UTXO index in the merkle tree
   */
   //0x 8A791620dd6260079BF849Dc5567aDC3F2FdC318
   //0x 0000000000000000000000000000000000000000

  constructor({ amount = 0, tokenId = 0, srcPubKey = BigNumber.from(EMPTY_PUB_KEY), srcEncryptionAddress = EMPTY_PUB_ADDRESS, keypair = new Keypair(), blinding = randomBN(), index = null } = {}) {
    this.amount = BigNumber.from(amount)
    this.tokenId = BigNumber.from(tokenId)
    this.srcPubKey = BigNumber.from(srcPubKey)
    this.srcEncryptionAddress = srcEncryptionAddress
    this.blinding = BigNumber.from(blinding)
    this.keypair = keypair
    this.index = index
  }

  /**
   * Returns commitment for this UTXO
   *
   * @returns {BigNumber}
   */
  getCommitment() {
    if (!this._commitment) {
      this._commitment = poseidonHash([this.amount, poseidonHash2(this.tokenId, this.srcPubKey), this.keypair.pubkey, this.blinding])
    }
    return this._commitment
  }

  /**
   * Returns nullifier for this UTXO
   *
   * @returns {BigNumber}
   */
  getNullifier() {
    if (!this._nullifier) {
      if (
        this.amount > 0 &&
        (this.index === undefined ||
          this.index === null ||
          this.keypair.privkey === undefined ||
          this.keypair.privkey === null)
      ) {
        throw new Error('Can not compute nullifier without utxo index or private key')
      }
      const signature = this.keypair.privkey ? this.keypair.sign(this.getCommitment(), this.index || 0) : 0
      this._nullifier = poseidonHash([this.getCommitment(), this.index || 0, signature])
    }
    return this._nullifier
  }

  /**
   * Encrypt UTXO data using the current keypair
   *
   * @returns {string} `0x`-prefixed hex string with data
   */
  encrypt() {
    return encryptUtxo(
      {
        amount: this.amount,
        tokenId: this.tokenId,
        srcPubKey: this.srcPubKey,
        srcEncryptionAddress: this.srcEncryptionAddress,
        blinding: this.blinding
      },
      this.keypair
    )
  }

  // encrypt() {
  //   return encryptUtxo(
  //     this,
  //     this.keypair
  //   )
  // }

  /**
   * Decrypt a UTXO
   *
   * @param {Keypair} keypair keypair used to decrypt
   * @param {string} data hex string with data
   * @param {number} index UTXO index in merkle tree
   * @returns {Utxo}
   */
  static decrypt(keypair, data, index) {
    const buf = keypair.decrypt(data)
    const destPubSliceString = buf.slice(189, 253).toString('hex');
    const destPubAddress = destPubSliceString ? ('0x' + destPubSliceString) : null;
    return new Utxo({
      amount: BigNumber.from('0x' + buf.slice(0, 31).toString('hex')),
      tokenId: BigNumber.from('0x' + buf.slice(31, 62).toString('hex')),
      srcPubKey: BigNumber.from('0x' + buf.slice(62, 94).toString('hex')),
      srcEncryptionAddress: '0x' + buf.slice(94, 158).toString('hex'),
      blinding: BigNumber.from('0x' + buf.slice(158, 189).toString('hex')),
      destPubAddress,
      keypair: destPubAddress ? Keypair.fromString(destPubAddress) : keypair,
      index,
    })
  }
}

module.exports = Utxo
