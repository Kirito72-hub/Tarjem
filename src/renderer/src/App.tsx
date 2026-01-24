import React, { useState } from 'react';
import { TitleBar } from './components/TitleBar';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { SettingsView } from './components/SettingsView';
import { SubtitleSourcesModal } from './components/SubtitleSourcesModal';
import { MergeOptionsModal } from './components/MergeOptionsModal';
import { EpisodeFile, ProcessingStage, View, SubtitleSource, DashboardTab, MergeOptions, SubtitleResult } from "../../types";
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
  const handleAddFiles = async (fileList: FileList | null) => {
    let filesToProcess: { name: string; path: string; size: number }[] = [];

    // Handle FileList (Dropping)
    if (fileList && fileList.length > 0) {
      // Filter extensions based on active tab
      const allowedExtensions = activeTab === 'FILE_MATCH'
        ? ['avi', 'mkv', 'mp4'] // Auto Match: only video files
        : ['mkv', 'mp4', 'avi', 'srt', 'ass', 'vtt', 'sub']; // Merger: video + subtitle files

      filesToProcess = Array.from(fileList)
        .filter(f => {
          const ext = f.name.split('.').pop()?.toLowerCase();
          return ext && allowedExtensions.includes(ext);
        })
        .map(f => ({
          name: f.name,
          path: (f as any).path || f.name, // Electron File object has path
          size: f.size
        }));
    }
    // Handle Native Dialog (Clicking)
    else {
      const paths = await window.api.files.selectFiles(activeTab);
      if (!paths || paths.length === 0) return;

      // Call main process to get file details (size, name)
      // For now, we'll just use the path and mock size/name
      // In a real app, we should have a 'files:getDetails' IPC
      filesToProcess = paths.map(p => {
        const name = p.split(/[/\\]/).pop() || p;
        return {
          name: name,
          path: p,
          size: 0 // We'll need another IPC to get size, or valid locally
        };
      });
    }

    if (filesToProcess.length === 0) return;

    const targetQueue = activeTab === 'MERGER' ? 'MERGER' : 'FILE_MATCH';
    if (activeTab === 'WEB_SEARCH') setActiveTab('FILE_MATCH');

    const newEpisodes: EpisodeFile[] = filesToProcess.map(file => {
      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      const isSubtitle = ['srt', 'ass', 'vtt', 'sub'].includes(ext);

      return {
        id: Math.random().toString(36).substr(2, 9),
        path: file.path,
        filename: file.name,
        size: file.size > 0 ? `${(file.size / (1024 * 1024)).toFixed(1)} MB` : 'Pending',
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

  // 2. Mock Folder Open (For Sidebar demo)
  const handleAddRandomFiles = () => {
    const videoNames = [
      '[SubsPlease] One Piece - 1092 (1080p).mkv',
      '[Erai-raws] Jujutsu Kaisen 2nd Season - 14.mp4',
      '[HorribleSubs] Bleach TYBW - 08 [1080p].mkv',
      '[Nii-sama] Frieren - 06.mkv',
      '[ASW] Solo Leveling - 02 [1080p].mkv',
    ];

    const subNames = ['One Piece - 1092.srt', 'Jujutsu Kaisen S2 - 14.ass'];

    const newEpisodes: EpisodeFile[] = [];
    const count = Math.floor(Math.random() * 3) + 3;
    for (let i = 0; i < count; i++) {
      const randomName = videoNames[Math.floor(Math.random() * videoNames.length)];
      newEpisodes.push({
        id: Math.random().toString(36).substr(2, 9),
        path: `C:\\Fake\\Path\\${randomName}`,
        filename: randomName,
        size: `${(Math.random() * 1.5 + 0.5).toFixed(1)} GB`,
        progress: 0,
        stage: ProcessingStage.IDLE,
        statusMessage: 'Ready to process',
        thumbnailUrl: `https://picsum.photos/200/200?random=${Math.floor(Math.random() * 1000)}`,
        selected: true,
        fileType: 'VIDEO'
      });
    }

    if (activeTab === 'MERGER') {
      const subCount = Math.floor(Math.random() * 2) + 2;
      for (let i = 0; i < subCount; i++) {
        const randomName = subNames[Math.floor(Math.random() * subNames.length)];
        newEpisodes.push({
          id: Math.random().toString(36).substr(2, 9),
          path: `C:\\Fake\\Path\\${randomName}`,
          filename: randomName,
          size: '45 KB',
          progress: 0,
          stage: ProcessingStage.IDLE,
          statusMessage: 'Ready to merge',
          selected: true,
          fileType: 'SUBTITLE'
        });
      }
      setMergeEpisodes(prev => [...prev, ...newEpisodes]);
    } else {
      setSearchEpisodes(prev => [...prev, ...newEpisodes]);
    }
  };

  // Manual Web Search Logic
  const handleWebSearch = (query: string) => {
    if (!query.trim()) return;
    setIsSearchingWeb(true);
    setSearchResults([]);

    // Simulate API delay
    setTimeout(() => {
      const mockResults: SubtitleResult[] = [
        { id: '1', filename: `${query} - English (US).srt`, source: 'Subscene', language: 'English', downloads: 1240, rating: 5 },
        { id: '2', filename: `${query} - Arabic.ass`, source: 'OpenSubtitles', language: 'Arabic', downloads: 850, rating: 4.5 },
        { id: '3', filename: `${query} [1080p].srt`, source: 'YIFY', language: 'English', downloads: 2300, rating: 3 },
        { id: '4', filename: `${query} - French.srt`, source: 'Subscene', language: 'French', downloads: 400, rating: 4 },
        { id: '5', filename: `${query} (Official).ass`, source: 'Kitsunekko', language: 'English', downloads: 120, rating: 5 },
      ];
      setSearchResults(mockResults);
      setIsSearchingWeb(false);
    }, 1500);
  };

  const handleDownloadSubtitle = (id: string) => {
    // Find the result
    const result = searchResults.find(r => r.id === id);
    if (!result) return;

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

  const handleDownloadEpisodeSubtitle = async (episodeId: string, result: SubtitleResult) => {
    const episode = searchEpisodes.find(e => e.id === episodeId);
    if (!episode) return;

    // Construct destination path: same folder, same filename, but with subtitle extension matches the result (or .srt default)
    // Actually result.url might be a zip, usually api handles extraction or it's a direct srt.
    // Assuming api handles it.
    // We want to save it as <video_name>.srt (or .ass etc)

    const videoPath = episode.path;
    const lastDotIndex = videoPath.lastIndexOf('.');
    const basePath = lastDotIndex !== -1 ? videoPath.substring(0, lastDotIndex) : videoPath;
    // Get extension from result filename or default to srt
    const subExt = result.filename.split('.').pop() || 'srt';
    const destinationPath = `${basePath}.${subExt}`;

    try {
      await window.api.subtitles.download(result.url, destinationPath);

      setSearchEpisodes(prev => prev.map(e => e.id === episodeId ? {
        ...e,
        stage: ProcessingStage.COMPLETED,
        statusMessage: 'Subtitle downloaded',
        progress: 100
      } : e));

      // Also add to merger queue? valid convenience.
      // For now just mark complete.
    } catch (error) {
      setSearchEpisodes(prev => prev.map(e => e.id === episodeId ? {
        ...e,
        stage: ProcessingStage.ERROR,
        statusMessage: 'Download failed'
      } : e));
    }
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

  // Queue Processing
  const startProcessingQueue = () => {
    if (activeTab === 'MERGER') {
      setIsMergeModalOpen(true);
    } else if (activeTab === 'FILE_MATCH') {
      const { episodes } = getCurrentQueueInfo();
      const itemsToStart = episodes.filter(e => e.selected && e.stage === ProcessingStage.IDLE);
      itemsToStart.forEach(ep => {
        simulateProcessing(ep.id, activeTab);
      });
    }
  };

  const handleMergeConfirm = (options: MergeOptions) => {
    setIsMergeModalOpen(false);
    const { episodes } = getCurrentQueueInfo();
    const itemsToStart = episodes.filter(e => e.selected && e.stage === ProcessingStage.IDLE && e.fileType === 'VIDEO');

    itemsToStart.forEach(ep => {
      simulateProcessing(ep.id, 'MERGER');
    });
  };

  const simulateProcessing = async (id: string, tab: DashboardTab) => {
    const setTargetEpisodes = tab === 'FILE_MATCH' ? setSearchEpisodes : setMergeEpisodes;
    const episodes = tab === 'FILE_MATCH' ? searchEpisodes : mergeEpisodes;
    const episode = episodes.find(e => e.id === id);
    if (!episode) return;

    if (tab === 'FILE_MATCH') {
      // Real Hashing Logic
      console.log('Starting hash calculation for:', episode.path);
      setSearchEpisodes(prev => prev.map(e => e.id === id ? { ...e, stage: ProcessingStage.HASHING, statusMessage: 'Calculating hash...', progress: 0 } : e));

      // Setup progress listener (Global for now - implies single active hash or shared progress)
      // ideally we'd pass ID to IPC to filter events
      const removeListener = window.api.hashing.onProgress((progress) => {
        setSearchEpisodes(prev => prev.map(e => e.id === id ? { ...e, progress } : e));
      });

      try {
        // Mock API for now doesn't filter by ID, so we might clash if parallel. 
        // But for single file test it works.
        const hash = await window.api.hashing.calculateHash(episode.path);
        console.log('Hash calculated successfully:', hash);

        setSearchEpisodes(prev => prev.map(e => e.id === id ? {
          ...e,
          stage: ProcessingStage.SEARCHING,
          statusMessage: `Hash: ${hash.substring(0, 8)}...`,
          progress: 100
        } : e));

        // Real Search
        console.log('Searching for subtitles with hash:', hash);
        const results = await window.api.subtitles.searchByHash(hash);
        console.log('Search results:', results);

        if (results && results.length > 0) {
          console.log('Found', results.length, 'subtitle(s)');
          setSearchEpisodes(prev => prev.map(e => e.id === id ? {
            ...e,
            stage: ProcessingStage.REVIEW, // Go to Review stage
            statusMessage: 'Select a subtitle',
            searchResults: results
          } : e));
        } else {
          console.log('No subtitles found');
          setSearchEpisodes(prev => prev.map(e => e.id === id ? {
            ...e,
            stage: ProcessingStage.COMPLETED, // Or ERROR/NOT_FOUND
            statusMessage: 'No subtitles found',
          } : e));
        }

      } catch (err: any) {
        console.error('Error in auto-match process:', err);

        // Check if it's an API key error
        const isApiKeyError = err?.message?.includes('API Key missing');

        setSearchEpisodes(prev => prev.map(e => e.id === id ? {
          ...e,
          stage: ProcessingStage.ERROR,
          statusMessage: isApiKeyError ? 'API Key required - Check Settings' : 'Search failed'
        } : e));
      }

      return;
    }

    // Existing Merger Simulation
    const startStage = ProcessingStage.MERGING;
    const startMessage = 'Initializing FFmpeg...';

    setTargetEpisodes(prev => prev.map(e => e.id === id ? { ...e, stage: startStage, statusMessage: startMessage, progress: 5 } : e));

    let progress = 5;
    const interval = setInterval(() => {
      progress += Math.random() * 5;

      setTargetEpisodes(prev => {
        const currentEp = prev.find(e => e.id === id);
        if (!currentEp) {
          clearInterval(interval);
          return prev;
        }

        let newStage = currentEp.stage;
        let newMessage = currentEp.statusMessage;

        // MERGER logic
        if (progress > 30 && progress <= 60) newMessage = 'Cleaning streams...';
        if (progress > 60) newMessage = 'Muxing container...';
        if (progress >= 95) {
          newStage = ProcessingStage.COMPLETED;
          newMessage = 'Merge Complete';
        }

        if (progress >= 100) {
          newStage = ProcessingStage.COMPLETED;
          newMessage = 'Completed';
          progress = 100;
          clearInterval(interval);
        }

        return prev.map(e => e.id === id ? { ...e, progress, stage: newStage, statusMessage: newMessage } : e);
      });

    }, 400);
  };

  const clearCompleted = () => {
    const { setEpisodes } = getCurrentQueueInfo();
    setEpisodes(prev => prev.filter(e => e.stage !== ProcessingStage.COMPLETED));
  };

  const renderContent = () => {
    switch (view) {
      case 'DASHBOARD':
        const { episodes } = getCurrentQueueInfo();
        return (
          <Dashboard
            activeTab={activeTab}
            onTabChange={setActiveTab}
            episodes={episodes}
            searchResults={searchResults}
            isSearchingWeb={isSearchingWeb}
            onWebSearch={handleWebSearch}
            onDownloadSubtitle={handleDownloadSubtitle}
            onDownloadEpisodeSubtitle={handleDownloadEpisodeSubtitle}
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
          onAddFiles={handleAddRandomFiles}
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
