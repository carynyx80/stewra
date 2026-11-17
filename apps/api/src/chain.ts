import {
  createPublicClient,
  decodeEventLog,
  defineChain,
  erc20Abi,
  getAddress,
  http,
  isAddress,
  keccak256,
  parseAbi,
  toBytes,
  type Hash,
} from "viem";
import { env } from "./env.js";

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

export const activeChain = env.CHAIN_ID === 4663 ? robinhoodMainnet : robinhoodTestnet;

export const publicClient = createPublicClient({ chain: activeChain, transport: http(env.RPC_URL) });

export const escrowAbi = parseAbi([
  "event OrderFunded(bytes32 indexed orderId, address indexed buyer, address indexed seller, address token, uint256 amount, uint256 fee, uint64 deadline)",
  "event DeliverySubmitted(bytes32 indexed orderId, bytes32 deliverableHash)",
  "event PaymentReleased(bytes32 indexed orderId, address indexed seller, address token, uint256 amount, uint256 fee)",
  "event Refunded(bytes32 indexed orderId, address indexed buyer, uint256 amount)",
  "event DisputeOpened(bytes32 indexed orderId, address indexed by)",
  "event DisputeResolved(bytes32 indexed orderId, uint256 toSeller, uint256 toBuyer)",
  "function fund(bytes32 orderId, address seller, address token, uint256 amount, uint256 fee, uint64 deadline)",
  "function submitDelivery(bytes32 orderId, bytes32 deliverableHash)",
  "function accept(bytes32 orderId)",
  "function openDispute(bytes32 orderId)",
  "function refundAfterDeadline(bytes32 orderId)",
  "function claimAfterReview(bytes32 orderId)",
]);

/**
 * Asset registry. Only assets configured through the environment are supported;
 * no mainnet asset address is hard-coded.
 */
export function supportedAssets() {
  const assets: { symbol: string; address: `0x${string}`; decimals: number; kind: "erc20" }[] = [];
  if (env.SETTLEMENT_TOKEN_ADDRESS && isAddress(env.SETTLEMENT_TOKEN_ADDRESS)) {
    assets.push({
      symbol: env.SETTLEMENT_TOKEN_SYMBOL,
      address: getAddress(env.SETTLEMENT_TOKEN_ADDRESS),
      decimals: env.SETTLEMENT_TOKEN_DECIMALS,
      kind: "erc20",
    });
  }
  return assets;
}

export function chainConfig() {
  return {
    chainId: activeChain.id,
    name: activeChain.name,
    rpcUrl: env.RPC_URL,
    explorerUrl: env.EXPLORER_URL ?? null,
    escrowAddress: env.ESCROW_ADDRESS && isAddress(env.ESCROW_ADDRESS) ? getAddress(env.ESCROW_ADDRESS) : null,
    businessRegistryAddress:
      env.BUSINESS_REGISTRY_ADDRESS && isAddress(env.BUSINESS_REGISTRY_ADDRESS)
        ? getAddress(env.BUSINESS_REGISTRY_ADDRESS)
        : null,
    settlementToken: supportedAssets()[0] ?? null,
    platformFeeBps: env.PLATFORM_FEE_BPS,
  };
}

export function escrowReady(): boolean {
  const c = chainConfig();
  return Boolean(c.escrowAddress && c.settlementToken);
}

/** Deterministic onchain order id derived from the database order id. */
export const escrowOrderIdFor = (orderId: string) => keccak256(toBytes(`stewra:order:${orderId}`));

export async function readBalances(address: `0x${string}`) {
  const eth = await publicClient.getBalance({ address });
  const tokens = await Promise.all(
    supportedAssets().map(async (a) => ({
      ...a,
      balanceUnits: (
        await publicClient.readContract({ address: a.address, abi: erc20Abi, functionName: "balanceOf", args: [address] })
      ).toString(),
    })),
  );
  return { eth: { symbol: "ETH", decimals: 18, balanceUnits: eth.toString() }, tokens };
}

type EscrowEventName = "OrderFunded" | "PaymentReleased" | "Refunded" | "DisputeOpened" | "DeliverySubmitted";

/**
 * Fetch a transaction receipt and return the decoded escrow event of the given name
 * for the given onchain order id. Throws if the tx failed or the event is absent.
 */
export async function findEscrowEvent(txHash: Hash, eventName: EscrowEventName, escrowOrderId: `0x${string}`) {
  const cfg = chainConfig();
  if (!cfg.escrowAddress) throw new Error("Escrow contract is not configured");
  const receipt = await publicClient.getTransactionReceipt({ hash: txHash });
  if (receipt.status !== "success") throw new Error("Transaction reverted");
  for (const log of receipt.logs) {
    if (getAddress(log.address) !== cfg.escrowAddress) continue;
    try {
      const decoded = decodeEventLog({ abi: escrowAbi, data: log.data, topics: log.topics });
      if (decoded.eventName === eventName && (decoded.args as { orderId: string }).orderId === escrowOrderId) {
        return { args: decoded.args as Record<string, unknown>, receipt, logIndex: log.logIndex };
      }
    } catch {
      // not an escrow event we know
    }
  }
  throw new Error(`No ${eventName} event for this order in transaction ${txHash}`);
}
