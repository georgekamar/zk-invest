// SPDX-License-Identifier: MIT
pragma solidity ^0.7.0;

import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";

abstract contract AbstractERC1155 is IERC1155 {

  // Variable that maintains
  // owner address
  address internal contractOwner;

  // Publicly exposes who is the
  // owner of this contract
  function owner() public view returns(address)
  {
    return contractOwner;
  }

  // onlyOwner modifier that validates only
  // if caller of function is contract owner,
  // otherwise not
  modifier onlyOwner()
  {
    require(isOwner(), "Function accessible only by the owner");
    _;
  }

  // function for owners to verify their ownership.
  // Returns true for owners otherwise false
  function isOwner() public view returns(bool)
  {
    return msg.sender == contractOwner;
  }


  function changeOwner(address _newOwner) public onlyOwner {
    contractOwner = _newOwner;
  }

  function _performMint(address account, uint256 id, uint256 amount, bytes memory data) internal virtual;

  function mint(address _account, uint256 _id, uint256 _amount, bytes memory _data) onlyOwner public {
    _performMint(_account, _id, _amount, _data);
  }

  function _performSetURI(string memory _newUri) internal virtual;

  function setURI(string memory _newUri) onlyOwner public {
    _performSetURI(_newUri);
  }

}
