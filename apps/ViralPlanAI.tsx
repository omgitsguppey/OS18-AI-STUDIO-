
import React, { useState, useEffect } from 'react';
import { 
  Megaphone, 
  Target, 
  Layers, 
  Calendar, 
  DollarSign, 
  Loader2, 
  ChevronRight, 
  Zap,
  LayoutGrid,
  TrendingUp,
  Music
} from 'lucide-react';
import { generateViralContentPlan, ViralPlan } from '../services/geminiService';
import { storage, STORES } from '../services/storageService';
import OnboardingOverlay from '../components/OnboardingOverlay';
import { AppID } from '../types';

// Interfaces for external data
interface Artist { id: string; name: string; }
interface Album { id: string; title: string; artistId: string; songTitles: string[]; }

const ViralPlanAI: React.FC = () => {
  const [view, setView] = useState<'select' | 'plan'>('select');
  const [artists, setArtists] = useState<Artist[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [selectedTarget, setSelectedTarget] = useState<{ type: 'song' | 'album', name: string, artist: string } | null>(null);
  const [plans, setPlans] = useState<ViralPlan[]>([]);
  const [activePlan, setActivePlan] = useState<ViralPlan | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [activeTab, setActiveTab] = useState<'ecosystem' | 'timeline' | 'monetization'>('ecosystem');

  // Load Data
  useEffect(() => {
    const init = async () => {
      try {
        const [loadedArtists, loadedAlbums, loadedPlans] = await Promise.all([
          storage.get<Artist[]>(STORES.LYRICS, 'artists_list'),
          storage.get<Album[]>(STORES.ALBUMS, 'projects_list'),
          storage.get<ViralPlan[]>(STORES.VIRAL_PLAN, 'plans')
        ]);
        
        if (loadedArtists) setArtists(loadedArtists);
        if (loadedAlbums) setAlbums(loadedAlbums);
        if (loadedPlans) setPlans(loadedPlans);
      } catch (e) {
        console.error("ViralPlanAI Load Error", e);
      } finally {
        setIsReady(true);
      }
    };
    init();
  }, []);

  // Persist Plans
  useEffect(() => {
    if (!isReady) return;
    storage.set(STORES.VIRAL_PLAN, 'plans', plans).catch(console.error);
  }, [plans, isReady]);

  const handleGenerate = async () => {
    if (!selectedTarget) return;
    setIsGenerating(true);
    try {
      const result = await generateViralContentPlan(
        selectedTarget.name,
        selectedTarget.artist,
        selectedTarget.type === 'album' ? 'Full Album Release' : 'Single Release'
      );
      
      const newPlan: ViralPlan = {
        id: Date.now().toString(),
        createdAt: Date.now(),
        ...result
      };
      
      setPlans([newPlan, ...plans]);
      setActivePlan(newPlan);
      setView('plan');
      setActiveTab('ecosystem');
    } catch (e) {
      console.error(e);
      alert("Strategy generation failed.");
    } finally {
      setIsGenerating(false);
    }
  };

  if (!isReady) return (
    <div className="h-full bg-black flex items-center justify-center">
      <Loader2 className="animate-spin text-orange-500" size={32} />
    </div>
  );

  return (
    <div className="h-full bg-[#0a0a0a] text-white flex flex-col font-sans overflow-hidden relative">
      <OnboardingOverlay 
        appId={AppID.VIRAL_PLAN_AI}
        title="ViralPlanAI"
        subtitle="Automated Burner Account Strategy"
        features={[
          { icon: LayoutGrid, title: "Burner Ecosystems", description: "Generates concepts for 4-6 distinct niche accounts to promote your music." },
          { icon: DollarSign, title: "Content ID Farming", description: "Strategies to maximize passive revenue through audio usage." },
          { icon: Calendar, title: "Yearly Roadmap", description: "A 4-quarter execution plan for sustained growth." }
        ]}
      />

      {/* Header */}
      <div className="h-16 border-b border-white/5 px-6 flex items-center justify-between bg-black/40 backdrop-blur-md shrink-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-lg shadow-orange-900/20">
            <Megaphone size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold leading-none">ViralPlanAI</h1>
            <p className="text-[10px] text-gray-500 font-medium uppercase tracking-widest mt-1">Growth Hacking</p>
          </div>
        </div>
        {view === 'plan' && (
          <button onClick={() => setView('select')} className="text-xs font-bold text-gray-400 hover:text-white transition-colors bg-white/5 px-3 py-1.5 rounded-full">
            Back
          </button>
        )}
      </div>

      <div className="flex-1 overflow-hidden p-6 max-w-5xl mx-auto w-full">
        {view === 'select' && (
          <div className="space-y-10 animate-fade-in h-full overflow-y-auto custom-scrollbar">
            {/* New Generation */}
            <div className="space-y-6">
              <div className="text-center space-y-2 py-6">
                <h2 className="text-3xl font-black">New Campaign</h2>
                <p className="text-gray-500">Select a target from your library to generate a viral roadmap.</p>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-[#1c1c1e] border border-white/5 rounded-[2.5rem] p-6 space-y-4 shadow-lg">
                  <h3 className="flex items-center gap-2 font-bold text-sm text-gray-400"><Layers size={16} /> Select Album</h3>
                  <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
                    {albums.length === 0 && <p className="text-xs text-gray-600 italic p-4 text-center">No albums in AlbumsAI.</p>}
                    {albums.map(alb => {
                      const artist = artists.find(a => a.id === alb.artistId)?.name || 'Unknown';
                      return (
                        <button
                          key={alb.id}
                          onClick={() => setSelectedTarget({ type: 'album', name: alb.title, artist })}
                          className={`w-full text-left p-4 rounded-2xl border transition-all ${selectedTarget?.name === alb.title ? 'bg-orange-500/10 border-orange-500/50 text-orange-500 shadow-inner' : 'bg-black/20 border-white/5 hover:bg-white/5'}`}
                        >
                          <span className="font-bold block text-sm">{alb.title}</span>
                          <span className="text-[10px] opacity-70">{artist}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="bg-[#1c1c1e] border border-white/5 rounded-[2.5rem] p-6 space-y-4 shadow-lg">
                  <h3 className="flex items-center gap-2 font-bold text-sm text-gray-400"><Target size={16} /> Select Song</h3>
                  <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
                    {artists.length === 0 && <p className="text-xs text-gray-600 italic p-4 text-center">No songs in LyricsAI.</p>}
                    {artists.flatMap(a => a.songs.map((s, i) => ({ ...s, artist: a.name, id: `${a.id}-${i}` }))).map(song => (
                      <button
                        key={song.id}
                        onClick={() => setSelectedTarget({ type: 'song', name: song.songTitle, artist: song.artist })}
                        className={`w-full text-left p-4 rounded-2xl border transition-all ${selectedTarget?.name === song.songTitle ? 'bg-orange-500/10 border-orange-500/50 text-orange-500 shadow-inner' : 'bg-black/20 border-white/5 hover:bg-white/5'}`}
                      >
                        <span className="font-bold block text-sm">{song.songTitle}</span>
                        <span className="text-[10px] opacity-70">{song.artist}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-center pt-8">
                <button
                  onClick={handleGenerate}
                  disabled={!selectedTarget || isGenerating}
                  className="bg-gradient-to-r from-orange-500 to-red-600 text-white px-10 py-5 rounded-[2rem] font-black text-sm uppercase tracking-widest shadow-2xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100 flex items-center gap-3"
                >
                  {isGenerating ? <Loader2 className="animate-spin" /> : <><Zap size={18} fill="currentColor" /> Ignite Strategy</>}
                </button>
              </div>
            </div>

            {/* Previous Plans */}
            {plans.length > 0 && (
              <div className="space-y-4 pt-10 border-t border-white/5">
                <h3 className="text-xs font-black uppercase text-gray-500 tracking-widest">Active Campaigns</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  {plans.map(p => (
                    <div 
                      key={p.id}
                      onClick={() => { setActivePlan(p); setView('plan'); }}
                      className="bg-[#1c1c1e] border border-white/5 p-5 rounded-2xl cursor-pointer hover:bg-[#252527] transition-all group flex justify-between items-center"
                    >
                      <div>
                        <h4 className="font-bold text-lg">{p.target}</h4>
                        <p className="text-xs text-gray-500">{new Date(p.createdAt).toLocaleDateString()}</p>
                      </div>
                      <ChevronRight size={18} className="text-gray-600 group-hover:text-white transition-colors" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {view === 'plan' && activePlan && (
          <div className="h-full flex flex-col animate-slide-up">
            <div className="text-center space-y-2 shrink-0 mb-6">
              <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-br from-orange-400 to-red-500">
                {activePlan.target}
              </h2>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6 shrink-0 justify-center">
              {[
                { id: 'ecosystem', label: 'Ecosystem', icon: LayoutGrid },
                { id: 'timeline', label: 'Timeline', icon: Calendar },
                { id: 'monetization', label: 'Money', icon: DollarSign }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-6 py-2.5 rounded-full font-bold text-sm transition-all ${activeTab === tab.id ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' : 'bg-[#1c1c1e] text-gray-400 border border-white/5 hover:text-white'}`}
                >
                  <tab.icon size={16} /> {tab.label}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar pb-20">
              {activeTab === 'ecosystem' && (
                <div className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    {activePlan.nicheAccounts.map((acc, idx) => (
                      <div key={idx} className="bg-[#1c1c1e] border border-white/5 rounded-3xl p-6 hover:border-orange-500/30 transition-all shadow-sm">
                        <div className="flex justify-between items-start mb-4">
                          <span className="text-[10px] font-black uppercase tracking-widest text-white/90 bg-orange-500/20 px-3 py-1 rounded-full">
                            {acc.niche}
                          </span>
                          <span className="text-xs font-bold text-orange-400">@{acc.accountNameIdea.replace(/\s+/g, '').toLowerCase()}</span>
                        </div>
                        <div className="space-y-4">
                          <div className="bg-black/20 p-4 rounded-2xl border border-white/5">
                            <span className="block text-[10px] font-bold text-gray-500 mb-1">Visual Style</span>
                            <p className="text-sm font-medium leading-tight">{acc.contentStyle}</p>
                          </div>
                          <div className="bg-black/20 p-4 rounded-2xl border border-white/5">
                            <span className="block text-[10px] font-bold text-gray-500 mb-1">Audio Strategy</span>
                            <p className="text-sm font-medium leading-tight">{acc.audioUtilization}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'timeline' && (
                <div className="space-y-4">
                  {activePlan.quarterlyRoadmap.map((q, idx) => (
                    <div key={idx} className="bg-[#1c1c1e] border border-white/5 rounded-3xl p-6 relative overflow-hidden">
                      <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-gradient-to-b from-orange-500 to-red-600" />
                      <div className="flex flex-col md:flex-row gap-6">
                        <div className="shrink-0 md:w-32">
                          <h4 className="text-2xl font-black text-white">{q.quarter}</h4>
                          <p className="text-xs font-bold text-orange-500 uppercase tracking-widest mt-1">{q.focus}</p>
                        </div>
                        <div className="flex-1 space-y-3">
                          {q.actions.map((action, i) => (
                            <div key={i} className="flex items-start gap-3">
                              <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-gray-600 shrink-0" />
                              <p className="text-sm text-gray-300 leading-relaxed font-medium">{action}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'monetization' && (
                <div className="h-full flex flex-col justify-center">
                  <div className="bg-gradient-to-br from-green-900/20 to-emerald-900/10 border border-green-500/20 rounded-[3rem] p-10 text-center">
                    <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6 text-green-500">
                      <TrendingUp size={32} />
                    </div>
                    <h3 className="text-green-400 font-bold text-sm uppercase tracking-widest mb-4">Content ID Strategy</h3>
                    <p className="text-xl font-medium leading-relaxed text-green-100 max-w-2xl mx-auto">
                      "{activePlan.contentIdStrategy}"
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ViralPlanAI;
