// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// Manam Token contract tho matladali kabatti idi interface
interface IMintableToken {
    function mint(address to, uint256 amount) external;
}

contract TokenFaucet {
    // --- SETTINGS (Rules) ---
    uint256 public constant FAUCET_AMOUNT = 10 * 10**18;    // Okasari 10 Tokens istam
    uint256 public constant COOLDOWN_TIME = 24 hours;       // 24 hours waiting period
    uint256 public constant MAX_CLAIM_AMOUNT = 50 * 10**18; // Jeevitham lo max 50 Tokens matrame tiskovali
    
    // --- STATE VARIABLES (Memory) ---
    IMintableToken public token;
    address public admin;
    bool public isPaused;

    // Evaru eppudu tiskunnaru? (User Address => Time)
    mapping(address => uint256) public lastClaimAt;
    
    // Evaru total ga enni tiskunnaru? (User Address => Amount)
    mapping(address => uint256) public totalClaimed;

    // --- EVENTS (Logs for Website) ---
    event TokensClaimed(address indexed user, uint256 amount, uint256 timestamp);
    event FaucetPaused(bool isPaused);

    // --- CONSTRUCTOR ---
    constructor(address _tokenAddress) {
        token = IMintableToken(_tokenAddress);
        admin = msg.sender; // Nuvve admin
        isPaused = false;
    }

    // --- MAIN FUNCTION: Claim Tokens ---
    function requestTokens() external {
        require(!isPaused, "Faucet is paused");
        require(canClaim(msg.sender), "Cooldown active or limit reached");
        
        // Update user data
        lastClaimAt[msg.sender] = block.timestamp;
        totalClaimed[msg.sender] += FAUCET_AMOUNT;
        
        // Give tokens
        token.mint(msg.sender, FAUCET_AMOUNT);
        
        emit TokensClaimed(msg.sender, FAUCET_AMOUNT, block.timestamp);
    }

    // --- HELPER FUNCTIONS (For Frontend) ---
    
    // Check if user is allowed to claim now
    function canClaim(address user) public view returns (bool) {
        if (isPaused) return false;
        if (totalClaimed[user] >= MAX_CLAIM_AMOUNT) return false;
        if (block.timestamp < lastClaimAt[user] + COOLDOWN_TIME) return false;
        return true;
    }

    // Check how many tokens user can still claim in future
    function remainingAllowance(address user) external view returns (uint256) {
        if (totalClaimed[user] >= MAX_CLAIM_AMOUNT) return 0;
        return MAX_CLAIM_AMOUNT - totalClaimed[user];
    }

    // --- ADMIN FUNCTIONS ---
    function setPaused(bool _state) external {
        require(msg.sender == admin, "Only admin");
        isPaused = _state;
        emit FaucetPaused(_state);
    }
}