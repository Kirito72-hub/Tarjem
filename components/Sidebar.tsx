import React from 'react';
import { LayoutDashboard, Settings, FileText, FolderOpen } from 'lucide-react';
import { View } from '../types';

interface SidebarProps {
  currentView: View;
  onViewChange: (view: View) => void;
  onAddFiles: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onViewChange, onAddFiles }) => {
  const navItems = [
    { id: 'DASHBOARD', icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'SETTINGS', icon: Settings, label: 'Settings' },
    { id: 'LOGS', icon: FileText, label: 'Logs' },
  ] as const;

  return (
    <div className="w-64 bg-[#161B22] border-r border-white/5 flex flex-col justify-between h-[calc(100vh-32px)]">
      <div>
        <div className="p-6">
          <h1 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
            Tarjem
          </h1>
          <p className="text-xs text-gray-500 mt-1">Subtitle Automator</p>
        </div>

        <nav className="px-3 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                currentView === item.id
                  ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                  : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
              }`}
            >
              <item.icon size={18} className={currentView === item.id ? 'text-purple-400' : 'text-gray-500'} />
              {item.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="p-4">
         <div className="bg-[#1C212E]/50 rounded-xl p-4 border border-white/5 backdrop-blur-sm">
            <p className="text-xs text-gray-400 mb-3">Add more episodes?</p>
            <button 
                onClick={onAddFiles}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white py-2 rounded-lg text-sm font-medium shadow-lg shadow-purple-900/20 transition-all active:scale-95"
            >
                <FolderOpen size={16} />
                Open Folder
            </button>
         </div>
      </div>
    </div>
  );
};