// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IMintableToken
 * @dev Interface for tokens that support minting
 */
interface IMintableToken {
    function mint(address to, uint256 amount) external;
}

/**
 * @title TokenFaucet
 * @dev A faucet contract that distributes ERC20 tokens with rate limiting
 * @notice Users can claim tokens once per cooldown period up to a maximum lifetime amount
 */
contract TokenFaucet {
    // --- CONSTANTS ---
    /// @notice Amount of tokens distributed per claim (10 tokens)
    uint256 public constant FAUCET_AMOUNT = 10 * 10**18;
    
    /// @notice Cooldown period between claims (24 hours)
    uint256 public constant COOLDOWN_TIME = 24 hours;
    
    /// @notice Maximum total amount a user can claim (50 tokens)
    uint256 public constant MAX_CLAIM_AMOUNT = 50 * 10**18;
    
    // --- STATE VARIABLES ---
    /// @notice The token contract that this faucet distributes
    IMintableToken public token;
    
    /// @notice Administrator address with special privileges
    address public admin;
    
    /// @notice Whether the faucet is currently paused
    bool public isPaused;

    /// @notice Mapping of user addresses to their last claim timestamp
    mapping(address => uint256) public lastClaimAt;
    
    /// @notice Mapping of user addresses to their total claimed amount
    mapping(address => uint256) public totalClaimed;

    // --- EVENTS ---
    /// @dev Emitted when a user successfully claims tokens
    event TokensClaimed(address indexed user, uint256 amount, uint256 timestamp);
    
    /// @dev Emitted when the faucet pause state changes
    event FaucetPaused(bool isPaused);

    // --- ERRORS ---
    error FaucetIsPaused();
    error CannotClaimYet();
    error MaxClaimReached();
    error OnlyAdmin();

    /**
     * @dev Constructor sets the token address and admin
     * @param _tokenAddress Address of the ERC20 token to distribute
     */
    constructor(address _tokenAddress) {
        require(_tokenAddress != address(0), "Token address cannot be zero");
        token = IMintableToken(_tokenAddress);
        admin = msg.sender;
        isPaused = false;
    }

    /**
     * @notice Request tokens from the faucet
     * @dev Checks cooldown period and claim limits before minting tokens
     */
    function requestTokens() external {
        if (isPaused) revert FaucetIsPaused();
        if (!canClaim(msg.sender)) revert CannotClaimYet();
        
        // Update user data
        lastClaimAt[msg.sender] = block.timestamp;
        totalClaimed[msg.sender] += FAUCET_AMOUNT;
        
        // Mint tokens to user
        token.mint(msg.sender, FAUCET_AMOUNT);
        
        emit TokensClaimed(msg.sender, FAUCET_AMOUNT, block.timestamp);
    }

    /**
     * @notice Check if a user is eligible to claim tokens
     * @param user Address to check
     * @return bool True if user can claim, false otherwise
     */
    function canClaim(address user) public view returns (bool) {
        if (isPaused) return false;
        if (totalClaimed[user] >= MAX_CLAIM_AMOUNT) return false;
        if (block.timestamp < lastClaimAt[user] + COOLDOWN_TIME) return false;
        return true;
    }

    /**
     * @notice Get the remaining amount a user can claim in the future
     * @param user Address to check
     * @return uint256 Remaining claimable amount
     */
    function remainingAllowance(address user) external view returns (uint256) {
        if (totalClaimed[user] >= MAX_CLAIM_AMOUNT) return 0;
        return MAX_CLAIM_AMOUNT - totalClaimed[user];
    }

    /**
     * @notice Get the time remaining until a user can claim again
     * @param user Address to check
     * @return uint256 Seconds until next claim (0 if can claim now)
     */
    function timeUntilNextClaim(address user) external view returns (uint256) {
        if (lastClaimAt[user] == 0) return 0;
        uint256 nextClaimTime = lastClaimAt[user] + COOLDOWN_TIME;
        if (block.timestamp >= nextClaimTime) return 0;
        return nextClaimTime - block.timestamp;
    }

    /**
     * @notice Pause or unpause the faucet
     * @dev Only admin can call this function
     * @param _state True to pause, false to unpause
     */
    function setPaused(bool _state) external {
        if (msg.sender != admin) revert OnlyAdmin();
        isPaused = _state;
        emit FaucetPaused(_state);
    }

    /**
     * @notice Transfer admin rights to a new address
     * @dev Only current admin can call this function
     * @param newAdmin Address of the new admin
     */
    function transferAdmin(address newAdmin) external {
        if (msg.sender != admin) revert OnlyAdmin();
        require(newAdmin != address(0), "New admin cannot be zero address");
        admin = newAdmin;
    }
}