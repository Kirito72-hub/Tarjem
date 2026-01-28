import { MetadataResult } from './metadataApi'

interface CacheEntry {
  key: string
  metadata: MetadataResult
  timestamp: number
}

export class MetadataCache {
  private store: any
  private cacheKey = 'metadata_cache'
  private cacheDuration = 30 * 24 * 60 * 60 * 1000 // 30 days in milliseconds

  constructor(store: any) {
    this.store = store
  }

  /**
   * Generate cache key from search parameters
   */
  private generateKey(title: string, year?: number, type?: 'movie' | 'tv'): string {
    const normalizedTitle = title.toLowerCase().trim()
    return `${normalizedTitle}|${year || 'any'}|${type || 'any'}`
  }

  /**
   * Get cached metadata
   */
  get(title: string, year?: number, type?: 'movie' | 'tv'): MetadataResult | null {
    const key = this.generateKey(title, year, type)
    const cache = (this.store.get(this.cacheKey) as CacheEntry[]) || []

    const entry = cache.find((e) => e.key === key)

    if (!entry) {
      return null
    }

    // Check if cache is expired
    const now = Date.now()
    if (now - entry.timestamp > this.cacheDuration) {
      console.log(`Cache expired for: ${title}`)
      this.remove(title, year, type)
      return null
    }

    console.log(`Cache hit for: ${title}`)
    return entry.metadata
  }

  /**
   * Store metadata in cache
   */
  set(title: string, metadata: MetadataResult, year?: number, type?: 'movie' | 'tv'): void {
    const key = this.generateKey(title, year, type)
    const cache = (this.store.get(this.cacheKey) as CacheEntry[]) || []

    // Remove existing entry if present
    const filteredCache = cache.filter((e) => e.key !== key)

    // Add new entry
    filteredCache.push({
      key,
      metadata,
      timestamp: Date.now()
    })

    // Limit cache size to 1000 entries (keep most recent)
    if (filteredCache.length > 1000) {
      filteredCache.sort((a, b) => b.timestamp - a.timestamp)
      filteredCache.splice(1000)
    }

    this.store.set(this.cacheKey, filteredCache)
    console.log(`Cached metadata for: ${title}`)
  }

  /**
   * Remove entry from cache
   */
  remove(title: string, year?: number, type?: 'movie' | 'tv'): void {
    const key = this.generateKey(title, year, type)
    const cache = (this.store.get(this.cacheKey) as CacheEntry[]) || []
    const filteredCache = cache.filter((e) => e.key !== key)
    this.store.set(this.cacheKey, filteredCache)
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.store.set(this.cacheKey, [])
    console.log('Metadata cache cleared')
  }

  /**
   * Get cache statistics
   */
  getStats(): { total: number; expired: number } {
    const cache = (this.store.get(this.cacheKey) as CacheEntry[]) || []
    const now = Date.now()
    const expired = cache.filter((e) => now - e.timestamp > this.cacheDuration).length

    return {
      total: cache.length,
      expired
    }
  }
}
