// services/cacheService.js - Simple in-memory caching
export class CacheService {
  constructor() {
    this.cache = new Map();
    this.ttls = new Map();
    
    // Clean expired entries every 5 minutes
    setInterval(() => this.cleanExpired(), 5 * 60 * 1000);
  }

  /**
   * Store value in cache with optional TTL (in seconds)
   */
  async set(key, value, ttl = 300) {
    this.cache.set(key, value);
    
    if (ttl > 0) {
      const expiresAt = Date.now() + (ttl * 1000);
      this.ttls.set(key, expiresAt);
    }
    
    return true;
  }

  /**
   * Retrieve value from cache
   */
  async get(key) {
    // Check if expired
    if (this.isExpired(key)) {
      this.delete(key);
      return null;
    }
    
    return this.cache.get(key) || null;
  }

  /**
   * Delete key from cache
   */
  async delete(key) {
    this.cache.delete(key);
    this.ttls.delete(key);
    return true;
  }

  /**
   * Clear all cache
   */
  async clear() {
    this.cache.clear();
    this.ttls.clear();
    return true;
  }

  /**
   * Check if key exists and is not expired
   */
  async has(key) {
    if (this.isExpired(key)) {
      this.delete(key);
      return false;
    }
    return this.cache.has(key);
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }

  // Private methods

  isExpired(key) {
    const expiresAt = this.ttls.get(key);
    if (!expiresAt) return false;
    return Date.now() > expiresAt;
  }

  cleanExpired() {
    const now = Date.now();
    for (const [key, expiresAt] of this.ttls.entries()) {
      if (now > expiresAt) {
        this.cache.delete(key);
        this.ttls.delete(key);
      }
    }
  }
}