import { useState, useEffect } from 'react';
import { ethers } from 'ethers';

// --- CONFIGURATION ---
const TOKEN_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function transfer(address, uint256) returns (bool)"
];
const FAUCET_ABI = [
  "function requestTokens()",
  "function canClaim(address) view returns (bool)",
  "function remainingAllowance(address) view returns (uint256)",
  "function lastClaimAt(address) view returns (uint256)",
  "function COOLDOWN_TIME() view returns (uint256)"
];

// --- DARK MODE STYLES ---
const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    height: "100vh",
    width: "100vw",
    backgroundColor: "#000000", // Pure Black Background
    color: "#ffffff",
    fontFamily: "'Courier New', Courier, monospace", // Tech/Hacker font
  },
  card: {
    backgroundColor: "#111111", // Dark Gray Card
    padding: "50px",
    borderRadius: "15px",
    border: "1px solid #333",
    boxShadow: "0 0 20px rgba(0, 255, 0, 0.1)", // Subtle Green Glow
    textAlign: "center",
    maxWidth: "500px",
    width: "90%",
  },
  title: {
    fontSize: "32px",
    marginBottom: "10px",
    color: "#ffffff",
    letterSpacing: "2px",
    textTransform: "uppercase",
  },
  subtitle: {
    color: "#888",
    marginBottom: "40px",
    fontSize: "14px",
  },
  statsContainer: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: "30px",
    gap: "20px",
  },
  statBox: {
    backgroundColor: "#000",
    padding: "15px",
    borderRadius: "8px",
    border: "1px solid #222",
    flex: 1,
  },
  statLabel: {
    color: "#666",
    fontSize: "12px",
    marginBottom: "5px",
    textTransform: "uppercase",
  },
  statValue: {
    fontSize: "18px",
    fontWeight: "bold",
    color: "#00ff88", // Neon Green Text
  },
  button: {
    backgroundColor: "#00ff88", // Neon Green Button
    color: "#000",
    border: "none",
    padding: "18px 40px",
    fontSize: "16px",
    fontWeight: "bold",
    borderRadius: "8px",
    cursor: "pointer",
    width: "100%",
    textTransform: "uppercase",
    transition: "0.3s",
  },
  buttonDisabled: {
    backgroundColor: "#333",
    color: "#666",
    cursor: "not-allowed",
  },
  walletInfo: {
    backgroundColor: "#222",
    padding: "10px",
    borderRadius: "5px",
    color: "#bbb",
    fontSize: "13px",
    marginBottom: "30px",
    display: "inline-block",
  },
  statusMsg: {
    marginTop: "20px",
    padding: "10px",
    fontSize: "14px",
    borderRadius: "4px",
  },
};

