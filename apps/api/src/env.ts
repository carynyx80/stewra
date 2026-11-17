import { z } from "zod";

const bool = z
  .string()
  .optional()
  .transform((v) => v === "true" || v === "1");

const schema = z.object({
  NODE_ENV: z.string().default("development"),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  // comma-separated list of allowed browser origins, e.g. https://stewra.vercel.app
  CORS_ORIGINS: z.string().default("http://localhost:3000"),
  // the domain that appears in the sign-in message (EIP-4361 style)
  AUTH_DOMAIN: z.string().default("localhost:3000"),

  ANTHROPIC_API_KEY: z.string().optional(),
  DEFAULT_MODEL: z.string().default("claude-opus-5-5"),
  // Explicitly labelled mock mode for local development only. Never enabled in production.
  AGENT_MOCK_MODE: bool,
  WORKER_ENABLED: z
    .string()
    .optional()
    .transform((v) => v !== "false"),
  WORKER_CONCURRENCY: z.coerce.number().default(2),

  CHAIN_ID: z.coerce.number().default(46630),
  RPC_URL: z.string().default("https://rpc.testnet.chain.robinhood.com"),
  EXPLORER_URL: z.string().optional(),
  ESCROW_ADDRESS: z.string().optional(),
  BUSINESS_REGISTRY_ADDRESS: z.string().optional(),
  SETTLEMENT_TOKEN_ADDRESS: z.string().optional(),
  SETTLEMENT_TOKEN_SYMBOL: z.string().default("tUSD"),
  SETTLEMENT_TOKEN_DECIMALS: z.coerce.number().default(6),

  PLATFORM_FEE_BPS: z.coerce.number().int().min(0).max(900).default(0),
  QUOTE_TTL_MINUTES: z.coerce.number().default(30),
});

export type Env = z.infer<typeof schema>;

function load(): Env {
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  ${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  const env = parsed.data;
  if (env.NODE_ENV === "production" && env.AGENT_MOCK_MODE) {
    throw new Error("AGENT_MOCK_MODE must not be enabled in production");
  }
  return env;
}

export const env = load();
export const corsOrigins = env.CORS_ORIGINS.split(",").map((s) => s.trim()).filter(Boolean);
