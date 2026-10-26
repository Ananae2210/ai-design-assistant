import Anthropic from "@anthropic-ai/sdk";
import { LruCache } from "@/lib/critique/cache";
import { handleCritique } from "@/lib/critique/handler";
import { RateLimiter } from "@/lib/critique/rateLimit";
import { type CritiqueResult, DEFAULT_MODEL } from "@/lib/critique/run";

export const maxDuration = 60;

const HOUR = 60 * 60 * 1000;
const env = (name: string, fallback: number) => Number(process.env[name]) || fallback;

const deps = {
  client: process.env.ANTHROPIC_API_KEY ? new Anthropic() : null,
  model: process.env.CLAUDE_MODEL || DEFAULT_MODEL,
  perClient: new RateLimiter(env("CRITIQUE_LIMIT_PER_HOUR", 5), HOUR),
  global: new RateLimiter(env("CRITIQUE_DAILY_LIMIT", 200), 24 * HOUR),
  cache: new LruCache<CritiqueResult>(100),
};

export function POST(request: Request) {
  return handleCritique(request, deps);
}
