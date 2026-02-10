/**
 * Data Caching Utility
 * Provides in-memory and localStorage caching for API data
 * Automatically invalidates stale data based on TTL (time-to-live)
 */

const CACHE_PREFIX = 'orbit_cache_';
const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds

// In-memory cache for fast access
const memoryCache = new Map();

/**
 * Generate cache key
 */
function getCacheKey(namespace, key) {
  return `${CACHE_PREFIX}${namespace}_${key}`;
}

/**
 * Get data from cache (checks memory first, then localStorage)
 */
export function getCachedData(namespace, key) {
  const cacheKey = getCacheKey(namespace, key);
  
  // Check memory cache first
  if (memoryCache.has(cacheKey)) {
    const cached = memoryCache.get(cacheKey);
    if (cached.expiresAt > Date.now()) {
      return cached.data;
    }
    // Remove expired data
    memoryCache.delete(cacheKey);
  }
  
  // Check localStorage
  try {
    const stored = localStorage.getItem(cacheKey);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed.expiresAt > Date.now()) {
        // Restore to memory cache
        memoryCache.set(cacheKey, parsed);
        return parsed.data;
      }
      // Remove expired data
      localStorage.removeItem(cacheKey);
    }
  } catch (error) {
    console.error('Error reading from cache:', error);
  }
  
  return null;
}

/**
 * Set data in cache (both memory and localStorage)
 */
export function setCachedData(namespace, key, data, ttl = DEFAULT_TTL) {
  const cacheKey = getCacheKey(namespace, key);
  const cacheEntry = {
    data,
    expiresAt: Date.now() + ttl,
    cachedAt: Date.now(),
  };
  
  // Set in memory cache
  memoryCache.set(cacheKey, cacheEntry);
  
  // Set in localStorage
  try {
    localStorage.setItem(cacheKey, JSON.stringify(cacheEntry));
  } catch (error) {
    console.error('Error writing to cache:', error);
    // If localStorage is full, clear old entries
    if (error.name === 'QuotaExceededError') {
      clearExpiredCache();
      try {
        localStorage.setItem(cacheKey, JSON.stringify(cacheEntry));
      } catch (retryError) {
        console.error('Failed to cache after cleanup:', retryError);
      }
    }
  }
}

/**
 * Invalidate specific cache entry
 */
export function invalidateCache(namespace, key) {
  const cacheKey = getCacheKey(namespace, key);
  memoryCache.delete(cacheKey);
  try {
    localStorage.removeItem(cacheKey);
  } catch (error) {
    console.error('Error invalidating cache:', error);
  }
}

/**
 * Invalidate all cache entries for a namespace
 */
export function invalidateNamespace(namespace) {
  const prefix = `${CACHE_PREFIX}${namespace}_`;
  
  // Clear from memory cache
  for (const key of memoryCache.keys()) {
    if (key.startsWith(prefix)) {
      memoryCache.delete(key);
    }
  }
  
  // Clear from localStorage
  try {
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefix)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
  } catch (error) {
    console.error('Error invalidating namespace:', error);
  }
}

/**
 * Clear all expired cache entries
 */
export function clearExpiredCache() {
  const now = Date.now();
  
  // Clear from memory cache
  for (const [key, value] of memoryCache.entries()) {
    if (value.expiresAt <= now) {
      memoryCache.delete(key);
    }
  }
  
  // Clear from localStorage
  try {
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(CACHE_PREFIX)) {
        try {
          const stored = localStorage.getItem(key);
          if (stored) {
            const parsed = JSON.parse(stored);
            if (parsed.expiresAt <= now) {
              keysToRemove.push(key);
            }
          }
        } catch (parseError) {
          // Remove corrupted entries
          keysToRemove.push(key);
        }
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
  } catch (error) {
    console.error('Error clearing expired cache:', error);
  }
}

/**
 * Clear all cache data
 */
export function clearAllCache() {
  memoryCache.clear();
  
  try {
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(CACHE_PREFIX)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
  } catch (error) {
    console.error('Error clearing all cache:', error);
  }
}

/**
 * Fetch data with caching
 * @param {string} namespace - Cache namespace (e.g., 'budgetConfigs', 'approvers')
 * @param {string} key - Unique key for this data (e.g., 'all', 'L1', user ID)
 * @param {Function} fetchFn - Async function to fetch data if not in cache
 * @param {number} ttl - Time to live in milliseconds
 * @param {boolean} forceRefresh - Force bypass cache and fetch fresh data
 */
export async function fetchWithCache(namespace, key, fetchFn, ttl = DEFAULT_TTL, forceRefresh = false) {
  // Check cache first unless force refresh
  if (!forceRefresh) {
    const cached = getCachedData(namespace, key);
    if (cached !== null) {
      return cached;
    }
  }
  
  // Fetch fresh data
  const data = await fetchFn();
  
  // Cache the result
  setCachedData(namespace, key, data, ttl);
  
  return data;
}

// Auto-cleanup expired cache every 5 minutes
if (typeof window !== 'undefined') {
  setInterval(clearExpiredCache, 5 * 60 * 1000);
}
