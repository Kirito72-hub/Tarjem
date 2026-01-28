import React from 'react'
import { Minus, X, Square } from 'lucide-react'

export const TitleBar: React.FC = () => {
  const [isMaximized, setIsMaximized] = React.useState(false)

  React.useEffect(() => {
    // Check if API is available (in case running without Electron or preload failure)
    if (window.api && window.api.window && window.api.window.onWindowStateChange) {
      window.api.window.onWindowStateChange((state) => {
        setIsMaximized(state === 'maximized')
      })
    }
  }, [])

  const handleMinimize = () => window.api?.window?.minimize()
  const handleMaximize = () => window.api?.window?.maximize()
  const handleClose = () => window.api?.window?.close()

  return (
    <div className="h-8 bg-[#0F111A] flex items-center justify-between px-3 select-none draggable border-b border-white/5 w-full z-50">
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 rounded-full bg-purple-500/20 border border-purple-500/50"></div>
        <span className="text-xs font-medium text-gray-400 tracking-wide">Tarjem v1.0.2</span>
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
