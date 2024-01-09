import { expect } from "chai";
import { ethers } from "hardhat";
import { NFTMarketplace } from "../typechain";
import { ERC721Mock } from "../typechain";
import { ERC20Mock } from "../typechain";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { BigNumber } from "ethers";

describe("NFTMarketplace", () => {
  let marketplace: NFTMarketplace;
  let erc721Mock: ERC721Mock;
  let erc20Mock: ERC20Mock;
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;

  beforeEach(async () => {
    [owner, user1, user2] = await ethers.getSigners();

    const ERC721Mock = await ethers.getContractFactory("ERC721Mock");
    erc721Mock = await ERC721Mock.connect(user1).deploy();
    erc721Mock.connect(user1).deployed();

    const ERC20Mock = await ethers.getContractFactory("ERC20Mock");
    erc20Mock = await ERC20Mock.deploy();
    erc20Mock.deployed();

    const NFTMarketplace = await ethers.getContractFactory("NFTMarketplace");
    marketplace = await NFTMarketplace.deploy(erc721Mock.address);
    marketplace.deployed();
  });

  describe("NonReetrant", () => {
    let tokenId: BigNumber;
    let price: BigNumber;

    beforeEach(async () => {
      price = ethers.utils.parseEther("10"); // 10 ETH
      await marketplace.connect(owner).grantArtistRole(user1.address);
      await erc721Mock.connect(user1).grantMinterRole(marketplace.address);
      await marketplace.connect(user1).createItem();
      tokenId = await erc721Mock.balanceOf(user1.address);
    });

    it("should prevent reentrancy in listItem", async () => {
      await expect(
        marketplace
          .connect(user1)
          .listItem(tokenId, price, erc20Mock.address)
          .then(() =>
            marketplace
              .connect(user1)
              .listItem(tokenId, price, erc20Mock.address)
          )
      ).to.be.revertedWith("NFT_Marketplace: Token already listed");
    });

    it("should prevent reentrancy in buyItem", async () => {
      await marketplace.connect(user1).createItem();
      tokenId = await erc721Mock.balanceOf(user1.address);
      await marketplace
        .connect(user1)
        .listItem(tokenId, price, erc20Mock.address);

      await erc20Mock.connect(owner).transfer(user2.address, price);

      await erc20Mock.connect(user2).approve(marketplace.address, price);

      await expect(
        marketplace
          .connect(user2)
          .buyItem(tokenId, { value: price })
          .then(() =>
            marketplace.connect(user2).buyItem(tokenId, { value: price })
          )
      ).to.be.revertedWith("ERC721: caller is not token owner or approved");
    });

    it("should prevent reentrancy in cancel", async () => {
      await marketplace.connect(user1).createItem();
      tokenId = await erc721Mock.balanceOf(user1.address);
      await marketplace
        .connect(user1)
        .listItem(tokenId, price, erc20Mock.address);

      await expect(
        marketplace
          .connect(user1)
          .cancel(tokenId)
          .then(() => marketplace.connect(user1).cancel(tokenId))
      ).to.be.revertedWith("NFT_Marketplace: Only owner can cancel");
    });
  });

  describe("grantArtistRole", () => {
    it("should grant the artist role to a user", async () => {
      await expect(
        marketplace.connect(owner).grantArtistRole(user1.address)
      ).to.emit(marketplace, "RoleGranted");

      const ARTIST_ROLE = ethers.utils.id("ARTIST_ROLE");
      // second variant to get ARTIST_ROLE
      // const ARTIST_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("ARTIST_ROLE"));

      const hasRole = await marketplace.hasRole(ARTIST_ROLE, user1.address);
      expect(hasRole).to.equal(true);
    });

    it("should fail if the caller is not the admin", async () => {
      await expect(
        marketplace.connect(user1).grantArtistRole(user2.address)
      ).to.be.revertedWith(
        "NFT_Marketplace: must have role ADMIN_ROLE to grant"
      );
    });
  });

  describe("createItem", () => {
    it("should create a new NFT and emit an event", async () => {
      await marketplace.connect(owner).grantArtistRole(user1.address);
      await erc721Mock.connect(user1).grantMinterRole(marketplace.address);

      const initialItemCount = await erc721Mock.balanceOf(user1.address);

      await expect(marketplace.connect(user1).createItem())
        .to.emit(marketplace, "ItemCreated")
        .withArgs(initialItemCount.add(1), user1.address);

      const newItemCount = await erc721Mock.balanceOf(user1.address);
      expect(newItemCount).to.equal(initialItemCount.add(1));
    });

    it("should fail if the caller is not an artist", async () => {
      await expect(marketplace.connect(user2).createItem()).to.be.revertedWith(
        "NFT_Marketplace: must have role ARTIST_ROLE to mint"
      );
    });

    it("should fail if mint token failed", async () => {
      await marketplace.connect(owner).grantArtistRole(user1.address);
      await expect(marketplace.connect(user1).createItem()).to.be.revertedWith(
        "NFT_Marketplace: mint token failed"
      );
    });
  });

  describe("listItem", () => {
    let price: BigNumber;
    let tokenId: BigNumber;

    beforeEach(async () => {
      price = ethers.utils.parseEther("10"); // 10 ETH
      await marketplace.connect(owner).grantArtistRole(user1.address);
      await erc721Mock.connect(user1).grantMinterRole(marketplace.address);
      await marketplace.connect(user1).createItem();
      tokenId = await erc721Mock.balanceOf(user1.address);
    });
    it("should list an NFT for sale use native token", async () => {
      const paymentToken = ethers.constants.AddressZero; // Use native token (ETH)

      await expect(
        marketplace.connect(user1).listItem(tokenId, price, paymentToken)
      ).to.emit(marketplace, "ItemListed");

      const listing = await marketplace.listings(tokenId);
      expect(listing.tokenId).to.equal(tokenId);
      expect(listing.owner).to.equal(user1.address);
      expect(listing.price).to.equal(price);
      expect(listing.paymentToken).to.equal(paymentToken);
    });

    it("should list an NFT for sale use ERC20 token", async () => {
      await expect(
        marketplace.connect(user1).listItem(tokenId, price, erc20Mock.address)
      ).to.emit(marketplace, "ItemListed");

      const listing = await marketplace.listings(tokenId);
      expect(listing.tokenId).to.equal(tokenId);
      expect(listing.owner).to.equal(user1.address);
      expect(listing.price).to.equal(price);
      expect(listing.paymentToken).to.equal(erc20Mock.address);
    });

    it("should fail if the caller is not the owner of the NFT", async () => {
      await expect(
        marketplace.connect(user2).listItem(tokenId, price, erc20Mock.address)
      ).to.be.revertedWith("NFT_Marketplace: Only owner can list");
    });

    it("should fail if the NFT token already listed", async () => {
      await marketplace
        .connect(user1)
        .listItem(tokenId, price, erc20Mock.address);

      await expect(
        marketplace.connect(user1).listItem(tokenId, price, erc20Mock.address)
      ).to.be.revertedWith("NFT_Marketplace: Token already listed");
    });
  });

  describe("buyItem", () => {
    let paymentAmount: BigNumber;
    let tokenId: BigNumber;

    beforeEach(async () => {
      paymentAmount = ethers.utils.parseEther("10"); // 10 ETH
      await marketplace.connect(owner).grantArtistRole(user1.address);
      await erc721Mock.connect(user1).grantMinterRole(marketplace.address);
      await marketplace.connect(user1).createItem();
      tokenId = await erc721Mock.balanceOf(user1.address);
    });
    it("should purchase the NFT and transfer ownership for native token", async () => {
      await marketplace
        .connect(user1)
        .listItem(tokenId, paymentAmount, ethers.constants.AddressZero);

      await erc721Mock.connect(user1).approve(marketplace.address, tokenId);

      await expect(
        marketplace.connect(user2).buyItem(tokenId, {
          value: paymentAmount,
        })
      ).to.emit(marketplace, "ItemPurchased");

      const newOwner = await erc721Mock.ownerOf(tokenId);
      expect(newOwner).to.equal(user2.address);
    });

    it("should purchase the NFT and transfer ownership for a ERC20 token", async () => {
      await marketplace
        .connect(user1)
        .listItem(tokenId, paymentAmount, erc20Mock.address);

      await erc20Mock.connect(owner).transfer(user2.address, paymentAmount);

      await erc20Mock
        .connect(user2)
        .approve(marketplace.address, paymentAmount);

      await erc721Mock.connect(user1).approve(marketplace.address, tokenId);

      await expect(marketplace.connect(user2).buyItem(tokenId)).to.emit(
        marketplace,
        "ItemPurchased"
      );

      const newOwner = await erc721Mock.ownerOf(tokenId);
      expect(newOwner).to.equal(user2.address);
    });

    it("should fail if the NFT token not listed", async () => {
      await expect(
        marketplace.connect(user2).buyItem(tokenId, {
          value: paymentAmount,
        })
      ).to.be.revertedWith("NFT_Marketplace: Token not listed");
    });

    it("should fail if incorrect payment amount", async () => {
      await marketplace
        .connect(user1)
        .listItem(tokenId, paymentAmount, ethers.constants.AddressZero);

      await erc721Mock.connect(user1).approve(marketplace.address, tokenId);

      await expect(
        marketplace.connect(user2).buyItem(tokenId, {
          value: paymentAmount.sub(ethers.utils.parseEther("2")),
        })
      ).to.be.revertedWith("NFT_Marketplace: Incorrect payment amount");
    });

    it("should purchase the NFT and transfer ownership for a ERC20 token", async () => {
      await marketplace
        .connect(user1)
        .listItem(tokenId, paymentAmount, erc20Mock.address);

      await erc20Mock.connect(owner).transfer(user2.address, paymentAmount);

      await erc20Mock
        .connect(user2)
        .approve(marketplace.address, paymentAmount);

      await erc721Mock.connect(user1).approve(marketplace.address, tokenId);

      await expect(marketplace.connect(user2).buyItem(tokenId))
        .to.emit(marketplace, "ItemPurchased")
        .withArgs(tokenId, user2.address, paymentAmount);

      const newOwner = await erc721Mock.ownerOf(tokenId);
      expect(newOwner).to.equal(user2.address);
    });
  });

  describe("cancel", () => {
    let price: BigNumber;
    let tokenId: BigNumber;

    beforeEach(async () => {
      await marketplace.connect(owner).grantArtistRole(user1.address);
      await erc721Mock.connect(user1).grantMinterRole(marketplace.address);
      await marketplace.connect(user1).createItem();
      tokenId = await erc721Mock.balanceOf(user1.address);
      price = ethers.utils.parseEther("10"); // 10 ETH
      await marketplace
        .connect(user1)
        .listItem(tokenId, 10, ethers.constants.AddressZero);
    });
    it("should cancel a listing", async () => {
      await expect(marketplace.connect(user1).cancel(tokenId))
        .to.emit(marketplace, "ListingCancelled")
        .withArgs(tokenId);

      const listing = await marketplace.listings(tokenId);
      expect(listing.owner).to.equal(ethers.constants.AddressZero); // Listing removed
    });

    it("should fail if the caller is not the owner of the listing", async () => {
      await expect(
        marketplace.connect(user2).cancel(tokenId)
      ).to.be.revertedWith("NFT_Marketplace: Only owner can cancel");
    });
  });
});
