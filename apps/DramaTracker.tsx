
import React, { useState, useEffect } from 'react';
import { 
  Flame, 
  Search, 
  Youtube, 
  Video, 
  Instagram, 
  Hash, 
  Globe, 
  ChevronDown,
  RefreshCcw,
  Zap,
  TrendingUp,
  ExternalLink,
  Plus,
  Trash2,
  MessageSquare,
  Smile,
  Frown,
  Meh,
  Loader2,
  Clapperboard,
  Check
} from 'lucide-react';
import { fetchDramaTimeline, TimelineEvent, ContentSeason } from '../services/geminiService';
import { storage, STORES } from '../services/storageService';
import { AppID } from '../types';

interface DramaTrackerProps {
    onNavigate?: (appId: AppID) => void;
}

const PLATFORM_THEMES: Record<string, { icon: React.ElementType, color: string, bg: string }> = {
  YouTube: { icon: Youtube, color: 'text-red-500', bg: 'bg-red-500/10' },
  TikTok: { icon: Video, color: 'text-pink-400', bg: 'bg-pink-500/10' },
  Instagram: { icon: Instagram, color: 'text-purple-400', bg: 'bg-purple-500/10' },
  Reddit: { icon: Hash, color: 'text-orange-500', bg: 'bg-orange-500/10' },
  Twitter: { icon: Hash, color: 'text-blue-400', bg: 'bg-blue-400/10' },
  Web: { icon: Globe, color: 'text-emerald-400', bg: 'bg-emerald-500/10' }
};

const LOADING_STEPS = [
  "Searching the real-time web...",
  "Browsing recent social uploads...",
  "Aggregating controversy data...",
  "Analyzing community sentiment...",
  "Fetching subreddit threads...",
  "Formatting the final timeline..."
];

interface CreatorCache {
  timeline: TimelineEvent[];
  summary: string;
  lastUpdated?: number; // Added TTL field
}

const TTL_MS = 6 * 60 * 60 * 1000; // 6 Hours

