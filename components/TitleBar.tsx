import React from 'react';
import { Minus, X, Square } from 'lucide-react';

export const TitleBar: React.FC = () => {
  return (
    <div className="h-8 bg-[#0F111A] flex items-center justify-between px-3 select-none draggable border-b border-white/5 w-full z-50">
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 rounded-full bg-purple-500/20 border border-purple-500/50"></div>
        <span className="text-xs font-medium text-gray-400 tracking-wide">Tarjem v1.0.2</span>
      </div>
      <div className="flex items-center gap-3">
        <button className="text-gray-500 hover:text-white transition-colors">
          <Minus size={14} />
        </button>
        <button className="text-gray-500 hover:text-white transition-colors">
          <Square size={12} />
        </button>
        <button className="text-gray-500 hover:text-red-400 transition-colors">
          <X size={14} />
        </button>
      </div>
    </div>
  );
};