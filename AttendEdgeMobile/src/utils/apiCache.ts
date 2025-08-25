import { Platform } from 'react-native';
import { getItem, setItem, removeItem } from './storage';
import { config } from './config';

// Cache configuration
const CACHE_CONFIG = {
  // Default cache TTL in milliseconds (5 minutes)
  defaultTTL: 5 * 60 * 1000,
  // Maximum number of items to keep in memory cache
  maxMemoryItems: 50,
  // Prefix for cache keys
  keyPrefix: '@cache:',
} as const;

type CacheEntry<T = any> = {
  data: T;
  timestamp: number;
  ttl: number;
  etag?: string;
  lastModified?: string;
};

// In-memory cache for fast access
const memoryCache = new Map<string, CacheEntry>();

/**
 * Generate a cache key from the request configuration
 */
const generateCacheKey = (url: string, params?: Record<string, any>): string => {
  const baseKey = url.split('?')[0];
  const sortedParams = params ? Object.entries(params).sort() : [];
  const paramsString = JSON.stringify(sortedParams);
  return `${CACHE_CONFIG.keyPrefix}${baseKey}:${paramsString}`;
};

/**
 * Get a cached response if available and not expired
 */
export const getCachedResponse = async <T = any>(
  url: string,
  params?: Record<string, any>,
  options: {
    useMemoryCache?: boolean;
    useDiskCache?: boolean;
    headers?: Record<string, string>;
  } = {}
): Promise<{ data: T; fromCache: boolean } | null> => {
  const {
    useMemoryCache = true,
    useDiskCache = true,
    headers = {},
  } = options;

  const cacheKey = generateCacheKey(url, params);
  const now = Date.now();

  // Check memory cache first
  if (useMemoryCache) {
    const cached = memoryCache.get(cacheKey);
    if (cached && (cached.ttl === 0 || cached.timestamp + cached.ttl > now)) {
      // Check cache control headers if provided
      if (headers['if-none-match'] && headers['if-none-match'] !== cached.etag) {
        return null;
      }
      if (
        headers['if-modified-since'] &&
        cached.lastModified &&
        new Date(headers['if-modified-since']) < new Date(cached.lastModified)
      ) {
        return null;
      }
      return { data: cached.data, fromCache: true };
    }
  }

  // Check disk cache if enabled
  if (useDiskCache) {
    try {
      const cached = await getItem<CacheEntry<T>>(cacheKey);
      if (cached && (cached.ttl === 0 || cached.timestamp + cached.ttl > now)) {
        // Add to memory cache for faster access
        if (useMemoryCache) {
          memoryCache.set(cacheKey, cached);
          // Clean up old entries if we have too many
          if (memoryCache.size > CACHE_CONFIG.maxMemoryItems) {
            const keys = Array.from(memoryCache.keys()).slice(0, 10);
            keys.forEach(key => memoryCache.delete(key));
          }
        }
        return { data: cached.data, fromCache: true };
      }
    } catch (error) {
      if (config.ENABLE_DEBUG_LOGS) {
        console.error('Error reading from cache:', error);
      }
    }
  }

  return null;
};

/**
 * Cache a response
 */
export const cacheResponse = async <T = any>(
  url: string,
  data: T,
  params?: Record<string, any>,
  options: {
    ttl?: number;
    useMemoryCache?: boolean;
    useDiskCache?: boolean;
    headers?: Record<string, string>;
  } = {}
): Promise<void> => {
  const {
    ttl = CACHE_CONFIG.defaultTTL,
    useMemoryCache = true,
    useDiskCache = true,
    headers = {},
  } = options;

  const cacheKey = generateCacheKey(url, params);
  const now = Date.now();
  const etag = headers['etag'];
  const lastModified = headers['last-modified'];

  const cacheEntry: CacheEntry<T> = {
    data,
    timestamp: now,
    ttl,
    etag,
    lastModified,
  };

  // Cache in memory
  if (useMemoryCache) {
    memoryCache.set(cacheKey, cacheEntry);
  }

  // Cache on disk
  if (useDiskCache) {
    try {
      await setItem(cacheKey, cacheEntry);
    } catch (error) {
      if (config.ENABLE_DEBUG_LOGS) {
        console.error('Error writing to cache:', error);
      }
    }
  }
};

