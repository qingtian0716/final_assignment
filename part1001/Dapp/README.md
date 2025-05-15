# BlindAuction 智能合约测试指南

本项目包含一个盲拍（盲目拍卖）智能合约及其测试脚本。

## 环境准备

确保您已安装以下工具：

- Node.js (推荐 v16 或更高版本)
- npm (Node.js 包管理器)

## 安装依赖

在项目根目录下运行以下命令安装所需依赖：

```bash
npm install
```

## 运行测试

执行以下命令运行测试脚本：

```bash
npx hardhat test test/BlindAuction.js
```

## 测试脚本说明

测试脚本 `test/BlindAuction.js` 包含以下测试场景：

### 部署测试
- 验证受益人地址是否正确设置
- 验证投标结束时间是否正确设置
- 验证揭示结束时间是否正确设置

### 投标功能测试
- 验证用户能否提交盲拍出价
- 验证投标期结束后是否禁止投标

### 揭示出价功能测试
- 验证用户能否在揭示期间揭示出价
- 验证揭示期结束后是否禁止揭示
- 验证虚假出价的处理

### 提款功能测试
- 验证非最高出价者能否提取资金

### 结束拍卖功能测试
- 验证揭示期结束后能否结束拍卖
- 验证是否禁止多次结束拍卖

## 盲拍合约使用说明

### 盲拍流程

1. **投标阶段**：用户提交加密的出价
   - 出价通过 `keccak256(value, fake, secret)` 进行加密
   - 用户可以提交多个出价

2. **揭示阶段**：用户揭示之前提交的出价
   - 必须提供原始的 value、fake 和 secret 值
   - 只有正确揭示的出价才会被考虑
   - 虚假出价（fake=true）不会被视为有效出价

3. **提款阶段**：非最高出价者可以提取资金

4. **结束拍卖**：揭示期结束后，任何人都可以调用结束拍卖
   - 最高出价将转给受益人

### 创建盲拍出价

在前端应用中，您可以使用以下方式创建盲拍出价：

```javascript
// 创建盲拍出价
async function createBid(value, fake, secret) {
  const abiCoder = ethers.AbiCoder.defaultAbiCoder();
  const blindedBid = ethers.keccak256(
    abiCoder.encode(["uint", "bool", "bytes32"], [value, fake, secret])
  );
  return blindedBid;
}

// 示例使用
const value = ethers.parseEther("1"); // 1 ETH
const fake = false; // 真实出价
const secret = ethers.encodeBytes32String("mysecret"); // 秘密字符串
const blindedBid = await createBid(value, fake, secret);

// 提交出价
await blindAuctionContract.bid(blindedBid, { value: ethers.parseEther("1") });
```

### 揭示出价

```javascript
// 揭示出价
await blindAuctionContract.reveal(
  [value], // 出价金额数组
  [fake],  // 是否为虚假出价数组
  [secret] // 秘密字符串数组
);
```

## 其他常用命令

```bash
npx hardhat help
REPORT_GAS=true npx hardhat test
npx hardhat node
npx hardhat ignition deploy ./ignition/modules/Lock.js
```
