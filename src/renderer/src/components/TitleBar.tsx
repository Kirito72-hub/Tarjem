import React from 'react'
import { Minus, X, Square } from 'lucide-react'
import appIcon from '../../../../resources/icon.png'

export const TitleBar: React.FC = () => {
  const [isMaximized, setIsMaximized] = React.useState(false)
  const [version, setVersion] = React.useState('')

  React.useEffect(() => {
    // Check if API is available (in case running without Electron or preload failure)
    // Check if API is available (in case running without Electron or preload failure)
    // @ts-ignore - window.api injected via preload
    if (window.api && window.api.window && window.api.window.onWindowStateChange) {
      // @ts-ignore - window.api injected via preload
      window.api.window.onWindowStateChange((state) => {
        setIsMaximized(state === 'maximized')
      })
    }

    // Fetch version
    // @ts-ignore - window.api injected via preload
    if (window.api && window.api.getVersion) {
      // @ts-ignore - window.api injected via preload
      window.api.getVersion().then(setVersion)
    }
  }, [])

  // @ts-ignore - window.api injected via preload
  const handleMinimize = () => window.api?.window?.minimize()
  // @ts-ignore - window.api injected via preload
  const handleMaximize = () => window.api?.window?.maximize()
  // @ts-ignore - window.api injected via preload
  const handleClose = () => window.api?.window?.close()

  return (
    <div className="h-8 bg-[#0F111A] flex items-center justify-between px-3 select-none draggable border-b border-white/5 w-full z-50">
      <div className="flex items-center gap-2">
        <img
          src={appIcon}
          alt="Tarjem"
          className="w-4 h-4 object-contain"
        />
        <span className="text-xs font-medium text-gray-400 tracking-wide">Tarjem {version && `v${version}`}</span>
      </div>
      <div className="flex items-center gap-3 no-drag">
        <button
          onClick={handleMinimize}
          className="text-gray-500 hover:text-white transition-colors p-1"
        >
          <Minus size={14} />
        </button>
        <button
          onClick={handleMaximize}
          className="text-gray-500 hover:text-white transition-colors p-1"
        >
          {isMaximized ? (
            <Square size={12} fill="currentColor" className="opacity-50" />
          ) : (
            <Square size={12} />
          )}
        </button>
        <button
          onClick={handleClose}
          className="text-gray-500 hover:text-red-400 transition-colors p-1"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  )
}
