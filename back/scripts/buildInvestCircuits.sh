#!/bin/bash -e
POWERS_OF_TAU=18 # circuit will support max 2^POWERS_OF_TAU constraints
mkdir -p artifacts/circuits
if [ ! -f artifacts/circuits/ptau$POWERS_OF_TAU ]; then
  echo "Downloading powers of tau file"
  curl -L https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_$POWERS_OF_TAU.ptau --create-dirs -o artifacts/circuits/ptau$POWERS_OF_TAU
fi
npx circom -v -r artifacts/circuits/projectTokenTransfer.r1cs -w artifacts/circuits/projectTokenTransfer.wasm -s artifacts/circuits/projectTokenTransfer.sym circuits/projectTokenTransfer.circom
npx snarkjs groth16 setup artifacts/circuits/projectTokenTransfer.r1cs artifacts/circuits/ptau$POWERS_OF_TAU artifacts/circuits/tmp_projectTokenTransfer.zkey
echo "qwe" | npx snarkjs zkey contribute artifacts/circuits/tmp_projectTokenTransfer.zkey artifacts/circuits/projectTokenTransfer.zkey
npx snarkjs zkey export solidityverifier artifacts/circuits/projectTokenTransfer.zkey artifacts/circuits/ProjectTokenTransferVerifier.sol
sed -i.bak "s/contract Verifier/contract ProjectTokenTransferVerifier/g" artifacts/circuits/ProjectTokenTransferVerifier.sol
#zkutil setup -c artifacts/circuits/projectTokenTransfer.r1cs -p artifacts/circuits/projectTokenTransfer.params
#zkutil generate-verifier -p artifacts/circuits/projectTokenTransfer.params -v artifacts/circuits/Verifier.sol
npx snarkjs info -r artifacts/circuits/projectTokenTransfer.r1cs
