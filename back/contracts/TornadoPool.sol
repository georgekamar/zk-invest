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
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155Receiver.sol";

import { AbstractERC1155 } from './interfaces/IERC1155.sol';

// import { IERC20Receiver, IERC6777, IOmniBridge } from "./interfaces/IBridge.sol";
// import { CrossChainGuard } from "./bridge/CrossChainGuard.sol";
import { IVerifier } from "./interfaces/IVerifier.sol";
import "./MerkleTreeWithHistory.sol";

/** @dev This contract(pool) allows deposit of an arbitrary amount to it, shielded transfer to another registered user inside the pool
 * and withdrawal from the pool. Project utilizes UTXO model to handle users' funds.
 */
contract TornadoPool is MerkleTreeWithHistory, ReentrancyGuard, IERC1155Receiver {
  int256 public constant MAX_EXT_AMOUNT = 2**248;
  uint256 public constant MAX_FEE = 2**248;
  uint256 public constant MIN_EXT_AMOUNT_LIMIT = 0.5 ether;

  IVerifier public immutable verifier2;
  IVerifier public immutable verifier16;
  IERC20 public immutable token;

  AbstractERC1155 public immutable projectTokensContract;

  // address public immutable omniBridge;
  // address public immutable l1Unwrapper;
  address public immutable multisig;

  uint256 public lastBalance;

  uint256 public __gap; // storage padding to prevent storage collision
  uint256 public maximumDepositAmount;
  mapping(bytes32 => bool) public nullifierHashes;

  mapping(bytes32 => bool) public pendingNullifierHashes;

  mapping(uint256 => address) public projectTokenToOwner;


  struct ExtData {
    address recipient;
    int256 extAmount;
    uint256 publicTokenId;
    address relayer;
    uint256 fee;
    bytes encryptedOutput1;
    bytes encryptedOutput2;
  }

  struct Proof {
    bytes proof;
    bytes32 root;
    bytes32[] inputNullifiers;
    bytes32[2] outputCommitments;
    uint256 publicAmount;
    uint256 publicTokenId;
    bytes32 extDataHash;
  }

  struct Account {
    address owner;
    bytes publicKey;
  }

  event NewCommitment(bytes32 commitment, uint256 index, bytes encryptedOutput);
  event NewNullifier(bytes32 nullifier);
  event PublicKey(address indexed owner, bytes key);

  modifier onlyMultisig() {
    require(msg.sender == multisig, "only governance");
    _;
  }

  /**
    @dev The constructor
    @param _verifier2 the address of SNARK verifier for 2 inputs
    @param _verifier16 the address of SNARK verifier for 16 inputs
    @param _levels hight of the commitments merkle tree
    @param _hasher hasher address for the merkle tree
    @param _token token address for the pool
    @param _projectTokensContract ERC1155 tokens for the pool
    @param _multisig multisig on L2
  */
  constructor(
    IVerifier _verifier2,
    IVerifier _verifier16,
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
    MerkleTreeWithHistory(_levels, _hasher)
    // CrossChainGuard(address(IOmniBridge(_omniBridge).bridgeContract()), _l1ChainId, _governance)
  {
    verifier2 = _verifier2;
    verifier16 = _verifier16;
    token = _token;
    projectTokensContract = _projectTokensContract;
    // omniBridge = _omniBridge;
    // l1Unwrapper = _l1Unwrapper;
    multisig = _multisig;
  }

  function initialize(uint256 _maximumDepositAmount) external initializer {
    _configureLimits(_maximumDepositAmount);
    super._initialize();
  }

  /** @dev Main function that allows deposits, transfers and withdrawal.
   */
  function transact(Proof memory _args, ExtData memory _extData) public {
    _transact(_args, _extData);
  }

  function register(Account memory _account) public {
    require(_account.owner == msg.sender, "only owner can be registered");
    _register(_account);
  }

  function registerAndTransact(
    Account memory _account,
    Proof memory _proofArgs,
    ExtData memory _extData
  ) public {
    register(_account);
    transact(_proofArgs, _extData);
  }

  // function onTokenBridged(
  //   IERC6777 _token,
  //   uint256 _amount,
  //   bytes calldata _data
  // ) external override {
  //   (Proof memory _args, ExtData memory _extData) = abi.decode(_data, (Proof, ExtData));
  //   require(_token == token, "provided token is not supported");
  //   require(msg.sender == omniBridge, "only omni bridge");
  //   require(_amount >= uint256(_extData.extAmount), "amount from bridge is incorrect");
  //   require(token.balanceOf(address(this)) >= uint256(_extData.extAmount) + lastBalance, "bridge did not send enough tokens");
  //   require(uint256(_extData.extAmount) <= maximumDepositAmount, "amount is larger than maximumDepositAmount");
  //   uint256 sentAmount = token.balanceOf(address(this)) - lastBalance;
  //   try TornadoPool(address(this)).onTransact(_args, _extData) {} catch (bytes memory) {
  //     token.transfer(multisig, sentAmount);
  //   }
  // }

  /**
   * @dev Wrapper for the internal func _transact to call it using try-catch from onTokenBridged
   */
  // function onTransact(Proof memory _args, ExtData memory _extData) external {
  //   require(msg.sender == address(this), "can be called only from onTokenBridged");
  //   _transact(_args, _extData);
  // }

  function onERC1155Received(address, address, uint256, uint256 value, bytes memory) public override pure returns (bytes4) {
    // Since project token deposit is not implemented, prevent non 0 amounts to be sent to address
    if(value == 0){
      return bytes4(keccak256("onERC1155Received(address,address,uint256,uint256,bytes)"));
    }else{
      return bytes4("");
    }
  }

  function onERC1155BatchReceived(address, address, uint256[] memory, uint256[] memory values, bytes memory) public override pure returns (bytes4) {
    // Since project token deposit is not implemented, prevent non 0 amounts to be sent to address
    bool valuesAreZero = true;
    for(uint256 i = 0; i < values.length; i++){
      if(values[i] != 0){
        valuesAreZero = false;
      }
    }
    if(valuesAreZero == true){
      return bytes4(keccak256("onERC1155BatchReceived(address,address,uint256[],uint256[],bytes)"));
    }else{
      return bytes4("");
    }
  }

  function supportsInterface(bytes4 interfaceID) external override pure returns (bool) {
    return  interfaceID == 0x01ffc9a7 ||    // ERC-165 support (i.e. `bytes4(keccak256('supportsInterface(bytes4)'))`).
            interfaceID == 0x4e2312e0;      // ERC-1155 `ERC1155TokenReceiver` support (i.e. `bytes4(keccak256("onERC1155Received(address,address,uint256,uint256,bytes)")) ^ bytes4(keccak256("onERC1155BatchReceived(address,address,uint256[],uint256[],bytes)"))`).
  }


  /// @dev Method to claim junk and accidentally sent tokens
  function rescueTokens(
    IERC20 _token,
    address payable _to,
    uint256 _balance
  ) external onlyMultisig {
    require(_to != address(0), "TORN: can not send to zero address");
    require(_token != token, "can not rescue pool asset");

    if (_token == IERC20(0)) {
      // for Ether
      uint256 totalBalance = address(this).balance;
      uint256 balance = _balance == 0 ? totalBalance : _balance;
      _to.transfer(balance);
    } else {
      // any other erc20
      uint256 totalBalance = _token.balanceOf(address(this));
      uint256 balance = _balance == 0 ? totalBalance : _balance;
      require(balance > 0, "TORN: trying to send 0 balance");
      _token.transfer(_to, balance);
    }
  }

  function configureLimits(uint256 _maximumDepositAmount) public onlyMultisig {
    _configureLimits(_maximumDepositAmount);
  }

  function setProjectTokensURI(string memory _newUri) public onlyMultisig {
    projectTokensContract.setURI(_newUri);
  }

  function calculatePublicAmount(int256 _extAmount, uint256 _fee) public pure returns (uint256) {
    require(_fee < MAX_FEE, "Invalid fee");
    require(_extAmount > -MAX_EXT_AMOUNT && _extAmount < MAX_EXT_AMOUNT, "Invalid ext amount");
    int256 publicAmount = _extAmount - int256(_fee);
    return (publicAmount >= 0) ? uint256(publicAmount) : FIELD_SIZE - uint256(-publicAmount);
  }

  /** @dev whether a note is already spent */
  function isSpent(bytes32 _nullifierHash) public view returns (bool) {
    return nullifierHashes[_nullifierHash];
  }
  function isPending(bytes32 _nullifierHash) public view returns (bool) {
    return pendingNullifierHashes[_nullifierHash];
  }

  function verifyProof(Proof memory _args) public view returns (bool) {
    if (_args.inputNullifiers.length == 2) {
      return
        verifier2.verifyProof(
          _args.proof,
          [
            uint256(_args.root),
            _args.publicAmount,
            uint256(_args.publicTokenId),
            uint256(_args.extDataHash),
            uint256(_args.inputNullifiers[0]),
            uint256(_args.inputNullifiers[1]),
            uint256(_args.outputCommitments[0]),
            uint256(_args.outputCommitments[1])
          ]
        );
    } else if (_args.inputNullifiers.length == 16) {
      return
        verifier16.verifyProof(
          _args.proof,
          [
            uint256(_args.root),
            _args.publicAmount,
            uint256(_args.publicTokenId),
            uint256(_args.extDataHash),
            uint256(_args.inputNullifiers[0]),
            uint256(_args.inputNullifiers[1]),
            uint256(_args.inputNullifiers[2]),
            uint256(_args.inputNullifiers[3]),
            uint256(_args.inputNullifiers[4]),
            uint256(_args.inputNullifiers[5]),
            uint256(_args.inputNullifiers[6]),
            uint256(_args.inputNullifiers[7]),
            uint256(_args.inputNullifiers[8]),
            uint256(_args.inputNullifiers[9]),
            uint256(_args.inputNullifiers[10]),
            uint256(_args.inputNullifiers[11]),
            uint256(_args.inputNullifiers[12]),
            uint256(_args.inputNullifiers[13]),
            uint256(_args.inputNullifiers[14]),
            uint256(_args.inputNullifiers[15]),
            uint256(_args.outputCommitments[0]),
            uint256(_args.outputCommitments[1])
          ]
        );
    } else {
      revert("unsupported input count");
    }
  }

  function _register(Account memory _account) internal {
    emit PublicKey(_account.owner, _account.publicKey);
  }

  function _preTransact(Proof memory _args, ExtData memory _extData) internal view {
    require(isKnownRoot(_args.root), "Invalid merkle root");
    // require(_args.isInvestment == false, "Cannot be an investment transaction");
    for (uint256 i = 0; i < _args.inputNullifiers.length; i++) {
      require(!isSpent(_args.inputNullifiers[i]), "Input is already spent");
      require(!isPending(_args.inputNullifiers[i]), "Input pending");
    }
    require(uint256(_args.extDataHash) == uint256(keccak256(abi.encode(_extData))) % FIELD_SIZE, "Incorrect external data hash");
    require(_args.publicTokenId == _extData.publicTokenId, "Non-matching public token IDs");
    require(projectTokenToOwner[_args.publicTokenId] != address(0), "Invalid public token ID");
    require(_args.publicAmount == calculatePublicAmount(_extData.extAmount, _extData.fee), "Invalid public amount");
    if (_extData.extAmount > 0) {
      require(_extData.publicTokenId == 0, "Deposits only in main trade token");
    }
    require(verifyProof(_args), "Invalid transaction proof");

  }

  function _transact(Proof memory _args, ExtData memory _extData) internal nonReentrant {

    _preTransact(_args, _extData);

    for (uint256 i = 0; i < _args.inputNullifiers.length; i++) {
      nullifierHashes[_args.inputNullifiers[i]] = true;
    }

    if (_extData.extAmount > 0) {
      // for deposits from L2
      // if(_extData.publicTokenId == 0){
      token.transferFrom(msg.sender, address(this), uint256(_extData.extAmount));
      // }else{
        // safeTransferFrom(msg.sender, address(this), uint256(_extData.publicTokenId), uint256(_extData.extAmount), "");
      // }
      require(uint256(_extData.extAmount) <= maximumDepositAmount, "amount is larger than maximumDepositAmount");
    }

    if (_extData.extAmount < 0) {
      require(_extData.recipient != address(0), "Can't withdraw to zero address");
      // if (_extData.isL1Withdrawal) {
      //   token.transferAndCall(
      //     omniBridge,
      //     uint256(-_extData.extAmount),
      //     abi.encodePacked(l1Unwrapper, abi.encode(_extData.recipient, _extData.l1Fee))
      //   );
      // } else {
      if(_extData.publicTokenId == 0){
        token.transfer(_extData.recipient, uint256(-_extData.extAmount));
        lastBalance = token.balanceOf(address(this));
      }else{
        projectTokensContract.mint(_extData.recipient, _extData.publicTokenId, uint256(-_extData.extAmount), "");
      }
      // }
    }
    if (_extData.fee > 0) {
      token.transfer(_extData.relayer, _extData.fee);
    }

    _insert(_args.outputCommitments[0], _args.outputCommitments[1]);
    emit NewCommitment(_args.outputCommitments[0], nextIndex - 2, _extData.encryptedOutput1);
    emit NewCommitment(_args.outputCommitments[1], nextIndex - 1, _extData.encryptedOutput2);
    for (uint256 i = 0; i < _args.inputNullifiers.length; i++) {
      emit NewNullifier(_args.inputNullifiers[i]);
    }
  }

  function _configureLimits(uint256 _maximumDepositAmount) internal {
    maximumDepositAmount = _maximumDepositAmount;
  }
}
