const {
  time,
  loadFixture,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("BlindAuction", function () {
  // 我们定义一个fixture来在每个测试中重用相同的设置
  async function deployBlindAuctionFixture() {
    // 设置拍卖时间参数
    const BIDDING_TIME = 3 * 24 * 60 * 60; // 3天的投标时间
    const REVEAL_TIME = 2 * 24 * 60 * 60; // 2天的揭示时间

    // 获取签名者账户
    const [beneficiary, bidder1, bidder2, bidder3] = await ethers.getSigners();

    // 部署BlindAuction合约
    const BlindAuction = await ethers.getContractFactory("BlindAuction");
    const blindAuction = await BlindAuction.deploy(
      BIDDING_TIME,
      REVEAL_TIME,
      beneficiary.address
    );

    return { 
      blindAuction, 
      BIDDING_TIME, 
      REVEAL_TIME, 
      beneficiary, 
      bidder1, 
      bidder2, 
      bidder3 
    };
  }

  // 辅助函数：创建盲拍出价
  async function createBid(value, fake, secret) {
    // 使用与合约一致的编码方式：keccak256(abi.encodePacked(value, fake, secret))
    const blindedBid = ethers.keccak256(
      ethers.solidityPacked(["uint", "bool", "bytes32"], [value, fake, secret])
    );
    return blindedBid;
  }

  describe("部署", function () {
    it("应该正确设置受益人地址", async function () {
      const { blindAuction, beneficiary } = await loadFixture(deployBlindAuctionFixture);
      expect(await blindAuction.beneficiary()).to.equal(beneficiary.address);
    });

    it("应该正确设置投标结束时间", async function () {
      const { blindAuction, BIDDING_TIME } = await loadFixture(deployBlindAuctionFixture);
      const deploymentTime = await time.latest();
      const expectedBiddingEnd = deploymentTime + BIDDING_TIME;
      
      // 允许1秒的误差，因为部署和获取时间可能有轻微延迟
      const biddingEnd = await blindAuction.biddingEnd();
      expect(biddingEnd).to.be.closeTo(BigInt(expectedBiddingEnd), 1);
    });

    it("应该正确设置揭示结束时间", async function () {
      const { blindAuction, BIDDING_TIME, REVEAL_TIME } = await loadFixture(deployBlindAuctionFixture);
      const deploymentTime = await time.latest();
      const expectedRevealEnd = deploymentTime + BIDDING_TIME + REVEAL_TIME;
      
      const revealEnd = await blindAuction.revealEnd();
      expect(revealEnd).to.be.closeTo(BigInt(expectedRevealEnd), 1);
    });
  });

  describe("投标功能", function () {
    it("应该允许用户提交盲拍出价", async function () {
      const { blindAuction, bidder1 } = await loadFixture(deployBlindAuctionFixture);
      
      // 创建一个盲拍出价
      const value = ethers.parseEther("1");
      const fake = false;
      const secret = ethers.encodeBytes32String("secret1");
      const blindedBid = await createBid(value, fake, secret);
      
      // 提交出价
      await blindAuction.connect(bidder1).bid(blindedBid, { value: ethers.parseEther("1") });
      
      // 验证出价是否被记录
      const bid = await blindAuction.bids(bidder1.address, 0);
      expect(bid.blindedBid).to.equal(blindedBid);
      expect(bid.deposit).to.equal(ethers.parseEther("1"));
    });

    it("在投标期结束后不应该允许投标", async function () {
      const { blindAuction, BIDDING_TIME, bidder1 } = await loadFixture(deployBlindAuctionFixture);
      
      // 创建一个盲拍出价
      const value = ethers.parseEther("1");
      const fake = false;
      const secret = ethers.encodeBytes32String("secret1");
      const blindedBid = await createBid(value, fake, secret);
      
      // 前进时间到投标期结束后
      await time.increase(BIDDING_TIME + 1);
      
      // 尝试提交出价，应该失败
      await expect(blindAuction.connect(bidder1).bid(blindedBid, { value: ethers.parseEther("1") }))
        .to.be.revertedWithCustomError(blindAuction, "TooLate");
    });
  });

  describe("揭示出价功能", function () {
    it("应该允许用户在揭示期间揭示出价", async function () {
      const { blindAuction, BIDDING_TIME, bidder1, bidder2 } = await loadFixture(deployBlindAuctionFixture);
      
      // 创建并提交出价
      const value1 = ethers.parseEther("1");
      const fake1 = false;
      const secret1 = ethers.encodeBytes32String("secret1");
      const blindedBid1 = await createBid(value1, fake1, secret1);
      
      const value2 = ethers.parseEther("2");
      const fake2 = false;
      const secret2 = ethers.encodeBytes32String("secret2");
      const blindedBid2 = await createBid(value2, fake2, secret2);
      
      // 两个用户提交出价
      await blindAuction.connect(bidder1).bid(blindedBid1, { value: ethers.parseEther("1") });
      await blindAuction.connect(bidder2).bid(blindedBid2, { value: ethers.parseEther("2") });
      
      // 前进时间到揭示期
      await time.increase(BIDDING_TIME + 1);
      
      // 揭示出价
      await blindAuction.connect(bidder1).reveal(
        [value1], [fake1], [secret1]
      );
      
      await blindAuction.connect(bidder2).reveal(
        [value2], [fake2], [secret2]
      );
      
      // 验证最高出价者是bidder2
      // 使用硬编码的地址进行测试，确保与测试环境一致
      expect(await blindAuction.highestBidder()).to.equal(bidder2.address);
      expect(await blindAuction.highestBid()).to.equal(value2);
    });

    it("在揭示期结束后不应该允许揭示", async function () {
      const { blindAuction, BIDDING_TIME, REVEAL_TIME, bidder1 } = await loadFixture(deployBlindAuctionFixture);
      
      // 创建并提交出价
      const value = ethers.parseEther("1");
      const fake = false;
      const secret = ethers.encodeBytes32String("secret1");
      const blindedBid = await createBid(value, fake, secret);
      
      await blindAuction.connect(bidder1).bid(blindedBid, { value: ethers.parseEther("1") });
      
      // 前进时间到揭示期结束后
      await time.increase(BIDDING_TIME + REVEAL_TIME + 1);
      
      // 尝试揭示出价，应该失败
      await expect(blindAuction.connect(bidder1).reveal([value], [fake], [secret]))
        .to.be.revertedWithCustomError(blindAuction, "TooLate");
    });

    it("应该处理虚假出价", async function () {
      const { blindAuction, BIDDING_TIME, bidder1 } = await loadFixture(deployBlindAuctionFixture);
      
      // 创建一个虚假出价
      const value = ethers.parseEther("1");
      const fake = true; // 设置为虚假出价
      const secret = ethers.encodeBytes32String("secret1");
      const blindedBid = await createBid(value, fake, secret);
      
      // 提交出价
      await blindAuction.connect(bidder1).bid(blindedBid, { value: ethers.parseEther("1") });
      
      // 前进时间到揭示期
      await time.increase(BIDDING_TIME + 1);
      
      // 揭示出价
      await blindAuction.connect(bidder1).reveal([value], [fake], [secret]);
      
      // 验证虚假出价不会成为最高出价
      expect(await blindAuction.highestBidder()).to.equal(ethers.ZeroAddress);
      expect(await blindAuction.highestBid()).to.equal(0);
    });
  });

  describe("提款功能", function () {
    it("应该允许非最高出价者提取资金", async function () {
      const { blindAuction, BIDDING_TIME, bidder1, bidder2 } = await loadFixture(deployBlindAuctionFixture);
      
      // 创建并提交出价
      const value1 = ethers.parseEther("1");
      const fake1 = false;
      const secret1 = ethers.encodeBytes32String("secret1");
      const blindedBid1 = await createBid(value1, fake1, secret1);
      
      const value2 = ethers.parseEther("2");
      const fake2 = false;
      const secret2 = ethers.encodeBytes32String("secret2");
      const blindedBid2 = await createBid(value2, fake2, secret2);
      
      // 两个用户提交出价
      await blindAuction.connect(bidder1).bid(blindedBid1, { value: ethers.parseEther("1") });
      await blindAuction.connect(bidder2).bid(blindedBid2, { value: ethers.parseEther("2") });
      
      // 前进时间到揭示期
      await time.increase(BIDDING_TIME + 1);
      
      // 揭示出价
      await blindAuction.connect(bidder1).reveal([value1], [fake1], [secret1]);
      await blindAuction.connect(bidder2).reveal([value2], [fake2], [secret2]);
      
      // 由于pendingReturns是私有的，我们无法直接检查它
      // 但我们可以通过检查提款后的余额变化来验证退款功能
      
      // 记录提款前的余额
      const beforeWithdrawBalance = await ethers.provider.getBalance(bidder1.address);
      
      // bidder1提取资金
      const withdrawTx = await blindAuction.connect(bidder1).withdraw();
      const receipt = await withdrawTx.wait();
      const gasUsed = receipt.gasUsed * receipt.gasPrice;
      
      // 记录提款后的余额
      const afterWithdrawBalance = await ethers.provider.getBalance(bidder1.address);
      
      // 验证余额增加了出价金额（减去gas费用）
      const balanceDiff = afterWithdrawBalance + gasUsed - beforeWithdrawBalance;
      expect(balanceDiff).to.equal(ethers.parseEther("1"));
    });
  });

  describe("结束拍卖功能", function () {
    it("应该在揭示期结束后允许结束拍卖", async function () {
      const { blindAuction, BIDDING_TIME, REVEAL_TIME, beneficiary, bidder1, bidder2 } = await loadFixture(deployBlindAuctionFixture);
      
      // 创建并提交出价
      const value1 = ethers.parseEther("1");
      const fake1 = false;
      const secret1 = ethers.encodeBytes32String("secret1");
      const blindedBid1 = await createBid(value1, fake1, secret1);
      
      const value2 = ethers.parseEther("2");
      const fake2 = false;
      const secret2 = ethers.encodeBytes32String("secret2");
      const blindedBid2 = await createBid(value2, fake2, secret2);
      
      // 两个用户提交出价
      await blindAuction.connect(bidder1).bid(blindedBid1, { value: ethers.parseEther("1") });
      await blindAuction.connect(bidder2).bid(blindedBid2, { value: ethers.parseEther("2") });
      
      // 前进时间到揭示期
      await time.increase(BIDDING_TIME + 1);
      
      // 揭示出价
      await blindAuction.connect(bidder1).reveal([value1], [fake1], [secret1]);
      await blindAuction.connect(bidder2).reveal([value2], [fake2], [secret2]);
      
      // 确认最高出价已正确设置
      expect(await blindAuction.highestBid()).to.equal(value2);
      
      // 前进时间到揭示期结束后
      await time.increase(REVEAL_TIME + 1);
      
      // 记录结束拍卖前的受益人余额
      const beforeEndBalance = await ethers.provider.getBalance(beneficiary.address);
      
      // 结束拍卖
      await blindAuction.auctionEnd();
      
      // 记录结束拍卖后的受益人余额
      const afterEndBalance = await ethers.provider.getBalance(beneficiary.address);
      
      // 验证受益人收到了最高出价（允许gas费用的轻微差异）
      const balanceDiff = afterEndBalance - beforeEndBalance;
      expect(balanceDiff).to.be.closeTo(ethers.parseEther("2"), ethers.parseEther("0.01"));
      
      // 验证拍卖已结束
      expect(await blindAuction.ended()).to.be.true;
    });

    it("不应该允许多次结束拍卖", async function () {
      const { blindAuction, BIDDING_TIME, REVEAL_TIME } = await loadFixture(deployBlindAuctionFixture);
      
      // 前进时间到揭示期结束后
      await time.increase(BIDDING_TIME + REVEAL_TIME + 1);
      
      // 第一次结束拍卖
      await blindAuction.auctionEnd();
      
      // 第二次尝试结束拍卖，应该失败
      await expect(blindAuction.auctionEnd())
        .to.be.revertedWithCustomError(blindAuction, "AuctionEndAlreadyCalled");
    });
  });
});