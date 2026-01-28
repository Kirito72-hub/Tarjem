import { SubtitleProvider, SubtitleResult } from './providers/types'
import { MetadataResult } from './metadataApi'

export class ProviderRegistry {
  private providers: Map<string, SubtitleProvider> = new Map()
  private store: any

  constructor(store: any) {
    this.store = store
  }

  register(provider: SubtitleProvider) {
    this.providers.set(provider.id, provider)
    console.log(`Registered provider: ${provider.name} (${provider.id})`)
  }

  getProvider(id: string): SubtitleProvider | undefined {
    return this.providers.get(id)
  }

  /**
   * Search all enabled providers
   */
  async searchAll(
    query: string,
    metadata: MetadataResult,
    language: string,
    enabledIds?: string[]
  ): Promise<SubtitleResult[]> {
    let activeIds: string[] = []

    if (enabledIds && enabledIds.length > 0) {
      activeIds = enabledIds
    } else {
      // Fallback to store if no specific IDs passed
      const savedSourcesStr = this.store.get('subtitle_sources')
      if (savedSourcesStr) {
        try {
          const sources = JSON.parse(savedSourcesStr as string)
          if (Array.isArray(sources)) {
            activeIds = sources.filter((s: any) => s.enabled).map((s: any) => s.id)
          }
        } catch (e) {
          console.error('Failed to parse sources from store', e)
        }
      }
      
      // If still empty (nothing saved), use defaults
      if (activeIds.length === 0) {
         // This logic mimics default App state
         activeIds = ['opensubtitles', 'subdl', 'animeslayer'] 
      }
    }

    console.log(`[ProviderRegistry] Searching providers: ${activeIds.join(', ')}`)

    const promises = activeIds.map(async (id) => {
      const provider = this.providers.get(id)
      if (!provider) {
        // console.warn(`Provider ${id} enabled but not registered/implemented`)
        return []
      }
      try {
        const results = await provider.search(query, metadata, language)
        return results
      } catch (error) {
        console.error(`[${provider.name}] Search failed:`, error)
        return []
      }
    })

    const resultsArray = await Promise.all(promises)
    const flattened = resultsArray.flat()
    
    // De-duplicate by URL
    const seenUrls = new Set()
    const uniqueResults: SubtitleResult[] = []
    
    for (const res of flattened) {
      if (!seenUrls.has(res.url)) {
        seenUrls.add(res.url)
        uniqueResults.push(res)
      }
    }

    console.log(`[ProviderRegistry] Total unique results: ${uniqueResults.length}`)
    return uniqueResults
  }

  /**
   * Search by hash across enabled providers
   */
  async searchAllByHash(
    hash: string,
    language: string,
    enabledIds?: string[]
  ): Promise<SubtitleResult[]> {
    // Similar dynamic logic
    let activeIds: string[] = []
     if (enabledIds && enabledIds.length > 0) {
      activeIds = enabledIds
    } else {
      const savedSourcesStr = this.store.get('subtitle_sources')
      if (savedSourcesStr) {
        try {
          const sources = JSON.parse(savedSourcesStr as string)
          if (Array.isArray(sources)) {
            activeIds = sources.filter((s: any) => s.enabled).map((s: any) => s.id)
          }
        } catch (e) {
             // ignore
        }
      }
      if (activeIds.length === 0) activeIds = ['opensubtitles'] // Default for hash?
    }
    
    console.log(`[ProviderRegistry] Hash search providers: ${activeIds.join(', ')}`)

    const promises = activeIds.map(async (id) => {
      const provider = this.providers.get(id)
      if (!provider || !provider.searchByHash) return []
      try {
        return await provider.searchByHash(hash, language)
      } catch (error) {
        console.error(`[${provider.name}] Hash Search failed:`, error)
        return []
      }
    })

    const resultsArray = await Promise.all(promises)
    return resultsArray.flat()
  }
}
