include "../node_modules/circomlib/circuits/poseidon.circom";

/*
Utxo structure:
{
    amount,
    tokenId,
    srcpubkey,
    pubkey,
    blinding, // random number
}

commitment = hash(amount, hash(tokenId, srcpubkey), pubKey, blinding)
nullifier = hash(commitment, merklePath, sign(privKey, commitment, merklePath))
*/

template ProjectTokenTransfer() {

    // data
    signal         input commitmentReceived;
    signal         input commitmentSent;
    signal         input tokenValue;
    signal         input sentTokenId;
    signal private input receivedTokenId;
    signal private input receivedSrcPubKey;
    signal private input receivedAmount;
    signal private input receivedPubKey;
    signal private input receivedBlinding;

    signal private input sentAmount;
    signal private input sentBlinding;
    signal private input sentSrcPubKey;


    component commitmentHasher[4];


    // verify correctness of received commitment
    commitmentHasher[0] = Poseidon(2);
    commitmentHasher[0].inputs[0] <== receivedTokenId;
    commitmentHasher[0].inputs[1] <== receivedSrcPubKey;

    commitmentHasher[1] = Poseidon(4);
    commitmentHasher[1].inputs[0] <== receivedAmount;
    commitmentHasher[1].inputs[1] <== commitmentHasher[0].out;
    commitmentHasher[1].inputs[2] <== receivedPubKey;
    commitmentHasher[1].inputs[3] <== receivedBlinding;
    commitmentHasher[1].out === commitmentReceived;


    commitmentHasher[2] = Poseidon(2);
    commitmentHasher[2].inputs[0] <== sentTokenId;
    commitmentHasher[2].inputs[1] <== sentSrcPubKey;

    commitmentHasher[3] = Poseidon(4);
    commitmentHasher[3].inputs[0] <== sentAmount;
    commitmentHasher[3].inputs[1] <== commitmentHasher[2].out;
    commitmentHasher[3].inputs[2] <== receivedSrcPubKey;
    commitmentHasher[3].inputs[3] <== sentBlinding;
    commitmentHasher[3].out === commitmentSent;

    // check amount sent corresponds to tokenValue

    receivedTokenId === 0;
    receivedAmount === sentAmount * tokenValue;

}

component main = ProjectTokenTransfer();
