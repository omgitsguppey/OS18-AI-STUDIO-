import React, { useState, useEffect, useMemo } from 'react';
import { 
  Gem, ThumbsUp, ThumbsDown, Trash2, Loader2, History, 
  Copy, Check, Zap, Quote, Ghost, CloudLightning, HeartCrack, Coins 
} from 'lucide-react';
import { generateTrapBar } from '../services/ai/trap';
import { storage, STORES } from '../services/storageService';
import OnboardingOverlay from '../components/OnboardingOverlay';
import { AppID } from '../types';
import { systemCore } from '../services/systemCore';

interface TrapBar {
  id: string;
  text: string;
  rating: 'up' | 'down' | null;
  timestamp: number;
  vibe: string;
}

const VIBES = [
  { id: 'Flex', icon: Coins, color: 'text-yellow-400', bg: 'bg-yellow-400/10 border-yellow-400/20' },
  { id: 'Dark', icon: Ghost, color: 'text-purple-400', bg: 'bg-purple-400/10 border-purple-400/20' },
  { id: 'Pain', icon: HeartCrack, color: 'text-red-400', bg: 'bg-red-400/10 border-red-400/20' },
  { id: 'Hype', icon: CloudLightning, color: 'text-cyan-400', bg: 'bg-cyan-400/10 border-cyan-400/20' }
];

