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

import "./TornadoPool.sol";

import { IVerifier } from "./interfaces/IVerifier.sol";


contract ZkInvest is TornadoPool {

  IVerifier public immutable projectTokenTransferVerifier;

  // mapping from project owner to project token (for existence)
  mapping(address => uint256) public projectOwnerToToken;
  mapping(bytes32 => bytes32[]) public pendingCommitmentToNullifiers;
  mapping(bytes32 => bytes32) public pendingCommitmentToCommitment;
  mapping(bytes32 => bytes) public pendingCommitmentToEncryptedOutput;

  // for pending transactions
  // mapping(bytes32 => bool) public pendingNullifierHashes;

  struct ProjectTokenTransferProof {
    bytes proof;
    bytes32 commitmentReceived;
    bytes32 commitmentSent;
    uint256 tokenValue;
    uint256 sentTokenId;
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

  struct EncryptedOutputs {
    bytes encryptedOutput1;
    bytes encryptedOutput2;
  }

  event NewPendingCommitment(bytes32 commitment, bytes encryptedOutput);
  event NewProjectCreated(bytes creator, uint256 tokenId, string title, string description);

  ProjectToken[] public projectTokens;
  Project[] public projects;

  /**
    @dev The constructor
    @param _verifiers the addresses of SNARK verifiers: 0 is verifier2, 1 is verifier16, 2 is projectTokenTransferVerifier
    @param _levels hight of the commitments merkle tree
    @param _hasher hasher address for the merkle tree
    @param _token token address for the pool
    @param _projectTokensContract ERC1155 tokens for the pool
    @param _multisig multisig on L2
  */
  constructor(
    IVerifier[3] memory _verifiers,
    uint32 _levels,
    address _hasher,
    IERC20 _token,
    AbstractERC1155 _projectTokensContract,
    // address _omniBridge,
    // address _l1Unwrapper,
    // address _governance,
    // uint256 _l1ChainId,
    address _multisig
  )
    TornadoPool(_verifiers[0], _verifiers[1], _levels, _hasher, _token, _projectTokensContract, _multisig)
  {
    projectTokenTransferVerifier = _verifiers[2];
    // _initializeProjects();
  }


  // function isPending(bytes32 _nullifierHash) public view returns (bool) {
  //   return pendingNullifierHashes[_nullifierHash];
  // }


  // function changeTokenValue(
  //   uint256 _tokenId,
  //   uint256 _newValue
  // ) public {
  //   require(projectTokenToOwner[_tokenId] == msg.sender, "only project owner can change token value");
  //   projectTokens[_tokenId].value = _newValue;
  // }

  function _initializeProjects() internal {
    if(projects.length == 0){
      projectTokensContract.mint(address(this), 0, 0, "");
      projectTokens.push(ProjectToken(0, 0));
      projects.push(Project(Account(address(this), ""), 0, "Reserved", "none"));
      projectTokenToOwner[0] = address(this);
    }
  }

  function createProject(
    Account memory _account,
    string memory _title,
    string memory _description,
    uint256 _tokenValue
  ) public {
    register(_account);
    require(projectOwnerToToken[_account.owner] == 0, "only one project per address");
    _initializeProjects();
    // create new token type here
    uint256 newProjectTokenId = projectTokens.length;
    projectTokensContract.mint(address(this), newProjectTokenId, 0, "");
    projectTokenToOwner[newProjectTokenId] = _account.owner;
    projectOwnerToToken[_account.owner] = newProjectTokenId;
    projectTokens.push(ProjectToken(newProjectTokenId, _tokenValue));
    projects.push(Project(_account, newProjectTokenId, _title, _description));
    NewProjectCreated(_account.publicKey, newProjectTokenId, _title, _description);
  }

  function verifyProjectTokenTransferProof(ProjectTokenTransferProof memory _args) public view returns (bool) {
    return
      projectTokenTransferVerifier.verifyProof(
        _args.proof,
        [
          uint256(_args.commitmentReceived),
          uint256(_args.commitmentSent),
          uint256(_args.tokenValue),
          uint256(_args.sentTokenId)
        ]
      );
  }

  // function transact(Proof memory _args, ExtData memory _extData) public override {
  //   if (_extData.extAmount > 0) {
  //     // for deposits from L2
  //     token.transferFrom(msg.sender, address(this), uint256(_extData.extAmount));
  //     require(uint256(_extData.extAmount) <= maximumDepositAmount, "amount is larger than maximumDepositAmount");
  //   }
  //   _transact(_args, _extData);
  // }

  function transactWithProject(Proof memory _args, ExtData memory _extData, EncryptedOutputs memory _cancellable) public nonReentrant {

    // Logic for direct investment requires adding token transfer
    // commitment to the merkle tree first for its nullifier to be valid
    // in the future and for pending project transaction to be cancellable
    // comes down to making a deposit to pool then making investment transaction
    require(_extData.extAmount == 0, "Investment only possible from shielded pool");

    _preTransact(_args, _extData);

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
    emit NewPendingCommitment(_args.outputCommitments[0], _cancellable.encryptedOutput1);
    emit NewPendingCommitment(_args.outputCommitments[1], _cancellable.encryptedOutput2);

    // lastBalance = token.balanceOf(address(this));
    // _insert(_args.outputCommitments[0], _args.outputCommitments[1]);
    // emit NewCommitment(_args.outputCommitments[0], nextIndex - 2, _extData.encryptedOutput1);
    // emit NewCommitment(_args.outputCommitments[1], nextIndex - 1, _extData.encryptedOutput2);
    // for (uint256 i = 0; i < _args.inputNullifiers.length; i++) {
    //   emit NewNullifier(_args.inputNullifiers[i]);
    // }

  }

  function cancelInvestment(Proof memory _args) public {
    require(isKnownRoot(_args.root), "Invalid merkle root");
    require(pendingCommitmentToCommitment[_args.outputCommitments[0]] == _args.outputCommitments[1], "Pending commitment 1 must still be pending");
    require(pendingCommitmentToCommitment[_args.outputCommitments[1]] == _args.outputCommitments[0], "Pending commitment 2 must still be pending");
    for (uint256 i = 0; i < _args.inputNullifiers.length; i++) {
      require(!isSpent(_args.inputNullifiers[i]), "Input already spent");
    }
    require(verifyProof(_args), "Invalid transaction proof");

    bytes32[] memory investmentNullifiers = (pendingCommitmentToNullifiers[_args.outputCommitments[0]].length > 0) ? pendingCommitmentToNullifiers[_args.outputCommitments[0]] : pendingCommitmentToNullifiers[_args.outputCommitments[1]];

    for (uint256 i = 0; i < investmentNullifiers.length; i++) {
      delete pendingNullifierHashes[investmentNullifiers[i]];
    }

    delete pendingCommitmentToCommitment[_args.outputCommitments[0]];
    delete pendingCommitmentToCommitment[_args.outputCommitments[1]];
    delete pendingCommitmentToNullifiers[_args.outputCommitments[0]];
    delete pendingCommitmentToNullifiers[_args.outputCommitments[1]];
    delete pendingCommitmentToEncryptedOutput[_args.outputCommitments[0]];
    delete pendingCommitmentToEncryptedOutput[_args.outputCommitments[1]];

  }

  function acceptInvestment(ProjectTokenTransferProof memory _args, EncryptedOutputs memory _encryptedOutputs, bytes32 _emptyCommitment) public nonReentrant {
    require(pendingCommitmentToCommitment[_args.commitmentReceived] != bytes32(0x0), "Pending commitment must still be pending");
    require(_args.sentTokenId == projectOwnerToToken[msg.sender], "TokenId must be from project owner");
    require(_args.tokenValue == projectTokens[_args.sentTokenId].value, "Value of token must be same as advertized");

    require(verifyProjectTokenTransferProof(_args), "Invalid project token transfer proof");

    _insert(_args.commitmentSent, _emptyCommitment);
    emit NewCommitment(_args.commitmentSent, nextIndex - 2, _encryptedOutputs.encryptedOutput1);
    emit NewCommitment(_emptyCommitment, nextIndex - 1, _encryptedOutputs.encryptedOutput2);

    bytes32 commitment1 = pendingCommitmentToCommitment[_args.commitmentReceived];
    _insert(_args.commitmentReceived, commitment1);
    emit NewCommitment(_args.commitmentReceived, nextIndex - 2, pendingCommitmentToEncryptedOutput[_args.commitmentReceived]);
    emit NewCommitment(commitment1, nextIndex - 1, pendingCommitmentToEncryptedOutput[commitment1]);

    bytes32[] memory investmentNullifiers = (pendingCommitmentToNullifiers[_args.commitmentReceived].length > 0) ? pendingCommitmentToNullifiers[_args.commitmentReceived] : pendingCommitmentToNullifiers[commitment1];
    for (uint256 i = 0; i < investmentNullifiers.length; i++) {
      nullifierHashes[investmentNullifiers[i]] = true;
      pendingNullifierHashes[investmentNullifiers[i]] = false;
      emit NewNullifier(investmentNullifiers[i]);
    }

    pendingCommitmentToCommitment[commitment1] = 0;
    pendingCommitmentToCommitment[_args.commitmentReceived] = 0;


  }


}
