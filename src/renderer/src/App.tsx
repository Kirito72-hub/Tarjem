import React, { useState, useEffect } from 'react'
import { TitleBar } from './components/TitleBar'
import { Sidebar } from './components/Sidebar'
import { Dashboard } from './components/Dashboard'
import { SettingsView } from './components/SettingsView'
import { SubtitleSourcesModal } from './components/SubtitleSourcesModal'
import { MergeOptionsModal } from './components/MergeOptionsModal'
import { ToastContainer } from './components/Toast'
import { useToastStore } from './store/toastStore'
import {
  EpisodeFile,
  ProcessingStage,
  View,
  SubtitleSource,
  DashboardTab,
  MergeOptions,
  SubtitleResult
} from '../../types'
import { FileText } from 'lucide-react'

const App: React.FC = () => {
  const [view, setView] = useState<View>('DASHBOARD')

  // Settings State
  const [subtitleLanguage, setSubtitleLanguage] = useState('en')

  // Load Settings when view changes (e.g. returning from Settings)
  React.useEffect(() => {
    const loadSettings = async () => {
      if (window.api && window.api.settings) {
        const lang = await window.api.settings.get('subtitle_language')
        if (lang) setSubtitleLanguage(lang)
      }
    }
    loadSettings()
  }, [view])

  // Dashboard Tabs State (Default to Auto Match)
  const [activeTab, setActiveTab] = useState<DashboardTab>('FILE_MATCH')

  // Separate Queues
  const [searchEpisodes, setSearchEpisodes] = useState<EpisodeFile[]>([]) // For Auto Match
  const [mergeEpisodes, setMergeEpisodes] = useState<EpisodeFile[]>([]) // For Merger
  const [searchResults, setSearchResults] = useState<SubtitleResult[]>([]) // For Manual Search results
  const [isSearchingWeb, setIsSearchingWeb] = useState(false)
  const [downloadingIds, setDownloadingIds] = useState<Set<string>>(new Set()) // Track downloads in progress

  // Modals State
  const [isSourcesModalOpen, setIsSourcesModalOpen] = useState(false)
  const [isMergeModalOpen, setIsMergeModalOpen] = useState(false)

  const [subtitleSources, setSubtitleSources] = useState<SubtitleSource[]>([
    { id: 'subdl', name: 'SubDL', url: 'subdl.com', enabled: true },
    { id: 'opensubtitles', name: 'OpenSubtitles', url: 'opensubtitles.org', enabled: true },
    { id: 'subsource', name: 'SubSource', url: 'subsource.net', enabled: true },
    { id: 'subscene', name: 'Subscene', url: 'subscene.com', enabled: false },
    { id: 'kitsunekko', name: 'Kitsunekko', url: 'kitsunekko.net', enabled: false },
    { id: 'animetosho', name: 'AnimeTosho', url: 'animetosho.org', enabled: false },
    { id: 'yify', name: 'YIFY Subtitles', url: 'yts-subs.com', enabled: false },
    { id: 'addic7ed', name: 'Addic7ed', url: 'addic7ed.com', enabled: false }
  ])

  // Load subtitle sources from settings on mount
  useEffect(() => {
    const loadSubtitleSources = async () => {
      if (window.api?.settings) {
        const savedSources = await window.api.settings.get('subtitle_sources')
        if (savedSources) {
          try {
            const parsed = JSON.parse(savedSources)
            if (Array.isArray(parsed) && parsed.length > 0) {
              // Migration: Remove AnimeSlayer, Add SubSource if missing
              const migrated = parsed.filter((s: any) => s.id !== 'animeslayer')
              if (!migrated.find((s: any) => s.id === 'subsource')) {
                migrated.push({
                  id: 'subsource',
                  name: 'SubSource',
                  url: 'subsource.net',
                  enabled: true
                })
              }
              setSubtitleSources(migrated)
            }
          } catch (error) {
            console.error('Failed to parse saved subtitle sources:', error)
          }
        }
      }
    }
    loadSubtitleSources()
  }, [])

  // Save subtitle sources to settings
  const handleSaveSubtitleSources = (updatedSources: SubtitleSource[]) => {
    setSubtitleSources(updatedSources)
    if (window.api?.settings) {
      window.api.settings.set('subtitle_sources', JSON.stringify(updatedSources))
    }
  }

  // Helper to get current active queue state setters
  const getCurrentQueueInfo = () => {
    return activeTab === 'FILE_MATCH'
      ? { episodes: searchEpisodes, setEpisodes: setSearchEpisodes }
      : { episodes: mergeEpisodes, setEpisodes: setMergeEpisodes }
  }

  // 1. Initial File Intake (Drag/Drop or File Picker)
  const handleAddFiles = async (fileList: FileList | null) => {
    let filesToProcess: { name: string; path: string; size: number }[] = []

    // Handle FileList (Dropping)
    if (fileList && fileList.length > 0) {
      // Filter extensions based on active tab
      const allowedExtensions =
        activeTab === 'FILE_MATCH'
          ? ['avi', 'mkv', 'mp4'] // Auto Match: only video files
          : ['mkv', 'mp4', 'avi', 'srt', 'ass', 'vtt', 'sub'] // Merger: video + subtitle files

      filesToProcess = Array.from(fileList)
        .filter((f) => {
          const ext = f.name.split('.').pop()?.toLowerCase()
          return ext && allowedExtensions.includes(ext)
        })
        .map((f) => ({
          name: f.name,
          path: (f as any).path || f.name, // Electron File object has path
          size: f.size
        }))
    }
    // Handle Native Dialog (Clicking)
    else {
      const paths = await window.api.files.selectFiles(activeTab)
      if (!paths || paths.length === 0) return

      // Call main process to get file details (size, name)
      // For now, we'll just use the path and mock size/name
      // In a real app, we should have a 'files:getDetails' IPC
      filesToProcess = paths.map((p) => {
        const name = p.split(/[/\\]/).pop() || p
        return {
          name: name,
          path: p,
          size: 0 // We'll need another IPC to get size, or valid locally
        }
      })
    }

    if (filesToProcess.length === 0) return

    const targetQueue = activeTab === 'MERGER' ? 'MERGER' : 'FILE_MATCH'
    if (activeTab === 'WEB_SEARCH') setActiveTab('FILE_MATCH')

    const newEpisodes: EpisodeFile[] = filesToProcess.map((file) => {
      const ext = file.name.split('.').pop()?.toLowerCase() || ''
      const isSubtitle = ['srt', 'ass', 'vtt', 'sub'].includes(ext)

      return {
        id: Math.random().toString(36).substr(2, 9),
        path: file.path,
        filename: file.name,
        size: file.size > 0 ? `${(file.size / (1024 * 1024)).toFixed(1)} MB` : 'Pending',
        progress: 0,
        stage: ProcessingStage.IDLE,
        statusMessage: isSubtitle ? 'Ready to merge' : 'Ready to process',
        thumbnailUrl: !isSubtitle
          ? `https://picsum.photos/200/200?random=${Math.floor(Math.random() * 1000)}`
          : undefined,
        selected: true,
        fileType: isSubtitle ? 'SUBTITLE' : 'VIDEO'
      }
    })

    if (targetQueue === 'MERGER') {
      setMergeEpisodes((prev) => [...prev, ...newEpisodes])
    } else {
      setSearchEpisodes((prev) => [...prev, ...newEpisodes])
    }
  }

  // 2. Mock Folder Open (For Sidebar demo)
  const handleAddRandomFiles = () => {
    const videoNames = [
      '[SubsPlease] One Piece - 1092 (1080p).mkv',
      '[Erai-raws] Jujutsu Kaisen 2nd Season - 14.mp4',
      '[HorribleSubs] Bleach TYBW - 08 [1080p].mkv',
      '[Nii-sama] Frieren - 06.mkv',
      '[ASW] Solo Leveling - 02 [1080p].mkv'
    ]

    const subNames = ['One Piece - 1092.srt', 'Jujutsu Kaisen S2 - 14.ass']

    const newEpisodes: EpisodeFile[] = []
    const count = Math.floor(Math.random() * 3) + 3
    for (let i = 0; i < count; i++) {
      const randomName = videoNames[Math.floor(Math.random() * videoNames.length)]
      newEpisodes.push({
        id: Math.random().toString(36).substr(2, 9),
        path: `C:\\Fake\\Path\\${randomName}`,
        filename: randomName,
        size: `${(Math.random() * 1.5 + 0.5).toFixed(1)} GB`,
        progress: 0,
        stage: ProcessingStage.IDLE,
        statusMessage: 'Ready to process',
        thumbnailUrl: `https://picsum.photos/200/200?random=${Math.floor(Math.random() * 1000)}`,
        selected: true,
        fileType: 'VIDEO'
      })
    }

    if (activeTab === 'MERGER') {
      const subCount = Math.floor(Math.random() * 2) + 2
      for (let i = 0; i < subCount; i++) {
        const randomName = subNames[Math.floor(Math.random() * subNames.length)]
        newEpisodes.push({
          id: Math.random().toString(36).substr(2, 9),
          path: `C:\\Fake\\Path\\${randomName}`,
          filename: randomName,
          size: '45 KB',
          progress: 0,
          stage: ProcessingStage.IDLE,
          statusMessage: 'Ready to merge',
          selected: true,
          fileType: 'SUBTITLE'
        })
      }
      setMergeEpisodes((prev) => [...prev, ...newEpisodes])
    } else {
      setSearchEpisodes((prev) => [...prev, ...newEpisodes])
    }
  }

  // Manual Web Search Logic
  const handleWebSearch = async (query: string) => {
    if (!query.trim()) return
    setIsSearchingWeb(true)
    setSearchResults([])

    try {
      console.log('Searching web for:', query, 'Language:', subtitleLanguage)

      // Try to extract metadata from the query (e.g. if it's a release name or just a title)
      // This is important so we can pass 'type: tv' etc.
      let metadata = undefined
      try {
        metadata = await window.api.utils.parseFilename(query)
        console.log('Manual search metadata:', metadata)
      } catch (e) {
        console.warn('Could not parse metadata from manual query', e)
      }

      const enabledSourceIds = subtitleSources.filter((s) => s.enabled).map((s) => s.id)
      const results = await window.api.subtitles.search(
        query,
        subtitleLanguage,
        metadata,
        enabledSourceIds
      )
      setSearchResults(results || [])
    } catch (error) {
      console.error('Web search failed:', error)
      // Optional: show error notification
    } finally {
      setIsSearchingWeb(false)
    }
  }

  const handleDownloadSubtitle = async (id: string) => {
    // Find the result
    const result = searchResults.find((r) => r.id === id)
    if (!result) return

    // Add to downloading set
    setDownloadingIds((prev) => new Set(prev).add(id))

    try {
      let destinationPath = ''
      // Check Export Path
      const exportPath = await window.api.settings.get('export_path')

      if (exportPath && typeof exportPath === 'string' && exportPath.trim().length > 0) {
        // Try to organize by series name if possible
        let seriesName = 'Unsorted'
        try {
          // Try to parse filename to get series name
          const metadata = await window.api.utils.parseFilename(result.filename)
          if (metadata && metadata.title) {
            seriesName = metadata.title
          }
        } catch (e) {
          // Ignore parse error
        }

        // Construct path: ExportPath / SeriesName / Filename
        // Note: using string concatenation for renderer path construction (assuming Windows/Node friendly)
        // Clean filename? content-disposition might give real name, but we have result.filename
        destinationPath = `${exportPath}\\${seriesName}\\${result.filename}`
      } else {
        // No export path. Leave empty to let Main process default to Downloads
        destinationPath = ''
      }

      const downloaded = await window.api.subtitles.download(result.url, destinationPath, {
        filename: result.filename
      })

      if (downloaded) {
        // In manual search, we just wanted to download it.
        // But we can also add it to the Merge list for convenience.
        const newSubFile: EpisodeFile = {
          id: Math.random().toString(36).substr(2, 9),
          filename: result.filename,
          size: 'Unknown',
          progress: 100,
          stage: ProcessingStage.DONE,
          statusMessage: 'Downloaded to ' + (destinationPath || 'Downloads'),
          selected: true,
          fileType: 'SUBTITLE',
          path: destinationPath || 'Downloads' // ideally we get back the real path from main, but we don't.
        }
        setMergeEpisodes((prev) => [...prev, newSubFile])
        addToast(`Subtitle downloaded successfully`, 'success')
      }
    } catch (error) {
      console.error('Download failed', error)
      addToast('Download failed', 'error')
    } finally {
      // Remove from downloading set
      setDownloadingIds((prev) => {
        const newSet = new Set(prev)
        newSet.delete(id)
        return newSet
      })
    }
  }

  const handleDownloadEpisodeSubtitle = async (episodeId: string, result: SubtitleResult) => {
    const episode = searchEpisodes.find((e) => e.id === episodeId)
    if (!episode) return

    try {
      // 1. Determine Destination Path
      let destinationPath = ''
      const exportPath = await window.api.settings.get('export_path')

      if (exportPath && typeof exportPath === 'string' && exportPath.trim().length > 0) {
        // Use Export Path
        const metadata = await window.api.utils.parseFilename(episode.filename)
        const seriesName = metadata.title || 'Unsorted'

        // Clean filename for the subtitle (keep original name but change extension)
        const safeFilename = result.filename || 'subtitle.srt'
        const subExt = safeFilename.split('.').pop() || 'srt'
        const newFilename =
          episode.filename.substring(0, episode.filename.lastIndexOf('.')) + '.' + subExt

        // We need to construct the path.
        // Since we are in renderer, we can't use 'path.join' directly unless exposed.
        // But we can format it with forward slashes (works on Windows usually in simple cases or passing to node)
        // Actually better to handle detailed path construction in main process or expose path.join.
        // For now, let's just append strings with standard separator, electron handles it.
        // Actually, main process download handler expects specific path.
        // Let's rely on basic string concat, assuming Windows for this user (they are on Windows).
        // But proper way: pass folder and filename to download?
        // Current API: download(url, destinationPath)

        destinationPath = `${exportPath}\\${seriesName}\\${newFilename}`
      } else {
        // Default: Next to video
        const videoPath = episode.path
        const lastDotIndex = videoPath.lastIndexOf('.')
        const basePath = lastDotIndex !== -1 ? videoPath.substring(0, lastDotIndex) : videoPath
        const safeFilename = result.filename || 'subtitle.srt'
        const subExt = safeFilename.split('.').pop() || 'srt'
        destinationPath = `${basePath}.${subExt}`
      }

      await window.api.subtitles.download(result.url, destinationPath)

      setSearchEpisodes((prev) =>
        prev.map((e) =>
          e.id === episodeId
            ? {
              ...e,
              stage: ProcessingStage.COMPLETED,
              statusMessage: 'Subtitle downloaded',
              progress: 100
            }
            : e
        )
      )

      // Notify user
      addToast(`Subtitle downloaded to ${destinationPath}`, 'success')
    } catch (error: any) {
      console.error('Download failed:', error)
      setSearchEpisodes((prev) =>
        prev.map((e) =>
          e.id === episodeId
            ? {
              ...e,
              stage: ProcessingStage.ERROR,
              statusMessage: 'Download failed'
            }
            : e
        )
      )
      addToast(`Download failed: ${error.message}`, 'error')
    }
  }

  // Selection Logic
  const toggleEpisodeSelection = (id: string) => {
    const { setEpisodes } = getCurrentQueueInfo()
    setEpisodes((prev) => prev.map((e) => (e.id === id ? { ...e, selected: !e.selected } : e)))
  }

  const toggleAllEpisodes = () => {
    const { episodes, setEpisodes } = getCurrentQueueInfo()
    const allSelected = episodes.every((e) => e.selected)
    setEpisodes((prev) => prev.map((e) => ({ ...e, selected: !allSelected })))
  }

  // Deletion Logic
  const removeEpisode = (id: string) => {
    const { setEpisodes } = getCurrentQueueInfo()
    setEpisodes((prev) => prev.filter((e) => e.id !== id))
  }

  const removeSelectedEpisodes = () => {
    const { setEpisodes } = getCurrentQueueInfo()
    setEpisodes((prev) => prev.filter((e) => !e.selected))
  }

  // Queue Processing
  const startProcessingQueue = () => {
    if (activeTab === 'MERGER') {
      setIsMergeModalOpen(true)
    } else if (activeTab === 'FILE_MATCH') {
      const { episodes } = getCurrentQueueInfo()
      const itemsToStart = episodes.filter((e) => e.selected && e.stage === ProcessingStage.IDLE)
      itemsToStart.forEach((ep) => {
        simulateProcessing(ep.id, activeTab)
      })
    }
  }

  const handleMergeConfirm = (options: MergeOptions) => {
    setIsMergeModalOpen(false)
    const { episodes } = getCurrentQueueInfo()
    const itemsToStart = episodes.filter(
      (e) => e.selected && e.stage === ProcessingStage.IDLE && e.fileType === 'VIDEO'
    )

    itemsToStart.forEach((ep) => {
      simulateProcessing(ep.id, 'MERGER')
    })
  }

  // Helper to clean filename for better search results
  const cleanFilename = (filename: string): string => {
    return (
      filename
        .replace(/\[.*?\]/g, '') // Remove [Group] tags
        .replace(/\(.*?\)/g, '') // Remove (Info) tags
        .replace(/\.(mkv|mp4|avi|mp3|wav|flac|aac|wma|wmv|mov|flv|webm)$/i, '') // Remove extension
        // Remove episode/season indicators (e.g., "- 06", "S01E02", "EP 12", "Episode 5")
        .replace(/\s*-\s*\d+\s*$/i, '') // Remove "- 06" at end
        .replace(/\s*S\d+E\d+/i, '') // Remove S01E02
        .replace(/\s*EP?\s*\d+/i, '') // Remove EP 12 or E12
        .replace(/\s*Episode\s*\d+/i, '') // Remove Episode 5
        // Remove quality indicators
        .replace(/\d{3,4}p/gi, '') // Remove 1080p, 720p, etc.
        .replace(/\b(BD|BluRay|WEB-?DL|HDTV|x264|x265|HEVC|10bit|8bit)\b/gi, '') // Remove quality tags
        .replace(/[._]/g, ' ') // Replace dots and underscores with spaces
        .replace(/\s+/g, ' ') // Collapse multiple spaces
        .trim()
    )
  }

  // Helper to extract episode/season info from filename
  interface EpisodeInfo {
    title: string
    season?: number
    episode?: number
    isMovie: boolean
  }

  const extractEpisodeInfo = (filename: string): EpisodeInfo => {
    const result: EpisodeInfo = {
      title: '',
      isMovie: false
    }

    // Check for movie indicators
    if (/\b(movie|film|ova)\b/i.test(filename)) {
      result.isMovie = true
    }

    // Try to extract season and episode using various patterns
    // Pattern 1: S01E12 or s01e12
    let match = filename.match(/S(\d+)E(\d+)/i)
    if (match) {
      result.season = parseInt(match[1], 10)
      result.episode = parseInt(match[2], 10)
    }

    // Pattern 2: "- 06" or " - 12" (common anime pattern)
    if (!result.episode) {
      match = filename.match(/\s-\s(\d+)(?:\s|$|\.)/i)
      if (match) {
        result.episode = parseInt(match[1], 10)
      }
    }

    // Pattern 3: "EP 12" or "E12" or "Episode 5"
    if (!result.episode) {
      match = filename.match(/\bEP?\.?\s*(\d+)\b/i) || filename.match(/\bEpisode\s*(\d+)\b/i)
      if (match) {
        result.episode = parseInt(match[1], 10)
      }
    }

    // Pattern 4: Just a number at the end (e.g., "Show Name 06.mkv")
    if (!result.episode) {
      match = filename.match(/\s(\d{1,3})(?:\s|\.mkv|\.mp4|\.avi|$)/i)
      if (match) {
        const num = parseInt(match[1], 10)
        // Only consider it an episode if it's a reasonable episode number (1-999)
        if (num >= 1 && num <= 999) {
          result.episode = num
        }
      }
    }

    // Extract title (everything before episode/season indicators)
    let title = filename
      .replace(/\[.*?\]/g, '') // Remove tags
      .replace(/\(.*?\)/g, '')
      .replace(/\.(mkv|mp4|avi|mp3|wav|flac|aac|wma|wmv|mov|flv|webm)$/i, '')
      .replace(/S\d+E\d+/i, '')
      .replace(/\s-\s\d+.*$/i, '')
      .replace(/\bEP?\.?\s*\d+.*$/i, '')
      .replace(/\bEpisode\s*\d+.*$/i, '')
      .replace(/\d{3,4}p/gi, '')
      .replace(/\b(BD|BluRay|WEB-?DL|HDTV|x264|x265|HEVC|10bit|8bit)\b/gi, '')
      .replace(/[._]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()

    result.title = title

    return result
  }

  // Helper to check if subtitle matches the episode
  const subtitleMatchesEpisode = (
    subtitle: SubtitleResult,
    videoInfo: EpisodeInfo
  ): boolean => {
    // If video is a movie, subtitle should also be a movie
    if (videoInfo.isMovie) {
      return /\b(movie|film)\b/i.test(subtitle.filename)
    }

    // If video has episode number, subtitle should match
    if (videoInfo.episode !== undefined) {
      const subFilename = subtitle.filename.toLowerCase()

      // Extract episode number from subtitle filename using same patterns
      const patterns = [
        /\s-\s0*(\d+)(?:\s|$|\.)/i, // "- 06" or "- 6"
        /\bep?\.?\s*0*(\d+)\b/i, // "EP 06" or "E6"
        /\bepisode\s*0*(\d+)\b/i, // "Episode 6"
        /s\d+e0*(\d+)/i, // "S01E06"
        /\s0*(\d{1,3})(?:\s|\.srt|\.ass|$)/i // Just number
      ]

      for (const pattern of patterns) {
        const match = subFilename.match(pattern)
        if (match) {
          const subEpisode = parseInt(match[1], 10)
          if (subEpisode === videoInfo.episode) {
            return true
          }
        }
      }

      // No match found
      return false
    }

    // If no specific episode info, consider it a potential match
    return true
  }

  // Helper to select best subtitle from search results
  const selectBestSubtitle = (
    results: SubtitleResult[],
    videoFilename: string
  ): SubtitleResult | null => {
    if (!results || results.length === 0) return null

    // Extract episode info from video filename
    const videoInfo = extractEpisodeInfo(videoFilename)
    console.log('Video episode info:', videoInfo)

    // Filter by preferred language
    let candidates = results.filter(
      (r) => r.language.toLowerCase() === subtitleLanguage.toLowerCase()
    )

    // If no language matches, use all results
    if (candidates.length === 0) {
      candidates = results
    }

    // Filter by episode match
    const exactMatches = candidates.filter((r) => subtitleMatchesEpisode(r, videoInfo))

    console.log(
      `Episode filtering: ${candidates.length} candidates -> ${exactMatches.length} exact matches`
    )

    // Use exact matches if available, otherwise fall back to all candidates
    const finalCandidates = exactMatches.length > 0 ? exactMatches : candidates

    // Sort by score: episode match bonus + rating * 10 + downloads / 1000
    const sorted = finalCandidates.sort((a, b) => {
      const episodeMatchA = subtitleMatchesEpisode(a, videoInfo) ? 100 : 0
      const episodeMatchB = subtitleMatchesEpisode(b, videoInfo) ? 100 : 0

      const scoreA = episodeMatchA + (a.rating || 0) * 10 + (a.downloads || 0) / 1000
      const scoreB = episodeMatchB + (b.rating || 0) * 10 + (b.downloads || 0) / 1000

      return scoreB - scoreA
    })

    const selected = sorted[0] || null
    if (selected) {
      console.log(
        `Selected subtitle: ${selected.filename} (Episode match: ${subtitleMatchesEpisode(selected, videoInfo)})`
      )
    }

    return selected
  }

  const simulateProcessing = async (id: string, tab: DashboardTab) => {
    const setTargetEpisodes = tab === 'FILE_MATCH' ? setSearchEpisodes : setMergeEpisodes
    const episodes = tab === 'FILE_MATCH' ? searchEpisodes : mergeEpisodes
    const episode = episodes.find((e) => e.id === id)
    if (!episode) return

    if (tab === 'FILE_MATCH') {
      // Real Hashing Logic
      console.log('Starting hash calculation for:', episode.path)
      setSearchEpisodes((prev) =>
        prev.map((e) =>
          e.id === id
            ? {
              ...e,
              stage: ProcessingStage.HASHING,
              statusMessage: 'Calculating hash...',
              progress: 0
            }
            : e
        )
      )

      // Setup progress listener (Global for now - implies single active hash or shared progress)
      // ideally we'd pass ID to IPC to filter events
      const removeListener = window.api.hashing.onProgress((progress) => {
        setSearchEpisodes((prev) => prev.map((e) => (e.id === id ? { ...e, progress } : e)))
      })

      try {
        // Mock API for now doesn't filter by ID, so we might clash if parallel.
        // But for single file test it works.
        const hash = await window.api.hashing.calculateHash(episode.path)
        console.log('Hash calculated successfully:', hash)

        setSearchEpisodes((prev) =>
          prev.map((e) =>
            e.id === id
              ? {
                ...e,
                stage: ProcessingStage.SEARCHING,
                statusMessage: `Hash: ${hash.substring(0, 8)}...`,
                progress: 100
              }
              : e
          )
        )

        // Real Search
        console.log('Searching for subtitles with hash:', hash, 'Language:', subtitleLanguage)
        let results = await window.api.subtitles.searchByHash(hash, subtitleLanguage)
        console.log('Hash Search results:', results ? results.length : 0)

        // Fallback to Text Search if Hash Search fails
        if (!results || results.length === 0) {
          console.log('Hash search yielded no results. Falling back to text search...')

          // Parse filename to extract metadata (including isAnime flag)
          const parsedMetadata = await window.api.utils.parseFilename(episode.filename)
          console.log('Parsed metadata:', parsedMetadata)

          const cleanedQuery = parsedMetadata.title || cleanFilename(episode.filename)
          console.log('Fallback Query:', cleanedQuery)

          setSearchEpisodes((prev) =>
            prev.map((e) =>
              e.id === id
                ? {
                  ...e,
                  statusMessage: `Searching: ${cleanedQuery}...`
                }
                : e
            )
          )

          // Pass metadata to search (including isAnime flag for AniList routing)
          results = await window.api.subtitles.search(
            cleanedQuery,
            subtitleLanguage,
            parsedMetadata
          )
          console.log('Fallback Search results:', results ? results.length : 0)
        }

        if (results && results.length > 0) {
          console.log('Found', results.length, 'subtitle(s)')

          // AUTO MATCH: Select best subtitle automatically
          const bestSubtitle = selectBestSubtitle(results, episode.filename)

          if (!bestSubtitle) {
            console.log('No suitable subtitle found after filtering')
            setSearchEpisodes((prev) =>
              prev.map((e) =>
                e.id === id
                  ? {
                    ...e,
                    stage: ProcessingStage.COMPLETED,
                    statusMessage: 'No suitable subtitle found'
                  }
                  : e
              )
            )
            return
          }

          console.log('Selected best subtitle:', bestSubtitle.filename)

          // DOWNLOADING stage
          setSearchEpisodes((prev) =>
            prev.map((e) =>
              e.id === id
                ? {
                  ...e,
                  stage: ProcessingStage.DOWNLOADING,
                  statusMessage: `Downloading: ${bestSubtitle.filename}...`,
                  progress: 0
                }
                : e
            )
          )

          try {
            // Determine download path
            const exportPath = await window.api.settings.get('export_path')
            let subtitlePath = ''

            if (exportPath && typeof exportPath === 'string' && exportPath.trim().length > 0) {
              const metadata = await window.api.utils.parseFilename(episode.filename)
              const seriesName = metadata.title || 'Subtitles'
              // Create temp subtitle path
              subtitlePath = `${exportPath}\\${seriesName}\\temp_${bestSubtitle.filename}`
            } else {
              // Fallback to temp directory
              subtitlePath = `C:\\Temp\\${bestSubtitle.filename}`
            }

            // Download subtitle
            console.log('Downloading subtitle to:', subtitlePath)
            const downloaded = await window.api.subtitles.download(
              bestSubtitle.url,
              subtitlePath
            )

            if (!downloaded) {
              throw new Error('Download failed')
            }

            // MERGING stage
            setSearchEpisodes((prev) =>
              prev.map((e) =>
                e.id === id
                  ? {
                    ...e,
                    stage: ProcessingStage.MERGING,
                    statusMessage: 'Merging subtitle with video...',
                    progress: 0
                  }
                  : e
              )
            )

            // Determine output path
            let outputPath = ''
            if (exportPath && typeof exportPath === 'string' && exportPath.trim().length > 0) {
              const metadata = await window.api.utils.parseFilename(episode.filename)
              const seriesName = metadata.title || 'Merged'
              // Keep original filename and extension
              const originalFilename = episode.filename
              outputPath = `${exportPath}\\${seriesName}\\${originalFilename}`
            } else {
              // Fallback to same directory as source
              const lastSlash = episode.path.lastIndexOf('\\')
              const dir = lastSlash !== -1 ? episode.path.substring(0, lastSlash) : 'C:\\Temp'
              outputPath = `${dir}\\${episode.filename}`
            }

            console.log('Merging:', episode.path, '+', subtitlePath, '->', outputPath)

            // Setup progress listener for merge
            const removeProgressListener = window.api.merger.onProgress((progress) => {
              setSearchEpisodes((prev) => prev.map((e) => (e.id === id ? { ...e, progress } : e)))
            })

            // Merge video and subtitle
            await window.api.merger.mergeMedia({
              videoPath: episode.path,
              subtitlePath: subtitlePath,
              outputPath: outputPath
            })

            // Clean up temporary subtitle file after successful merge
            try {
              await window.api.utils.deleteFile(subtitlePath)
              console.log('Cleaned up temporary subtitle file:', subtitlePath)
            } catch (cleanupError) {
              console.warn('Failed to cleanup subtitle file:', cleanupError)
              // Don't fail the whole process if cleanup fails
            }

            // Success!
            setSearchEpisodes((prev) =>
              prev.map((e) =>
                e.id === id
                  ? {
                    ...e,
                    stage: ProcessingStage.COMPLETED,
                    statusMessage: 'Completed successfully',
                    progress: 100
                  }
                  : e
              )
            )

            addToast(`Successfully processed: ${episode.filename}`, 'success')
          } catch (downloadError: any) {
            console.error('Download or merge failed:', downloadError)
            setSearchEpisodes((prev) =>
              prev.map((e) =>
                e.id === id
                  ? {
                    ...e,
                    stage: ProcessingStage.ERROR,
                    statusMessage: `Failed: ${downloadError.message || 'Unknown error'}`
                  }
                  : e
              )
            )
            addToast(`Failed to process: ${episode.filename}`, 'error')
          }
        } else {
          console.log('No subtitles found')
          setSearchEpisodes((prev) =>
            prev.map((e) =>
              e.id === id
                ? {
                  ...e,
                  stage: ProcessingStage.COMPLETED,
                  statusMessage: 'No subtitles found'
                }
                : e
            )
          )
        }
      } catch (err: any) {
        console.error('Error in auto-match process:', err)

        // Check if it's an API key error
        const isApiKeyError = err?.message?.includes('API Key missing')

        setSearchEpisodes((prev) =>
          prev.map((e) =>
            e.id === id
              ? {
                ...e,
                stage: ProcessingStage.ERROR,
                statusMessage: isApiKeyError
                  ? 'API Key required - Check Settings'
                  : 'Search failed'
              }
              : e
          )
        )
      }

      return
    }

    // Real Merger Logic
    const startStage = ProcessingStage.MERGING
    setTargetEpisodes((prev) =>
      prev.map((e) =>
        e.id === id
          ? { ...e, stage: startStage, statusMessage: 'Preparing merge...', progress: 0 }
          : e
      )
    )

    try {
      // 1. Find matching subtitle
      // Simple heuristic: Same filename stem
      const lastDot = episode.filename.lastIndexOf('.')
      const videoNameStem =
        lastDot !== -1 ? episode.filename.substring(0, lastDot) : episode.filename

      // Look for any selected subtitle that matches or just ANY selected subtitle if only 1 is selected
      const selectedSubs = mergeEpisodes.filter((e) => e.fileType === 'SUBTITLE' && e.selected)
      let targetSub = selectedSubs.find((s) => s.filename.includes(videoNameStem))

      // Fallback: if only 1 video is processing and 1 sub is selected, use it
      if (!targetSub && selectedSubs.length === 1) {
        targetSub = selectedSubs[0]
      }

      if (!targetSub) {
        throw new Error('No matching subtitle found selected')
      }

      // Determine Output Path
      let outputPath = ''
      const exportPath = await window.api.settings.get('export_path')

      if (exportPath && typeof exportPath === 'string' && exportPath.trim().length > 0) {
        const metadata = await window.api.utils.parseFilename(episode.filename)
        const seriesName = metadata.title || 'Merged'
        const mergedFilename =
          episode.filename.substring(0, episode.filename.lastIndexOf('.')) + '_merged.mp4'
        outputPath = `${exportPath}\\${seriesName}\\${mergedFilename}`

        // Ensure we don't overwrite source if it happens to be same path (unlikely due to _merged but possible if messy)
      } else {
        outputPath = episode.path.substring(0, episode.path.lastIndexOf('.')) + '_merged.mp4'
      }

      setTargetEpisodes((prev) =>
        prev.map((e) =>
          e.id === id
            ? {
              ...e,
              statusMessage: `Merging with ${targetSub?.filename}...`
            }
            : e
        )
      )

      // Setup progress listener
      const removeProgressListener = window.api.merger.onProgress((progress) => {
        setTargetEpisodes((prev) => prev.map((e) => (e.id === id ? { ...e, progress } : e)))
      })

      console.log(`Calling mergeMedia with: ${episode.path} + ${targetSub.path} -> ${outputPath}`)
      await window.api.merger.mergeMedia({
        videoPath: episode.path,
        subtitlePath: targetSub.path,
        outputPath: outputPath
      })

      // removeProgressListener(); // Cleanup function returned by onProgress isn't callable directly like this in current impl pattern?
      // Wait, window.api.merger.onProgress returns a cleanup function () => void
      // So I should call it.
      // Actually the current implementation in preload:
      // onProgress: (callback) => { ipcRenderer.on...; return () => ... }
      // Let's verify preload implementation later. Assuming standard pattern.

      setTargetEpisodes((prev) =>
        prev.map((e) =>
          e.id === id
            ? {
              ...e,
              stage: ProcessingStage.COMPLETED,
              statusMessage: 'Merge Complete',
              progress: 100
            }
            : e
        )
      )
    } catch (error: any) {
      console.error('Merge failed:', error)
      setTargetEpisodes((prev) =>
        prev.map((e) =>
          e.id === id
            ? {
              ...e,
              stage: ProcessingStage.ERROR,
              statusMessage: `Merge Failed: ${error.message}`
            }
            : e
        )
      )
    }
  }

  const clearCompleted = () => {
    const { setEpisodes } = getCurrentQueueInfo()
    setEpisodes((prev) => prev.filter((e) => e.stage !== ProcessingStage.COMPLETED))
  }

  const renderContent = () => {
    switch (view) {
      case 'DASHBOARD':
        const { episodes } = getCurrentQueueInfo()
        return (
          <Dashboard
            activeTab={activeTab}
            onTabChange={setActiveTab}
            episodes={episodes}
            searchResults={searchResults}
            isSearchingWeb={isSearchingWeb}
            downloadingIds={downloadingIds}
            onWebSearch={handleWebSearch}
            onDownloadSubtitle={handleDownloadSubtitle}
            onDownloadEpisodeSubtitle={handleDownloadEpisodeSubtitle}
            onAddFiles={handleAddFiles}
            onClearCompleted={clearCompleted}
            onStartQueue={startProcessingQueue}
            onToggleEpisode={toggleEpisodeSelection}
            onToggleAll={toggleAllEpisodes}
            onRemoveEpisode={removeEpisode}
            onRemoveSelected={removeSelectedEpisodes}
            onOpenSourcesSettings={() => setIsSourcesModalOpen(true)}
          />
        )
      case 'SETTINGS':
        return <SettingsView />
      case 'LOGS':
        return (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-500 gap-4">
            <FileText size={48} className="opacity-20" />
            <p>Logs Panel Placeholder</p>
          </div>
        )
    }
  }

  // Global Error Handling
  React.useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      // Prevent automatic console error if handled here
      // event.preventDefault();

      const message = event.reason?.message || 'An unexpected error occurred'
      if (message.includes('User cancelled')) return // Ignore user cancellations

      // Use the store instance directly or a helper if available,
      // but since we are inside a component, we can use the hook result or import store standalone.
      // However, hooks are better used inside components.
      // Ideally we would trigger the toast here.
      // Let's use a small workaround or just export store to use outside if needed,
      // but here we are inside App so we can use the hook from the store.
    }

    window.addEventListener('unhandledrejection', handleUnhandledRejection)
    return () => window.removeEventListener('unhandledrejection', handleUnhandledRejection)
  }, [])

  // We need to access addToast from the store to use in the event listener
  // But we can't easily pass it to the event listener if it changes.
  // Actually, since the listener is added once, we need a stable ref or similar.
  // Better pattern: Just rely on manual catch blocks or a proper error boundary.
  // For 'unhandledrejection', we can import the non-hook store instance if we exported it:
  // import { useToastStore } from './store/toastStore';
  // useToastStore.getState().addToast(...)
  // Let's modify the previous file slightly or assume we can import it.
  // Wait, I didn't export the store variable itself, just the hook.
  // Let's fix toastStore.ts first to export the store directly if needed, OR just put the listener inside useEffect and use the hook's addToast.

  const { addToast } = useToastStore()

  React.useEffect(() => {
    const handleRejection = (event: PromiseRejectionEvent) => {
      console.error('Unhandled Promise Rejection:', event.reason)
      const rawMessage = event.reason?.message || String(event.reason)
      // Clean up common electron error prefixes
      const message = rawMessage.replace(/^Error: invoking .*?: /, '')

      if (message.includes('User cancelled')) return

      addToast(message, 'error')
    }

    window.addEventListener('unhandledrejection', handleRejection)
    return () => window.removeEventListener('unhandledrejection', handleRejection)
  }, [addToast])

  return (
    <div className="flex flex-col h-screen max-h-screen bg-[#0F111A] text-white overflow-hidden font-sans">
      <TitleBar />
      <div className="flex flex-1 overflow-hidden relative">
        <Sidebar currentView={view} onViewChange={setView} onAddFiles={handleAddRandomFiles} />
        {renderContent()}

        <SubtitleSourcesModal
          isOpen={isSourcesModalOpen}
          sources={subtitleSources}
          currentLanguage={subtitleLanguage}
          onLanguageChange={(lang) => {
            setSubtitleLanguage(lang)
            window.api.settings.set('subtitle_language', lang)
          }}
          onClose={() => setIsSourcesModalOpen(false)}
          onSave={handleSaveSubtitleSources}
        />

        <MergeOptionsModal
          isOpen={isMergeModalOpen}
          onClose={() => setIsMergeModalOpen(false)}
          onConfirm={handleMergeConfirm}
          fileCount={
            mergeEpisodes.filter(
              (e) => e.selected && e.stage === ProcessingStage.IDLE && e.fileType === 'VIDEO'
            ).length
          }
        />

        <ToastContainer />
      </div>
    </div>
  )
}

export default App
