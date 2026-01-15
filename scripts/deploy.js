const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    console.log("🚀 Starting deployment...\n");

    // Get deployer account
    const [deployer] = await hre.ethers.getSigners();
    console.log("📝 Deploying contracts with account:", deployer.address);

    const balance = await hre.ethers.provider.getBalance(deployer.address);
    console.log("💰 Account balance:", hre.ethers.formatEther(balance), "ETH\n");

    // Deploy Token
    console.log("📦 Deploying MyToken...");
    const Token = await hre.ethers.getContractFactory("MyToken");
    const token = await Token.deploy();
    await token.waitForDeployment();
    const tokenAddress = await token.getAddress();
    console.log("✅ MyToken deployed to:", tokenAddress);

    // Deploy TokenFaucet
    console.log("\n📦 Deploying TokenFaucet...");
    const Faucet = await hre.ethers.getContractFactory("TokenFaucet");
    const faucet = await Faucet.deploy(tokenAddress);
    await faucet.waitForDeployment();
    const faucetAddress = await faucet.getAddress();
    console.log("✅ TokenFaucet deployed to:", faucetAddress);

    // Set faucet address in token
    console.log("\n🔗 Linking contracts...");
    const tx = await token.setFaucetAddress(faucetAddress);
    await tx.wait();
    console.log("✅ Faucet address set in Token contract");

    // Save deployment addresses
    const deploymentInfo = {
        network: hre.network.name,
        deployer: deployer.address,
        timestamp: new Date().toISOString(),
        contracts: {
            MyToken: {
                address: tokenAddress,
                name: await token.name(),
                symbol: await token.symbol(),
                maxSupply: hre.ethers.formatEther(await token.MAX_SUPPLY()),
            },
            TokenFaucet: {
                address: faucetAddress,
                faucetAmount: hre.ethers.formatEther(await faucet.FAUCET_AMOUNT()),
                cooldownTime: (await faucet.COOLDOWN_TIME()).toString(),
                maxClaimAmount: hre.ethers.formatEther(await faucet.MAX_CLAIM_AMOUNT()),
            },
        },
    };

    const deploymentsDir = path.join(__dirname, "..", "deployments");
    if (!fs.existsSync(deploymentsDir)) {
        fs.mkdirSync(deploymentsDir);
    }

    const filename = `${hre.network.name}-${Date.now()}.json`;
    const filepath = path.join(deploymentsDir, filename);
    fs.writeFileSync(filepath, JSON.stringify(deploymentInfo, null, 2));

    console.log("\n📄 Deployment info saved to:", filename);
    console.log("\n" + "=".repeat(60));
    console.log("🎉 DEPLOYMENT SUCCESSFUL!");
    console.log("=".repeat(60));
    console.log("\n📋 Summary:");
    console.log("   Token Address:  ", tokenAddress);
    console.log("   Faucet Address: ", faucetAddress);
    console.log("\n💡 Next steps:");
    console.log("   1. Update frontend/.env with contract addresses");
    console.log("   2. Verify contracts on Etherscan (if on testnet/mainnet):");
    console.log(`      npm run verify`);
    console.log("\n");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Deployment failed:", error);
        process.exit(1);
    });
