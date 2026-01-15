const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("MyToken", function () {
    let token;
    let owner;
    let faucet;
    let user1;
    let user2;

    beforeEach(async function () {
        [owner, faucet, user1, user2] = await ethers.getSigners();

        const Token = await ethers.getContractFactory("MyToken");
        token = await Token.deploy();
    });

    describe("Deployment", function () {
        it("Should set the correct name and symbol", async function () {
            expect(await token.name()).to.equal("SepoliaTestToken");
            expect(await token.symbol()).to.equal("STT");
        });

        it("Should set the correct owner", async function () {
            expect(await token.owner()).to.equal(owner.address);
        });

        it("Should have zero initial supply", async function () {
            expect(await token.totalSupply()).to.equal(0);
        });

        it("Should set the correct max supply", async function () {
            expect(await token.MAX_SUPPLY()).to.equal(ethers.parseEther("1000000"));
        });

        it("Should have no faucet address initially", async function () {
            expect(await token.faucetAddress()).to.equal(ethers.ZeroAddress);
        });
    });

    describe("Faucet Address Management", function () {
        it("Should allow owner to set faucet address", async function () {
            await expect(token.setFaucetAddress(faucet.address))
                .to.emit(token, "FaucetAddressSet")
                .withArgs(ethers.ZeroAddress, faucet.address);

            expect(await token.faucetAddress()).to.equal(faucet.address);
        });

        it("Should reject zero address as faucet", async function () {
            await expect(
                token.setFaucetAddress(ethers.ZeroAddress)
            ).to.be.revertedWith("Faucet address cannot be zero");
        });

        it("Should reject non-owner setting faucet address", async function () {
            await expect(
                token.connect(user1).setFaucetAddress(faucet.address)
            ).to.be.revertedWithCustomError(token, "OwnableUnauthorizedAccount");
        });

        it("Should allow updating faucet address", async function () {
            await token.setFaucetAddress(faucet.address);

            await expect(token.setFaucetAddress(user1.address))
                .to.emit(token, "FaucetAddressSet")
                .withArgs(faucet.address, user1.address);

            expect(await token.faucetAddress()).to.equal(user1.address);
        });
    });

    describe("Minting", function () {
        beforeEach(async function () {
            await token.setFaucetAddress(faucet.address);
        });

        it("Should allow faucet to mint tokens", async function () {
            const amount = ethers.parseEther("100");
            await token.connect(faucet).mint(user1.address, amount);

            expect(await token.balanceOf(user1.address)).to.equal(amount);
            expect(await token.totalSupply()).to.equal(amount);
        });

        it("Should reject minting from non-faucet address", async function () {
            const amount = ethers.parseEther("100");
            await expect(
                token.connect(user1).mint(user1.address, amount)
            ).to.be.revertedWith("Only faucet can mint");
        });

        it("Should reject minting to zero address", async function () {
            const amount = ethers.parseEther("100");
            await expect(
                token.connect(faucet).mint(ethers.ZeroAddress, amount)
            ).to.be.revertedWith("Cannot mint to zero address");
        });

        it("Should reject minting beyond max supply", async function () {
            const maxSupply = await token.MAX_SUPPLY();
            const excessAmount = maxSupply + ethers.parseEther("1");

            await expect(
                token.connect(faucet).mint(user1.address, excessAmount)
            ).to.be.revertedWith("Max supply exceeded");
        });

        it("Should allow minting up to max supply", async function () {
            const maxSupply = await token.MAX_SUPPLY();
            await token.connect(faucet).mint(user1.address, maxSupply);

            expect(await token.totalSupply()).to.equal(maxSupply);
        });

        it("Should reject minting when total would exceed max supply", async function () {
            const halfMax = ethers.parseEther("500000");
            await token.connect(faucet).mint(user1.address, halfMax);

            const tooMuch = ethers.parseEther("500001");
            await expect(
                token.connect(faucet).mint(user2.address, tooMuch)
            ).to.be.revertedWith("Max supply exceeded");
        });

        it("Should allow multiple mints to different users", async function () {
            const amount1 = ethers.parseEther("100");
            const amount2 = ethers.parseEther("200");

            await token.connect(faucet).mint(user1.address, amount1);
            await token.connect(faucet).mint(user2.address, amount2);

            expect(await token.balanceOf(user1.address)).to.equal(amount1);
            expect(await token.balanceOf(user2.address)).to.equal(amount2);
            expect(await token.totalSupply()).to.equal(amount1 + amount2);
        });
    });

    describe("ERC20 Functionality", function () {
        beforeEach(async function () {
            await token.setFaucetAddress(faucet.address);
            await token.connect(faucet).mint(user1.address, ethers.parseEther("1000"));
        });

        it("Should allow token transfers", async function () {
            const amount = ethers.parseEther("100");
            await token.connect(user1).transfer(user2.address, amount);

            expect(await token.balanceOf(user2.address)).to.equal(amount);
            expect(await token.balanceOf(user1.address)).to.equal(ethers.parseEther("900"));
        });

        it("Should allow token approvals and transferFrom", async function () {
            const amount = ethers.parseEther("100");
            await token.connect(user1).approve(user2.address, amount);

            expect(await token.allowance(user1.address, user2.address)).to.equal(amount);

            await token.connect(user2).transferFrom(user1.address, user2.address, amount);
            expect(await token.balanceOf(user2.address)).to.equal(amount);
        });
    });
});
