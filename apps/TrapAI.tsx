import React, { useState, useEffect, useRef } from 'react';
import { 
  Gem, 
  ThumbsUp, 
  ThumbsDown, 
  Trash2, 
  Loader2, 
  History, 
  Copy, 
  Check,
  Zap,
  Quote,
  Share,
  Ghost,
  CloudLightning,
  HeartCrack,
  Coins
} from 'lucide-react';
import { generateTrapBar } from '../services/geminiService';
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
  
  // System State
  const [credits, setCredits] = useState(0);

  // Load History & System Core
  useEffect(() => {
    const init = async () => {
      await systemCore.init();
      setCredits(systemCore.getCredits());

      const saved = await storage.get<TrapBar[]>(STORES.TRAP_AI, 'history');
      if (saved) {
        setHistory(saved);
        if (saved.length > 0) setCurrentBar(saved[0]);
      }
      setIsReady(true);
    };
    init();

    // Poll for credits
    const interval = setInterval(() => setCredits(systemCore.getCredits()), 5000);
    return () => clearInterval(interval);
  }, []);

  // Save History
  useEffect(() => {
    if (!isReady) return;
    storage.set(STORES.TRAP_AI, 'history', history).catch(console.error);
  }, [history, isReady]);

  // Wrapper to enforce uniqueness
  const getUniqueBar = async (attempts = 0): Promise<string> => {
      if (attempts > 3) throw new Error("AI loop detected");

      const liked = history.filter(h => h.rating === 'up').map(h => h.text);
      const disliked = history.filter(h => h.rating === 'down').map(h => h.text);
      const recent = history.slice(0, 10).map(h => h.text); // Avoid immediate repetition

      const text = await generateTrapBar(liked, [...disliked, ...recent], selectedVibe);
      
      // Simple duplicate check
      if (history.some(h => h.text === text)) {
          console.warn("Duplicate bar detected, retrying...");
          return getUniqueBar(attempts + 1);
      }
      return text;
  };

  const handleGenerate = async () => {
    // --- CREDIT CHECK (Cost: 1) ---
    if (credits < 1) {
        alert("Insufficient credits. Bar Generation costs 1 Credit.");
        return;
    }

    setIsGenerating(true);
    try {
      // Deduct Credit
      await systemCore.useCredit(1);
      setCredits(systemCore.getCredits());

      const text = await getUniqueBar();
      
      const newBar: TrapBar = {
        id: Date.now().toString(),
        text,
        rating: null,
        timestamp: Date.now(),
        vibe: selectedVibe
      };

      setHistory([newBar, ...history]);
      setCurrentBar(newBar);
      
      systemCore.trackInteraction('TRAP_AI', 'generate', { vibe: selectedVibe });

    } catch (e) {
      console.error(e);
      alert("Microphone check failed. Try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRate = (rating: 'up' | 'down') => {
    if (!currentBar) return;
    
    const newRating = currentBar.rating === rating ? null : rating;
    
    const updatedBar = { ...currentBar, rating: newRating };
    setCurrentBar(updatedBar);
    setHistory(prev => prev.map(h => h.id === currentBar.id ? updatedBar : h));

    // SYSTEM LEARNING (Fixed: Mapped 'like' to 'success')
    if (newRating) {
        systemCore.trackInteraction('TRAP_AI', newRating === 'up' ? 'success' : 'dislike', { content: currentBar.text });
    }
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const newHistory = history.filter(h => h.id !== id);
    setHistory(newHistory);
    if (currentBar?.id === id) {
        setCurrentBar(newHistory[0] || null);
    }
  };

  const handleCopy = (e: React.MouseEvent, text: string, id: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
    systemCore.trackInteraction('TRAP_AI', 'copy', { content: text });
  };

  if (!isReady) return (
    <div className="h-full bg-black flex items-center justify-center">
      <Loader2 className="animate-spin text-indigo-500" size={32} />
    </div>
  );

  return (
    <div className="h-full bg-[#050505] text-white flex flex-col font-sans overflow-hidden relative">
      <OnboardingOverlay 
        appId={AppID.TRAP_AI}
        title="TrapAI"
        subtitle="Luxury Bar Generator"
        features={[
          { icon: Gem, title: "Fashion References", description: "Automatically weaves in brands like Rick Owens and Balenciaga." },
          { icon: ThumbsUp, title: "Reinforcement Learning", description: "Rate lines to train the AI on your specific taste." },
          { icon: Zap, title: "Instant Punchlines", description: "Generates quick, caption-ready flexes." }
        ]}
      />

      {/* Header */}
      <div className="h-16 px-6 border-b border-white/5 bg-black/40 backdrop-blur-xl shrink-0 z-10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-900 to-black border border-indigo-500/30 flex items-center justify-center shadow-[0_0_15px_rgba(79,70,229,0.2)]">
            <Gem size={18} className="text-indigo-400" />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight text-white leading-none">TrapAI</h1>
            <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mt-0.5">{credits} CR</p>
          </div>
        </div>
        
        <div className="flex bg-[#1c1c1e] p-1 rounded-lg border border-white/5">
          <button 
            onClick={() => setActiveTab('studio')}
            className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${activeTab === 'studio' ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-500 hover:text-white'}`}
          >
            Studio
          </button>
          <button 
            onClick={() => setActiveTab('vault')}
            className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${activeTab === 'vault' ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-500 hover:text-white'}`}
          >
            Vault
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden relative flex flex-col">
        
        {/* STUDIO TAB */}
        {activeTab === 'studio' && (
          <div className="h-full flex flex-col p-6 animate-fade-in">
            
            {/* Vibe Selector */}
            <div className="flex gap-3 mb-8 overflow-x-auto no-scrollbar pb-2">
              {VIBES.map(v => (
                <button
                  key={v.id}
                  onClick={() => setSelectedVibe(v.id)}
                  className={`flex items-center gap-2 px-4 py-3 rounded-2xl border transition-all shrink-0 ${selectedVibe === v.id ? `${v.bg} ${v.color} shadow-lg` : 'bg-[#1c1c1e] border-white/5 text-gray-500 hover:border-white/10'}`}
                >
                  <v.icon size={16} />
                  <span className="text-xs font-black uppercase tracking-wider">{v.id}</span>
                </button>
              ))}
            </div>

            <div className="flex-1 flex flex-col justify-center">
              {currentBar ? (
                <div className="relative group perspective w-full">
                  <div className="absolute inset-0 bg-indigo-500/20 blur-[60px] rounded-full opacity-20 pointer-events-none" />
                  
                  {/* Card Container */}
                  <div className="bg-[#0a0a0a] border border-white/10 rounded-[2.5rem] p-8 md:p-12 shadow-2xl relative overflow-hidden min-h-[320px] flex flex-col justify-center items-center text-center">
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20" />
                    
                    <Quote size={32} className="absolute top-8 left-8 text-white/10" />
                    <Quote size={32} className="absolute bottom-8 right-8 text-white/10 rotate-180" />

                    <h2 className="text-2xl md:text-4xl font-black leading-tight tracking-tight break-words relative z-10 drop-shadow-md selection:bg-indigo-500/30">
                      "{currentBar.text}"
                    </h2>

                    {/* Action Row */}
                    <div className="mt-12 flex justify-center gap-6 z-20">
                      <button 
                        onClick={() => handleRate('down')}
                        className={`p-4 rounded-2xl transition-all active:scale-95 border ${currentBar.rating === 'down' ? 'bg-red-500/10 border-red-500/50 text-red-500' : 'bg-white/5 border-white/5 text-gray-500 hover:bg-white/10 hover:text-red-400'}`}
                      >
                        <ThumbsDown size={20} strokeWidth={2.5} />
                      </button>
                      <button 
                        onClick={(e) => handleCopy(e, currentBar.text, currentBar.id)}
                        className={`p-4 rounded-2xl transition-all active:scale-95 border ${copiedId === currentBar.id ? 'bg-green-500/10 border-green-500/50 text-green-500' : 'bg-white/5 border-white/5 text-gray-500 hover:bg-white/10 hover:text-white'}`}
                      >
                        {copiedId === currentBar.id ? <Check size={20} strokeWidth={3} /> : <Copy size={20} strokeWidth={2.5} />}
                      </button>
                      <button 
                        onClick={() => handleRate('up')}
                        className={`p-4 rounded-2xl transition-all active:scale-95 border ${currentBar.rating === 'up' ? 'bg-indigo-500/10 border-indigo-500/50 text-indigo-400' : 'bg-white/5 border-white/5 text-gray-500 hover:bg-white/10 hover:text-indigo-400'}`}
                      >
                        <ThumbsUp size={20} strokeWidth={2.5} />
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center opacity-30 space-y-4">
                  <Zap size={48} className="mx-auto" strokeWidth={1} />
                  <p className="font-bold text-sm tracking-widest uppercase">System Ready</p>
                </div>
              )}
            </div>

            <div className="pt-8 pb-4 shrink-0">
              <button 
                onClick={handleGenerate}
                disabled={isGenerating || credits < 1}
                className="w-full py-6 bg-white text-black rounded-[2rem] font-black text-lg uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-[0_0_30px_rgba(255,255,255,0.15)] flex items-center justify-center gap-3 disabled:opacity-50 disabled:scale-100"
              >
                {isGenerating ? <Loader2 size={24} className="animate-spin" /> : <><Gem size={20} fill="black" /> Spit Bar</>}
              </button>
            </div>
          </div>
        )}

        {/* VAULT TAB */}
        {activeTab === 'vault' && (
          <div className="h-full overflow-y-auto custom-scrollbar p-6 space-y-4 animate-fade-in pb-20">
            {history.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-gray-600">
                <History size={48} className="mb-4 opacity-20" />
                <p className="text-xs font-bold uppercase tracking-widest">Vault Empty</p>
              </div>
            ) : (
              history.map(bar => (
                <div 
                  key={bar.id} 
                  className="group bg-[#111] border border-white/5 rounded-3xl p-6 hover:bg-[#161616] transition-all relative overflow-hidden"
                >
                  <div className="flex justify-between items-start mb-4">
                    <span className="text-[9px] font-black uppercase tracking-widest bg-white/5 px-2 py-1 rounded text-gray-500">
                      {bar.vibe || 'Flex'}
                    </span>
                    <span className="text-[10px] text-gray-600 font-mono">
                      {new Date(bar.timestamp).toLocaleDateString()}
                    </span>
                  </div>

                  <p className="text-lg font-bold leading-tight text-gray-200 pr-4">"{bar.text}"</p>
                  
                  <div className="flex items-center justify-end mt-6 gap-3 opacity-60 group-hover:opacity-100 transition-opacity">
                    {bar.rating && (
                        <div className={`p-2 rounded-full ${bar.rating === 'up' ? 'text-indigo-400 bg-indigo-500/10' : 'text-red-400 bg-red-500/10'}`}>
                          {bar.rating === 'up' ? <ThumbsUp size={14} /> : <ThumbsDown size={14} />}
                        </div>
                    )}
                    <button onClick={(e) => handleCopy(e, bar.text, bar.id)} className="p-2 text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-colors">
                        {copiedId === bar.id ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                    </button>
                    <button onClick={(e) => handleDelete(e, bar.id)} className="p-2 text-gray-400 hover:text-red-500 bg-white/5 hover:bg-red-500/10 rounded-full transition-colors">
                        <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

      </div>
    </div>
  );
};

export default TrapAI;