function App() {
  const [account, setAccount] = useState(null);
  const [balance, setBalance] = useState("0");
  const [allowance, setAllowance] = useState("0");
  const [canClaim, setCanClaim] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ msg: "", color: "" });
  const [timeUntilClaim, setTimeUntilClaim] = useState(0);

  const TOKEN_ADDR = import.meta.env.VITE_TOKEN_ADDRESS;
  const FAUCET_ADDR = import.meta.env.VITE_FAUCET_ADDRESS;

  async function connectWallet() {
    if (!window.ethereum) return alert("Please install MetaMask!");
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      setAccount(address);
      updateData(provider, address);
    } catch (err) {
      console.error(err);
    }
  }

  async function updateData(provider, address) {
    const token = new ethers.Contract(TOKEN_ADDR, TOKEN_ABI, provider);
    const faucet = new ethers.Contract(FAUCET_ADDR, FAUCET_ABI, provider);

    const bal = await token.balanceOf(address);
    const allow = await faucet.remainingAllowance(address);
    const claimable = await faucet.canClaim(address);
    const lastClaim = await faucet.lastClaimAt(address);

    // Calculate time until next claim
    if (lastClaim > 0) {
      const cooldownTime = 24 * 60 * 60; // 24 hours in seconds
      const nextClaimTime = Number(lastClaim) + cooldownTime;
      const now = Math.floor(Date.now() / 1000);
      const timeRemaining = Math.max(0, nextClaimTime - now);
      setTimeUntilClaim(timeRemaining);
    } else {
      setTimeUntilClaim(0);
    }

    setBalance(ethers.formatEther(bal));
    setAllowance(ethers.formatEther(allow));
    setCanClaim(claimable);
  }

  async function handleClaim() {
    if (!account) return;
    setLoading(true);
    setStatus({ msg: "Processing Transaction...", color: "#FFA500" }); // Orange
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const faucet = new ethers.Contract(FAUCET_ADDR, FAUCET_ABI, signer);

      const tx = await faucet.requestTokens();
      await tx.wait();

      setStatus({ msg: "Success! Tokens Sent.", color: "#00ff88" }); // Green
      updateData(provider, account);
    } catch (err) {
      console.error(err);
      setStatus({ msg: "Transaction Failed", color: "#ff4444" }); // Red
    }
    setLoading(false);
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>Sepolia Faucet</h1>
        <p style={styles.subtitle}>Secure Blockchain Token Distribution</p>

        {!account ? (
          <button
            onClick={connectWallet}
            style={styles.button}
            onMouseOver={(e) => e.target.style.opacity = "0.8"}
            onMouseOut={(e) => e.target.style.opacity = "1"}
          >
            Connect Wallet
          </button>
        ) : (
          <>
            <div style={styles.walletInfo}>
              Wallet: {account.slice(0, 6)}...{account.slice(-4)}
            </div>

            <div style={styles.statsContainer}>
              <div style={styles.statBox}>
                <div style={styles.statLabel}>Balance</div>
                <div style={styles.statValue}>{parseFloat(balance).toFixed(2)} STT</div>
              </div>
              <div style={styles.statBox}>
                <div style={styles.statLabel}>Remaining</div>
                <div style={styles.statValue}>{parseFloat(allowance).toFixed(2)} STT</div>
              </div>
            </div>

            {timeUntilClaim > 0 && (
              <div style={{ ...styles.walletInfo, marginBottom: "20px", backgroundColor: "#1a1a1a" }}>
                ⏱️ Next claim in: {Math.floor(timeUntilClaim / 3600)}h {Math.floor((timeUntilClaim % 3600) / 60)}m {timeUntilClaim % 60}s
              </div>
            )}

            <button
              onClick={handleClaim}
              disabled={loading || !canClaim}
              style={{
                ...styles.button,
                ...(loading || !canClaim ? styles.buttonDisabled : {})
              }}
            >
              {loading ? "MINTING..." : canClaim ? "CLAIM TOKENS" : "COOLDOWN ACTIVE"}
            </button>

            {status.msg && (
              <div style={{ ...styles.statusMsg, color: status.color, border: `1px solid ${status.color}` }}>
                {status.msg}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// --- EVALUATION INTERFACE ---
// Expose functions for automated evaluation
if (typeof window !== 'undefined') {
  window.__EVAL__ = {
    /**
     * Connect wallet and return connected address
     * @returns {Promise<string>} Connected Ethereum address
     */
    connectWallet: async () => {
      try {
        if (!window.ethereum) throw new Error("MetaMask not installed");

        const provider = new ethers.BrowserProvider(window.ethereum);
        const accounts = await provider.send("eth_requestAccounts", []);

        if (!accounts || accounts.length === 0) {
          throw new Error("No accounts found");
        }

        return accounts[0];
      } catch (error) {
        throw new Error(`Wallet connection failed: ${error.message}`);
      }
    },

    /**
     * Get the deployed token contract address
     * @returns {string} Token contract address
     */
    getTokenAddress: () => {
      return import.meta.env.VITE_TOKEN_ADDRESS || "";
    },

    /**
     * Get the deployed faucet contract address
     * @returns {string} Faucet contract address
     */
    getFaucetAddress: () => {
      return import.meta.env.VITE_FAUCET_ADDRESS || "";
    },

    /**
     * Get contract addresses
     * @returns {Promise<object>} Object with token and faucet addresses
     */
    getContractAddresses: async () => {
      return {
        token: import.meta.env.VITE_TOKEN_ADDRESS || "",
        faucet: import.meta.env.VITE_FAUCET_ADDRESS || ""
      };
    },

    /**
     * Request tokens for the connected wallet
     * @returns {Promise<string>} Transaction hash
     */
    requestTokens: async () => {
      try {
        if (!window.ethereum) throw new Error("MetaMask not installed");

        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const faucetAddr = import.meta.env.VITE_FAUCET_ADDRESS;
        const faucet = new ethers.Contract(faucetAddr, FAUCET_ABI, signer);

        const tx = await faucet.requestTokens();
        const receipt = await tx.wait();

        return receipt.hash;
      } catch (error) {
        throw new Error(`Token request failed: ${error.message}`);
      }
    },

    /**
     * Get token balance for a specific address
     * @param {string} address - Ethereum address to check
     * @returns {Promise<string>} Token balance as string (in base units)
     */
    getBalance: async (address) => {
      try {
        if (!window.ethereum) throw new Error("MetaMask not installed");

        const provider = new ethers.BrowserProvider(window.ethereum);
        const tokenAddr = import.meta.env.VITE_TOKEN_ADDRESS;
        const token = new ethers.Contract(tokenAddr, TOKEN_ABI, provider);

        const balance = await token.balanceOf(address);
        return balance.toString();
      } catch (error) {
        throw new Error(`Failed to get balance: ${error.message}`);
      }
    },

    /**
     * Check if an address can claim tokens
     * @param {string} address - Ethereum address to check
     * @returns {Promise<boolean>} True if can claim, false otherwise
     */
    canClaim: async (address) => {
      try {
        if (!window.ethereum) throw new Error("MetaMask not installed");

        const provider = new ethers.BrowserProvider(window.ethereum);
        const faucetAddr = import.meta.env.VITE_FAUCET_ADDRESS;
        const faucet = new ethers.Contract(faucetAddr, FAUCET_ABI, provider);

        return await faucet.canClaim(address);
      } catch (error) {
        throw new Error(`Failed to check claim status: ${error.message}`);
      }
    },

    /**
     * Get remaining allowance for an address
     * @param {string} address - Ethereum address to check
     * @returns {Promise<string>} Remaining allowance as string (in base units)
     */
    getRemainingAllowance: async (address) => {
      try {
        if (!window.ethereum) throw new Error("MetaMask not installed");

        const provider = new ethers.BrowserProvider(window.ethereum);
        const faucetAddr = import.meta.env.VITE_FAUCET_ADDRESS;
        const faucet = new ethers.Contract(faucetAddr, FAUCET_ABI, provider);

        const allowance = await faucet.remainingAllowance(address);
        return allowance.toString();
      } catch (error) {
        throw new Error(`Failed to get remaining allowance: ${error.message}`);
      }
    },
  };
}

export default App;