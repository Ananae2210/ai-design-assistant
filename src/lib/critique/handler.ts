import Anthropic from "@anthropic-ai/sdk";
import { LruCache, cacheKey } from "./cache";
import { RateLimiter } from "./rateLimit";
import { CritiqueError, type CritiqueResult, type MessagesClient, runCritique } from "./run";
import { CritiqueRequestSchema } from "./schema";

export type CritiqueResponseBody =
  | ({ ok: true; cached: boolean } & CritiqueResult)
  | { ok: false; error: string; message: string };

export type HandlerDeps = {
  /** Null when no API key is configured. */
  client: MessagesClient | null;
  model: string;
  perClient: RateLimiter;
  global: RateLimiter;
  cache: LruCache<CritiqueResult>;
};

const fail = (status: number, error: string, message: string, headers?: HeadersInit) =>
  Response.json({ ok: false, error, message } satisfies CritiqueResponseBody, { status, headers });

function clientId(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
}

export async function handleCritique(request: Request, deps: HandlerDeps): Promise<Response> {
  if (!deps.client) {
    return fail(503, "ai_unavailable", "AI review isn't set up on this deployment yet.");
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail(400, "invalid_request", "The request body must be JSON.");
  }
  const parsed = CritiqueRequestSchema.safeParse(body);
  if (!parsed.success) {
    return fail(400, "invalid_request", "That image or its details couldn't be read.");
  }
  const input = parsed.data;

  const key = cacheKey(deps.model, input.image.data, input.context, JSON.stringify(input.findings));
  const hit = deps.cache.get(key);
  if (hit) return Response.json({ ok: true, cached: true, ...hit } satisfies CritiqueResponseBody);

  for (const [limiter, id, message] of [
    [deps.perClient, clientId(request), "You've used your free reviews for now."],
    [deps.global, "all", "The demo has reached today's review limit."],
  ] as const) {
    const limit = limiter.check(id);
    if (!limit.allowed) {
      const retryAfter = Math.max(1, Math.ceil((limit.resetAt - Date.now()) / 1000));
      return fail(429, "rate_limited", `${message} Try again later.`, { "Retry-After": String(retryAfter) });
    }
  }

  try {
    const result = await runCritique(deps.client, input, deps.model);
    deps.cache.set(key, result);
    return Response.json({ ok: true, cached: false, ...result } satisfies CritiqueResponseBody);
  } catch (error) {
    if (error instanceof CritiqueError) {
      return fail(error.code === "refused" ? 422 : 502, error.code, error.message);
    }
    if (error instanceof Anthropic.RateLimitError) {
      return fail(429, "rate_limited", "The AI service is busy. Try again in a minute.");
    }
    if (error instanceof Anthropic.AuthenticationError) {
      console.error("Anthropic API key was rejected");
      return fail(503, "ai_unavailable", "AI review isn't set up correctly on this deployment.");
    }
    if (error instanceof Anthropic.APIError) {
      console.error(`Anthropic API error ${error.status}`, error.message);
      return fail(502, "upstream_error", "The AI service had a problem. Try again shortly.");
    }
    throw error;
  }
}
