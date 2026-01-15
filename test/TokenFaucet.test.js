const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");

describe("TokenFaucet", function () {
    let token;
    let faucet;
    let owner;
    let user1;
    let user2;
    let user3;

    const FAUCET_AMOUNT = ethers.parseEther("10");
    const MAX_CLAIM_AMOUNT = ethers.parseEther("50");
    const COOLDOWN_TIME = 24 * 60 * 60; // 24 hours in seconds

    beforeEach(async function () {
        [owner, user1, user2, user3] = await ethers.getSigners();

        // Deploy Token
        const Token = await ethers.getContractFactory("MyToken");
        token = await Token.deploy();

        // Deploy Faucet
        const Faucet = await ethers.getContractFactory("TokenFaucet");
        faucet = await Faucet.deploy(await token.getAddress());

        // Set faucet address in token
        await token.setFaucetAddress(await faucet.getAddress());
    });

    describe("Deployment", function () {
        it("Should set the correct token address", async function () {
            expect(await faucet.token()).to.equal(await token.getAddress());
        });

        it("Should set the deployer as admin", async function () {
            expect(await faucet.admin()).to.equal(owner.address);
        });

        it("Should not be paused initially", async function () {
            expect(await faucet.isPaused()).to.equal(false);
        });

        it("Should set correct constants", async function () {
            expect(await faucet.FAUCET_AMOUNT()).to.equal(FAUCET_AMOUNT);
            expect(await faucet.MAX_CLAIM_AMOUNT()).to.equal(MAX_CLAIM_AMOUNT);
            expect(await faucet.COOLDOWN_TIME()).to.equal(COOLDOWN_TIME);
        });

        it("Should reject zero address for token", async function () {
            const Faucet = await ethers.getContractFactory("TokenFaucet");
            await expect(
                Faucet.deploy(ethers.ZeroAddress)
            ).to.be.revertedWith("Token address cannot be zero");
        });
    });

    describe("Token Claiming", function () {
        it("Should allow user to claim tokens for the first time", async function () {
            await expect(faucet.connect(user1).requestTokens())
                .to.emit(faucet, "TokensClaimed")
                .withArgs(user1.address, FAUCET_AMOUNT, anyValue);

            expect(await token.balanceOf(user1.address)).to.equal(FAUCET_AMOUNT);
            expect(await faucet.totalClaimed(user1.address)).to.equal(FAUCET_AMOUNT);
        });

        it("Should update lastClaimAt timestamp", async function () {
            const tx = await faucet.connect(user1).requestTokens();
            const receipt = await tx.wait();
            const block = await ethers.provider.getBlock(receipt.blockNumber);

            expect(await faucet.lastClaimAt(user1.address)).to.equal(block.timestamp);
        });

        it("Should reject claim before cooldown period", async function () {
            await faucet.connect(user1).requestTokens();

            // Try to claim again immediately
            await expect(
                faucet.connect(user1).requestTokens()
            ).to.be.revertedWithCustomError(faucet, "CannotClaimYet");
        });

        it("Should allow claim after cooldown period", async function () {
            await faucet.connect(user1).requestTokens();

            // Advance time by 24 hours
            await time.increase(COOLDOWN_TIME);

            await expect(faucet.connect(user1).requestTokens())
                .to.emit(faucet, "TokensClaimed");

            expect(await token.balanceOf(user1.address)).to.equal(FAUCET_AMOUNT * 2n);
            expect(await faucet.totalClaimed(user1.address)).to.equal(FAUCET_AMOUNT * 2n);
        });

        it("Should allow maximum 5 claims (50 tokens total)", async function () {
            for (let i = 0; i < 5; i++) {
                await faucet.connect(user1).requestTokens();
                if (i < 4) {
                    await time.increase(COOLDOWN_TIME);
                }
            }

            expect(await token.balanceOf(user1.address)).to.equal(MAX_CLAIM_AMOUNT);
            expect(await faucet.totalClaimed(user1.address)).to.equal(MAX_CLAIM_AMOUNT);
        });

        it("Should reject claim after reaching max claim amount", async function () {
            // Claim 5 times to reach max
            for (let i = 0; i < 5; i++) {
                await faucet.connect(user1).requestTokens();
                await time.increase(COOLDOWN_TIME);
            }

            // Try to claim again
            await expect(
                faucet.connect(user1).requestTokens()
            ).to.be.revertedWithCustomError(faucet, "CannotClaimYet");
        });

        it("Should allow multiple users to claim independently", async function () {
            await faucet.connect(user1).requestTokens();
            await faucet.connect(user2).requestTokens();
            await faucet.connect(user3).requestTokens();

            expect(await token.balanceOf(user1.address)).to.equal(FAUCET_AMOUNT);
            expect(await token.balanceOf(user2.address)).to.equal(FAUCET_AMOUNT);
            expect(await token.balanceOf(user3.address)).to.equal(FAUCET_AMOUNT);
        });
    });

    describe("canClaim Function", function () {
        it("Should return true for first-time user", async function () {
            expect(await faucet.canClaim(user1.address)).to.equal(true);
        });

        it("Should return false during cooldown period", async function () {
            await faucet.connect(user1).requestTokens();
            expect(await faucet.canClaim(user1.address)).to.equal(false);
        });

        it("Should return true after cooldown period", async function () {
            await faucet.connect(user1).requestTokens();
            await time.increase(COOLDOWN_TIME);
            expect(await faucet.canClaim(user1.address)).to.equal(true);
        });

        it("Should return false when max claim reached", async function () {
            for (let i = 0; i < 5; i++) {
                await faucet.connect(user1).requestTokens();
                await time.increase(COOLDOWN_TIME);
            }
            expect(await faucet.canClaim(user1.address)).to.equal(false);
        });

        it("Should return false when paused", async function () {
            await faucet.setPaused(true);
            expect(await faucet.canClaim(user1.address)).to.equal(false);
        });
    });

    describe("remainingAllowance Function", function () {
        it("Should return max amount for new user", async function () {
            expect(await faucet.remainingAllowance(user1.address)).to.equal(MAX_CLAIM_AMOUNT);
        });

        it("Should decrease after each claim", async function () {
            await faucet.connect(user1).requestTokens();
            expect(await faucet.remainingAllowance(user1.address)).to.equal(
                MAX_CLAIM_AMOUNT - FAUCET_AMOUNT
            );

            await time.increase(COOLDOWN_TIME);
            await faucet.connect(user1).requestTokens();
            expect(await faucet.remainingAllowance(user1.address)).to.equal(
                MAX_CLAIM_AMOUNT - (FAUCET_AMOUNT * 2n)
            );
        });

        it("Should return zero when max reached", async function () {
            for (let i = 0; i < 5; i++) {
                await faucet.connect(user1).requestTokens();
                await time.increase(COOLDOWN_TIME);
            }
            expect(await faucet.remainingAllowance(user1.address)).to.equal(0);
        });
    });

    describe("timeUntilNextClaim Function", function () {
        it("Should return 0 for first-time user", async function () {
            expect(await faucet.timeUntilNextClaim(user1.address)).to.equal(0);
        });

        it("Should return correct time remaining during cooldown", async function () {
            await faucet.connect(user1).requestTokens();

            const timeRemaining = await faucet.timeUntilNextClaim(user1.address);
            expect(timeRemaining).to.be.closeTo(COOLDOWN_TIME, 5);
        });

        it("Should return 0 after cooldown period", async function () {
            await faucet.connect(user1).requestTokens();
            await time.increase(COOLDOWN_TIME);

            expect(await faucet.timeUntilNextClaim(user1.address)).to.equal(0);
        });
    });

    describe("Pause Functionality", function () {
        it("Should allow admin to pause faucet", async function () {
            await expect(faucet.setPaused(true))
                .to.emit(faucet, "FaucetPaused")
                .withArgs(true);

            expect(await faucet.isPaused()).to.equal(true);
        });

        it("Should allow admin to unpause faucet", async function () {
            await faucet.setPaused(true);

            await expect(faucet.setPaused(false))
                .to.emit(faucet, "FaucetPaused")
                .withArgs(false);

            expect(await faucet.isPaused()).to.equal(false);
        });

        it("Should reject non-admin pausing", async function () {
            await expect(
                faucet.connect(user1).setPaused(true)
            ).to.be.revertedWithCustomError(faucet, "OnlyAdmin");
        });

        it("Should reject claims when paused", async function () {
            await faucet.setPaused(true);

            await expect(
                faucet.connect(user1).requestTokens()
            ).to.be.revertedWithCustomError(faucet, "FaucetIsPaused");
        });

        it("Should allow claims after unpausing", async function () {
            await faucet.setPaused(true);
            await faucet.setPaused(false);

            await expect(faucet.connect(user1).requestTokens())
                .to.emit(faucet, "TokensClaimed");
        });
    });

    describe("Admin Transfer", function () {
        it("Should allow admin to transfer admin rights", async function () {
            await faucet.transferAdmin(user1.address);
            expect(await faucet.admin()).to.equal(user1.address);
        });

        it("Should reject non-admin transferring admin rights", async function () {
            await expect(
                faucet.connect(user1).transferAdmin(user2.address)
            ).to.be.revertedWithCustomError(faucet, "OnlyAdmin");
        });

        it("Should reject zero address as new admin", async function () {
            await expect(
                faucet.transferAdmin(ethers.ZeroAddress)
            ).to.be.revertedWith("New admin cannot be zero address");
        });

        it("Should allow new admin to pause faucet", async function () {
            await faucet.transferAdmin(user1.address);

            await expect(faucet.connect(user1).setPaused(true))
                .to.emit(faucet, "FaucetPaused");
        });

        it("Should prevent old admin from pausing after transfer", async function () {
            await faucet.transferAdmin(user1.address);

            await expect(
                faucet.setPaused(true)
            ).to.be.revertedWithCustomError(faucet, "OnlyAdmin");
        });
    });

    describe("Edge Cases", function () {
        it("Should handle multiple users claiming at different times", async function () {
            await faucet.connect(user1).requestTokens();
            await time.increase(COOLDOWN_TIME / 2);
            await faucet.connect(user2).requestTokens();

            // User1 can't claim yet
            expect(await faucet.canClaim(user1.address)).to.equal(false);
            // User2 can't claim yet
            expect(await faucet.canClaim(user2.address)).to.equal(false);

            await time.increase(COOLDOWN_TIME / 2);

            // User1 can claim now
            expect(await faucet.canClaim(user1.address)).to.equal(true);
            // User2 still can't
            expect(await faucet.canClaim(user2.address)).to.equal(false);
        });

        it("Should maintain separate state for each user", async function () {
            await faucet.connect(user1).requestTokens();
            await faucet.connect(user1).requestTokens().catch(() => { }); // Should fail

            // User2 should still be able to claim
            await expect(faucet.connect(user2).requestTokens())
                .to.emit(faucet, "TokensClaimed");
        });
    });
});
