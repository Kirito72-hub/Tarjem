import React, { useRef, useState, useEffect } from 'react'
import { ChevronDown, Search, Check } from 'lucide-react'

export const LanguageDropdown = ({
  selectedCode,
  isOpen,
  setIsOpen,
  onSelect,
  label,
  dropdownRef
}: {
  selectedCode: string
  isOpen: boolean
  setIsOpen: (v: boolean) => void
  onSelect: (c: string) => void
  label?: string
  dropdownRef?: React.RefObject<HTMLDivElement | null>
}) => {
  const [searchQuery, setSearchQuery] = useState('')
  const internalRef = useRef<HTMLDivElement>(null)
  const ref = dropdownRef || internalRef // Use provided ref or fallback

  const languages = [
    { code: 'en', name: 'English', native: 'English' },
    { code: 'ar', name: 'Arabic', native: 'العربية' },
    { code: 'fr', name: 'French', native: 'Français' },
    { code: 'ja', name: 'Japanese', native: '日本語' },
    { code: 'es', name: 'Spanish', native: 'Español' },
    { code: 'de', name: 'German', native: 'Deutsch' },
    { code: 'it', name: 'Italian', native: 'Italiano' },
    { code: 'pt', name: 'Portuguese', native: 'Português' },
    { code: 'ru', name: 'Russian', native: 'Русский' },
    { code: 'zh', name: 'Chinese', native: '中文' },
    { code: 'ko', name: 'Korean', native: '한국어' },
    { code: 'tr', name: 'Turkish', native: 'Türkçe' }
  ]

  const getLangDetails = (code: string) => languages.find((l) => l.code === code) || languages[0]

  // Filter languages
  const filteredLanguages = languages.filter(
    (l) =>
      l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.native.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const selected = getLangDetails(selectedCode)

  // Close on click outside if using internal ref (if external ref handled by parent, this might be redundant but safe)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen, ref, setIsOpen])

  return (
    <div className="w-full relative" ref={ref}>
      {label && (
        <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 block">
          {label}
        </label>
      )}
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`w-full flex items-center justify-between bg-[#0F111A] border ${isOpen ? 'border-purple-500/50 ring-1 ring-purple-500/20' : 'border-white/10 hover:border-white/20'} rounded-lg px-4 py-3 text-left transition-all duration-200`}
        >
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-full bg-[#1C212E] border border-white/10 flex items-center justify-center text-[10px] font-bold text-gray-400 uppercase">
              {selected.code}
            </div>
            <span className="text-sm font-medium text-gray-200">
              {selected.name} <span className="text-gray-500 ml-1">({selected.native})</span>
            </span>
          </div>
          <ChevronDown
            size={16}
            className={`text-gray-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          />
        </button>

        {isOpen && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-[#0F111A] border border-white/10 rounded-lg shadow-xl shadow-black/50 z-[110] overflow-hidden animate-in fade-in zoom-in-95 duration-100">
            <div className="p-2 border-b border-white/5">
              <div className="relative">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
                />
                <input
                  type="text"
                  placeholder="Search languages..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#1C212E] text-sm text-gray-200 pl-9 pr-3 py-2 rounded-md focus:outline-none placeholder:text-gray-600"
                  autoFocus
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </div>
            <div className="max-h-60 overflow-y-auto custom-scrollbar p-1">
              {filteredLanguages.length === 0 ? (
                <div className="px-4 py-3 text-sm text-gray-500 text-center">
                  No languages found
                </div>
              ) : (
                filteredLanguages.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={(e) => {
                      e.stopPropagation()
                      onSelect(lang.code)
                      setIsOpen(false)
                      setSearchQuery('')
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-md text-sm transition-colors ${
                      selectedCode === lang.code
                        ? 'bg-purple-500/10 text-purple-400'
                        : 'text-gray-300 hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border ${selectedCode === lang.code ? 'bg-purple-500 text-white border-transparent' : 'bg-[#1C212E] text-gray-500 border-white/10'}`}
                      >
                        {lang.code.toUpperCase()}
                      </div>
                      <div className="flex flex-col items-start">
                        <span className="font-medium">{lang.name}</span>
                        <span className="text-xs text-gray-500 opacity-80">{lang.native}</span>
                      </div>
                    </div>
                    {selectedCode === lang.code && <Check size={14} />}
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
