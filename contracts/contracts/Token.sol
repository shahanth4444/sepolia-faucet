// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MyToken
 * @dev ERC20 Token with controlled minting through a faucet contract
 * @notice This token can only be minted by the designated faucet address
 */
contract MyToken is ERC20, Ownable {
    /// @notice Maximum supply of tokens (1 Million tokens)
    uint256 public constant MAX_SUPPLY = 1000000 * 10**18;
    
    /// @notice Address of the authorized faucet contract
    address public faucetAddress;

    /// @dev Emitted when the faucet address is updated
    event FaucetAddressSet(address indexed oldFaucet, address indexed newFaucet);

    /**
     * @dev Constructor initializes the token with name and symbol
     * @notice Initial supply is 0, tokens are minted through the faucet
     */
    constructor() ERC20("SepoliaTestToken", "STT") Ownable(msg.sender) {
        // Constructor is empty as faucet will mint tokens
    }

    /**
     * @notice Sets the faucet address that is authorized to mint tokens
     * @dev Only the contract owner can call this function
     * @param _faucet Address of the faucet contract
     */
    function setFaucetAddress(address _faucet) external onlyOwner {
        require(_faucet != address(0), "Faucet address cannot be zero");
        address oldFaucet = faucetAddress;
        faucetAddress = _faucet;
        emit FaucetAddressSet(oldFaucet, _faucet);
    }

    /**
     * @notice Mints new tokens to a specified address
     * @dev Only the faucet contract can call this function
     * @param to Address to receive the minted tokens
     * @param amount Amount of tokens to mint
     */
    function mint(address to, uint256 amount) external {
        require(msg.sender == faucetAddress, "Only faucet can mint");
        require(to != address(0), "Cannot mint to zero address");
        require(totalSupply() + amount <= MAX_SUPPLY, "Max supply exceeded");
        _mint(to, amount);
    }
}