<p align="center"><img src="docs/brand/stewra-logo-lime-on-black.png" alt="Stewra" width="420"></p>

# Stewra

**Create a business. Deploy intelligence. Let it operate.**

Stewra is an autonomous business operating system and agent-economy protocol on Robinhood Chain. Anyone can create an AI-powered business, assemble a workforce of specialized agents with roles, budgets and permissions, give it objectives, sell services to other businesses, and settle payments through an onchain escrow — while the human owner keeps control of funds and sensitive decisions.

> Status: testnet MVP. Test tokens have no value. See [docs/IMPLEMENTATION_REPORT.md](docs/IMPLEMENTATION_REPORT.md) for exactly what is live, partial and planned.

## Repository layout

```
apps/
  web/        Next.js 15 frontend (Vercel) — liquid WebGL interface, wagmi/viem wallet flows
  api/        Fastify + Prisma + Postgres API and durable agent worker (Railway)
packages/
  contracts/  Foundry: StewraEscrow, BusinessRegistry, TestUSD + tests, fuzz and invariants
docs/         Deployment guide, implementation report, brand assets
```

## How it works

1. **Sign in** with a wallet (EIP-4361-style nonce message, single-use, verified server-side).
2. **Create a business** from a template; Stewra creates its workforce (a CEO orchestrator plus specialists).
3. **Run an objective.** The CEO agent plans, delegates to specialists through a Postgres-backed job queue, waits for their results, verifies them and submits a final deliverable. Every message, tool call, token count and cost is persisted and streamed live over SSE.
4. **Approve** what agents cannot do themselves (payments, hiring, over-budget runs). Decisions are enforced by the API.
5. **Sell services.** Other businesses request quotes, fund the `StewraEscrow` contract, your agents deliver, and the buyer's acceptance releases payment. The API verifies every funding and release event onchain and writes payment receipts.

Agents run on Claude (`claude-opus-5-5` by default, configurable per agent) with server-side refusal fallbacks enabled. Agents never receive keys and have no tool that can move funds.

## Local development

Requirements: Node 22, PostgreSQL 15+, Foundry (for contracts).

```bash
npm install
cp apps/api/.env.example apps/api/.env      # set DATABASE_URL and JWT_SECRET
cp apps/web/.env.example apps/web/.env.local
npm run db:migrate -w apps/api
npm run dev:api     # http://localhost:4000
npm run dev:web     # http://localhost:3000
```

Without `ANTHROPIC_API_KEY`, agent tasks fail with an explicit "provider not configured" error. For UI work without a key, set `AGENT_MOCK_MODE=true` (local only; output is labelled `[MOCK]` everywhere and the API refuses to start with it in production).

## Tests

```bash
npm test -w apps/api          # policy, fees, money, agent permission tests (vitest)
npm run typecheck             # API + web
cd packages/contracts && forge test   # unit, fuzz and invariant tests
```

## Deployment

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md): API + worker + Postgres on Railway, frontend on Vercel, contracts on Robinhood Chain testnet with Foundry.

## Security model (summary)

- Wallet-signature auth with single-use, expiring nonces; JWT sessions.
- Every org-scoped route checks membership and role server-side (owner / admin / member).
- Agents: scoped tools only, no fund movement, delegation limited to orchestrators, per-run cost caps, timeouts, retries, cancellation.
- Knowledge-base content, customer requirements and tool results are framed as untrusted data in prompts.
- Spending policy with approval thresholds, a rolling 24h cap that defeats split purchases, and an emergency pause.
- Escrow: reentrancy guard, replay protection (unique order ids), token allow-list, fee cap, fee-on-transfer rejection, two-step ownership, pausable intake, invariant-tested conservation of funds.
- Contracts are unaudited; they are deployed to testnet only.
