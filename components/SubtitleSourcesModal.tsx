import React, { useState, useEffect } from 'react';
import { X, Globe, Check, Save, RotateCcw } from 'lucide-react';
import { SubtitleSource } from '../types';

interface SubtitleSourcesModalProps {
  isOpen: boolean;
  sources: SubtitleSource[];
  onClose: () => void;
  onSave: (updatedSources: SubtitleSource[]) => void;
}

export const SubtitleSourcesModal: React.FC<SubtitleSourcesModalProps> = ({
  isOpen,
  sources,
  onClose,
  onSave
}) => {
  const [localSources, setLocalSources] = useState<SubtitleSource[]>(sources);

  // Reset local state when modal opens or parent sources change
  useEffect(() => {
    if (isOpen) {
      setLocalSources(sources);
    }
  }, [isOpen, sources]);

  if (!isOpen) return null;

  const toggleSource = (id: string) => {
    setLocalSources(prev => prev.map(s => 
      s.id === id ? { ...s, enabled: !s.enabled } : s
    ));
  };

  const handleSave = () => {
    onSave(localSources);
    onClose();
  };

  const enabledCount = localSources.filter(s => s.enabled).length;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-[#0F111A] border border-white/10 w-full max-w-md rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="h-14 bg-[#161B22] border-b border-white/5 flex items-center justify-between px-5 select-none">
          <div>
            <h3 className="text-sm font-semibold text-white">Subtitle Sources</h3>
            <p className="text-xs text-gray-500">Select where to search for subtitles</p>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-white transition-colors p-1.5 rounded-md hover:bg-white/5"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-2 overflow-y-auto max-h-[400px]">
           <div className="space-y-1">
             {localSources.map((source) => (
               <div 
                 key={source.id}
                 onClick={() => toggleSource(source.id)}
                 className={`flex items-center justify-between px-4 py-3 rounded-lg cursor-pointer transition-all border ${
                   source.enabled 
                     ? 'bg-purple-500/10 border-purple-500/20' 
                     : 'bg-transparent border-transparent hover:bg-white/5'
                 }`}
               >
                 <div className="flex items-center gap-3">
                   <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                     source.enabled ? 'bg-purple-500 text-white' : 'bg-[#1C212E] text-gray-500'
                   }`}>
                     <Globe size={16} />
                   </div>
                   <div>
                     <div className={`text-sm font-medium ${source.enabled ? 'text-white' : 'text-gray-400'}`}>
                       {source.name}
                     </div>
                     <div className="text-xs text-gray-600">
                       {source.url}
                     </div>
                   </div>
                 </div>
                 
                 <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                    source.enabled 
                      ? 'bg-purple-500 border-purple-500' 
                      : 'border-gray-600'
                 }`}>
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
                onClick={() => setLocalSources(prev => prev.map(s => ({...s, enabled: false})))}
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
  );
};