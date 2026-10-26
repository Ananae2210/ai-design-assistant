import { createHash } from "node:crypto";

/** Small least-recently-used cache, so the same screenshot is never paid for twice. */
export class LruCache<V> {
  private items = new Map<string, V>();

  constructor(private readonly max = 100) {}

  get(key: string): V | undefined {
    const value = this.items.get(key);
    if (value !== undefined) {
      this.items.delete(key);
      this.items.set(key, value);
    }
    return value;
  }

  set(key: string, value: V) {
    this.items.delete(key);
    this.items.set(key, value);
    if (this.items.size > this.max) this.items.delete(this.items.keys().next().value!);
  }
}

export function cacheKey(...parts: string[]): string {
  const hash = createHash("sha256");
  for (const part of parts) hash.update(part).update("\0");
  return hash.digest("hex");
}
