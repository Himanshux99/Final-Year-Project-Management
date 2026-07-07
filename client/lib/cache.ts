/**
 * Client-side caching utilities for API data
 * Reduces unnecessary API calls when switching tabs
 */

const CACHE_PREFIX = "projecthub_cache_";
const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

/**
 * Get cached data if valid
 */
export function getCachedData<T>(key: string): T | null {
  try {
    const cacheKey = CACHE_PREFIX + key;
    const cached = localStorage.getItem(cacheKey);
    
    if (!cached) return null;
    
    const entry: CacheEntry<T> = JSON.parse(cached);
    const now = Date.now();
    
    // Check if cache is still valid
    if (now - entry.timestamp > entry.ttl) {
      localStorage.removeItem(cacheKey);
      return null;
    }
    
    return entry.data;
  } catch (error) {
    console.error("Cache read error:", error);
    return null;
  }
}

/**
 * Set cached data with TTL
 */
export function setCachedData<T>(
  key: string, 
  data: T, 
  ttl: number = DEFAULT_TTL
): void {
  try {
    const cacheKey = CACHE_PREFIX + key;
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl,
    };
    
    localStorage.setItem(cacheKey, JSON.stringify(entry));
  } catch (error) {
    console.error("Cache write error:", error);
    // If localStorage is full, clear old cache entries
    clearExpiredCache();
  }
}

/**
 * Check if cache is valid
 */
export function isCacheValid(key: string): boolean {
  try {
    const cacheKey = CACHE_PREFIX + key;
    const cached = localStorage.getItem(cacheKey);
    
    if (!cached) return false;
    
    const entry: CacheEntry<unknown> = JSON.parse(cached);
    const now = Date.now();
    
    return now - entry.timestamp <= entry.ttl;
  } catch {
    return false;
  }
}

/**
 * Invalidate specific cache key
 */
export function invalidateCache(key: string): void {
  try {
    const cacheKey = CACHE_PREFIX + key;
    localStorage.removeItem(cacheKey);
  } catch (error) {
    console.error("Cache invalidation error:", error);
  }
}

/**
 * Invalidate all cache entries matching a pattern
 */
export function invalidateCachePattern(pattern: string): void {
  try {
    const keys = Object.keys(localStorage);
    keys.forEach((key) => {
      if (key.startsWith(CACHE_PREFIX) && key.includes(pattern)) {
        localStorage.removeItem(key);
      }
    });
  } catch (error) {
    console.error("Cache pattern invalidation error:", error);
  }
}

/**
 * Clear all cache entries
 */
export function clearAllCache(): void {
  try {
    const keys = Object.keys(localStorage);
    keys.forEach((key) => {
      if (key.startsWith(CACHE_PREFIX)) {
        localStorage.removeItem(key);
      }
    });
  } catch (error) {
    console.error("Cache clear error:", error);
  }
}

/**
 * Clear expired cache entries
 */
export function clearExpiredCache(): void {
  try {
    const keys = Object.keys(localStorage);
    const now = Date.now();
    
    keys.forEach((key) => {
      if (key.startsWith(CACHE_PREFIX)) {
        try {
          const cached = localStorage.getItem(key);
          if (cached) {
            const entry: CacheEntry<unknown> = JSON.parse(cached);
            if (now - entry.timestamp > entry.ttl) {
              localStorage.removeItem(key);
            }
          }
        } catch {
          // Remove corrupted entries
          localStorage.removeItem(key);
        }
      }
    });
  } catch (error) {
    console.error("Clear expired cache error:", error);
  }
}

// Cache key constants for consistent naming
export const CACHE_KEYS = {
  MENTOR_OVERVIEW: "mentor_overview",
  GROUPS: "groups",
  FACULTY_LIST: "faculty_list",
  ALLOCATIONS: "allocations",
  TEAM_PROGRESS: "team_progress",
  REVIEW_ROLLOUTS: "review_rollouts",
  MY_GROUP: "my_group",
  ATTACHMENTS: "attachments",
} as const;

// TTL constants
export const CACHE_TTL = {
  SHORT: 1 * 60 * 1000,    // 1 minute
  MEDIUM: 3 * 60 * 1000,   // 3 minutes
  LONG: 5 * 60 * 1000,     // 5 minutes
  VERY_LONG: 10 * 60 * 1000, // 10 minutes
} as const;
