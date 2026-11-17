# Mainnet launch (Robinhood Chain, 4663)

The escrow contract is **not independently audited**. This guide is a guarded launch: per-order caps, deployed paused, ownership with a multisig. Raise caps only as volume and confidence grow, and commission an audit before large amounts flow through it.

## What you need

| Item | Notes |
|---|---|
| Deployer wallet with ETH on Robinhood Chain | pays gas only; import it as an encrypted Foundry keystore, never a plaintext key |
| Owner multisig (e.g. Safe) | owns the escrow: unpause, caps, token list, arbiter |
| Arbiter address | resolves disputes; a multisig is recommended |
| Fee recipient address | receives platform fees (fee is 0% unless `PLATFORM_FEE_BPS` is set) |
| Settlement token address | a stablecoin **verified** on Robinhood Chain from the issuer's official sources. Never copy an address from a chat, ad or unofficial site |
| Per-order cap | in token base units. e.g. `500000000` = 500 at 6 decimals |

## Settlement token: USDG

The only stablecoin on Robinhood's official token list is **USDG (Global Dollar)**:

| | |
|---|---|
| Address | `0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168` |
| Source | docs.robinhood.com/chain/contracts, "Token Smart Contracts" table (checked 2026-11-17) |
| Onchain (chain 4663) | `name()` "Global Dollar", `symbol()` "USDG", `decimals()` 6, contract code present, `paused()` false |
| Contract type | upgradeable proxy (EIP-1967); the issuer can upgrade it and, like most regulated stablecoins, may be able to freeze addresses |

USDC and USDT were not on Robinhood's official lists at the time of checking. Re-check the official page before deploying in case it has changed.

With 6 decimals, `MAX_ORDER_TOTAL=500000000` is a 500 USDG cap.

## 1. Deploy

```bash
cd packages/contracts
cast wallet import stewra-deployer --interactive     # once
forge test

export STEWRA_OWNER=0x...          # multisig
export STEWRA_ARBITER=0x...
export STEWRA_FEE_RECIPIENT=0x...
export SETTLEMENT_TOKEN=0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168   # USDG (official list)
export MAX_ORDER_TOTAL=500000000

forge script script/DeployMainnet.s.sol --rpc-url robinhood_mainnet --account stewra-deployer          # simulate first
forge script script/DeployMainnet.s.sol --rpc-url robinhood_mainnet --account stewra-deployer --broadcast
```

The script refuses to run on any chain but 4663, if an input is missing, if the token has no contract code, or if the cap is zero. It prints the addresses and token metadata.

## 2. Hand over and open

From the owner multisig, on the escrow address:

1. `acceptOwnership()`
2. When ready for orders: `unpause()`

## 3. Point the app at mainnet

Railway, `api` service:

```
CHAIN_ID=4663
RPC_URL=https://rpc.mainnet.chain.robinhood.com
ESCROW_ADDRESS=...                 # from the script output
BUSINESS_REGISTRY_ADDRESS=...
SETTLEMENT_TOKEN_ADDRESS=...
SETTLEMENT_TOKEN_SYMBOL=...
SETTLEMENT_TOKEN_DECIMALS=...
EXPLORER_URL=...                   # optional
```

Vercel, `stewra` project: `NEXT_PUBLIC_CHAIN_ID=4663`, then redeploy. The site's network wording, wallet network prompts, faucet visibility and testnet labels all follow this value.

Testnet data in the database (test orders, receipts) stays labelled as test activity and never counts as verified mainnet reputation.

## 4. After launch

- Watch the first orders end to end (fund → deliver → accept → receipt).
- Raise the cap with `setMaxOrderTotal(token, newCap)` from the multisig, gradually.
- Emergency: `pause()` stops new orders immediately; existing orders can still settle, refund and be disputed.
