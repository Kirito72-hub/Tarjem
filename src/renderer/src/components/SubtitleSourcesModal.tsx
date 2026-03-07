import React, { useState, useEffect } from 'react'
import { X, Globe, Check, Save, RotateCcw, GripVertical } from 'lucide-react'
import { SubtitleSource } from '../../../types'
import { LanguageDropdown } from './LanguageDropdown'

interface SubtitleSourcesModalProps {
  isOpen: boolean
  sources: SubtitleSource[]
  currentLanguage?: string
  onLanguageChange?: (lang: string) => void
  onClose: () => void
  onSave: (updatedSources: SubtitleSource[]) => void
}

export const SubtitleSourcesModal: React.FC<SubtitleSourcesModalProps> = ({
  isOpen,
  sources,
  currentLanguage = 'en',
  onLanguageChange = () => { },
  onClose,
  onSave
}) => {
  const [localSources, setLocalSources] = useState<SubtitleSource[]>(sources)
  const [isLangOpen, setIsLangOpen] = useState(false)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const [parserMode, setParserMode] = useState<'anime' | 'tv'>('anime')

  // Reset local state when modal opens or parent sources change
  useEffect(() => {
    if (isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLocalSources(sources)
      // Load saved parser mode from settings
      if (window.api?.settings) {
        window.api.settings.get('parser_mode').then((val) => {
          if (val === 'anime' || val === 'tv') setParserMode(val)
        })
      }
    }
  }, [isOpen, sources])

  if (!isOpen) return null

  const toggleSource = (id: string) => {
    setLocalSources((prev) => prev.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s)))
  }

  const handleSave = () => {
    onSave(localSources)
    onClose()
  }

  const handleParserMode = (mode: 'anime' | 'tv') => {
    setParserMode(mode)
    window.api.settings.set('parser_mode', mode)
  }

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverIndex(index)
  }

  const handleDragLeave = () => {
    setDragOverIndex(null)
  }

  const handleDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === index) {
      setDraggedIndex(null)
      setDragOverIndex(null)
      return
    }

    const newSources = [...localSources]
    const [removed] = newSources.splice(draggedIndex, 1)
    newSources.splice(index, 0, removed)
    setLocalSources(newSources)
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  const enabledCount = localSources.filter((s) => s.enabled).length

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-[#0F111A] border border-white/10 w-full max-w-md rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="h-14 bg-[#161B22] border-b border-white/5 flex items-center justify-between px-5 select-none">
          <div>
            <h3 className="text-sm font-semibold text-white">Subtitle Source Settings</h3>
            <p className="text-xs text-gray-500">Drag to reorder priority</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-white transition-colors p-1.5 rounded-md hover:bg-white/5"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[480px]">
          {/* Language Selector */}
          <div className="px-4 py-3 border-b border-white/5">
            <LanguageDropdown
              label="Search Language"
              selectedCode={currentLanguage}
              isOpen={isLangOpen}
              setIsOpen={setIsLangOpen}
              onSelect={onLanguageChange}
            />
          </div>

          {/* Parser Mode Toggle */}
          <div className="px-4 py-3 border-b border-white/5">
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
              Auto Match Mode
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleParserMode('tv')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all border ${parserMode === 'tv'
                    ? 'bg-purple-600/30 border-purple-500/60 text-purple-300'
                    : 'bg-transparent border-white/10 text-gray-400 hover:border-white/20 hover:text-gray-300'
                  }`}
              >
                📺 TV
              </button>
              <button
                onClick={() => handleParserMode('anime')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all border ${parserMode === 'anime'
                    ? 'bg-purple-600/30 border-purple-500/60 text-purple-300'
                    : 'bg-transparent border-white/10 text-gray-400 hover:border-white/20 hover:text-gray-300'
                  }`}
              >
                🎌 Anime
              </button>
            </div>
            <p className="text-xs text-gray-600 mt-1.5">
              {parserMode === 'anime'
                ? 'Anime: 3-pass waterfall verified against AniList'
                : 'TV: Fast guessit parsing, no AniList calls'}
            </p>
          </div>

          {/* Sources List */}
          <div className="space-y-1 p-2">
            {localSources.map((source, index) => (
              <div
                key={source.id}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
                className={`flex items-center justify-between px-3 py-3 rounded-lg cursor-grab active:cursor-grabbing transition-all border ${dragOverIndex === index
                    ? 'border-purple-500 bg-purple-500/20'
                    : draggedIndex === index
                      ? 'opacity-50 border-transparent'
                      : source.enabled
                        ? 'bg-purple-500/10 border-purple-500/20'
                        : 'bg-transparent border-transparent hover:bg-white/5'
                  }`}
              >
                {/* Drag Handle */}
                <div className="text-gray-500 hover:text-gray-300 mr-2 cursor-grab">
                  <GripVertical size={16} />
                </div>

                <div
                  className="flex items-center gap-3 flex-1"
                  onClick={() => toggleSource(source.id)}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center ${source.enabled ? 'bg-purple-500 text-white' : 'bg-[#1C212E] text-gray-500'
                      }`}
                  >
                    <Globe size={16} />
                  </div>
                  <div>
                    <div
                      className={`text-sm font-medium ${source.enabled ? 'text-white' : 'text-gray-400'}`}
                    >
                      {source.name}
                    </div>
                    <div className="text-xs text-gray-600">{source.url}</div>
                  </div>
                </div>

                <div
                  onClick={() => toggleSource(source.id)}
                  className={`w-5 h-5 rounded border flex items-center justify-center transition-colors cursor-pointer ${source.enabled ? 'bg-purple-500 border-purple-500' : 'border-gray-600'
                    }`}
                >
                  {source.enabled && <Check size={12} className="text-white" />}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#161B22] border-t border-white/5 flex items-center justify-between">
          <div className="text-xs text-gray-500">
            <span className={enabledCount === 0 ? 'text-red-400' : 'text-gray-400'}>
              {enabledCount} selected
            </span>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setLocalSources((prev) => prev.map((s) => ({ ...s, enabled: false })))}
              className="px-3 py-2 text-xs font-medium text-gray-500 hover:text-white transition-colors flex items-center gap-1.5"
              title="Reset Selection"
            >
              <RotateCcw size={14} />
              Clear
            </button>
            <button
              onClick={handleSave}
              className="px-5 py-2 text-sm font-medium bg-purple-600 hover:bg-purple-500 text-white rounded-lg shadow-lg shadow-purple-900/20 transition-all active:scale-95 flex items-center gap-2"
            >
              <Save size={16} />
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
