# 🪪 Membership NFT

This project enables users to join decentralized "parties" by paying a fee and receiving an on-chain NFT membership. Each NFT visually represents the user's membership and level within a party using dynamically generated SVG metadata.

## 📁 Project Structure

```
project-root/
├── frontend/   # React frontend app (JavaScript)
└── contract/   # Foundry-based smart contract project
```

## ⚙️ Smart Contract Overview

The smart contract (`MembershipNFT.sol`) allows:
- **Party Creation** by the owner
- **Joining Parties** by paying a fee
- **NFT Minting** for members
- **On-chain SVG and metadata generation**
- **Level tracking and fund withdrawal**

## 🚀 Getting Started

### 🔨 Prerequisites

- [Foundry](https://book.getfoundry.sh/getting-started/installation)
- [Node.js](https://nodejs.org/) (for frontend)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)

## 📜 Contract: Deployment & Interaction (Foundry)

### 1. Install Dependencies

```bash
cd contract
forge install
```

### 2. Build Contract

```bash
forge build
```

### 3. Run Tests

```bash
forge test
```

### 4. Deploy Contract (using Anvil as example)

```bash
anvil
```

In a new terminal:

```bash
forge script script/Deploy.s.sol:Deploy --rpc-url http://localhost:8545 --private-key <YOUR_PRIVATE_KEY> --broadcast
```

Replace `<YOUR_PRIVATE_KEY>` with your dev key.

You can create `Deploy.s.sol` inside a `script/` folder to automate deployment.
**contract address: 0x5ba800BCCEb770fC8Bb7c2c1dC3C72535F0Aa847**

Example `Deploy.s.sol`:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "forge-std/Script.sol";
import "../src/MembershipNFT.sol";

contract Deploy is Script {
    function run() external {
        vm.startBroadcast();
        new MembershipNFT();
        vm.stopBroadcast();
    }
}
```

## 🖼️ Frontend: Running the React App

### 1. Install Dependencies

```bash
cd frontend
npm install
```

### 2. Start the Development Server

```bash
npm start
```

This will run the frontend on http://localhost:3000.

## 🔗 Contract Interactions

After deploying the contract, you can:

Create a party:
```js
await contract.createParty("Chess Club", ethers.utils.parseEther("0.01"));
```

Join a party:
```js
await contract.payContributionToJoinParty(partyId, { value: ethers.utils.parseEther("0.01") });
```

Check membership:
```js
await contract.isMember(partyId, userAddress);
```

Withdraw funds (owner only):
```js
await contract.withdrawAll();
```

## 🧪 Testing

Smart contracts can be tested using Forge:

```bash
cd contract
forge test
```

Frontend unit/integration tests can be added using tools like Jest + React Testing Library.

## 🛡️ Security Notes

- Only the contract owner can create parties or withdraw funds.
- All NFT metadata is generated and stored on-chain (no external servers/IPFS needed).

## 📄 License

This project is licensed under the MIT License.