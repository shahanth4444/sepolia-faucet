// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MyToken is ERC20, Ownable {
    // Manam max 1 Million tokens create chestunnam
    uint256 public constant MAX_SUPPLY = 1000000 * 10**18;
    
    // Faucet address ni ikkada save chestam
    address public faucetAddress;

    constructor() ERC20("SepoliaTestToken", "STT") Ownable(msg.sender) {
        // Constructor empty ga undi, endukante Faucet mint chestundi
    }

    // Faucet address ni set chese function (Only owner can call)
    function setFaucetAddress(address _faucet) external onlyOwner {
        faucetAddress = _faucet;
    }

    // Faucet matrame tokens create cheyagalladu
    function mint(address to, uint256 amount) external {
        require(msg.sender == faucetAddress, "Only faucet can mint");
        require(totalSupply() + amount <= MAX_SUPPLY, "Max supply exceeded");
        _mint(to, amount);
    }
}