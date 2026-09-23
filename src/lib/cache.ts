interface CacheEntry<T> {
  data: T;
  expiresAt: number;
  tags: string[];
}

class MemoryCache {
  private store = new Map<string, CacheEntry<any>>();

  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.data as T;
  }

  set<T>(key: string, data: T, ttlSeconds: number = 60, tags: string[] = []): void {
    this.store.set(key, {
      data,
      expiresAt: Date.now() + ttlSeconds * 1000,
      tags,
    });
  }

  invalidateTags(tags: string[]): void {
    const tagSet = new Set(tags);
    for (const [key, entry] of this.store.entries()) {
      if (entry.tags.some((t) => tagSet.has(t))) {
        this.store.delete(key);
      }
    }
  }

  delete(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }
}

declare global {
  // eslint-disable-next-line no-var
  var __crafted_server_cache: MemoryCache | undefined;
}

export const serverCache: MemoryCache =
  globalThis.__crafted_server_cache || new MemoryCache();

if (process.env.NODE_ENV !== "production") {
  globalThis.__crafted_server_cache = serverCache;
}
