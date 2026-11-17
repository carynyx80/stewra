# Deploying Stewra

Stewra has three deployable parts:

| Part | Where | Why |
|---|---|---|
| `apps/api` (API + agent worker) | Railway | Long-lived process; agent runs take minutes and must not live inside serverless requests |
| PostgreSQL | Railway | Application data, durable job queue, activity stream |
| `apps/web` | Vercel | Next.js frontend |
| `packages/contracts` | Robinhood Chain testnet (46630) | Escrow and registry |

## 1. Railway — API, worker and database

1. Create a Railway project and add the **PostgreSQL** service.
2. Add a service from the GitHub repo with **root directory `apps/api`**. `apps/api/railway.json` sets:
   - build: `npm run build` (Prisma generate + TypeScript)
   - start: `npm start` (runs `prisma migrate deploy`, then the server)
   - healthcheck: `/v1/health`
3. Variables on the API service:

| Variable | Value |
|---|---|
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` (reference) |
| `JWT_SECRET` | `${{secret(64)}}` (Railway generates it) |
| `NODE_ENV` | `production` |
| `CORS_ORIGINS` | your Vercel URL, e.g. `https://stewra.vercel.app` |
| `AUTH_DOMAIN` | the Vercel host, e.g. `stewra.vercel.app` |
| `ANTHROPIC_API_KEY` | **set this yourself** in the Railway dashboard to enable agent execution |
| `CHAIN_ID` / `RPC_URL` | `46630` / `https://rpc.testnet.chain.robinhood.com` |
| `ESCROW_ADDRESS`, `BUSINESS_REGISTRY_ADDRESS`, `SETTLEMENT_TOKEN_ADDRESS` | from step 3 |
| `EXPLORER_URL` | optional block explorer base URL |
| `PLATFORM_FEE_BPS` | `0` unless you decide otherwise (max 900) |

4. Generate a public domain for the API service.

To run the worker separately, set `WORKER_ENABLED=false` on the API service and add a second service from the same repo/root with start command `npm run start:worker`.

## 2. Vercel — frontend

1. Import the GitHub repo, **root directory `apps/web`**, framework Next.js.
2. Environment variables:
   - `NEXT_PUBLIC_API_URL` = the Railway API domain (e.g. `https://stewra-api.up.railway.app`)
   - `NEXT_PUBLIC_CHAIN_ID` = `46630`
3. Deploy, then put the Vercel URL into the API's `CORS_ORIGINS` and `AUTH_DOMAIN`.

## 3. Contracts — Robinhood Chain testnet

You need a deployer wallet with testnet ETH for gas. Never paste a private key into a file or chat; use an encrypted Foundry keystore:

```bash
cd packages/contracts
cast wallet import stewra-deployer --interactive
forge test
forge script script/Deploy.s.sol --rpc-url robinhood_testnet --broadcast --account stewra-deployer
```

The script prints `SETTLEMENT_TOKEN_ADDRESS`, `BUSINESS_REGISTRY_ADDRESS` and `ESCROW_ADDRESS`. Add them to the Railway API variables and redeploy. The deployer becomes escrow owner, arbiter and fee recipient; change these with `setArbiter` / `setFeeRecipient` / `transferOwnership` (two-step).

The token contract refuses to deploy on mainnet (chain 4663). Do not deploy the escrow to mainnet before an independent audit.

## 4. Smoke test

1. Open the Vercel URL → connect a wallet on Robinhood Chain testnet → sign in.
2. Create a business (e.g. Research Company) → run an objective → watch the CEO delegate in the project view.
3. Publish a service. From a second wallet, create another business, open the listing, request a quote, place the order, mint test tUSD on the Treasury page, approve and fund the escrow.
4. The seller's agents deliver; accept as the buyer and check the payment receipt and both treasuries.
