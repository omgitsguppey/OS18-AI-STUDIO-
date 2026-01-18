
import React, { useState, useEffect } from 'react';
import { 
  Crown, 
  Sparkles, 
  ArrowRight, 
  Loader2, 
  Target, 
  Zap, 
  Users, 
  Lock, 
  Eye, 
  TrendingUp, 
  ChevronRight,
  History,
  Trash2
} from 'lucide-react';
import { generateFamePlan, FameRoadmap } from '../services/geminiService';
import { storage, STORES } from '../services/storageService';

const GetFamous: React.FC = () => {
  const [view, setView] = useState<'input' | 'roadmap' | 'history'>('input');
  const [idea, setIdea] = useState('');
  const [status, setStatus] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [roadmap, setRoadmap] = useState<FameRoadmap | null>(null);
  const [history, setHistory] = useState<FameRoadmap[]>([]);
  const [activePhase, setActivePhase] = useState<number>(0);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const init = async () => {
      const saved = await storage.get<FameRoadmap[]>(STORES.GET_FAMOUS, 'roadmaps');
      if (saved) setHistory(saved);
      setIsReady(true);
    };
    init();
  }, []);

  useEffect(() => {
    if (!isReady) return;
    storage.set(STORES.GET_FAMOUS, 'roadmaps', history).catch(console.error);
  }, [history, isReady]);

  const handleGenerate = async () => {
    if (!idea.trim()) return;
    setIsGenerating(true);
    try {
      const plan = await generateFamePlan(idea, status || 'Just an idea');
      setRoadmap(plan);
      setHistory(prev => [plan, ...prev]);
      setView('roadmap');
    } catch (e) {
      console.error(e);
      alert("Strategy generation failed.");
    } finally {
      setIsGenerating(false);
    }
  };

  const deleteRoadmap = (title: string) => {
    setHistory(prev => prev.filter(r => r.projectTitle !== title));
    if (roadmap?.projectTitle === title) {
      setRoadmap(null);
      setView('input');
    }
  };

  if (!isReady) return (
    <div className="h-full bg-black flex items-center justify-center">
      <Loader2 className="animate-spin text-amber-500" size={32} />
    </div>
  );

  return (
    <div className="h-full bg-[#0a0a0a] text-white flex flex-col font-sans overflow-hidden">
      {/* Header */}
      <div className="h-16 border-b border-white/5 px-6 flex items-center justify-between bg-black/40 backdrop-blur-md shrink-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-900/20">
            <Crown size={20} className="text-white" fill="currentColor" />
          </div>
          <div>
            <h1 className="text-lg font-bold leading-none text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 to-amber-500">Get Famous</h1>
            <p className="text-[10px] text-gray-500 font-medium uppercase tracking-widest mt-1">Major Label Tactics</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {view !== 'input' && (
            <button onClick={() => setView('input')} className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-full text-xs font-bold transition-colors">
              New Plan
            </button>
          )}
          {view !== 'history' && history.length > 0 && (
            <button onClick={() => setView('history')} className="p-2.5 bg-white/5 hover:bg-white/10 rounded-full transition-colors text-amber-500/50 hover:text-amber-500">
              <History size={18} />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 max-w-5xl mx-auto w-full">
        {view === 'input' && (
          <div className="h-full flex flex-col items-center justify-center space-y-12 pb-20">
            <div className="text-center space-y-4">
              <h2 className="text-5xl md:text-7xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-yellow-100 to-amber-800">
                FAME IS<br/>A FORMULA.
              </h2>
              <p className="text-gray-400 max-w-md mx-auto text-lg font-medium">
                Stop guessing. Generate a ruthless, day-by-day psychological roadmap to ubiquity.
              </p>
            </div>

            <div className="w-full max-w-xl space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-black uppercase text-amber-500 tracking-widest ml-4">The Vision</label>
                <textarea 
                  value={idea}
                  onChange={(e) => setIdea(e.target.value)}
                  placeholder="Describe your project, song, brand, or idea..."
                  className="w-full bg-[#1c1c1e] border border-white/10 rounded-3xl px-6 py-5 text-lg font-medium outline-none focus:border-amber-500/50 transition-all resize-none min-h-[120px]"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black uppercase text-gray-600 tracking-widest ml-4">Current Status (Optional)</label>
                <input 
                  type="text"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  placeholder="e.g. Finished demo, Zero followers, Launching next week..."
                  className="w-full bg-[#1c1c1e] border border-white/10 rounded-2xl px-6 py-4 text-sm font-medium outline-none focus:border-amber-500/50 transition-all"
                />
              </div>
              
              <button 
                onClick={handleGenerate}
                disabled={isGenerating || !idea.trim()}
                className="w-full group relative overflow-hidden bg-gradient-to-r from-yellow-500 to-amber-600 py-6 rounded-3xl font-black text-xl uppercase tracking-widest shadow-2xl shadow-amber-900/40 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:scale-100"
              >
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
                <span className="relative flex items-center justify-center gap-3">
                  {isGenerating ? <Loader2 className="animate-spin" /> : <><Sparkles size={24} fill="currentColor" /> Generate Roadmap</>}
                </span>
              </button>
            </div>
          </div>
        )}

        {view === 'roadmap' && roadmap && (
          <div className="animate-fade-in pb-20">
            {/* Strategy Header */}
            <div className="mb-12 text-center space-y-4">
               <h2 className="text-4xl font-black tracking-tight">{roadmap.projectTitle}</h2>
               <div className="flex flex-wrap justify-center gap-4">
                  <div className="bg-[#1c1c1e] border border-white/10 px-6 py-3 rounded-2xl flex items-center gap-3">
                     <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400"><Target size={18} /></div>
                     <div className="text-left">
                        <span className="block text-[10px] font-black uppercase text-gray-500 tracking-widest">The Angle</span>
                        <span className="font-bold text-sm">{roadmap.theAngle}</span>
                     </div>
                  </div>
                  <div className="bg-[#1c1c1e] border border-white/10 px-6 py-3 rounded-2xl flex items-center gap-3">
                     <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400"><Users size={18} /></div>
                     <div className="text-left">
                        <span className="block text-[10px] font-black uppercase text-gray-500 tracking-widest">Archetype</span>
                        <span className="font-bold text-sm">{roadmap.targetArchetype}</span>
                     </div>
                  </div>
               </div>
            </div>

            {/* Phases Tabs */}
            <div className="flex justify-center gap-2 mb-8 sticky top-0 z-20 bg-[#0a0a0a]/80 backdrop-blur-xl py-4">
               {roadmap.phases.map((phase, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActivePhase(idx)}
                    className={`px-6 py-3 rounded-full text-xs font-black uppercase tracking-widest transition-all border ${activePhase === idx ? 'bg-amber-500 text-black border-amber-500 shadow-lg shadow-amber-500/20' : 'bg-[#1c1c1e] border-white/10 text-gray-500 hover:text-white'}`}
                  >
                    Phase {idx + 1}
                  </button>
               ))}
            </div>

            {/* Phase Content */}
            <div className="animate-slide-up space-y-8">
               <div className="bg-gradient-to-br from-amber-900/20 to-orange-900/10 border border-amber-500/20 rounded-3xl p-8 text-center">
                  <h3 className="text-2xl font-black text-amber-500 mb-2">{roadmap.phases[activePhase].phaseName}</h3>
                  <p className="text-lg font-medium text-amber-100">{roadmap.phases[activePhase].goal}</p>
               </div>

               <div className="space-y-4">
                  {roadmap.phases[activePhase].steps.map((step, idx) => (
                     <div key={idx} className="bg-[#1c1c1e] border border-white/5 rounded-2xl p-6 group hover:border-amber-500/30 transition-colors">
                        <div className="flex flex-col md:flex-row gap-6">
                           <div className="shrink-0 flex md:flex-col items-center gap-3 md:w-24 border-b md:border-b-0 md:border-r border-white/5 pb-4 md:pb-0 md:pr-6">
                              <span className="text-xs font-black uppercase text-gray-500 tracking-widest">{step.day}</span>
                              <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-amber-500 font-bold border border-white/10">
                                 {idx + 1}
                              </div>
                           </div>
                           
                           <div className="flex-1 space-y-4">
                              <h4 className="text-xl font-bold leading-tight">{step.action}</h4>
                              
                              <div className="grid md:grid-cols-2 gap-4">
                                 <div className="bg-black/30 rounded-xl p-4 border border-white/5">
                                    <div className="flex items-center gap-2 mb-2">
                                       <Zap size={14} className="text-blue-400" />
                                       <span className="text-[10px] font-black uppercase text-blue-400 tracking-widest">Psychology</span>
                                    </div>
                                    <p className="text-sm text-gray-300">{step.psychologicalTactic}</p>
                                 </div>
                                 
                                 <div className="bg-amber-500/5 rounded-xl p-4 border border-amber-500/10">
                                    <div className="flex items-center gap-2 mb-2">
                                       <Lock size={14} className="text-amber-500" />
                                       <span className="text-[10px] font-black uppercase text-amber-500 tracking-widest">Industry Secret</span>
                                    </div>
                                    <p className="text-sm text-amber-200/80">{step.majorLabelSecret}</p>
                                 </div>
                              </div>
                           </div>
                        </div>
                     </div>
                  ))}
               </div>
            </div>
          </div>
        )}

        {view === 'history' && (
          <div className="animate-fade-in space-y-6">
            <h2 className="text-3xl font-black">Strategy Vault</h2>
            <div className="grid gap-4">
               {history.map((h, idx) => (
                  <div 
                     key={idx}
                     onClick={() => { setRoadmap(h); setView('roadmap'); }}
                     className="bg-[#1c1c1e] border border-white/5 p-6 rounded-2xl flex items-center justify-between cursor-pointer hover:bg-[#252527] group"
                  >
                     <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                           <Crown size={24} />
                        </div>
                        <div>
                           <h3 className="font-bold text-lg">{h.projectTitle}</h3>
                           <p className="text-xs text-gray-500">{h.phases.length} Phases • {h.targetArchetype}</p>
                        </div>
                     </div>
                     <div className="flex items-center gap-4">
                        <ChevronRight size={20} className="text-gray-600" />
                        <button 
                           onClick={(e) => { e.stopPropagation(); deleteRoadmap(h.projectTitle); }}
                           className="p-2 text-gray-700 hover:text-red-500 transition-colors"
                        >
                           <Trash2 size={18} />
                        </button>
                     </div>
                  </div>
               ))}
               {history.length === 0 && (
                  <div className="text-center py-20 text-gray-500 opacity-50">
                     <Lock size={48} className="mx-auto mb-4" />
                     <p>No plans in the vault.</p>
                  </div>
               )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GetFamous;
