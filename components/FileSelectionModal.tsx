import React, { useMemo } from 'react';
import { X, FileVideo, HardDrive, CheckSquare, Square, FolderOpen } from 'lucide-react';

export interface PendingFile {
  id: string;
  file?: File; // Optional for simulated files
  name: string;
  size: string;
  checked: boolean;
}

interface FileSelectionModalProps {
  isOpen: boolean;
  files: PendingFile[];
  onToggle: (id: string) => void;
  onToggleAll: () => void;
  onConfirm: () => void;
  onCancel: () => void;
}

export const FileSelectionModal: React.FC<FileSelectionModalProps> = ({
  isOpen,
  files,
  onToggle,
  onToggleAll,
  onConfirm,
  onCancel
}) => {
  if (!isOpen) return null;

  const allChecked = files.every(f => f.checked);
  const selectedCount = files.filter(f => f.checked).length;
  const totalSize = useMemo(() => {
     // Rough calculation for display
     return files.filter(f => f.checked).length * 1.2; // Assuming avg 1.2GB for sim
  }, [files]);

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-[#0F111A] border border-white/10 w-full max-w-4xl h-[600px] rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Modal Title Bar */}
        <div className="h-12 bg-[#161B22] border-b border-white/5 flex items-center justify-between px-4 select-none">
          <div className="flex items-center gap-2">
            <FolderOpen size={16} className="text-purple-400" />
            <span className="text-sm font-medium text-gray-200">Select Episodes to Import</span>
          </div>
          <button 
            onClick={onCancel}
            className="text-gray-500 hover:text-white transition-colors p-1 rounded-md hover:bg-white/5"
          >
            <X size={18} />
          </button>
        </div>

        {/* Toolbar / Info */}
        <div className="bg-[#1C212E] px-4 py-3 flex items-center justify-between border-b border-white/5">
            <div className="text-sm text-gray-400">
                Found <span className="text-white font-medium">{files.length}</span> video files.
            </div>
            <div className="text-xs text-gray-500 flex gap-4">
                <span>Selected: {selectedCount}</span>
                {/* Simulated total size for visual flair */}
                <span>Total Size: ~{selectedCount > 0 ? (selectedCount * 1.2).toFixed(1) : 0} GB</span>
            </div>
        </div>

        {/* List Header */}
        <div className="flex items-center px-4 py-2 bg-[#161B22]/50 border-b border-white/5 text-xs font-medium text-gray-500 uppercase tracking-wider">
            <div className="w-10 flex justify-center">
                <button onClick={onToggleAll} className="hover:text-white transition-colors">
                    {allChecked ? <CheckSquare size={16} className="text-purple-500" /> : <Square size={16} />}
                </button>
            </div>
            <div className="flex-1 px-2">Name</div>
            <div className="w-32 px-2 text-right">Size</div>
            <div className="w-24 px-2 text-center">Type</div>
        </div>

        {/* File List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#0F111A]">
            {files.map((file, index) => (
                <div 
                    key={file.id}
                    onClick={() => onToggle(file.id)}
                    className={`flex items-center px-4 py-2.5 border-b border-white/5 cursor-pointer group transition-colors ${
                        file.checked ? 'bg-purple-500/5 hover:bg-purple-500/10' : 'hover:bg-white/5'
                    }`}
                >
                    <div className="w-10 flex justify-center shrink-0">
                        <div className={`transition-colors ${file.checked ? 'text-purple-500' : 'text-gray-600 group-hover:text-gray-400'}`}>
                            {file.checked ? <CheckSquare size={16} /> : <Square size={16} />}
                        </div>
                    </div>
                    <div className="flex-1 px-2 min-w-0 flex items-center gap-3">
                        <FileVideo size={18} className={file.checked ? 'text-purple-400' : 'text-gray-600'} />
                        <span className={`text-sm truncate ${file.checked ? 'text-gray-200' : 'text-gray-400'}`}>
                            {file.name}
                        </span>
                    </div>
                    <div className="w-32 px-2 text-right text-sm text-gray-500 font-mono shrink-0">
                        {file.size}
                    </div>
                    <div className="w-24 px-2 text-center text-xs text-gray-600 shrink-0">
                        MKV/MP4
                    </div>
                </div>
            ))}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-[#161B22] border-t border-white/5 flex justify-end gap-3">
            <button 
                onClick={onCancel}
                className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
            >
                Cancel
            </button>
            <button 
                onClick={onConfirm}
                disabled={selectedCount === 0}
                className={`px-6 py-2 text-sm font-medium rounded-lg shadow-lg flex items-center gap-2 transition-all ${
                    selectedCount > 0 
                    ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-900/20' 
                    : 'bg-gray-800 text-gray-500 cursor-not-allowed'
                }`}
            >
                <HardDrive size={16} />
                Import {selectedCount} Files
            </button>
        </div>
      </div>
    </div>
  );
};