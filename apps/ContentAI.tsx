
import React, { useState, useEffect } from 'react';
import { 
  Clapperboard, 
  Plus, 
  Film, 
  Tv, 
  Smartphone, 
  ChevronRight, 
  ArrowLeft, 
  Sparkles, 
  Loader2, 
  Flame, 
  History, 
  Trash2,
  Play,
  User,
  Users,
  Eye,
  Wand2
} from 'lucide-react';
import { generateContentEpisode, generateSeasonTitle, ContentSeason, ContentEpisode, TimelineEvent } from '../services/geminiService';
import { storage, STORES } from '../services/storageService';

interface CreatorCache {
  timeline: TimelineEvent[];
  summary: string;
}

const ContentAI: React.FC = () => {
  const [view, setView] = useState<'series' | 'season' | 'generate' | 'episode'>('series');
  const [seasons, setSeasons] = useState<ContentSeason[]>([]);
  const [activeSeasonId, setActiveSeasonId] = useState<string | null>(null);
  const [activeEpisode, setActiveEpisode] = useState<ContentEpisode | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isRenamingSeason, setIsRenamingSeason] = useState(false);

  // Generator State
  const [prompt, setPrompt] = useState('');
  const [dramaSource, setDramaSource] = useState<string | null>(null); 
  const [availableDrama, setAvailableDrama] = useState<Record<string, CreatorCache>>({});
  const [selectedDramaEvent, setSelectedDramaEvent] = useState<string>('');
  
  // New Controls
  const [selectedFormat, setSelectedFormat] = useState<'Short Form' | 'Mid Form' | 'Long Form'>('Short Form');
  const [selectedPOV, setSelectedPOV] = useState<'First Person' | 'Second Person' | 'Third Person'>('First Person');

  // Initial Load
  useEffect(() => {
    const init = async () => {
      try {
        const savedSeasons = await storage.get<ContentSeason[]>(STORES.CONTENT, 'seasons');
        const dramaCache = await storage.get<Record<string, CreatorCache>>(STORES.DRAMA, 'results_cache');
        
        if (savedSeasons) setSeasons(savedSeasons);
        if (dramaCache) setAvailableDrama(dramaCache);

        // Check for incoming "Convert to Episode" actions from DramaTracker
        const pendingDrama = localStorage.getItem('content_ai_pending_context');
        const pendingSeasonId = localStorage.getItem('content_ai_pending_season');
        
        if (pendingSeasonId && pendingDrama) {
            setActiveSeasonId(pendingSeasonId);
            setSelectedDramaEvent(pendingDrama);
            setDramaSource('select');
            setView('generate');
            // Clean up
            localStorage.removeItem('content_ai_pending_context');
            localStorage.removeItem('content_ai_pending_season');
        }

      } catch (e) {
        console.error("ContentAI Load Error", e);
      } finally {
        setIsReady(true);
      }
    };
    init();
  }, []);

  // Persist
  useEffect(() => {
    if (!isReady) return;
    storage.set(STORES.CONTENT, 'seasons', seasons).catch(console.error);
  }, [seasons, isReady]);

  const createSeason = () => {
    const nextNum = seasons.length + 1;
    const newSeason: ContentSeason = {
      id: Date.now().toString(),
      number: nextNum,
      title: `Season ${nextNum}`,
      episodes: []
    };
    setSeasons([...seasons, newSeason]);
    setActiveSeasonId(newSeason.id);
    setView('season');
  };

  const handleMagicRenameSeason = async () => {
    if (!activeSeasonId) return;
    const season = seasons.find(s => s.id === activeSeasonId);
    if (!season || season.episodes.length === 0) return;

    setIsRenamingSeason(true);
    try {
        const newTitle = await generateSeasonTitle(season.episodes);
        setSeasons(prev => prev.map(s => s.id === season.id ? { ...s, title: newTitle } : s));
    } catch (e) {
        console.error("Renaming failed", e);
    } finally {
        setIsRenamingSeason(false);
    }
  };

  const handleGenerate = async () => {
    if (!activeSeasonId) return;
    const season = seasons.find(s => s.id === activeSeasonId);
    if (!season) return;

    // Construct prompt
    let finalPrompt = prompt;
    if (selectedDramaEvent) {
      finalPrompt = `Based on this drama event: ${selectedDramaEvent}. ${prompt}`;
    }
    if (!finalPrompt.trim()) return;

    setIsLoading(true);
    try {
      const nextEpNum = season.episodes.length + 1;
      const result = await generateContentEpisode(
        season.number,
        nextEpNum,
        finalPrompt,
        season.episodes,
        selectedFormat,
        selectedPOV
      );

      const newEpisode: ContentEpisode = {
        id: Date.now().toString(),
        seasonId: season.id,
        createdAt: Date.now(),
        episodeNumber: nextEpNum, // Ensure sequential
        ...result
      };

      setSeasons(prev => prev.map(s => 
        s.id === season.id 
          ? { ...s, episodes: [newEpisode, ...s.episodes] } 
          : s
      ));
      
      setActiveEpisode(newEpisode);
      setView('episode');
      setPrompt('');
      setSelectedDramaEvent('');
    } catch (e) {
      console.error(e);
      alert("Script generation failed. The writers went on strike.");
    } finally {
      setIsLoading(false);
    }
  };

  const deleteEpisode = (epId: string) => {
    if (!activeSeasonId) return;
    setSeasons(prev => prev.map(s => 
      s.id === activeSeasonId 
        ? { ...s, episodes: s.episodes.filter(e => e.id !== epId) }
        : s
    ));
    if (activeEpisode?.id === epId) setView('season');
  };

  const activeSeason = seasons.find(s => s.id === activeSeasonId);

  if (!isReady) return (
    <div className="h-full bg-black flex items-center justify-center">
      <Loader2 className="animate-spin text-white/20" size={32} />
    </div>
  );

  return (
    <div className="h-full bg-[#0a0a0a] text-white flex flex-col font-sans overflow-hidden">
      {/* Header */}
      <div className="h-16 border-b border-white/5 px-6 flex items-center justify-between bg-black/40 backdrop-blur-md shrink-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-600 to-rose-600 flex items-center justify-center shadow-lg shadow-red-900/20">
            <Clapperboard size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold leading-none">Showrunner</h1>
            <p className="text-[10px] text-gray-500 font-medium uppercase tracking-widest mt-1">ContentAI</p>
          </div>
        </div>
        
        {view === 'series' && (
          <button onClick={createSeason} className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-4 py-2 rounded-full text-xs font-bold transition-all">
            <Plus size={14} /> New Season
          </button>
        )}
        
        {view !== 'series' && (
          <button 
            onClick={() => {
               if (view === 'episode') setView('season');
               else if (view === 'generate') setView('season');
               else setView('series');
            }} 
            className="flex items-center gap-1 text-sm text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={16} /> Back
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 max-w-2xl mx-auto w-full">
        
        {/* VIEW: SERIES LIST */}
        {view === 'series' && (
          <div className="space-y-6 animate-fade-in">
            <div className="text-center py-6">
               <h2 className="text-3xl font-black mb-2">The Archive</h2>
               <p className="text-gray-500 text-sm">Your content career, organized into seasons.</p>
            </div>
            
            {seasons.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 opacity-30">
                <Tv size={64} className="mb-4" />
                <p>No seasons produced yet.</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {seasons.slice().reverse().map(season => (
                  <div 
                    key={season.id} 
                    onClick={() => { setActiveSeasonId(season.id); setView('season'); }}
                    className="bg-[#1c1c1e] border border-white/5 rounded-2xl p-6 hover:bg-[#252527] cursor-pointer transition-all group flex items-center justify-between"
                  >
                    <div>
                       <h3 className="text-xl font-bold">{season.title}</h3>
                       <p className="text-xs text-gray-500 font-medium mt-1">{season.episodes.length} Episodes</p>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-white/10 group-hover:scale-110 transition-all">
                       <ChevronRight size={20} className="text-gray-400" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* VIEW: SEASON DETAIL */}
        {view === 'season' && activeSeason && (
          <div className="space-y-6 animate-fade-in">
             <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <h2 className="text-3xl font-black">{activeSeason.title}</h2>
                    {activeSeason.episodes.length > 0 && (
                        <button 
                            onClick={handleMagicRenameSeason}
                            disabled={isRenamingSeason}
                            className="p-2 bg-indigo-500/10 text-indigo-400 rounded-full hover:bg-indigo-500/20 transition-all disabled:opacity-50"
                            title="Generate Title with AI"
                        >
                            {isRenamingSeason ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
                        </button>
                    )}
                </div>
                <button 
                  onClick={() => setView('generate')}
                  className="bg-white text-black px-6 py-3 rounded-full font-bold text-sm shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                >
                  <Sparkles size={16} /> Write Episode
                </button>
             </div>

             <div className="space-y-4">
                {activeSeason.episodes.length === 0 ? (
                  <div className="p-10 text-center border-2 border-dashed border-white/5 rounded-3xl text-gray-500">
                    <p>Writers' room is empty.</p>
                  </div>
                ) : (
                  activeSeason.episodes.map(ep => (
                    <div 
                      key={ep.id} 
                      onClick={() => { setActiveEpisode(ep); setView('episode'); }}
                      className="bg-[#1c1c1e] border border-white/5 rounded-2xl p-5 hover:bg-[#252527] cursor-pointer transition-all relative group"
                    >
                       <div className="flex items-start justify-between mb-3">
                          <span className="text-[10px] font-black uppercase tracking-widest text-red-500">Episode {ep.episodeNumber}</span>
                          <div className="flex gap-2">
                            <span className="text-[10px] font-bold px-2 py-1 bg-white/5 rounded-lg text-gray-400">{ep.format}</span>
                            <span className="text-[10px] font-bold px-2 py-1 bg-white/5 rounded-lg text-gray-400">{ep.pov}</span>
                          </div>
                       </div>
                       <h3 className="text-lg font-bold mb-2">{ep.title}</h3>
                       <p className="text-xs text-gray-400 line-clamp-2">{ep.hook}</p>
                    </div>
                  ))
                )}
             </div>
          </div>
        )}

        {/* VIEW: GENERATOR */}
        {view === 'generate' && (
          <div className="h-full flex flex-col animate-slide-up pb-10">
             <div className="flex-1 space-y-6">
                <div className="text-center py-4">
                   <h2 className="text-2xl font-black">Writers' Room</h2>
                   <p className="text-xs text-gray-500">Drafting Season {activeSeason?.number}, Episode { (activeSeason?.episodes.length || 0) + 1 }</p>
                </div>

                {/* Configuration: POV & Format */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest">Format</label>
                        <div className="flex flex-col gap-2">
                            {['Short Form', 'Mid Form', 'Long Form'].map((fmt) => (
                                <button
                                    key={fmt}
                                    onClick={() => setSelectedFormat(fmt as any)}
                                    className={`text-left px-3 py-2 rounded-lg border text-xs font-bold transition-all ${selectedFormat === fmt ? 'bg-red-500/10 border-red-500 text-red-500' : 'bg-[#1c1c1e] border-white/5 hover:bg-white/5 text-gray-400'}`}
                                >
                                    {fmt}
                                    <span className="block text-[9px] font-normal opacity-70 mt-0.5">
                                        {fmt === 'Short Form' ? 'Vertical 60s' : fmt === 'Mid Form' ? '3-5 min vlog' : 'Video Essay'}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest">Perspective</label>
                        <div className="flex flex-col gap-2">
                            {[
                                { val: 'First Person', icon: User, label: 'Me/My' },
                                { val: 'Second Person', icon: Users, label: 'You/Your' },
                                { val: 'Third Person', icon: Eye, label: 'Observer' }
                            ].map((p) => (
                                <button
                                    key={p.val}
                                    onClick={() => setSelectedPOV(p.val as any)}
                                    className={`flex items-center gap-2 text-left px-3 py-3 rounded-lg border text-xs font-bold transition-all ${selectedPOV === p.val ? 'bg-blue-500/10 border-blue-500 text-blue-500' : 'bg-[#1c1c1e] border-white/5 hover:bg-white/5 text-gray-400'}`}
                                >
                                    <p.icon size={14} /> {p.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Drama Source Toggle */}
                <div className="flex gap-2 p-1 bg-[#1c1c1e] rounded-xl border border-white/5">
                   <button 
                      onClick={() => setDramaSource(null)}
                      className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${!dramaSource ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300'}`}
                   >
                      Manual Prompt
                   </button>
                   <button 
                      onClick={() => setDramaSource('select')}
                      className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${dramaSource ? 'bg-red-500/10 text-red-500' : 'text-gray-500 hover:text-gray-300'}`}
                   >
                      Pull from Drama
                   </button>
                </div>

                {/* Content Input Area */}
                <div className="bg-[#1c1c1e] rounded-[2rem] border border-white/5 p-6 shadow-2xl relative">
                   {dramaSource ? (
                      <div className="space-y-4">
                         <div className="flex items-center gap-2 text-red-500 mb-2">
                            <Flame size={16} />
                            <span className="text-xs font-black uppercase tracking-widest">Recent Events</span>
                         </div>
                         <div className="max-h-60 overflow-y-auto custom-scrollbar space-y-2">
                            {Object.entries(availableDrama).flatMap(([creator, data]) => 
                               (data as CreatorCache).timeline.map((event, i) => (
                                  <button 
                                     key={`${creator}-${i}`}
                                     onClick={() => setSelectedDramaEvent(`${creator}: ${event.title} - ${event.description}`)}
                                     className={`w-full text-left p-3 rounded-xl border transition-all text-xs ${selectedDramaEvent.includes(event.title) ? 'bg-red-500/20 border-red-500' : 'bg-black/20 border-white/5 hover:bg-white/5'}`}
                                  >
                                     <span className="font-bold block mb-1">{creator}</span>
                                     <span className="text-gray-400">{event.title}</span>
                                  </button>
                               ))
                            )}
                            {Object.keys(availableDrama).length === 0 && (
                               <div className="text-center py-8 text-gray-500 text-xs">No drama data found in storage.</div>
                            )}
                         </div>
                      </div>
                   ) : (
                      <textarea 
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="What's the concept? (e.g., 'I try to live on $1 a day', 'Responding to the haters')..."
                        className="w-full bg-transparent outline-none text-sm font-medium min-h-[150px] resize-none placeholder-gray-600"
                        autoFocus
                      />
                   )}
                </div>

                {/* Additional Prompting if Drama Selected */}
                {dramaSource && (
                   <div className="bg-[#1c1c1e] rounded-xl border border-white/5 p-4">
                      <input 
                         type="text"
                         value={prompt}
                         onChange={(e) => setPrompt(e.target.value)}
                         placeholder="Add your spin (Optional)..."
                         className="w-full bg-transparent outline-none text-sm"
                      />
                   </div>
                )}
             </div>

             <button 
                onClick={handleGenerate}
                disabled={isLoading || (!prompt.trim() && !selectedDramaEvent)}
                className="w-full bg-white text-black py-4 rounded-[1.5rem] font-black text-sm flex items-center justify-center gap-2 shadow-xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:scale-100 mt-6"
             >
                {isLoading ? <Loader2 size={18} className="animate-spin" /> : <><Sparkles size={18} /> Greenlight Episode</>}
             </button>
          </div>
        )}

        {/* VIEW: EPISODE DETAIL */}
        {view === 'episode' && activeEpisode && (
          <div className="animate-fade-in space-y-6 pb-20">
             {/* Hero */}
             <div className="bg-gradient-to-br from-red-900/20 to-rose-900/10 border border-red-500/20 rounded-[2.5rem] p-8 text-center space-y-4 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent opacity-50" />
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 text-red-400 text-[10px] font-black uppercase tracking-widest border border-red-500/20">
                   {activeEpisode.platform} • {activeEpisode.format} • {activeEpisode.pov}
                </div>
                <h2 className="text-3xl font-black leading-tight">{activeEpisode.title}</h2>
             </div>

             {/* Arc Context */}
             <div className="bg-[#1c1c1e] p-6 rounded-3xl border border-white/5 flex gap-4 items-start">
                <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400 shrink-0">
                   <History size={18} />
                </div>
                <div>
                   <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Arc Notes</h4>
                   <p className="text-sm text-gray-300 leading-relaxed">{activeEpisode.arcNotes}</p>
                </div>
             </div>

             {/* The Hook */}
             <div className="bg-[#1c1c1e] p-6 rounded-3xl border border-white/5 space-y-2">
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide flex items-center gap-2">
                   <Flame size={14} className="text-orange-500" /> The Hook
                </h4>
                <p className="text-lg font-medium text-white">{activeEpisode.hook}</p>
             </div>

             {/* The Script */}
             <div className="bg-[#1c1c1e] p-8 rounded-3xl border border-white/5 space-y-4">
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide">Final Script</h4>
                <div className="font-mono text-sm max-w-none text-gray-300 leading-loose whitespace-pre-wrap p-4 bg-black/30 rounded-xl border border-white/5">
                   {activeEpisode.script}
                </div>
             </div>

             {/* Actions */}
             <button 
               onClick={() => deleteEpisode(activeEpisode.id)}
               className="w-full py-4 text-xs font-bold text-red-500/50 hover:text-red-500 transition-colors flex items-center justify-center gap-2"
             >
                <Trash2 size={14} /> Kill Episode
             </button>
          </div>
        )}

      </div>
    </div>
  );
};

export default ContentAI;
