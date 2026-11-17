# Stewra — Implementation Report (MVP)

Date: 2026-11-17 · Network: Robinhood Chain testnet (46630)

## Live deployments

| Part | URL / status |
|---|---|
| Frontend (Vercel) | https://stewra-carynyx1.vercel.app |
| API + agent worker (Railway) | https://api-production-bb6bcb36.up.railway.app/v1/health |
| Database | Railway PostgreSQL, migration `20261117000000_init` applied |
| Contracts | **Not deployed to testnet yet** — needs a funded deployer wallet (see Required configuration) |

## Test results (all executed)

| Suite | Result |
|---|---|
| API unit tests (vitest): money, fee engine, spend policy incl. split-purchase defence, agent tool permissions, templates, cost estimation | 17 / 17 passed |
| Contracts (Foundry): escrow unit tests, fuzz (fund conservation, dispute splits), invariants (held == balance, total conservation), registry | 19 / 19 passed (fuzz 512 runs, invariants 128 × 64) |
| End-to-end (`apps/api/scripts/e2e.mjs`) against the real API, PGlite Postgres and a local Anvil chain with the deployed contracts, agents in labelled mock mode | 34 / 34 passed |
| Type checks (API + web) and `next build` | Passed |
| Live smoke test: Vercel pages 200, API health 200, CORS preflight from the site allowed | Passed |

The e2e run covers two separate businesses completing one paid order: wallet sign-in, nonce replay rejection, org creation with template workforce, objective executed by the background worker, approval gate for over-budget work, org isolation, self-purchase refusal, quote with disclosed fee, admin purchase held for approval, escrow approve + fund, onchain verification of funding, refusal of unrelated tx hashes and non-buyer reports, seller workforce fulfilment, onchain acceptance, exact seller payout, payment receipt, verified review, reputation, both treasuries and the dashboard revenue figure.

**Not exercised:** real Claude execution. No `ANTHROPIC_API_KEY` was available, so the e2e used `AGENT_MOCK_MODE` (output labelled `[MOCK]`). The Claude tool loop is type-checked against `@anthropic-ai/sdk` 1.9.0 but has not made a live call.

## Completed

- Wallet-signature auth (single-use expiring nonces, JWT sessions, account-switch logout)
- Organizations from 7 templates, roles (owner/admin/member), invites by wallet, public profiles
- Agent workforce: model (Claude Opus 5.5 default) and effort per agent, private instructions, scoped tools, pause/resume, memory, execution history, cost and token accounting
- Orchestration: objectives → CEO plans and delegates → specialists run as durable jobs → parent resumes with results → final deliverable; retries with backoff, timeouts, cancellation (whole tree), stale-lock recovery
- Task states: pending approval, queued, running, waiting on dependency, completed, failed, cancelled
- Approval inbox enforced server-side; expiry sweeper cancels expired work
- Spending policy: approval threshold, rolling 24 h cap (split-purchase defence), per-run model-cost cap, emergency pause
- Marketplace: listings, categories, quotes with expiry and disclosed fee, escrow orders, deliveries by the seller's agents, acceptance, disputes, refunds, receipts, reviews; verified vs unverified reputation with self-dealing excluded
- Treasury: live chain balances, dedicated treasury address, escrowed amounts, idempotent transaction ledger keyed by (chain, tx, log index)
- Real-time activity feed over SSE (persisted, works across processes), audit log
- Knowledge base (text/Markdown/CSV/JSON, org-isolated, framed as untrusted in prompts)
- Contracts: `StewraEscrow`, `BusinessRegistry`, `TestUSD` (mainnet-deploy guard), deploy script
- Frontend: all public and authenticated pages listed in the spec, liquid WebGL surface with cursor lens and click ripples, liquid glass panels, magnetic and liquid buttons, empty/loading/error states

## Partially completed

- **Knowledge retrieval:** keyword search; pgvector embeddings planned
- **Payroll:** per-task settlement live; streaming/milestone/subscription payroll shown as planned (no `PayrollStream.sol` yet)
- **Treasury:** dedicated wallet supported; smart-account scoped permissions (`TreasuryPolicy.sol`) planned
- **Model providers:** Anthropic adapter only; OpenAI-compatible providers planned
- **Uploads:** logo by URL; file/object storage and PDF extraction planned

## Unimplemented (planned)

AgentRegistry and ServiceMarketplace contracts (listings are offchain, payments onchain), external agent registration API, SDK, MCP adapter, API keys and signed webhooks (schema exists), recurring workflows, B2B multi-milestone contracts, sandboxed code execution for agents, NEX token (not created, by design).

## Contract deployment addresses

None on testnet yet. Local Anvil addresses used in testing are not meaningful.

## Required configuration

1. **`ANTHROPIC_API_KEY`** on the Railway `api` service. Set it yourself in the Railway dashboard. Until then, tasks fail with a clear "provider not configured" message.
2. **Deploy contracts** with a funded testnet wallet: `forge script script/Deploy.s.sol --rpc-url robinhood_testnet --broadcast --account <keystore>` (see DEPLOYMENT.md), then set `ESCROW_ADDRESS`, `SETTLEMENT_TOKEN_ADDRESS` and `BUSINESS_REGISTRY_ADDRESS` on the Railway service. Until then, quotes work but orders show "escrow not deployed".
3. Optional: `EXPLORER_URL` for transaction links.

## Known risks

- Contracts are unaudited; testnet only. The deployer is the escrow owner, arbiter and fee recipient until changed.
- Agent cost figures are estimates from token counts and list prices.
- One API instance runs the worker; for scale, split the worker into its own Railway service (`WORKER_ENABLED=false` + `npm run start:worker`).
- The SSE stream polls Postgres every 1.5 s per connected client.
- Sessions live in `localStorage` (bearer tokens); a cookie-based session would reduce XSS impact.

## Next priorities

1. Set the API key and deploy contracts; run the smoke test in DEPLOYMENT.md on testnet.
2. pgvector retrieval and PDF ingestion.
3. Smart-account treasury with scoped session keys; `PayrollStream.sol` with invariant tests.
4. External agent API with scoped API keys, signed webhooks and an MCP adapter.
5. Independent security review of the contracts before any mainnet use.
