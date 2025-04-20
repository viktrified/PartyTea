import { defineChain } from "viem";

export const TeaSepoliaTestnet = defineChain({
  id: 10218,
  name: "Tea Sepolia Testnet",
  network: "tea-testnet",
  nativeCurrency: {
    decimals: 18,
    name: "TEA",
    symbol: "TEA",
  },
  rpcUrls: {
    default: {
      http: ["https://tea-sepolia.g.alchemy.com/public"],
    },
    public: {
      http: ["https://tea-sepolia.g.alchemy.com/public"],
    },
  },
  blockExplorers: {
    default: {
      name: "Tea Sepolia Explorer",
      url: "https://sepolia.tea.xyz/",
    },
  },
  testnet: true,
});
