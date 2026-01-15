const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    console.log("🔍 Starting contract verification...\n");

    // Find the latest deployment file
    const deploymentsDir = path.join(__dirname, "..", "deployments");
    if (!fs.existsSync(deploymentsDir)) {
        console.error("❌ No deployments directory found. Please deploy contracts first.");
        process.exit(1);
    }

    const files = fs.readdirSync(deploymentsDir)
        .filter(f => f.startsWith(hre.network.name) && f.endsWith('.json'))
        .sort()
        .reverse();

    if (files.length === 0) {
        console.error(`❌ No deployment found for network: ${hre.network.name}`);
        process.exit(1);
    }

    const deploymentFile = path.join(deploymentsDir, files[0]);
    const deployment = JSON.parse(fs.readFileSync(deploymentFile, 'utf8'));

    console.log("📄 Using deployment:", files[0]);
    console.log("📝 Token Address:", deployment.contracts.MyToken.address);
    console.log("📝 Faucet Address:", deployment.contracts.TokenFaucet.address);
    console.log("");

    // Verify Token
    console.log("🔍 Verifying MyToken...");
    try {
        await hre.run("verify:verify", {
            address: deployment.contracts.MyToken.address,
            constructorArguments: [],
        });
        console.log("✅ MyToken verified successfully");
    } catch (error) {
        if (error.message.includes("Already Verified")) {
            console.log("ℹ️  MyToken already verified");
        } else {
            console.error("❌ MyToken verification failed:", error.message);
        }
    }

    // Verify Faucet
    console.log("\n🔍 Verifying TokenFaucet...");
    try {
        await hre.run("verify:verify", {
            address: deployment.contracts.TokenFaucet.address,
            constructorArguments: [deployment.contracts.MyToken.address],
        });
        console.log("✅ TokenFaucet verified successfully");
    } catch (error) {
        if (error.message.includes("Already Verified")) {
            console.log("ℹ️  TokenFaucet already verified");
        } else {
            console.error("❌ TokenFaucet verification failed:", error.message);
        }
    }

    console.log("\n✨ Verification process completed!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Verification failed:", error);
        process.exit(1);
    });
