// SPDX-License-Identifier: MIT
pragma solidity ^0.7.0;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";

import { AbstractERC1155 } from '../interfaces/IERC1155.sol';

contract OwnableERC1155 is ERC1155, AbstractERC1155 {

  /**
    @dev The constructor
    @param _tokensUri ERC1155 spec tokens URI
  */
  constructor(
    string memory _tokensUri
  )
  ERC1155(_tokensUri)
  {
    contractOwner = msg.sender;
  }

  function _performMint(address _account, uint256 _id, uint256 _amount, bytes memory _data) internal override {
    _mint(_account, _id, _amount, _data);
  }

  function _performSetURI(string memory _newUri) internal override {
    _setURI(_newUri);
  }

}
