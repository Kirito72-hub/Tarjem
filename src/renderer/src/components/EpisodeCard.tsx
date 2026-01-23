import React from 'react';
import { CheckCircle2, AlertCircle, Loader2, FileVideo, Search, Merge, Hash, Square, CheckSquare, Trash2, FileType, Captions } from 'lucide-react';
import { EpisodeFile, ProcessingStage } from "../../../types";

interface EpisodeCardProps {
  episode: EpisodeFile;
  onToggle?: () => void;
  onRemove: () => void;
}

export const EpisodeCard: React.FC<EpisodeCardProps> = ({ episode, onToggle, onRemove }) => {
  // Determine styles based on stage
  const getStageStyles = (stage: ProcessingStage) => {
    switch (stage) {
      case ProcessingStage.HASHING:
        return {
          barColor: 'bg-blue-500',
          textColor: 'text-blue-400',
          icon: <Hash size={14} className="text-blue-400" />
        };
      case ProcessingStage.SEARCHING:
        return {
          barColor: 'bg-amber-500',
          textColor: 'text-amber-400',
          icon: <Search size={14} className="text-amber-400" />
        };
      case ProcessingStage.MERGING:
        return {
          barColor: 'bg-purple-500',
          textColor: 'text-purple-400',
          icon: <Merge size={14} className="text-purple-400" />
        };
      case ProcessingStage.COMPLETED:
        return {
          barColor: 'bg-emerald-500',
          textColor: 'text-emerald-400',
          icon: <CheckCircle2 size={14} className="text-emerald-400" />
        };
      case ProcessingStage.ERROR:
        return {
          barColor: 'bg-red-500',
          textColor: 'text-red-400',
          icon: <AlertCircle size={14} className="text-red-400" />
        };
      default:
        return {
          barColor: 'bg-gray-600',
          textColor: 'text-gray-400',
          icon: <FileVideo size={14} className="text-gray-400" />
        };
    }
  };

  const styles = getStageStyles(episode.stage);
  const isProcessing = episode.stage !== ProcessingStage.COMPLETED && episode.stage !== ProcessingStage.ERROR && episode.stage !== ProcessingStage.IDLE;
  const isCompleted = episode.stage === ProcessingStage.COMPLETED;
  const isSubtitle = episode.fileType === 'SUBTITLE';

  return (
    <div 
        onClick={onToggle}
        className={`group flex items-center px-8 py-3 border-b border-white/5 cursor-pointer transition-colors hover:bg-white/5 ${episode.selected ? 'bg-purple-500/5' : ''}`}
    >
      {/* Checkbox */}
      <div className="w-8 flex justify-center shrink-0 mr-4 text-gray-600 group-hover:text-gray-400 transition-colors">
         {episode.selected ? <CheckSquare size={16} className="text-purple-500" /> : <Square size={16} />}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 flex items-center gap-4">
        {/* Thumbnail (Small) or Icon */}
        <div className={`w-12 h-12 rounded bg-[#1C212E] border border-white/10 flex items-center justify-center shrink-0 overflow-hidden relative ${isSubtitle ? 'bg-[#161B22]' : ''}`}>
            {episode.thumbnailUrl && !isSubtitle ? (
                <img src={episode.thumbnailUrl} alt="" className="w-full h-full object-cover opacity-80" />
            ) : (
                isSubtitle ? (
                    <Captions className="text-blue-400" size={20} />
                ) : (
                    <FileVideo className="text-gray-600" size={18} />
                )
            )}
             {/* Overlay Icon */}
             {isCompleted && !isSubtitle && <div className="absolute inset-0 bg-black/40 flex items-center justify-center"><CheckCircle2 size={16} className="text-emerald-500"/></div>}
        </div>
        
        <div className="min-w-0 flex-1">
            <h3 className={`text-sm font-medium truncate ${episode.selected ? 'text-gray-200' : 'text-gray-400'}`}>
                {episode.filename}
            </h3>
            {/* If IDLE, show a small "Waiting for start" text or similar, else show progress bar */}
            {episode.stage === ProcessingStage.IDLE || isSubtitle ? (
                <div className="text-xs text-gray-600 mt-1">{episode.statusMessage}</div>
            ) : (
                 <div className="w-full max-w-[200px] h-1 bg-gray-800 rounded-full mt-2 overflow-hidden">
                    <div 
                        className={`h-full ${styles.barColor} transition-all duration-300`} 
                        style={{ width: `${episode.progress}%` }}
                    />
                 </div>
            )}
        </div>
      </div>

      {/* Status Column (Hidden for subtitles unless explicit need) */}
      <div className="w-64 px-4 flex flex-col justify-center">
         {!isSubtitle ? (
             <>
                <div className="flex items-center gap-2 mb-0.5">
                    {isProcessing && <Loader2 size={12} className={`${styles.textColor} animate-spin`} />}
                    {!isProcessing && styles.icon}
                    <span className={`text-[10px] uppercase font-bold tracking-wider ${styles.textColor}`}>
                        {episode.stage}
                    </span>
                </div>
                <span className="text-xs text-gray-500 truncate">
                    {episode.statusMessage}
                </span>
             </>
         ) : (
             <div className="flex items-center gap-2">
                 <FileType size={12} className="text-gray-500"/>
                 <span className="text-xs text-gray-500 uppercase tracking-wider">Subtitle File</span>
             </div>
         )}
      </div>

      {/* Size Column with Delete Action */}
      <div className="w-32 px-4 flex items-center justify-end gap-3 text-right">
        <span className="text-xs text-gray-500 font-mono">{episode.size}</span>
        <button
            onClick={(e) => {
                e.stopPropagation();
                onRemove();
            }}
            className="text-gray-600 hover:text-red-400 transition-colors p-1 rounded hover:bg-white/5 opacity-0 group-hover:opacity-100 focus:opacity-100"
            title="Remove file"
        >
            <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
};
