import { defineChain, parseAbi } from "viem";

export const robinhoodTestnet = defineChain({
  id: 46630,
  name: "Robinhood Chain Testnet",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.testnet.chain.robinhood.com"] } },
  testnet: true,
});

export const robinhoodMainnet = defineChain({
  id: 4663,
  name: "Robinhood Chain",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.mainnet.chain.robinhood.com"] } },
});

export const escrowAbi = parseAbi([
  "function fund(bytes32 orderId, address seller, address token, uint256 amount, uint256 fee, uint64 deadline)",
  "function accept(bytes32 orderId)",
  "function openDispute(bytes32 orderId)",
  "function refundAfterDeadline(bytes32 orderId)",
  "function submitDelivery(bytes32 orderId, bytes32 deliverableHash)",
]);

export const erc20Abi = parseAbi([
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function balanceOf(address owner) view returns (uint256)",
  "function faucet()",
]);
