import Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it, vi } from "vitest";
import { LruCache, cacheKey } from "./cache";
import { type HandlerDeps, handleCritique } from "./handler";
import { buildUserText } from "./prompt";
import { RateLimiter } from "./rateLimit";
import type { CritiqueResult, MessagesClient } from "./run";
import { CritiqueRequestSchema } from "./schema";

const critique = {
  summary: "A clear layout with one contrast problem.",
  strengths: ["Consistent spacing"],
  issues: [
    {
      title: "Low-contrast helper text",
      category: "accessibility" as const,
      severity: "major" as const,
      wcag: "1.4.3",
      location: "Under the email field",
      problem: "Grey helper text is hard to read.",
      fix: "Darken it to #5c5c66.",
    },
  ],
};

const validBody = {
  image: { mediaType: "image/png", data: "aGVsbG8=" },
  context: "Sign-up form",
  findings: [{ fg: "#949494", bg: "#ffffff", ratio: 3.03, verdict: "large-only" }],
};

function fakeClient(response: Partial<{ stop_reason: string; parsed_output: unknown }> = {}) {
  const parse = vi.fn().mockResolvedValue({
    stop_reason: "end_turn",
    parsed_output: critique,
    model: "claude-haiku-5-5",
    usage: { input_tokens: 1800, output_tokens: 600 },
    ...response,
  });
  return { client: { messages: { parse } } as unknown as MessagesClient, parse };
}

function deps(overrides: Partial<HandlerDeps> = {}): HandlerDeps {
  return {
    client: fakeClient().client,
    model: "claude-haiku-5-5",
    perClient: new RateLimiter(5, 60_000),
    global: new RateLimiter(100, 60_000),
    cache: new LruCache<CritiqueResult>(10),
    ...overrides,
  };
}

const post = (body: unknown, ip = "1.2.3.4") =>
  new Request("http://localhost/api/critique", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": ip },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });

describe("CritiqueRequestSchema", () => {
  it("accepts a valid request and fills defaults", () => {
    const parsed = CritiqueRequestSchema.parse({ image: validBody.image });
    expect(parsed.context).toBe("");
    expect(parsed.findings).toEqual([]);
  });

  it("rejects unsupported image types and malformed colours", () => {
    expect(CritiqueRequestSchema.safeParse({ image: { mediaType: "image/gif", data: "x" } }).success).toBe(false);
    expect(
      CritiqueRequestSchema.safeParse({ ...validBody, findings: [{ ...validBody.findings[0], fg: "red" }] }).success,
    ).toBe(false);
  });
});

describe("buildUserText", () => {
  it("includes the designer's context and only failing pairs", () => {
    const text = buildUserText({
      context: "Checkout page",
      findings: [
        { fg: "#000000", bg: "#ffffff", ratio: 21, verdict: "pass" },
        { fg: "#949494", bg: "#ffffff", ratio: 3.03, verdict: "large-only" },
      ],
    });
    expect(text).toContain("Checkout page");
    expect(text).toContain("#949494 on #ffffff: 3.03:1 (large text only)");
    expect(text).not.toContain("#000000");
  });
});

describe("RateLimiter", () => {
  it("allows up to the limit, then blocks until the window resets", () => {
    let now = 0;
    const limiter = new RateLimiter(2, 1000, () => now);
    expect(limiter.check("a").allowed).toBe(true);
    expect(limiter.check("a").allowed).toBe(true);
    expect(limiter.check("a").allowed).toBe(false);
    expect(limiter.check("b").allowed).toBe(true);
    now = 1000;
    expect(limiter.check("a").allowed).toBe(true);
  });
});

describe("LruCache", () => {
  it("evicts the least recently used entry", () => {
    const cache = new LruCache<number>(2);
    cache.set("a", 1);
    cache.set("b", 2);
    cache.get("a");
    cache.set("c", 3);
    expect(cache.get("b")).toBeUndefined();
    expect(cache.get("a")).toBe(1);
  });

  it("builds different keys for different inputs", () => {
    expect(cacheKey("a", "bc")).not.toBe(cacheKey("ab", "c"));
  });
});

describe("handleCritique", () => {
  it("returns the critique and sends the image and findings to Claude", async () => {
    const { client, parse } = fakeClient();
    const res = await handleCritique(post(validBody), deps({ client }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toMatchObject({ ok: true, cached: false, critique });

    const params = parse.mock.calls[0][0];
    expect(params.model).toBe("claude-haiku-5-5");
    expect(params.messages[0].content[0]).toMatchObject({ type: "image", source: { media_type: "image/png" } });
    expect(params.messages[0].content[1].text).toContain("#949494");
  });

  it("serves a repeat request from cache without calling Claude again", async () => {
    const { client, parse } = fakeClient();
    const d = deps({ client });
    await handleCritique(post(validBody), d);
    const res = await handleCritique(post(validBody), d);
    expect((await res.json()).cached).toBe(true);
    expect(parse).toHaveBeenCalledTimes(1);
  });

  it("returns 503 when no API key is configured", async () => {
    const res = await handleCritique(post(validBody), deps({ client: null }));
    expect(res.status).toBe(503);
    expect((await res.json()).error).toBe("ai_unavailable");
  });

  it("returns 400 for bad input", async () => {
    expect((await handleCritique(post("not json"), deps())).status).toBe(400);
    expect((await handleCritique(post({ image: {} }), deps())).status).toBe(400);
  });

  it("returns 429 with Retry-After once a visitor uses up their reviews", async () => {
    const d = deps({ perClient: new RateLimiter(1, 60_000) });
    await handleCritique(post(validBody), d);
    const res = await handleCritique(post({ ...validBody, context: "different" }), d);
    expect(res.status).toBe(429);
    expect(Number(res.headers.get("Retry-After"))).toBeGreaterThan(0);
  });

  it("reports a refusal as 422 and a cut-off answer as 502", async () => {
    const refused = await handleCritique(post(validBody), deps({ client: fakeClient({ stop_reason: "refusal" }).client }));
    expect(refused.status).toBe(422);
    const cut = await handleCritique(post(validBody), deps({ client: fakeClient({ stop_reason: "max_tokens" }).client }));
    expect(cut.status).toBe(502);
    expect((await cut.json()).error).toBe("incomplete");
  });

  it("maps an upstream rate limit to 429", async () => {
    const parse = vi
      .fn()
      .mockRejectedValue(new Anthropic.RateLimitError(429, { type: "error" }, "rate limited", new Headers()));
    const res = await handleCritique(post(validBody), deps({ client: { messages: { parse } } as unknown as MessagesClient }));
    expect(res.status).toBe(429);
  });
});
