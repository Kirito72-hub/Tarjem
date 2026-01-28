import React, { useState } from 'react'
import { X, Merge, Settings2, Trash2, Volume2, Type, Check } from 'lucide-react'
import { MergeOptions } from '../../../types'

interface MergeOptionsModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (options: MergeOptions) => void
  fileCount: number
}

export const MergeOptionsModal: React.FC<MergeOptionsModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  fileCount
}) => {
  const [options, setOptions] = useState<MergeOptions>({
    removeOldSubs: true,
    removeOtherAudio: false,
    setDefaultSub: true,
    embedFonts: false
  })

  if (!isOpen) return null

  const toggleOption = (key: keyof MergeOptions) => {
    setOptions((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-[#0F111A] border border-white/10 w-full max-w-lg rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="h-14 bg-[#161B22] border-b border-white/5 flex items-center justify-between px-5 select-none">
          <div className="flex items-center gap-2">
            <Settings2 size={18} className="text-blue-400" />
            <h3 className="text-sm font-semibold text-white">Merge Configuration</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-white transition-colors p-1.5 rounded-md hover:bg-white/5"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="mb-6">
            <p className="text-gray-400 text-sm">
              You are about to process{' '}
              <span className="text-white font-medium">{fileCount} files</span>. Configure how
              FFmpeg should handle streams.
            </p>
          </div>

          <div className="space-y-3">
            {/* Option 1: Remove Old Subs */}
            <div
              onClick={() => toggleOption('removeOldSubs')}
              className={`group flex items-start gap-4 p-3 rounded-lg border cursor-pointer transition-all ${
                options.removeOldSubs
                  ? 'bg-blue-500/10 border-blue-500/20'
                  : 'bg-[#1C212E] border-white/5 hover:border-white/10'
              }`}
            >
              <div
                className={`mt-0.5 w-5 h-5 rounded border flex items-center justify-center transition-colors shrink-0 ${
                  options.removeOldSubs ? 'bg-blue-500 border-blue-500' : 'border-gray-600'
                }`}
              >
                {options.removeOldSubs && <Check size={12} className="text-white" />}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-200 mb-0.5">
                  <Trash2 size={14} className="text-gray-400" />
                  Remove existing subtitles
                </div>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Deletes all hard-coded or embedded subtitle tracks from the source video to
                  prevent duplicates.
                </p>
              </div>
            </div>

            {/* Option 2: Remove Other Audio */}
            <div
              onClick={() => toggleOption('removeOtherAudio')}
              className={`group flex items-start gap-4 p-3 rounded-lg border cursor-pointer transition-all ${
                options.removeOtherAudio
                  ? 'bg-blue-500/10 border-blue-500/20'
                  : 'bg-[#1C212E] border-white/5 hover:border-white/10'
              }`}
            >
              <div
                className={`mt-0.5 w-5 h-5 rounded border flex items-center justify-center transition-colors shrink-0 ${
                  options.removeOtherAudio ? 'bg-blue-500 border-blue-500' : 'border-gray-600'
                }`}
              >
                {options.removeOtherAudio && <Check size={12} className="text-white" />}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-200 mb-0.5">
                  <Volume2 size={14} className="text-gray-400" />
                  Keep only original audio
                </div>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Removes dubbed audio tracks and keeps only the default (usually Japanese) track.
                </p>
              </div>
            </div>

            {/* Option 3: Default Sub */}
            <div
              onClick={() => toggleOption('setDefaultSub')}
              className={`group flex items-start gap-4 p-3 rounded-lg border cursor-pointer transition-all ${
                options.setDefaultSub
                  ? 'bg-blue-500/10 border-blue-500/20'
                  : 'bg-[#1C212E] border-white/5 hover:border-white/10'
              }`}
            >
              <div
                className={`mt-0.5 w-5 h-5 rounded border flex items-center justify-center transition-colors shrink-0 ${
                  options.setDefaultSub ? 'bg-blue-500 border-blue-500' : 'border-gray-600'
                }`}
              >
                {options.setDefaultSub && <Check size={12} className="text-white" />}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-200 mb-0.5">
                  <Check size={14} className="text-gray-400" />
                  Set as default track
                </div>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Forces players to load the newly merged subtitle track by default.
                </p>
              </div>
            </div>

            {/* Option 4: Embed Fonts */}
            <div
              onClick={() => toggleOption('embedFonts')}
              className={`group flex items-start gap-4 p-3 rounded-lg border cursor-pointer transition-all ${
                options.embedFonts
                  ? 'bg-blue-500/10 border-blue-500/20'
                  : 'bg-[#1C212E] border-white/5 hover:border-white/10'
              }`}
            >
              <div
                className={`mt-0.5 w-5 h-5 rounded border flex items-center justify-center transition-colors shrink-0 ${
                  options.embedFonts ? 'bg-blue-500 border-blue-500' : 'border-gray-600'
                }`}
              >
                {options.embedFonts && <Check size={12} className="text-white" />}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-200 mb-0.5">
                  <Type size={14} className="text-gray-400" />
                  Embed Attachments/Fonts
                </div>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Scans the folder for font files and attaches them to the MKV container.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#161B22] border-t border-white/5 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(options)}
            className="px-6 py-2 text-sm font-medium bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white rounded-lg shadow-lg shadow-blue-900/20 transition-all active:scale-95 flex items-center gap-2"
          >
            <Merge size={16} />
            Start Merging
          </button>
        </div>
      </div>
    </div>
  )
}
