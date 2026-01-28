import React, { useState, useRef, useEffect } from 'react'
import { User, Globe } from 'lucide-react'
import { LanguageDropdown } from './LanguageDropdown'

export const SettingsView: React.FC = () => {
  const [interfaceLanguage, setInterfaceLanguage] = useState('en')
  // Subtitle language is now managed via the "cog" menu in Dashboard (SubtitleSourcesModal)

  // API Keys State
  const [openSubtitlesKey, setOpenSubtitlesKey] = useState('')
  const [openSubtitlesUsername, setOpenSubtitlesUsername] = useState('')
  const [openSubtitlesPassword, setOpenSubtitlesPassword] = useState('')
  const [subdlKey, setSubdlKey] = useState('')
  const [subSourceKey, setSubSourceKey] = useState('')
  const [omdbKey, setOmdbKey] = useState('')
  const [exportPath, setExportPath] = useState('')

  const [isInterfaceDropdownOpen, setIsInterfaceDropdownOpen] = useState(false)

  const interfaceDropdownRef = useRef<HTMLDivElement>(null)

  // Load Settings on Mount
  useEffect(() => {
    const loadSettings = async () => {
      if (window.api && window.api.settings) {
        const iLang = await window.api.settings.get('interface_language')
        if (iLang) setInterfaceLanguage(iLang)

        // Subtitle language is loaded in App.tsx now

        const osKey = await window.api.settings.get('opensubtitles_api_key')
        if (osKey) setOpenSubtitlesKey(osKey)

        const osUser = await window.api.settings.get('opensubtitles_username')
        if (osUser) setOpenSubtitlesUsername(osUser)

        const osPass = await window.api.settings.get('opensubtitles_password')
        if (osPass) setOpenSubtitlesPassword(osPass)

        const subdlKey = await window.api.settings.get('subdl_api_key')
        if (subdlKey) setSubdlKey(subdlKey)

        const subSourceKey = await window.api.settings.get('subsource_api_key')
        if (subSourceKey) setSubSourceKey(subSourceKey)

        const omdbKey = await window.api.settings.get('omdb_api_key')
        if (omdbKey) setOmdbKey(omdbKey)

        const exportPath = await window.api.settings.get('export_path')
        if (exportPath) setExportPath(exportPath)
      }
    }
    loadSettings()
  }, [])

  const handleBrowseExportPath = async () => {
    const result = await window.api.files.selectFiles('DIRECTORY')
    if (result && result.length > 0) {
      const path = result[0]
      setExportPath(path)
      window.api.settings.set('export_path', path)
    }
  }

  const handleInterfaceLangChange = (code: string) => {
    setInterfaceLanguage(code)
    window.api.settings.set('interface_language', code)
    setIsInterfaceDropdownOpen(false)
  }

  const handleOsKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setOpenSubtitlesKey(val)
    window.api.settings.set('opensubtitles_api_key', val)
  }

  const handleOsUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setOpenSubtitlesUsername(val)
    window.api.settings.set('opensubtitles_username', val)
  }

  const handleOsPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setOpenSubtitlesPassword(val)
    window.api.settings.set('opensubtitles_password', val)
  }

  const handleSubdlKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setSubdlKey(val)
    window.api.settings.set('subdl_api_key', val)
  }

  const handleSubSourceKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setSubSourceKey(val)
    window.api.settings.set('subsource_api_key', val)
  }

  const handleOmdbKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setOmdbKey(val)
    window.api.settings.set('omdb_api_key', val)
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        interfaceDropdownRef.current &&
        !interfaceDropdownRef.current.contains(event.target as Node)
      ) {
        setIsInterfaceDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="flex-1 h-full bg-[#0F111A] overflow-y-auto p-8 custom-scrollbar">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Settings</h2>
          <p className="text-gray-400 text-sm">Manage your preferences and account details.</p>
        </div>

        {/* Profile Section (Static for now) */}
        <div className="bg-[#1C212E] rounded-xl border border-white/5 p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
            <User size={20} className="text-purple-400" />
            Profile
          </h3>
          <div className="flex flex-col md:flex-row items-start gap-6">
            <div className="relative group cursor-pointer self-center md:self-start">
              <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-purple-600 to-blue-600 p-[2px]">
                <div className="w-full h-full rounded-full bg-[#1C212E] flex items-center justify-center overflow-hidden">
                  <img
                    src="https://picsum.photos/seed/tarjem_user/200"
                    alt="Avatar"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </div>
            <div className="flex-1 space-y-4 w-full">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Username
                  </label>
                  <input
                    type="text"
                    value="TarjemUser"
                    readOnly
                    className="w-full bg-[#0F111A] border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-purple-500/50 transition-colors"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </label>
                  <input
                    type="email"
                    value="user@tarjem.app"
                    readOnly
                    className="w-full bg-[#0F111A] border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-purple-500/50 transition-colors"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Language Section */}
        <div className="bg-[#1C212E] rounded-xl border border-white/5 p-6 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-75 overflow-visible">
          <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
            <Globe size={20} className="text-purple-400" />
            Language Preferences
          </h3>

          <div className="space-y-6">
            {/* Interface Language */}
            <LanguageDropdown
              label="Interface Language"
              selectedCode={interfaceLanguage}
              isOpen={isInterfaceDropdownOpen}
              setIsOpen={setIsInterfaceDropdownOpen}
              onSelect={handleInterfaceLangChange}
              dropdownRef={interfaceDropdownRef}
            />
            {/* Subtitle Language removed as per user request. Controlled via Dashboard Cog. */}
          </div>
        </div>

        {/* Export Configuration */}
        <div className="bg-[#1C212E] rounded-xl border border-white/5 p-6 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100 overflow-visible">
          <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-purple-400"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" x2="12" y1="15" y2="3" />
            </svg>
            Export Settings
          </h3>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                Default Export Directory
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={exportPath}
                  onChange={(e) => {
                    setExportPath(e.target.value)
                    window.api.settings.set('export_path', e.target.value)
                  }}
                  placeholder="Leave empty to use Downloads folder (default)"
                  className="flex-1 bg-[#0F111A] border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-purple-500/50 transition-colors"
                />
                <button
                  onClick={handleBrowseExportPath}
                  className="bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 px-4 py-2 rounded-lg text-sm transition-colors border border-purple-500/30"
                >
                  Browse
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Files will be saved to{' '}
                <code>{exportPath || 'Downloads/Tarjem'}/&#123;SeriesName&#125;</code> and will be
                organized accordingly.
              </p>
            </div>
          </div>
        </div>

        {/* API Integrations Section */}
        <div className="bg-[#1C212E] rounded-xl border border-white/5 p-6 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-150">
          <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
            <Globe size={20} className="text-purple-400" />
            API Integrations
          </h3>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                OpenSubtitles Credentials
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Username"
                  value={openSubtitlesUsername}
                  onChange={handleOsUsernameChange}
                  className="w-full bg-[#0F111A] border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-purple-500/50 transition-colors"
                />
                <input
                  type="password"
                  placeholder="Password"
                  value={openSubtitlesPassword}
                  onChange={handleOsPasswordChange}
                  className="w-full bg-[#0F111A] border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-purple-500/50 transition-colors"
                />
              </div>
              <input
                type="text"
                placeholder="API Key (Consumer Key)"
                value={openSubtitlesKey}
                onChange={handleOsKeyChange}
                className="w-full bg-[#0F111A] border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-purple-500/50 transition-colors mt-2"
              />
              <p className="text-xs text-gray-500 mt-1">
                An account is required for downloads. Get one at{' '}
                <a
                  href="#"
                  onClick={() =>
                    window.electron?.ipcRenderer.send('open-external', 'https://opensubtitles.com')
                  }
                  className="text-purple-400 hover:underline"
                >
                  opensubtitles.com
                </a>
                .
              </p>
            </div>

            <div className="space-y-1.5 pt-4 border-t border-white/5">
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                SubDL API Key
              </label>
              <input
                type="text"
                placeholder="Enter your SubDL API Key"
                value={subdlKey}
                onChange={handleSubdlKeyChange}
                className="w-full bg-[#0F111A] border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-purple-500/50 transition-colors"
              />
              <p className="text-xs text-gray-500">
                Required for SubDL. Get one at{' '}
                <a
                  href="#"
                  onClick={() =>
                    window.electron?.ipcRenderer.send('open-external', 'https://subdl.com')
                  }
                  className="text-purple-400 hover:underline"
                >
                  subdl.com
                </a>
                .
              </p>
            </div>

            <div className="space-y-1.5 pt-4 border-t border-white/5">
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                SubSource API Key
              </label>
              <input
                type="text"
                placeholder="Enter your SubSource API Key"
                value={subSourceKey}
                onChange={handleSubSourceKeyChange}
                className="w-full bg-[#0F111A] border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-purple-500/50 transition-colors"
              />
              <p className="text-xs text-gray-500">
                Required for SubSource. Get one at{' '}
                <a
                  href="#"
                  onClick={() =>
                    window.electron?.ipcRenderer.send('open-external', 'https://subsource.net')
                  }
                  className="text-purple-400 hover:underline"
                >
                  subsource.net
                </a>
                .
              </p>
            </div>

            <div className="space-y-1.5 pt-4 border-t border-white/5">
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                OMDb API Key (Free)
              </label>
              <input
                type="text"
                placeholder="Enter your OMDb API Key"
                value={omdbKey}
                onChange={handleOmdbKeyChange}
                className="w-full bg-[#0F111A] border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-purple-500/50 transition-colors"
              />
              <p className="text-xs text-gray-500">
                Required for movie/TV show metadata. Get a free key at{' '}
                <a
                  href="#"
                  onClick={() =>
                    window.electron?.ipcRenderer.send(
                      'open-external',
                      'http://www.omdbapi.com/apikey.aspx'
                    )
                  }
                  className="text-purple-400 hover:underline"
                >
                  omdbapi.com
                </a>{' '}
                (1000 requests/day free tier).
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