const TrapAI: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'studio' | 'vault'>('studio');
  const [history, setHistory] = useState<TrapBar[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [currentBar, setCurrentBar] = useState<TrapBar | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedVibe, setSelectedVibe] = useState('Flex');
  const [credits, setCredits] = useState(0);

  // --- HARDENED INITIALIZATION ---
  useEffect(() => {
    const init = async () => {
      try {
        await systemCore.init();
        setCredits(systemCore.getCredits());

        const saved = await storage.get<TrapBar[]>(STORES.TRAP_AI, 'history');
        // Type Guard: Ensure it's an array to prevent .map() crash
        const validatedHistory = Array.isArray(saved) ? saved : [];
        
        setHistory(validatedHistory);
        if (validatedHistory.length > 0) setCurrentBar(validatedHistory[0]);
      } catch (e) {
        console.error("Vault Recovery Failed:", e);
        setHistory([]);
      } finally {
        setIsReady(true);
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (isReady) storage.set(STORES.TRAP_AI, 'history', history);
  }, [history, isReady]);

  const handleGenerate = async () => {
    if (credits < 1) return alert("Insufficient credits.");
    
    setIsGenerating(true);
    try {
      await systemCore.useCredit(1);
      setCredits(systemCore.getCredits());

      const liked = history.filter(h => h.rating === 'up').map(h => h.text);
      const disliked = history.filter(h => h.rating === 'down').map(h => h.text);

      const text = await generateTrapBar(liked, disliked, selectedVibe);
      
      const newBar: TrapBar = {
        id: `bar_${Date.now()}`,
        text,
        rating: null,
        timestamp: Date.now(),
        vibe: selectedVibe
      };

      setHistory(prev => [newBar, ...prev]);
      setCurrentBar(newBar);
      systemCore.trackInteraction('TRAP_AI', 'generate', { vibe: selectedVibe });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRate = (rating: 'up' | 'down') => {
    if (!currentBar) return;
    const newRating = currentBar.rating === rating ? null : rating;
    const updated = { ...currentBar, rating: newRating };
    setCurrentBar(updated);
    setHistory(prev => prev.map(h => h.id === currentBar.id ? updated : h));
    
    if (newRating) {
      systemCore.trackInteraction('TRAP_AI', newRating === 'up' ? 'success' : 'dislike', { content: currentBar.text });
    }
  };

  if (!isReady) return <div className="h-full bg-black flex items-center justify-center"><Loader2 className="animate-spin text-indigo-500" /></div>;

  return (
    <div className="h-full bg-[#050505] text-white flex flex-col relative select-none">
      <OnboardingOverlay 
        appId={AppID.TRAP_AI}
        title="TrapAI"
        subtitle="Ghostwriter Protocol"
        features={[
          { icon: Gem, title: "Luxury Engine", description: "Automated wealth-flexing and brand affinity." },
          { icon: ThumbsUp, title: "Neural Feedback", description: "Learns from your ratings to refine its 'stank-face' impact." }
        ]}
      />

      {/* HEADER */}
      <header className="h-16 px-6 border-b border-white/5 bg-black/40 backdrop-blur-xl flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center"><Gem size={16} /></div>
          <div>
            <h1 className="text-sm font-black uppercase tracking-tighter">TrapAI</h1>
            <p className="text-[10px] text-indigo-400 font-bold">{credits} CREDITS</p>
          </div>
        </div>
        <div className="flex bg-white/5 p-1 rounded-xl">
          {['studio', 'vault'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`px-4 py-1.5 text-[10px] font-black uppercase rounded-lg transition-all ${activeTab === tab ? 'bg-indigo-600' : 'text-white/40'}`}
            >
              {tab}
            </button>
          ))}
        </div>
      </header>

      {/* CONTENT */}
      <main className="flex-1 overflow-hidden">
        {activeTab === 'studio' ? (
          <div className="h-full flex flex-col p-6 animate-in fade-in duration-500">
            {/* Vibe Grid */}
            <div className="grid grid-cols-4 gap-2 mb-8">
              {VIBES.map(v => (
                <button
                  key={v.id}
                  onClick={() => setSelectedVibe(v.id)}
                  className={`flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all ${selectedVibe === v.id ? `${v.bg} ${v.color} border-current` : 'bg-white/5 border-transparent opacity-40'}`}
                >
                  <v.icon size={18} />
                  <span className="text-[8px] font-black uppercase">{v.id}</span>
                </button>
              ))}
            </div>

            {/* Display Area */}
            <div className="flex-1 flex flex-col justify-center items-center">
              {currentBar ? (
                <div className="w-full relative group">
                  <div className="absolute -inset-4 bg-indigo-500/10 blur-3xl rounded-full opacity-50 group-hover:opacity-100 transition-opacity" />
                  <div className="bg-[#0a0a0a] border border-white/10 rounded-[2rem] p-8 relative overflow-hidden text-center min-h-[240px] flex flex-col justify-center">
                    <Quote className="absolute top-4 left-4 text-white/5" size={40} />
                    <h2 className="text-xl md:text-3xl font-black italic tracking-tight leading-snug">"{currentBar.text}"</h2>
                    <div className="mt-8 flex justify-center gap-4">
                      <button onClick={() => handleRate('down')} className={`p-3 rounded-full border ${currentBar.rating === 'down' ? 'bg-red-500/20 border-red-500 text-red-500' : 'bg-white/5 border-transparent text-white/20'}`}><ThumbsDown size={18} /></button>
                      <button onClick={() => {navigator.clipboard.writeText(currentBar.text); setCopiedId(currentBar.id); setTimeout(() => setCopiedId(null), 1000)}} className="p-3 rounded-full bg-white/5 text-white/20 hover:text-white transition-colors">
                        {copiedId === currentBar.id ? <Check size={18} className="text-green-500" /> : <Copy size={18} />}
                      </button>
                      <button onClick={() => handleRate('up')} className={`p-3 rounded-full border ${currentBar.rating === 'up' ? 'bg-indigo-500/20 border-indigo-500 text-indigo-500' : 'bg-white/5 border-transparent text-white/20'}`}><ThumbsUp size={18} /></button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="opacity-10 flex flex-col items-center"><Zap size={64} /><p className="font-black uppercase tracking-widest mt-4">Static in the booth</p></div>
              )}
            </div>

            <button
              onClick={handleGenerate}
              disabled={isGenerating || credits < 1}
              className="w-full py-6 mt-8 bg-white text-black rounded-full font-black uppercase text-sm tracking-widest hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-20"
            >
              {isGenerating ? <Loader2 className="animate-spin" /> : <><Ghost size={18} /> Spit Protocol</>}
            </button>
          </div>
        ) : (
          <div className="h-full overflow-y-auto p-6 space-y-3 pb-24">
            {history.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center opacity-20"><History size={48} /><p className="uppercase font-black mt-4">Vault Encrypted</p></div>
            ) : (
              history.map(bar => (
                <div key={bar.id} className="bg-white/5 border border-white/5 rounded-2xl p-4 group">
                  <div className="flex justify-between text-[8px] font-black uppercase text-white/20 mb-2"><span>{bar.vibe}</span><span>{new Date(bar.timestamp).toLocaleDateString()}</span></div>
                  <p className="text-sm font-bold italic">"{bar.text}"</p>
                  <div className="mt-3 flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => setHistory(h => h.filter(i => i.id !== bar.id))} className="text-white/20 hover:text-red-500"><Trash2 size={14} /></button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default TrapAI;