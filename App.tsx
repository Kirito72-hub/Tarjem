import React, { useState, useEffect } from 'react';
import { TitleBar } from './components/TitleBar';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { SettingsView } from './components/SettingsView';
import { SubtitleSourcesModal } from './components/SubtitleSourcesModal';
import { MergeOptionsModal } from './components/MergeOptionsModal';
import { EpisodeFile, ProcessingStage, View, SubtitleSource, DashboardTab, MergeOptions, SubtitleResult } from './types';
import { formatFileSize } from './lib/formatFileSize';
import type { ScannedFileInfo } from './electron/electron.d';
import { FileText } from 'lucide-react';

const App: React.FC = () => {
  const [view, setView] = useState<View>('DASHBOARD');
  
  // Dashboard Tabs State (Default to Auto Match)
  const [activeTab, setActiveTab] = useState<DashboardTab>('FILE_MATCH');

  // Separate Queues
  const [searchEpisodes, setSearchEpisodes] = useState<EpisodeFile[]>([]); // For Auto Match
  const [mergeEpisodes, setMergeEpisodes] = useState<EpisodeFile[]>([]);   // For Merger
  const [searchResults, setSearchResults] = useState<SubtitleResult[]>([]); // For Manual Search results
  const [isSearchingWeb, setIsSearchingWeb] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [pipelineUsesMock, setPipelineUsesMock] = useState<boolean | null>(null);

  // Modals State
  const [isSourcesModalOpen, setIsSourcesModalOpen] = useState(false);
  const [isMergeModalOpen, setIsMergeModalOpen] = useState(false);

  const [subtitleSources, setSubtitleSources] = useState<SubtitleSource[]>([
    { id: 'subscene', name: 'Subscene', url: 'subscene.com', enabled: true },
    { id: 'opensubtitles', name: 'OpenSubtitles', url: 'opensubtitles.org', enabled: true },
    { id: 'kitsunekko', name: 'Kitsunekko', url: 'kitsunekko.net', enabled: true },
    { id: 'animetosho', name: 'AnimeTosho', url: 'animetosho.org', enabled: true },
    { id: 'yify', name: 'YIFY Subtitles', url: 'yts-subs.com', enabled: false },
    { id: 'addic7ed', name: 'Addic7ed', url: 'addic7ed.com', enabled: false },
  ]);

  // Helper to get current active queue state setters
  const getCurrentQueueInfo = () => {
    return activeTab === 'FILE_MATCH' 
      ? { episodes: searchEpisodes, setEpisodes: setSearchEpisodes }
      : { episodes: mergeEpisodes, setEpisodes: setMergeEpisodes };
  };

  // 1. Initial File Intake (Drag/Drop or File Picker)
  const handleAddFiles = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    
    // If we are in Web Search tab, we probably shouldn't be dropping files, 
    // but if user does, let's switch to File Match or Merger depending on file type?
    // For now, let's just default to adding to File Match queue if in Web Search.
    
    const targetQueue = activeTab === 'MERGER' ? 'MERGER' : 'FILE_MATCH';
    if (activeTab === 'WEB_SEARCH') setActiveTab('FILE_MATCH');

    const newEpisodes: EpisodeFile[] = Array.from(fileList).map(file => {
      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      const isSubtitle = ['srt', 'ass', 'vtt', 'sub'].includes(ext);
      
      return {
        id: Math.random().toString(36).substr(2, 9),
        filename: file.name,
        size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
        progress: 0,
        stage: ProcessingStage.IDLE,
        statusMessage: isSubtitle ? 'Ready to merge' : 'Ready to process',
        thumbnailUrl: !isSubtitle ? `https://picsum.photos/200/200?random=${Math.floor(Math.random() * 1000)}` : undefined,
        selected: true,
        fileType: isSubtitle ? 'SUBTITLE' : 'VIDEO'
      };
    });

    if (targetQueue === 'MERGER') {
        setMergeEpisodes(prev => [...prev, ...newEpisodes]);
    } else {
        setSearchEpisodes(prev => [...prev, ...newEpisodes]);
    }
  };

  const mapScannedToEpisode = (file: ScannedFileInfo): EpisodeFile => ({
    id: file.id,
    filename: file.filename,
    filePath: file.filePath,
    size: formatFileSize(file.size),
    progress: 0,
    stage: ProcessingStage.IDLE,
    statusMessage: file.fileType === 'SUBTITLE' ? 'Ready to merge' : 'Ready to process',
    selected: true,
    fileType: file.fileType,
  });

  const addEpisodesToQueue = (files: EpisodeFile[]) => {
    if (files.length === 0) return;

    let targetTab = activeTab;
    if (targetTab === 'WEB_SEARCH') {
      targetTab = 'FILE_MATCH';
      setActiveTab('FILE_MATCH');
    }

    if (targetTab === 'MERGER') {
      setMergeEpisodes((prev) => [...prev, ...files]);
    } else {
      const videosOnly = files.filter((f) => f.fileType === 'VIDEO');
      if (videosOnly.length > 0) {
        setSearchEpisodes((prev) => [...prev, ...videosOnly]);
      }
    }
  };

  /** Open folder dialog, scan recursively in main process, load real files into the queue */
  const handleOpenFolder = async () => {
    const api = window.electronAPI;
    if (!api?.dialog?.selectFolder || !api?.files?.scanFolder) {
      console.warn('Folder scan requires Electron (electronAPI not available)');
      return;
    }

    const folderPath = await api.dialog.selectFolder();
    if (!folderPath) return;

    try {
      const scanned = await api.files.scanFolder(folderPath);
      const episodes = scanned.map(mapScannedToEpisode);
      addEpisodesToQueue(episodes);
    } catch (err) {
      console.error('Failed to scan folder:', err);
      const message = err instanceof Error ? err.message : 'Unknown error';
      window.alert(`Could not scan folder:\n${message}`);
    }
  };

  useEffect(() => {
      const api = window.electronAPI;
      if (!api?.processing?.onProgress) return;

      return api.processing.onProgress((payload) => {
          const patch = (list: EpisodeFile[]) =>
              list.map((ep) =>
                  ep.id !== payload.episodeId
                      ? ep
                      : {
                            ...ep,
                            progress: payload.progress,
                            stage: payload.stage as ProcessingStage,
                            statusMessage: payload.statusMessage,
                        }
              );

          if (payload.tab === 'FILE_MATCH') {
              setSearchEpisodes((prev) => patch(prev));
          } else if (payload.tab === 'MERGER') {
              setMergeEpisodes((prev) => patch(prev));
          }
      });
  }, []);

  useEffect(() => {
      window.electronAPI?.pipeline?.useMock?.().then(setPipelineUsesMock).catch(() => setPipelineUsesMock(false));
  }, []);

  const handleWebSearch = async (query: string) => {
      if (!query.trim()) return;

      const api = window.electronAPI;
      if (!api?.subtitles?.searchWeb) {
          setSearchError('Subtitle search requires the Electron app.');
          return;
      }

      setIsSearchingWeb(true);
      setSearchResults([]);
      setSearchError(null);

      try {
          const { results, error } = await api.subtitles.searchWeb(query);
          if (error) {
              setSearchError(error);
              setSearchResults([]);
          } else {
              setSearchResults(results);
          }
      } catch (err) {
          const message = err instanceof Error ? err.message : 'Search failed';
          setSearchError(message);
          setSearchResults([]);
      } finally {
          setIsSearchingWeb(false);
      }
  };

  const handleDownloadSubtitle = (id: string) => {
      // Find the result
      const result = searchResults.find(r => r.id === id);
      if(!result) return;

      // In a real app, this would download the file.
      // Here, let's simulate adding it to the Merger tab? Or just show a notification.
      // Let's add it to the merger tab for flow continuity.
      const newSubFile: EpisodeFile = {
        id: Math.random().toString(36).substr(2, 9),
        filename: result.filename,
        size: '35 KB',
        progress: 0,
        stage: ProcessingStage.IDLE,
        statusMessage: 'Downloaded from ' + result.source,
        selected: true,
        fileType: 'SUBTITLE'
      };
      setMergeEpisodes(prev => [...prev, newSubFile]);
      // Optional: switch to merger? setActiveTab('MERGER');
      alert(`Downloaded ${result.filename} to Merger queue.`);
  };

  // Selection Logic
  const toggleEpisodeSelection = (id: string) => {
    const { setEpisodes } = getCurrentQueueInfo();
    setEpisodes(prev => prev.map(e => e.id === id ? { ...e, selected: !e.selected } : e));
  };

  const toggleAllEpisodes = () => {
    const { episodes, setEpisodes } = getCurrentQueueInfo();
    const allSelected = episodes.every(e => e.selected);
    setEpisodes(prev => prev.map(e => ({ ...e, selected: !allSelected })));
  };

  // Deletion Logic
  const removeEpisode = (id: string) => {
    const { setEpisodes } = getCurrentQueueInfo();
    setEpisodes(prev => prev.filter(e => e.id !== id));
  };

  const removeSelectedEpisodes = () => {
    const { setEpisodes } = getCurrentQueueInfo();
    setEpisodes(prev => prev.filter(e => !e.selected));
  };

  const startFileMatchJob = (ep: EpisodeFile) => {
      const api = window.electronAPI;
      if (!api?.processing?.startFileMatch) return;

      if (!ep.filePath) {
          setSearchEpisodes((prev) =>
              prev.map((item) =>
                  item.id === ep.id
                      ? {
                            ...item,
                            stage: ProcessingStage.ERROR,
                            progress: 100,
                            statusMessage:
                                'No on-disk path. Use Open Folder (not drag-and-drop) for real processing.',
                        }
                      : item
              )
          );
          return;
      }

      setSearchEpisodes((prev) =>
          prev.map((item) =>
              item.id === ep.id
                  ? {
                        ...item,
                        stage: ProcessingStage.HASHING,
                        progress: 0,
                        statusMessage: 'Queued for processing...',
                    }
                  : item
          )
      );

      void api.processing.startFileMatch({
          episodeId: ep.id,
          filePath: ep.filePath,
          filename: ep.filename,
      });
  };

  const startMergeJob = (ep: EpisodeFile, options: MergeOptions) => {
      const api = window.electronAPI;
      if (!api?.processing?.startMerge) return;

      if (!ep.filePath) {
          setMergeEpisodes((prev) =>
              prev.map((item) =>
                  item.id === ep.id
                      ? {
                            ...item,
                            stage: ProcessingStage.ERROR,
                            progress: 100,
                            statusMessage: 'No on-disk path for merge.',
                        }
                      : item
              )
          );
          return;
      }

      setMergeEpisodes((prev) =>
          prev.map((item) =>
              item.id === ep.id
                  ? {
                        ...item,
                        stage: ProcessingStage.MERGING,
                        progress: 0,
                        statusMessage: 'Queued for merge...',
                    }
                  : item
          )
      );

      void api.processing.startMerge({
          episodeId: ep.id,
          videoPath: ep.filePath,
          filename: ep.filename,
          removeOldSubs: options.removeOldSubs,
          removeOtherAudio: options.removeOtherAudio,
          setDefaultSub: options.setDefaultSub,
      });
  };

  // Queue Processing
  const startProcessingQueue = () => {
    if (activeTab === 'MERGER') {
      setIsMergeModalOpen(true);
    } else if (activeTab === 'FILE_MATCH') {
      const { episodes } = getCurrentQueueInfo();
      const itemsToStart = episodes.filter((e) => e.selected && e.stage === ProcessingStage.IDLE);
      itemsToStart.forEach((ep) => startFileMatchJob(ep));
    }
  };

  const handleMergeConfirm = (options: MergeOptions) => {
    setIsMergeModalOpen(false);
    const { episodes } = getCurrentQueueInfo();
    const itemsToStart = episodes.filter(
        (e) => e.selected && e.stage === ProcessingStage.IDLE && e.fileType === 'VIDEO'
    );

    itemsToStart.forEach((ep) => startMergeJob(ep, options));
  };

  const clearCompleted = () => {
    const { setEpisodes } = getCurrentQueueInfo();
    setEpisodes(prev => prev.filter(e => e.stage !== ProcessingStage.COMPLETED));
  };

  const renderContent = () => {
      switch(view) {
          case 'DASHBOARD': {
              const { episodes } = getCurrentQueueInfo();
              return (
                <Dashboard 
                    activeTab={activeTab}
                    onTabChange={setActiveTab}
                    episodes={episodes}
                    searchResults={searchResults}
                    isSearchingWeb={isSearchingWeb}
                    searchError={searchError}
                    pipelineUsesMock={pipelineUsesMock}
                    onWebSearch={handleWebSearch}
                    onDownloadSubtitle={handleDownloadSubtitle}
                    onAddFiles={handleAddFiles} 
                    onClearCompleted={clearCompleted} 
                    onStartQueue={startProcessingQueue}
                    onToggleEpisode={toggleEpisodeSelection}
                    onToggleAll={toggleAllEpisodes}
                    onRemoveEpisode={removeEpisode}
                    onRemoveSelected={removeSelectedEpisodes}
                    onOpenSourcesSettings={() => setIsSourcesModalOpen(true)}
                />
              );
          }
          case 'SETTINGS':
              return <SettingsView />;
          case 'LOGS':
              return (
                  <div className="flex-1 flex flex-col items-center justify-center text-gray-500 gap-4">
                      <FileText size={48} className="opacity-20" />
                      <p>Logs Panel Placeholder</p>
                  </div>
              );
      }
  };

  return (
    <div className="flex flex-col h-screen max-h-screen bg-[#0F111A] text-white overflow-hidden font-sans">
      <TitleBar />
      <div className="flex flex-1 overflow-hidden relative">
        <Sidebar 
            currentView={view} 
            onViewChange={setView} 
            onAddFiles={handleOpenFolder}
        />
        {renderContent()}

        <SubtitleSourcesModal 
            isOpen={isSourcesModalOpen}
            sources={subtitleSources}
            onClose={() => setIsSourcesModalOpen(false)}
            onSave={setSubtitleSources}
        />

        <MergeOptionsModal
            isOpen={isMergeModalOpen}
            onClose={() => setIsMergeModalOpen(false)}
            onConfirm={handleMergeConfirm}
            fileCount={mergeEpisodes.filter(e => e.selected && e.stage === ProcessingStage.IDLE && e.fileType === 'VIDEO').length}
        />
      </div>
    </div>
  );
};

export default App;