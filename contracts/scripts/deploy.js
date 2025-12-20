const hre = require("hardhat");

async function main() {
  console.log("Deployment start ayindi Mowa... Wait cheyyi...");

  // 1. Deploy Token Contract
  const Token = await hre.ethers.getContractFactory("MyToken");
  const token = await Token.deploy();
  await token.waitForDeployment();
  const tokenAddress = await token.getAddress();
  console.log(`Token deployed to: ${tokenAddress}`);

  // 2. Deploy Faucet Contract (Pass Token address to it)
  const Faucet = await hre.ethers.getContractFactory("TokenFaucet");
  const faucet = await Faucet.deploy(tokenAddress);
  await faucet.waitForDeployment();
  const faucetAddress = await faucet.getAddress();
  console.log(`Faucet deployed to: ${faucetAddress}`);

  // 3. Connect them (Give Faucet permission to Mint)
  console.log("Linking Faucet to Token...");
  // Manam Token contract lo rasina 'setFaucetAddress' function ni call chestunnam
  const tx = await token.setFaucetAddress(faucetAddress);
  await tx.wait(); // Transaction confirm ayye varaku wait cheyyali

  console.log("---------------------------------------------");
  console.log("SUCCESS! Setup antha aipoyindi.");
  console.log("Token Address:", tokenAddress);
  console.log("Faucet Address:", faucetAddress);
  console.log("---------------------------------------------");
  
  // Ee addresses ni save chesko, Frontend ki kavali!
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});