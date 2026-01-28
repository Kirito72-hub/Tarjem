import React, { useState } from 'react'
import {
  Upload,
  Trash2,
  Search,
  CheckSquare,
  Square,
  Settings,
  Merge,
  FileSearch,
  FileVideo,
  Captions,
  Globe,
  Download,
  Star,
  Loader2
} from 'lucide-react'
import { EpisodeCard } from './EpisodeCard'
import { EpisodeFile, DashboardTab, SubtitleResult } from '../../../types'

interface DashboardProps {
  activeTab: DashboardTab
  onTabChange: (tab: DashboardTab) => void
  episodes: EpisodeFile[]

  // Web Search Props
  searchResults: SubtitleResult[]
  isSearchingWeb: boolean
  onWebSearch: (query: string) => void
  onDownloadSubtitle: (id: string) => void
  onDownloadEpisodeSubtitle?: (episodeId: string, result: SubtitleResult) => void

  onAddFiles: (files: FileList | null) => void
  onClearCompleted: () => void
  onStartQueue: () => void
  onToggleEpisode: (id: string) => void
  onToggleAll: () => void
  onRemoveEpisode: (id: string) => void
  onRemoveSelected: () => void
  onOpenSourcesSettings: () => void
}

export const Dashboard: React.FC<DashboardProps> = ({
  activeTab,
  onTabChange,
  episodes,
  searchResults,
  isSearchingWeb,
  onWebSearch,
  onDownloadSubtitle,
  onDownloadEpisodeSubtitle,
  onAddFiles,
  onClearCompleted,
  onStartQueue,
  onToggleEpisode,
  onToggleAll,
  onRemoveEpisode,
  onRemoveSelected,
  onOpenSourcesSettings
}) => {
  const generalInputRef = React.useRef<HTMLInputElement>(null)
  const videoInputRef = React.useRef<HTMLInputElement>(null)
  const subtitleInputRef = React.useRef<HTMLInputElement>(null)

  const [searchQuery, setSearchQuery] = useState('')

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    onAddFiles(e.target.files)
    if (e.target) e.target.value = ''
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onAddFiles(e.dataTransfer.files)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onWebSearch(searchQuery)
  }

  const activeCount = episodes.filter(
    (e) => e.stage !== 'COMPLETED' && e.stage !== 'ERROR' && e.stage !== 'IDLE'
  ).length
  const idleCount = episodes.filter((e) => e.stage === 'IDLE').length
  const completedCount = episodes.filter((e) => e.stage === 'COMPLETED').length
  const selectedCount = episodes.filter((e) => e.selected).length
  const allSelected = episodes.length > 0 && episodes.every((e) => e.selected)

  // Logic to determine if "Start" should be enabled
  const canStart = episodes.some(
    (e) =>
      e.selected && e.stage === 'IDLE' && (activeTab === 'FILE_MATCH' || e.fileType === 'VIDEO')
  )

  // Filter lists for Merger tab
  const videoFiles = episodes.filter((e) => e.fileType === 'VIDEO')
  const subtitleFiles = episodes.filter((e) => e.fileType === 'SUBTITLE')

  // Title Helper
  const getTabTitle = () => {
    if (activeTab === 'FILE_MATCH') return 'Auto Match'
    if (activeTab === 'WEB_SEARCH') return 'Manual Search'
    return 'Merger'
  }

  return (
    <div className="flex-1 h-[calc(100vh-32px)] overflow-hidden flex flex-col bg-[#0F111A]">
      {/* Header */}
      <header className="px-8 py-6 flex items-end justify-between border-b border-white/5 bg-[#0F111A]/95 backdrop-blur-md sticky top-0 z-20">
        <div className="flex flex-col gap-4">
          {/* Tab Switcher */}
          <div className="flex p-1 bg-[#1C212E] rounded-lg border border-white/5 w-fit">
            <button
              onClick={() => onTabChange('FILE_MATCH')}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-medium transition-all ${activeTab === 'FILE_MATCH'
                ? 'bg-purple-600 text-white shadow-lg'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
            >
              <FileSearch size={14} />
              Auto Match
            </button>
            <button
              onClick={() => onTabChange('WEB_SEARCH')}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-medium transition-all ${activeTab === 'WEB_SEARCH'
                ? 'bg-amber-600 text-white shadow-lg'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
            >
              <Globe size={14} />
              Manual Search
            </button>
            <button
              onClick={() => onTabChange('MERGER')}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-medium transition-all ${activeTab === 'MERGER'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
            >
              <Merge size={14} />
              Merger
            </button>
          </div>

          {/* Title & Stats */}
          <div>
            <h2 className="text-2xl font-semibold text-white mb-1">{getTabTitle()}</h2>
            {activeTab !== 'WEB_SEARCH' && (
              <div className="flex items-center gap-4 text-sm text-gray-500">
                {activeCount > 0 ? (
                  <span
                    className={`flex items-center gap-1.5 ${activeTab === 'FILE_MATCH' ? 'text-purple-400' : 'text-blue-400'}`}
                  >
                    <div
                      className={`w-1.5 h-1.5 rounded-full animate-pulse ${activeTab === 'FILE_MATCH' ? 'bg-purple-500' : 'bg-blue-500'}`}
                    ></div>
                    {activeCount} Processing
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-gray-600"></div>
                    {idleCount} Waiting
                  </span>
                )}
                <span className="w-1 h-1 rounded-full bg-gray-700"></span>
                <span>{selectedCount} Selected</span>
              </div>
            )}
            {activeTab === 'WEB_SEARCH' && (
              <div className="text-sm text-gray-500">Search for subtitles by name</div>
            )}
          </div>
        </div>

        <div className="flex gap-3">
          {/* Common Actions (Clear, Start, Add) - Only show relevant ones */}
          {activeTab !== 'WEB_SEARCH' && (
            <>
              {completedCount > 0 && (
                <button
                  onClick={onClearCompleted}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1C212E] border border-white/5 text-gray-400 hover:text-white hover:border-white/20 transition-all text-sm font-medium"
                >
                  <Trash2 size={16} />
                  Clear Done
                </button>
              )}

              <button
                onClick={onStartQueue}
                disabled={!canStart}
                className={`flex items-center gap-2 px-6 py-2 rounded-lg transition-all text-sm font-medium shadow-lg ${canStart
                  ? activeTab === 'FILE_MATCH'
                    ? 'bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white shadow-purple-900/20 active:scale-95'
                    : 'bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white shadow-blue-900/20 active:scale-95'
                  : 'bg-white/5 border border-white/5 text-gray-500 cursor-not-allowed'
                  }`}
              >
                {activeTab === 'FILE_MATCH' ? <Search size={16} /> : <Merge size={16} />}
                {activeTab === 'FILE_MATCH' ? 'Start Matching' : 'Start Merging'}
              </button>

              <button
                onClick={() =>
                  activeTab === 'FILE_MATCH'
                    ? videoInputRef.current?.click()
                    : generalInputRef.current?.click()
                }
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white hover:bg-white/10 hover:scale-105 active:scale-95 transition-all text-sm font-medium"
              >
                <Upload size={16} />
                Add Files
              </button>
            </>
          )}

          {/* Settings button for search providers (visible in both search tabs) */}
          {(activeTab === 'FILE_MATCH' || activeTab === 'WEB_SEARCH') && (
            <button
              onClick={onOpenSourcesSettings}
              className="flex items-center justify-center w-10 h-10 rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 hover:rotate-90 transition-all active:scale-95"
              title="Subtitle Source Settings"
            >
              <Settings size={20} />
            </button>
          )}

          {/* Hidden Inputs */}
          <input
            type="file"
            ref={generalInputRef}
            onChange={handleFileSelect}
            className="hidden"
            multiple
            accept="video/*,.srt,.ass,.sub,.vtt"
          />
          <input
            type="file"
            ref={videoInputRef}
            onChange={handleFileSelect}
            className="hidden"
            multiple
            accept=".avi,.mkv,.mp4"
          />
          <input
            type="file"
            ref={subtitleInputRef}
            onChange={handleFileSelect}
            className="hidden"
            multiple
            accept=".srt,.ass,.sub,.vtt"
          />
        </div>
      </header>

      {/* Content Area */}

      {/* 1. AUTO MATCH TAB */}
      {activeTab === 'FILE_MATCH' && (
        <div className="flex-1 flex flex-col min-h-0">
          {episodes.length === 0 ? (
            <div className="flex-1 relative p-4" onDrop={handleDrop} onDragOver={handleDragOver}>
              <div
                className="w-full h-full border-2 border-dashed border-white/10 rounded-xl bg-[#1C212E]/20 hover:bg-[#1C212E]/40 hover:border-purple-500/30 transition-all flex flex-col items-center justify-center gap-3 cursor-pointer group"
                onClick={() => videoInputRef.current?.click()}
              >
                <div className="w-12 h-12 rounded-full bg-[#1C212E] flex items-center justify-center group-hover:scale-110 transition-transform">
                  <FileVideo className="text-purple-500/50 group-hover:text-purple-400" size={24} />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-300 group-hover:text-white">
                    Drop Episodes Here to Auto-Match
                  </p>
                  <p className="text-xs text-gray-600">
                    Analyzes file hash to find exact subtitles
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col h-full">
              {/* Searcher Column Headers */}
              <div className="flex items-center px-8 py-3 bg-[#161B22] border-b border-white/5 text-xs font-medium text-gray-500 uppercase tracking-wider select-none shrink-0">
                <button
                  onClick={onToggleAll}
                  className="w-8 flex justify-center text-gray-500 hover:text-white transition-colors mr-4"
                >
                  {allSelected ? (
                    <CheckSquare size={16} className="text-purple-500" />
                  ) : (
                    <Square size={16} />
                  )}
                </button>
                <div className="flex-1">File Name</div>
                <div className="w-64">Status</div>
                <div className="w-32 px-4 text-right flex items-center justify-end gap-3">
                  <span>Size</span>
                  <button
                    onClick={onRemoveSelected}
                    disabled={selectedCount === 0}
                    className={`transition-colors ${selectedCount > 0 ? 'text-gray-400 hover:text-red-400 cursor-pointer' : 'text-transparent pointer-events-none'}`}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              <div className="overflow-y-auto custom-scrollbar p-0 flex-1">
                {episodes.map((ep) => (
                  <EpisodeCard
                    key={ep.id}
                    episode={ep}
                    onToggle={() => onToggleEpisode(ep.id)}
                    onRemove={() => onRemoveEpisode(ep.id)}
                    onDownload={(result) =>
                      onDownloadEpisodeSubtitle && onDownloadEpisodeSubtitle(ep.id, result)
                    }
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. MANUAL WEB SEARCH TAB */}
      {activeTab === 'WEB_SEARCH' && (
        <div className="flex-1 flex flex-col min-h-0 relative">
          {/* Search Input Area */}
          <div
            className={`transition-all duration-300 ${searchResults.length > 0 || isSearchingWeb ? 'px-8 py-4 bg-[#161B22] border-b border-white/5' : 'absolute inset-0 flex items-center justify-center px-4'}`}
          >
            <form
              onSubmit={handleSearchSubmit}
              className={`w-full ${searchResults.length > 0 || isSearchingWeb ? '' : 'max-w-xl flex flex-col gap-4'}`}
            >
              {searchResults.length === 0 && !isSearchingWeb && (
                <div className="text-center mb-4">
                  <div className="w-16 h-16 rounded-full bg-[#1C212E] border border-white/10 flex items-center justify-center mx-auto mb-4">
                    <Globe className="text-amber-500" size={32} />
                  </div>
                  <h3 className="text-xl font-medium text-white">Find Subtitles Manually</h3>
                  <p className="text-gray-500 mt-1">
                    Search by movie or series name across multiple providers
                  </p>
                </div>
              )}

              <div className="relative group">
                <Search
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-amber-500 transition-colors"
                  size={20}
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Enter movie or anime name..."
                  className="w-full bg-[#1C212E] border border-white/10 rounded-xl py-4 pl-12 pr-4 text-lg text-white placeholder:text-gray-600 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 transition-all shadow-xl"
                  autoFocus
                />
                {isSearchingWeb && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    <Loader2 className="animate-spin text-amber-500" size={20} />
                  </div>
                )}
              </div>
            </form>
          </div>

          {/* Results List */}
          {searchResults.length > 0 && (
            <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#0F111A]">
              <div className="p-0">
                {/* Header */}
                <div className="flex items-center px-8 py-3 bg-[#161B22]/50 border-b border-white/5 text-xs font-medium text-gray-500 uppercase tracking-wider select-none">
                  <div className="flex-1">Release Name</div>
                  <div className="w-24">Language</div>
                  <div className="w-24">Source</div>
                  <div className="w-20">Type</div>
                  <div className="w-32">Owner</div>
                  <div className="w-16 text-center">H.I.</div>
                  <div className="w-48">Caption</div>
                  <div className="w-24 text-right">Rating</div>
                  <div className="w-16 text-right">Action</div>
                </div>

                {searchResults.map((result) => (
                  <div
                    key={result.id}
                    className="flex items-center px-8 py-4 border-b border-white/5 hover:bg-white/5 transition-colors group"
                  >
                    <div className="flex-1 min-w-0 pr-4">
                      <div className="flex items-center gap-3">
                        <Captions size={18} className="text-gray-600 group-hover:text-gray-400" />
                        <span className="text-sm font-medium text-gray-300 group-hover:text-white truncate" title={result.filename}>
                          {result.filename}
                        </span>
                      </div>
                    </div>
                    <div className="w-24 text-sm text-gray-400">{result.language}</div>
                    <div className="w-24 text-sm text-gray-500 flex items-center gap-1.5">
                      <Globe size={12} /> {result.source}
                    </div>
                    <div className="w-20 text-sm text-gray-400 uppercase">{result.subtitleType || 'SRT'}</div>
                    <div className="w-32 text-sm text-gray-400 truncate" title={result.owner || 'Unknown'}>{result.owner || '-'}</div>
                    <div className="w-16 text-center text-sm text-gray-400">{result.hi ? 'Yes' : '-'}</div>
                    <div className="w-48 text-sm text-gray-500 truncate italic" title={result.caption || ''}>{result.caption || '-'}</div>
                    <div className="w-24 text-right flex items-center justify-end gap-1 text-amber-500">
                      <span className="text-sm font-bold">{result.rating}</span>
                      <Star size={12} fill="currentColor" />
                    </div>
                    <div className="w-16 text-right">
                      <button
                        onClick={() => onDownloadSubtitle(result.id)}
                        className="px-3 py-1.5 bg-white/5 hover:bg-amber-600 hover:text-white text-gray-400 rounded-md text-xs font-medium transition-all flex items-center gap-2 ml-auto"
                      >
                        <Download size={14} />
                        Get
                      </button>
                    </div>
                  </div>
                ))}
                <div className="p-8 text-center text-xs text-gray-600">
                  Found {searchResults.length} results
                </div>
              </div>
            </div>
          )}

          {/* Empty State / Loading */}
          {searchResults.length === 0 && (
            <div className="flex flex-1 items-center justify-center text-gray-500">
              {isSearchingWeb ? (
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="animate-spin text-amber-500" size={32} />
                  <p>Searching providers...</p>
                </div>
              ) : null}
            </div>
          )}
        </div>
      )}

      {/* 3. MERGER TAB */}
      {activeTab === 'MERGER' && (
        <div className="flex-1 flex flex-col min-h-0">
          {/* 1. EPISODES SECTION */}
          <div className="flex-1 flex flex-col min-h-0 border-b border-white/5">
            <div className="px-6 py-2 bg-[#161B22] border-b border-white/5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2 text-xs font-bold text-blue-400 uppercase tracking-wider">
                <FileVideo size={14} />
                Episodes ({videoFiles.length})
              </div>
              {videoFiles.length > 0 && (
                <button
                  onClick={() => videoInputRef.current?.click()}
                  className="text-xs text-gray-500 hover:text-white flex items-center gap-1"
                >
                  <Upload size={12} /> Add
                </button>
              )}
            </div>

            <div
              className="flex-1 overflow-y-auto custom-scrollbar relative bg-[#0F111A]"
              onDrop={handleDrop}
              onDragOver={handleDragOver}
            >
              {videoFiles.length === 0 ? (
                <div className="absolute inset-0 p-4">
                  <div
                    onClick={() => videoInputRef.current?.click()}
                    className="w-full h-full border-2 border-dashed border-white/10 rounded-xl bg-[#1C212E]/20 hover:bg-[#1C212E]/40 hover:border-blue-500/30 transition-all flex flex-col items-center justify-center gap-3 cursor-pointer group"
                  >
                    <div className="w-12 h-12 rounded-full bg-[#1C212E] flex items-center justify-center group-hover:scale-110 transition-transform">
                      <FileVideo className="text-blue-500/50 group-hover:text-blue-400" size={24} />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-gray-300 group-hover:text-white">
                        Drop Episodes Here
                      </p>
                      <p className="text-xs text-gray-600">MKV, MP4, AVI</p>
                    </div>
                  </div>
                </div>
              ) : (
                videoFiles.map((ep) => (
                  <EpisodeCard
                    key={ep.id}
                    episode={ep}
                    onToggle={() => onToggleEpisode(ep.id)}
                    onRemove={() => onRemoveEpisode(ep.id)}
                  />
                ))
              )}
            </div>
          </div>

          {/* 2. SUBTITLES SECTION */}
          <div className="flex-1 flex flex-col min-h-0">
            <div className="px-6 py-2 bg-[#161B22] border-b border-white/5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2 text-xs font-bold text-blue-400 uppercase tracking-wider">
                <Captions size={14} />
                Subtitles ({subtitleFiles.length})
              </div>
              {subtitleFiles.length > 0 && (
                <button
                  onClick={() => subtitleInputRef.current?.click()}
                  className="text-xs text-gray-500 hover:text-white flex items-center gap-1"
                >
                  <Upload size={12} /> Add
                </button>
              )}
            </div>

            <div
              className="flex-1 overflow-y-auto custom-scrollbar relative bg-[#0F111A]"
              onDrop={handleDrop}
              onDragOver={handleDragOver}
            >
              {subtitleFiles.length === 0 ? (
                <div className="absolute inset-0 p-4">
                  <div
                    onClick={() => subtitleInputRef.current?.click()}
                    className="w-full h-full border-2 border-dashed border-white/10 rounded-xl bg-[#1C212E]/20 hover:bg-[#1C212E]/40 hover:border-blue-500/30 transition-all flex flex-col items-center justify-center gap-3 cursor-pointer group"
                  >
                    <div className="w-12 h-12 rounded-full bg-[#1C212E] flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Captions className="text-blue-500/50 group-hover:text-blue-400" size={24} />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-gray-300 group-hover:text-white">
                        Drop Subtitles Here
                      </p>
                      <p className="text-xs text-gray-600">SRT, ASS, VTT</p>
                    </div>
                  </div>
                </div>
              ) : (
                subtitleFiles.map((ep) => (
                  <EpisodeCard
                    key={ep.id}
                    episode={ep}
                    onToggle={() => onToggleEpisode(ep.id)}
                    onRemove={() => onRemoveEpisode(ep.id)}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
