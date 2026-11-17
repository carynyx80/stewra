import { describe, expect, it } from "vitest";
import { toolsForAgent } from "../src/ai/engine.js";
import { estimateCostMicros } from "../src/ai/provider.js";
import { TEMPLATES } from "../src/templates.js";

describe("agent tool permissions", () => {
  it("never exposes delegation to non-orchestrators, even if assigned", () => {
    const tools = toolsForAgent({ tools: ["delegate_task", "submit_deliverable"], isOrchestrator: false });
    expect(tools.map((t) => t.name)).toEqual(["submit_deliverable"]);
  });
  it("exposes only assigned tools", () => {
    const tools = toolsForAgent({ tools: ["search_knowledge"], isOrchestrator: true });
    expect(tools.map((t) => t.name)).toEqual(["search_knowledge"]);
  });
  it("ignores unknown tool names", () => {
    expect(toolsForAgent({ tools: ["transfer_funds", "shell"], isOrchestrator: true })).toEqual([]);
  });
  it("has no tool that can move funds", () => {
    const names = toolsForAgent({ tools: TEMPLATES.flatMap((t) => t.agents.flatMap((a) => a.tools)), isOrchestrator: true }).map((t) => t.name);
    expect(names.some((n) => /transfer|pay|send|withdraw|sign/.test(n))).toBe(false);
  });
});

describe("templates", () => {
  it("every template has exactly one orchestrator", () => {
    for (const t of TEMPLATES) expect(t.agents.filter((a) => a.isOrchestrator).length).toBe(1);
  });
});

describe("cost estimation", () => {
  it("prices Opus 5.5 at $4 / $20 per million tokens", () => {
    expect(estimateCostMicros("claude-opus-5-5", 1_000_000, 0)).toBe(4_000_000);
    expect(estimateCostMicros("claude-opus-5-5", 0, 1_000_000)).toBe(20_000_000);
  });
});