const DramaTracker: React.FC<DramaTrackerProps> = ({ onNavigate }) => {
  const [creators, setCreators] = useState<string[]>([]);
  const [selectedCreator, setSelectedCreator] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [resultsCache, setResultsCache] = useState<Record<string, CreatorCache>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [newCreatorName, setNewCreatorName] = useState('');
  
  // ContentAI Integration
  const [seasons, setSeasons] = useState<ContentSeason[]>([]);
  const [convertingEvent, setConvertingEvent] = useState<TimelineEvent | null>(null);

  // 1. Initial Load from IndexedDB
  useEffect(() => {
    const init = async () => {
      try {
        const savedCache = await storage.get<Record<string, CreatorCache>>(STORES.DRAMA, 'results_cache');
        const savedCreators = await storage.get<string[]>(STORES.DRAMA, 'creator_list');
        const savedSeasons = await storage.get<ContentSeason[]>(STORES.CONTENT, 'seasons');
        
        if (savedCache) setResultsCache(savedCache);
        if (savedCreators) setCreators(savedCreators);
        if (savedSeasons) setSeasons(savedSeasons);
      } catch (e) {
        console.error('Failed to load drama data', e);
      } finally {
        setIsReady(true);
      }
    };
    init();
  }, []);

  // 2. Persist to IndexedDB
  useEffect(() => {
    if (!isReady) return;
    storage.set(STORES.DRAMA, 'results_cache', resultsCache).catch(console.error);
    storage.set(STORES.DRAMA, 'creator_list', creators).catch(console.error);
  }, [resultsCache, creators, isReady]);

  useEffect(() => {
    let interval: any;
    if (isLoading) {
      interval = setInterval(() => {
        setLoadingStep(prev => (prev < LOADING_STEPS.length - 1 ? prev + 1 : prev));
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [isLoading]);

  const loadTimeline = async (name: string, forceRefresh = false) => {
    if (!name) return;
    
    // Check Cache Validity (TTL)
    const cached = resultsCache[name];
    const isStale = cached && cached.lastUpdated && (Date.now() - cached.lastUpdated > TTL_MS);
    
    if (!forceRefresh && cached && !isStale) {
        console.log("Serving cached drama timeline");
        return;
    }
    
    setIsLoading(true);
    setLoadingStep(0);
    try {
      const data = await fetchDramaTimeline(name);
      setResultsCache(prev => ({
        ...prev,
        [name]: { 
            timeline: data.events, 
            summary: data.summary,
            lastUpdated: Date.now()
        }
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddCreator = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newCreatorName.trim();
    if (name && !creators.includes(name)) {
      setCreators(prev => [...prev, name]);
      setSelectedCreator(name);
      setNewCreatorName('');
      setIsDropdownOpen(false);
    }
  };

  const handleRemoveCreator = (e: React.MouseEvent, name: string) => {
    e.stopPropagation();
    const newCreators = creators.filter(c => c !== name);
    setCreators(newCreators);
    const newCache = { ...resultsCache };
    delete newCache[name];
    setResultsCache(newCache);
    if (selectedCreator === name) setSelectedCreator(newCreators[0] || '');
  };

  const handleConvert = (seasonId: string) => {
    if (!convertingEvent) return;
    localStorage.setItem('content_ai_pending_context', `${selectedCreator}: ${convertingEvent.title} - ${convertingEvent.description}`);
    localStorage.setItem('content_ai_pending_season', seasonId);
    onNavigate?.(AppID.CONTENT_AI);
    setConvertingEvent(null);
  };

  const currentData = resultsCache[selectedCreator] || { timeline: [], summary: '' };

  if (!isReady) return (
    <div className="h-full bg-black flex items-center justify-center">
      <Loader2 className="animate-spin text-white/20" size={32} />
    </div>
  );

  return (
    <div className="h-full bg-black text-white flex flex-col overflow-hidden">
      <div className="p-4 border-b border-white/10 flex items-center justify-between bg-black/50 backdrop-blur-xl shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center">
            <Flame size={20} fill="currentColor" />
          </div>
          <div className="relative">
            <button 
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-lg text-sm font-bold hover:bg-white/20 transition-colors"
            >
              {selectedCreator || 'Select Creator'} <ChevronDown size={14} className={`transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            {isDropdownOpen && (
              <div className="absolute top-full left-0 mt-2 w-64 bg-[#1c1c1e] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden flex flex-col max-h-[400px]">
                <div className="overflow-y-auto flex-1">
                  {creators.map(c => (
                    <div 
                      key={c}
                      className={`group flex items-center justify-between px-4 py-3 hover:bg-white/5 cursor-pointer ${selectedCreator === c ? 'bg-white/10' : ''}`}
                      onClick={() => { setSelectedCreator(c); setIsDropdownOpen(false); }}
                    >
                      <span className="text-sm font-medium">{c}</span>
                      <button onClick={(e) => handleRemoveCreator(e, c)} className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 transition-all">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
                <form onSubmit={handleAddCreator} className="p-3 border-t border-white/10 bg-[#2c2c2e]">
                  <input 
                    type="text" value={newCreatorName}
                    onChange={(e) => setNewCreatorName(e.target.value)}
                    placeholder="Add creator..."
                    className="bg-black/20 rounded-lg px-3 py-1.5 border border-white/5 text-xs outline-none w-full"
                  />
                </form>
              </div>
            )}
          </div>
        </div>
        <button onClick={() => loadTimeline(selectedCreator, true)} disabled={isLoading || !selectedCreator} className="p-2 bg-white/10 rounded-full">
          <RefreshCcw size={18} className={isLoading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-20">
        {!selectedCreator ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <Search size={48} className="opacity-10 mb-4" />
            <p className="text-sm">Select a creator stored in IndexedDB.</p>
          </div>
        ) : isLoading ? (
          <div className="flex flex-col items-center justify-center h-full space-y-6">
            <div className="w-12 h-12 border-4 border-red-500/20 border-t-red-500 animate-spin rounded-full" />
            <p className="text-xl font-bold animate-pulse">{LOADING_STEPS[loadingStep]}</p>
          </div>
        ) : !resultsCache[selectedCreator] ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Zap size={48} className="text-red-500 mb-4" />
            <button onClick={() => loadTimeline(selectedCreator, true)} className="bg-white text-black px-8 py-3 rounded-full font-bold">Search Realtime Web</button>
          </div>
        ) : (
          <>
            <div className="bg-gradient-to-br from-red-500/20 to-orange-500/20 border border-red-500/30 p-4 rounded-2xl">
              <p className="text-sm leading-relaxed">{currentData.summary}</p>
              {resultsCache[selectedCreator].lastUpdated && (
                  <p className="text-[10px] text-gray-500 mt-2 text-right">
                      Cached: {new Date(resultsCache[selectedCreator].lastUpdated!).toLocaleTimeString()}
                  </p>
              )}
            </div>
            <div className="space-y-4">
              {currentData.timeline.map((event, idx) => {
                const Theme = PLATFORM_THEMES[event.platform] || PLATFORM_THEMES.Web;
                const isConverting = convertingEvent === event;
                
                return (
                  <div key={idx} className="bg-[#1c1c1e] border border-white/5 rounded-2xl p-5 relative overflow-visible">
                    <div className="flex items-center gap-2 mb-3">
                      <div className={`px-2 py-0.5 rounded-full ${Theme.bg} ${Theme.color} text-[10px] font-bold uppercase`}>{event.platform}</div>
                      <span className="text-xs text-gray-500">{event.date}</span>
                    </div>
                    <h3 className="font-bold text-lg mb-2">{event.title}</h3>
                    <p className="text-sm text-gray-400 mb-4">{event.description}</p>
                    
                    <div className="flex justify-end relative">
                        <button 
                            onClick={() => setConvertingEvent(isConverting ? null : event)}
                            className="bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wide flex items-center gap-2 transition-colors"
                        >
                            <Clapperboard size={12} /> Convert to Episode
                        </button>

                        {isConverting && (
                            <div className="absolute bottom-full right-0 mb-2 w-56 bg-[#252527] border border-white/10 rounded-2xl shadow-2xl p-2 z-20 animate-pop-in">
                                <p className="px-2 py-1 text-[10px] font-black uppercase text-gray-500 tracking-widest mb-1">Select Season</p>
                                {seasons.length === 0 ? (
                                    <div className="px-2 py-2 text-xs text-gray-500 italic">No seasons found in ContentAI.</div>
                                ) : (
                                    <div className="max-h-40 overflow-y-auto">
                                        {seasons.map(season => (
                                            <button 
                                                key={season.id}
                                                onClick={() => handleConvert(season.id)}
                                                className="w-full text-left px-3 py-2 rounded-xl text-xs hover:bg-white/10 flex items-center justify-between group"
                                            >
                                                {season.title}
                                                <ChevronDown size={12} className="opacity-0 group-hover:opacity-100 -rotate-90 transition-all" />
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default DramaTracker;
