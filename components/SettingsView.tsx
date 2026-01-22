import React, { useState, useRef, useEffect } from 'react';
import { User, Globe, Check, Camera, ChevronDown, Search } from 'lucide-react';

export const SettingsView: React.FC = () => {
  const [language, setLanguage] = useState('en');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState('');

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
    { code: 'tr', name: 'Turkish', native: 'Türkçe' },
  ];

  const selectedLang = languages.find(l => l.code === language) || languages[0];

  const filteredLanguages = languages.filter(l => 
    l.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    l.native.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="flex-1 h-full bg-[#0F111A] overflow-y-auto p-8 custom-scrollbar">
      <div className="max-w-3xl mx-auto space-y-8">
        
        {/* Header */}
        <div>
           <h2 className="text-2xl font-bold text-white mb-2">Settings</h2>
           <p className="text-gray-400 text-sm">Manage your preferences and account details.</p>
        </div>

        {/* Profile Section */}
        <div className="bg-[#1C212E] rounded-xl border border-white/5 p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                <User size={20} className="text-purple-400" />
                Profile
            </h3>
            
            <div className="flex flex-col md:flex-row items-start gap-6">
                <div className="relative group cursor-pointer self-center md:self-start">
                    <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-purple-600 to-blue-600 p-[2px]">
                        <div className="w-full h-full rounded-full bg-[#1C212E] flex items-center justify-center overflow-hidden">
                             <img src="https://picsum.photos/seed/tarjem_user/200" alt="Avatar" className="w-full h-full object-cover" />
                        </div>
                    </div>
                    <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Camera size={20} className="text-white" />
                    </div>
                </div>

                <div className="flex-1 space-y-4 w-full">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Username</label>
                            <input type="text" value="TarjemUser" readOnly className="w-full bg-[#0F111A] border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-purple-500/50 transition-colors" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Email</label>
                            <input type="email" value="user@tarjem.app" readOnly className="w-full bg-[#0F111A] border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-purple-500/50 transition-colors" />
                        </div>
                    </div>
                    
                    <div className="pt-2 flex gap-3">
                        <button className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium rounded-lg transition-colors shadow-lg shadow-purple-900/20">
                            Save Changes
                        </button>
                        <button className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 text-sm font-medium rounded-lg transition-colors border border-white/5 hover:border-white/10">
                            Change Password
                        </button>
                    </div>
                </div>
            </div>
        </div>

        {/* Language Section (Modified for Dropdown) */}
        <div className="bg-[#1C212E] rounded-xl border border-white/5 p-6 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-75 overflow-visible">
            <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                <Globe size={20} className="text-purple-400" />
                Language
            </h3>

            <div className="max-w-md" ref={dropdownRef}>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 block">Application Language</label>
                
                <div className="relative">
                    {/* Dropdown Trigger */}
                    <button 
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        className={`w-full flex items-center justify-between bg-[#0F111A] border ${isDropdownOpen ? 'border-purple-500/50 ring-1 ring-purple-500/20' : 'border-white/10 hover:border-white/20'} rounded-lg px-4 py-3 text-left transition-all duration-200`}
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-6 h-6 rounded-full bg-[#1C212E] border border-white/10 flex items-center justify-center text-[10px] font-bold text-gray-400 uppercase">
                                {selectedLang.code}
                            </div>
                            <span className="text-sm font-medium text-gray-200">{selectedLang.name} <span className="text-gray-500 ml-1">({selectedLang.native})</span></span>
                        </div>
                        <ChevronDown size={16} className={`text-gray-500 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {/* Dropdown Menu */}
                    {isDropdownOpen && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-[#0F111A] border border-white/10 rounded-lg shadow-xl shadow-black/50 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                            {/* Search Input */}
                            <div className="p-2 border-b border-white/5">
                                <div className="relative">
                                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                                    <input 
                                        type="text" 
                                        placeholder="Search languages..." 
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full bg-[#1C212E] text-sm text-gray-200 pl-9 pr-3 py-2 rounded-md focus:outline-none placeholder:text-gray-600"
                                        autoFocus
                                    />
                                </div>
                            </div>

                            {/* List */}
                            <div className="max-h-60 overflow-y-auto custom-scrollbar p-1">
                                {filteredLanguages.length === 0 ? (
                                    <div className="px-4 py-3 text-sm text-gray-500 text-center">No languages found</div>
                                ) : (
                                    filteredLanguages.map((lang) => (
                                        <button
                                            key={lang.code}
                                            onClick={() => {
                                                setLanguage(lang.code);
                                                setIsDropdownOpen(false);
                                                setSearchQuery('');
                                            }}
                                            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-md text-sm transition-colors ${
                                                language === lang.code 
                                                ? 'bg-purple-500/10 text-purple-400' 
                                                : 'text-gray-300 hover:bg-white/5'
                                            }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                 <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border ${language === lang.code ? 'bg-purple-500 text-white border-transparent' : 'bg-[#1C212E] text-gray-500 border-white/10'}`}>
                                                    {lang.code.toUpperCase()}
                                                </div>
                                                <div className="flex flex-col items-start">
                                                    <span className="font-medium">{lang.name}</span>
                                                    <span className="text-xs text-gray-500 opacity-80">{lang.native}</span>
                                                </div>
                                            </div>
                                            {language === lang.code && <Check size={14} />}
                                        </button>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>
                <p className="mt-2 text-xs text-gray-500">
                    Choose the interface language. Subtitle search languages are configured separately in global settings.
                </p>
            </div>
        </div>

      </div>
    </div>
  );
};