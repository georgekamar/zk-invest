// SPDX-License-Identifier: MIT
// https://tornado.cash
/*
 * d888888P                                           dP              a88888b.                   dP
 *    88                                              88             d8'   `88                   88
 *    88    .d8888b. 88d888b. 88d888b. .d8888b. .d888b88 .d8888b.    88        .d8888b. .d8888b. 88d888b.
 *    88    88'  `88 88'  `88 88'  `88 88'  `88 88'  `88 88'  `88    88        88'  `88 Y8ooooo. 88'  `88
 *    88    88.  .88 88       88    88 88.  .88 88.  .88 88.  .88 dP Y8.   .88 88.  .88       88 88    88
 *    dP    `88888P' dP       dP    dP `88888P8 `88888P8 `88888P' 88  Y88888P' `88888P8 `88888P' dP    dP
 * ooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooo
 */

pragma solidity ^0.7.0;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "./TornadoPool.sol";

import { IVerifier } from "./interfaces/IVerifier.sol";


contract ZkInvest is TornadoPool, ERC1155 {

  IVerifier public immutable projectTokenTransferVerifier;

  // mapping from project owner to project token (for existence)
  mapping(address => uint256) public projectOwnerToToken;
  mapping(uint256 => address) public projectTokenToOwner;
  mapping(bytes32 => bytes32[]) public pendingCommitmentToNullifiers;
  mapping(bytes32 => bytes32) public pendingCommitmentToCommitment;
  mapping(bytes32 => bytes) public pendingCommitmentToEncryptedOutput;



  struct ProjectTokenTransferProof {
    bytes proof;
    bytes32 commitmentReceived;
    bytes32 commitmentSent;
    uint256 tokenValue;
    uint256 tokenId;
  }

  struct ProjectToken {
    uint256 id;
    uint256 value;
  }

  struct Project {
    Account creator;
    uint256 tokenId;
    string title;
    string description;
  }

  ProjectToken[] public projectTokens;
  Project[] public projects;

  /**
    @dev The constructor
    @param _verifiers the addresses of SNARK verifiers
    @param _levels hight of the commitments merkle tree
    @param _hasher hasher address for the merkle tree
    @param _token token address for the pool
    @param _omniBridge omniBridge address for specified token
    @param _l1Unwrapper address of the L1Helper
    @param _governance owner address
    @param _l1ChainId chain id of L1
    @param _multisig multisig on L2
    @param _tokensUri URI for ERC1155
  */
  constructor(
    IVerifier[3] memory _verifiers,
    uint32 _levels,
    address _hasher,
    IERC6777 _token,
    address _omniBridge,
    address _l1Unwrapper,
    address _governance,
    uint256 _l1ChainId,
    address _multisig,
    string memory _tokensUri
  )
    TornadoPool(_verifiers[0], _verifiers[1], _levels, _hasher, _token, _omniBridge, _l1Unwrapper, _governance, _l1ChainId, _multisig)
    ERC1155(_tokensUri)
  {
    projectTokenTransferVerifier = _verifiers[2];
  }




  // function changeTokenValue(
  //   uint256 _tokenId,
  //   uint256 _newValue
  // ) public {
  //   require(projectTokenToOwner[_tokenId] == msg.sender, "only project owner can change token value");
  //   projectTokens[_tokenId].value = _newValue;
  // }

  function createProject(
    Account memory _account,
    string memory _title,
    string memory _description,
    uint256 _tokenValue
  ) public {
    register(_account);
    require(projectOwnerToToken[_account.owner] == 0, "only one project per address");
    // create new token type here
    uint256 newProjectTokenId = projectTokens.length;
    projectTokenToOwner[newProjectTokenId] = _account.owner;
    projectOwnerToToken[_account.owner] = newProjectTokenId;
    projectTokens.push(ProjectToken(newProjectTokenId, _tokenValue));
    projects.push(Project(_account, newProjectTokenId, _title, _description));
  }

  function verifyProjectTokenTransferProof(ProjectTokenTransferProof memory _args) public view returns (bool) {
    return
      projectTokenTransferVerifier.verifyProof(
        _args.proof,
        [
          uint256(_args.commitmentReceived),
          uint256(_args.commitmentSent),
          uint256(_args.tokenId),
          uint256(_args.tokenValue)
        ]
      );
  }

  function _transactWithProject(Proof memory _args, ExtData memory _extData) internal nonReentrant {
    require(isKnownRoot(_args.root), "Invalid merkle root");
    for (uint256 i = 0; i < _args.inputNullifiers.length; i++) {
      require(!isSpent(_args.inputNullifiers[i]), "Input is already spent");
      require(!isPending(_args.inputNullifiers[i]), "Input pending");
    }
    require(uint256(_args.extDataHash) == uint256(keccak256(abi.encode(_extData))) % FIELD_SIZE, "Incorrect external data hash");
    require(_args.publicAmount == calculatePublicAmount(_extData.extAmount, _extData.fee), "Invalid public amount");
    require(_args.publicAmount == 0, "Pending transactions only within pool");
    require(verifyProof(_args), "Invalid transaction proof");

    for (uint256 i = 0; i < _args.inputNullifiers.length; i++) {
      pendingNullifierHashes[_args.inputNullifiers[i]] = true;
    }

    pendingCommitmentToNullifiers[_args.outputCommitments[0]] = _args.inputNullifiers;
    pendingCommitmentToCommitment[_args.outputCommitments[0]] = _args.outputCommitments[1];
    pendingCommitmentToCommitment[_args.outputCommitments[1]] = _args.outputCommitments[0];
    pendingCommitmentToEncryptedOutput[_args.outputCommitments[0]] = _extData.encryptedOutput1;
    pendingCommitmentToEncryptedOutput[_args.outputCommitments[1]] = _extData.encryptedOutput2;

    emit NewPendingCommitment(_args.outputCommitments[0], _extData.encryptedOutput1);
    emit NewPendingCommitment(_args.outputCommitments[1], _extData.encryptedOutput2);

    // lastBalance = token.balanceOf(address(this));
    // _insert(_args.outputCommitments[0], _args.outputCommitments[1]);
    // emit NewCommitment(_args.outputCommitments[0], nextIndex - 2, _extData.encryptedOutput1);
    // emit NewCommitment(_args.outputCommitments[1], nextIndex - 1, _extData.encryptedOutput2);
    // for (uint256 i = 0; i < _args.inputNullifiers.length; i++) {
    //   emit NewNullifier(_args.inputNullifiers[i]);
    // }

  }

  function _acceptInvestment(ProjectTokenTransferProof memory _args, bytes memory _encryptedOutput) internal nonReentrant {
    require(pendingCommitmentToCommitment[_args.commitmentReceived] != 0, "Pending commitment must still be pending");
    require(_args.tokenId == projectOwnerToToken[msg.sender], "TokenId must be from project owner");
    require(_args.tokenValue == projectTokens[_args.tokenId].value, "Value of token must be same as advertized");

    require(verifyProjectTokenTransferProof(_args), "Invalid project token transfer proof");

    _insert(_args.commitmentSent, _args.commitmentSent);
    emit NewCommitment(_args.commitmentSent, nextIndex - 1, _encryptedOutput);

    bytes32[] memory investmentNullifiers = (pendingCommitmentToNullifiers[_args.commitmentReceived].length > 0) ? pendingCommitmentToNullifiers[_args.commitmentReceived] : pendingCommitmentToNullifiers[pendingCommitmentToCommitment[_args.commitmentReceived]];
    for (uint256 i = 0; i < investmentNullifiers.length; i++) {
      nullifierHashes[investmentNullifiers[i]] = true;
      pendingNullifierHashes[investmentNullifiers[i]] = false;
      emit NewNullifier(investmentNullifiers[i]);
    }

    bytes32 commitment1 = pendingCommitmentToCommitment[_args.commitmentReceived];
    _insert(_args.commitmentReceived, commitment1);
    emit NewCommitment(_args.commitmentReceived, nextIndex - 1, pendingCommitmentToEncryptedOutput[_args.commitmentReceived]);
    emit NewCommitment(pendingCommitmentToCommitment[_args.commitmentReceived], nextIndex - 2, pendingCommitmentToEncryptedOutput[commitment1]);

    pendingCommitmentToCommitment[commitment1] = 0;
    pendingCommitmentToCommitment[_args.commitmentReceived] = 0;


  }


}