/**
 * Remove an item from the cache
 */
export const removeCachedResponse = async (
  url: string,
  params?: Record<string, any>
): Promise<void> => {
  const cacheKey = generateCacheKey(url, params);
  
  // Remove from memory cache
  memoryCache.delete(cacheKey);
  
  // Remove from disk cache
  try {
    await removeItem(cacheKey);
  } catch (error) {
    if (config.ENABLE_DEBUG_LOGS) {
      console.error('Error removing from cache:', error);
    }
  }
};

/**
 * Clear the entire cache
 */
export const clearCache = async (): Promise<void> => {
  // Clear memory cache
  memoryCache.clear();
  
  // Clear disk cache
  try {
    const allKeys = await getItem<string[]>('@cache_keys') || [];
    await Promise.all(allKeys.map(key => removeItem(key)));
    await removeItem('@cache_keys');
  } catch (error) {
    if (config.ENABLE_DEBUG_LOGS) {
      console.error('Error clearing cache:', error);
    }
  }
};

/**
 * Invalidate cache entries matching a pattern
 */
export const invalidateCache = async (pattern: string | RegExp): Promise<void> => {
  const keysToRemove: string[] = [];
  
  // Invalidate memory cache
  for (const [key] of memoryCache.entries()) {
    if (
      (typeof pattern === 'string' && key.includes(pattern)) ||
      (pattern instanceof RegExp && pattern.test(key))
    ) {
      memoryCache.delete(key);
      keysToRemove.push(key);
    }
  }
  
  // Invalidate disk cache
  try {
    const allKeys = await getItem<string[]>('@cache_keys') || [];
    const keysToKeep = allKeys.filter(key => {
      const shouldRemove = 
        (typeof pattern === 'string' && key.includes(pattern)) ||
        (pattern instanceof RegExp && pattern.test(key));
      
      if (shouldRemove) {
        keysToRemove.push(key);
        return false;
      }
      
      return true;
    });
    
    await Promise.all(keysToRemove.map(key => removeItem(key)));
    await setItem('@cache_keys', keysToKeep);
  } catch (error) {
    if (config.ENABLE_DEBUG_LOGS) {
      console.error('Error invalidating cache:', error);
    }
  }
};

/**
 * API client with retry logic and caching
 */
class ApiClient {
  private baseURL: string;
  private defaultHeaders: Record<string, string>;
  private retryConfig: {
    maxRetries: number;
    retryDelay: number;
    retryOn: number[];
  };

  constructor(config: {
    baseURL: string;
    headers?: Record<string, string>;
    retryConfig?: {
      maxRetries?: number;
      retryDelay?: number;
      retryOn?: number[];
    };
  }) {
    this.baseURL = config.baseURL;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-Platform': Platform.OS,
      'X-App-Version': Constants.expoConfig?.version || '1.0.0',
      ...config.headers,
    };

