// ============================================
// AeroStreet-AI — In-Memory TTL Cache with Eviction
// ============================================

export class TTLMemoryCache {
  /**
   * @param {number} defaultTtlMs - Default TTL in milliseconds (default: 10 mins)
   * @param {number} maxEntries - Maximum cache capacity to prevent memory leaks (default: 500)
   */
  constructor(defaultTtlMs = 10 * 60 * 1000, maxEntries = 500) {
    this.defaultTtlMs = defaultTtlMs;
    this.maxEntries = maxEntries;
    this.cache = new Map();
  }

  /**
   * Set cache entry
   * @param {string} key
   * @param {any} value
   * @param {number} [ttlMs]
   */
  set(key, value, ttlMs = this.defaultTtlMs) {
    // Evict oldest if limit reached
    if (this.cache.size >= this.maxEntries) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) this.cache.delete(oldestKey);
    }

    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
    });
  }

  /**
   * Get cache entry or null if missing/expired
   * @param {string} key
   * @returns {any|null}
   */
  get(key) {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.value;
  }

  /**
   * Check if active key exists
   * @param {string} key
   * @returns {boolean}
   */
  has(key) {
    return this.get(key) !== null;
  }

  /**
   * Delete entry
   * @param {string} key
   */
  delete(key) {
    this.cache.delete(key);
  }

  /**
   * Clear all cache
   */
  clear() {
    this.cache.clear();
  }

  /**
   * Current size of active cache
   */
  size() {
    // Clean expired
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
    return this.cache.size;
  }
}

// Global shared caches
export const telemetryCache = new TTLMemoryCache(10 * 60 * 1000, 300); // 10m TTL
export const geminiCache = new TTLMemoryCache(5 * 60 * 1000, 200); // 5m TTL
export const assistantCache = new TTLMemoryCache(15 * 60 * 1000, 200); // 15m TTL
