import Anthropic from "@anthropic-ai/sdk";
import { env } from "../env.js";

/** USD per 1M tokens == micro-dollars per token. First-party Claude API list prices. */
const PRICING: Record<string, { input: number; output: number }> = {
  "claude-opus-5-5": { input: 4, output: 20 },
  "claude-sonnet-5-5": { input: 2, output: 10 },
  "claude-haiku-5-5": { input: 0.1, output: 0.5 },
  "claude-fable-5-2": { input: 8, output: 40 },
};

export const SUPPORTED_MODELS = [
  { id: "claude-opus-5-5", label: "Claude Opus 5.5", provider: "anthropic" },
  { id: "claude-sonnet-5-5", label: "Claude Sonnet 5.5", provider: "anthropic" },
  { id: "claude-haiku-5-5", label: "Claude Haiku 5.5", provider: "anthropic" },
  { id: "claude-fable-5-2", label: "Claude Fable 5.2", provider: "anthropic" },
] as const;

export const EFFORTS = ["low", "medium", "high", "xhigh", "max"] as const;
export type Effort = (typeof EFFORTS)[number];

/** Estimated cost in micro-dollars. Labelled as an estimate in the UI. */
export function estimateCostMicros(model: string, inputTokens: number, outputTokens: number): number {
  const p = PRICING[model] ?? PRICING["claude-opus-5-5"];
  return Math.round(inputTokens * p.input + outputTokens * p.output);
}

export function providerConfigured(): boolean {
  return Boolean(env.ANTHROPIC_API_KEY);
}

let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!env.ANTHROPIC_API_KEY) throw new ProviderNotConfiguredError();
  client ??= new Anthropic({ apiKey: env.ANTHROPIC_API_KEY, maxRetries: 2 });
  return client;
}

export class ProviderNotConfiguredError extends Error {
  constructor() {
    super("No model provider is configured. Set ANTHROPIC_API_KEY on the API service to enable agent execution.");
  }
}

export interface ModelTurn {
  content: Anthropic.Beta.BetaContentBlock[];
  stopReason: string | null;
  inputTokens: number;
  outputTokens: number;
}

/**
 * One Messages API call. Uses server-side refusal fallbacks ("default" routing) so a
 * safety decline on the primary model is retried by the API on an appropriate model.
 */
export async function callModel(opts: {
  model: string;
  effort: Effort;
  system: string;
  messages: Anthropic.Beta.BetaMessageParam[];
  tools: Anthropic.Beta.BetaTool[];
  signal?: AbortSignal;
}): Promise<ModelTurn> {
  const response = await getClient().beta.messages.create(
    {
      model: opts.model,
      max_tokens: 16000,
      system: opts.system,
      messages: opts.messages,
      tools: opts.tools,
      output_config: { effort: opts.effort },
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
    },
    { signal: opts.signal, timeout: 10 * 60 * 1000 },
  );
  return {
    content: response.content,
    stopReason: response.stop_reason,
    inputTokens: response.usage.input_tokens + (response.usage.cache_read_input_tokens ?? 0) + (response.usage.cache_creation_input_tokens ?? 0),
    outputTokens: response.usage.output_tokens,
  };
}

/** Errors worth retrying (rate limits, overload, network). Bad requests and auth errors are not. */
export function isRetryable(err: unknown): boolean {
  if (err instanceof ProviderNotConfiguredError) return false;
  if (err instanceof Anthropic.RateLimitError) return true;
  if (err instanceof Anthropic.InternalServerError) return true;
  if (err instanceof Anthropic.APIConnectionError) return true;
  if (err instanceof Anthropic.BadRequestError) return false;
  if (err instanceof Anthropic.AuthenticationError) return false;
  if (err instanceof Anthropic.PermissionDeniedError) return false;
  if (err instanceof Anthropic.NotFoundError) return false;
  if (err instanceof Anthropic.APIError) return (err.status ?? 500) >= 500;
  return true;
}
