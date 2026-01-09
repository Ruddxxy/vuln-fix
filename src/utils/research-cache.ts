import localforage from "localforage";
import logger from "@/utils/logger";

// Create a dedicated store for research cache
const cacheStore = localforage.createInstance({
  name: "deep-journalist",
  storeName: "researchCache",
});

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

const CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

// Normalize and hash query for cache key
function getCacheKey(query: string): string {
  const normalized = query.toLowerCase().trim().replace(/\s+/g, " ");
  // Simple hash function
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    const char = normalized.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `query_${Math.abs(hash).toString(16)}`;
}

// Get cached result
export async function getCachedResult<T>(query: string): Promise<T | null> {
  try {
    const key = getCacheKey(query);
    const entry = await cacheStore.getItem<CacheEntry<T>>(key);
    
    if (!entry) return null;
    
    // Check if expired
    if (Date.now() > entry.expiresAt) {
      await cacheStore.removeItem(key);
      logger.info(`Cache expired for query: "${query.substring(0, 50)}..."`);
      return null;
    }
    
    logger.info(`Cache hit for query: "${query.substring(0, 50)}..."`);
    return entry.data;
  } catch (error) {
    logger.warn("Cache read error:", error);
    return null;
  }
}

// Set cached result
export async function setCachedResult<T>(query: string, data: T): Promise<void> {
  try {
    const key = getCacheKey(query);
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + CACHE_EXPIRY_MS,
    };
    await cacheStore.setItem(key, entry);
    logger.info(`Cached result for query: "${query.substring(0, 50)}..."`);
  } catch (error) {
    logger.warn("Cache write error:", error);
  }
}

// Clear all cache
export async function clearCache(): Promise<void> {
  try {
    await cacheStore.clear();
    logger.info("Research cache cleared");
  } catch (error) {
    logger.warn("Cache clear error:", error);
  }
}

// Get cache statistics
export async function getCacheStats(): Promise<{ count: number; oldestEntry: number | null }> {
  try {
    const keys = await cacheStore.keys();
    let oldestTimestamp: number | null = null;
    
    for (const key of keys) {
      const entry = await cacheStore.getItem<CacheEntry<unknown>>(key);
      if (entry && (oldestTimestamp === null || entry.timestamp < oldestTimestamp)) {
        oldestTimestamp = entry.timestamp;
      }
    }
    
    return { count: keys.length, oldestEntry: oldestTimestamp };
  } catch (error) {
    logger.warn("Cache stats error:", error);
    return { count: 0, oldestEntry: null };
  }
}

// Clean expired entries
export async function cleanExpiredEntries(): Promise<number> {
  try {
    const keys = await cacheStore.keys();
    let removedCount = 0;
    const now = Date.now();
    
    for (const key of keys) {
      const entry = await cacheStore.getItem<CacheEntry<unknown>>(key);
      if (entry && now > entry.expiresAt) {
        await cacheStore.removeItem(key);
        removedCount++;
      }
    }
    
    if (removedCount > 0) {
      logger.info(`Cleaned ${removedCount} expired cache entries`);
    }
    
    return removedCount;
  } catch (error) {
    logger.warn("Cache cleanup error:", error);
    return 0;
  }
}

export default {
  getCachedResult,
  setCachedResult,
  clearCache,
  getCacheStats,
  cleanExpiredEntries,
};