    this.retryConfig = {
      maxRetries: config.retryConfig?.maxRetries ?? 3,
      retryDelay: config.retryConfig?.retryDelay ?? 1000,
      retryOn: config.retryConfig?.retryOn ?? [408, 429, 500, 502, 503, 504],
    };
  }

  private async request<T = any>(
    method: string,
    endpoint: string,
    options: {
      params?: Record<string, any>;
      data?: any;
      headers?: Record<string, string>;
      cache?: {
        ttl?: number;
        useCache?: boolean;
        skipCache?: boolean;
      };
    } = {}
  ): Promise<T> {
    const {
      params = {},
      data,
      headers = {},
      cache = {},
    } = options;

    const url = new URL(endpoint, this.baseURL);
    
    // Add query parameters
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, String(value));
      }
    });

    const requestHeaders = {
      ...this.defaultHeaders,
      ...headers,
    };

    // Check cache first if enabled
    if (cache.useCache && !cache.skipCache) {
      const cached = await getCachedResponse<T>(
        url.toString(),
        params,
        { headers: requestHeaders }
      );
      
      if (cached) {
        return cached.data;
      }
    }

    let attempts = 0;
    const maxAttempts = this.retryConfig.maxRetries + 1;
    let lastError: Error | null = null;

    while (attempts < maxAttempts) {
      try {
        const response = await fetch(url.toString(), {
          method,
          headers: requestHeaders,
          body: data ? JSON.stringify(data) : undefined,
        });

        // Handle successful response
        if (response.ok) {
          const responseData = await this.parseResponse<T>(response);
          
          // Cache the response if caching is enabled
          if (cache.useCache) {
            await cacheResponse<T>(
              url.toString(),
              responseData,
              params,
              {
                ttl: cache.ttl,
                headers: Object.fromEntries(response.headers.entries()),
              }
            );
          }
          
          return responseData;
        }

        // Handle error response
        if (
          attempts < this.retryConfig.maxRetries &&
          this.retryConfig.retryOn.includes(response.status)
        ) {
          // Exponential backoff
          const delay = this.retryConfig.retryDelay * Math.pow(2, attempts);
          await new Promise(resolve => setTimeout(resolve, delay));
          attempts++;
          continue;
        }

        // If we get here, the error is not retryable or we've exceeded max retries
        throw new Error(`Request failed with status ${response.status}`);
      } catch (error) {
        lastError = error as Error;
        
        if (attempts < this.retryConfig.maxRetries) {
          // Exponential backoff
          const delay = this.retryConfig.retryDelay * Math.pow(2, attempts);
          await new Promise(resolve => setTimeout(resolve, delay));
          attempts++;
        } else {
          break;
        }
      }
    }

    throw lastError || new Error('Unknown error occurred');
  }

  private async parseResponse<T>(response: Response): Promise<T> {
    const contentType = response.headers.get('content-type');
    
    if (contentType?.includes('application/json')) {
      return response.json();
    }
    
    if (contentType?.includes('text/')) {
      return (await response.text()) as unknown as T;
    }
    
    return (await response.blob()) as unknown as T;
  }

  public get<T = any>(
    endpoint: string,
    options: {
      params?: Record<string, any>;
      headers?: Record<string, string>;
      cache?: {
        ttl?: number;
        useCache?: boolean;
        skipCache?: boolean;
      };
    } = {}
  ): Promise<T> {
    return this.request<T>('GET', endpoint, {
      ...options,
    });
  }

  public post<T = any>(
    endpoint: string,
    data?: any,
    options: {
      params?: Record<string, any>;
      headers?: Record<string, string>;
      cache?: {
        ttl?: number;
        useCache?: boolean;
        skipCache?: boolean;
      };
    } = {}
  ): Promise<T> {
    return this.request<T>('POST', endpoint, {
      ...options,
      data,
    });
  }

  public put<T = any>(
    endpoint: string,
    data?: any,
    options: {
      params?: Record<string, any>;
      headers?: Record<string, string>;
      cache?: {
        ttl?: number;
        useCache?: boolean;
        skipCache?: boolean;
      };
    } = {}
  ): Promise<T> {
    return this.request<T>('PUT', endpoint, {
      ...options,
      data,
    });
  }

  public patch<T = any>(
    endpoint: string,
    data?: any,
    options: {
      params?: Record<string, any>;
      headers?: Record<string, string>;
      cache?: {
        ttl?: number;
        useCache?: boolean;
        skipCache?: boolean;
      };
    } = {}
  ): Promise<T> {
    return this.request<T>('PATCH', endpoint, {
      ...options,
      data,
    });
  }

  public delete<T = any>(
    endpoint: string,
    options: {
      params?: Record<string, any>;
      headers?: Record<string, string>;
      cache?: {
        ttl?: number;
        useCache?: boolean;
        skipCache?: boolean;
      };
    } = {}
  ): Promise<T> {
    return this.request<T>('DELETE', endpoint, {
      ...options,
    });
  }
}

export const createApiClient = (config: {
  baseURL: string;
  headers?: Record<string, string>;
  retryConfig?: {
    maxRetries?: number;
    retryDelay?: number;
    retryOn?: number[];
  };
}) => new ApiClient(config);

export const apiClient = createApiClient({
  baseURL: config.API_URL,
  headers: {
    'X-Requested-With': 'XMLHttpRequest',
  },
  retryConfig: {
    maxRetries: 3,
    retryDelay: 1000,
    retryOn: [408, 429, 500, 502, 503, 504],
  },
});

export default {
  getCachedResponse,
  cacheResponse,
  removeCachedResponse,
  clearCache,
  invalidateCache,
  createApiClient,
  apiClient,
};
