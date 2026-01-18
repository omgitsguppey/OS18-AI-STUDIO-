
import React, { useState, useEffect } from 'react';
import { 
  Heart, 
  Flame, 
  Lock, 
  Eye, 
  ArrowRight, 
  Loader2, 
  MessageCircle, 
  ShieldCheck, 
  Zap,
  PenTool,
  Check
} from 'lucide-react';
import { generateNSFWConsultation, generateNSFWStrategy, NSFWStrategy, NSFWConsultation } from '../services/geminiService';
import { storage, STORES } from '../services/storageService';
import { AppID } from '../types';

interface SavedStrategy extends NSFWStrategy {
  id: string;
  niche: string;
  createdAt: number;
}

const NSFWAI: React.FC = () => {
  const [view, setView] = useState<'input' | 'consult' | 'strategy' | 'history'>('input');
  const [niche, setNiche] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [consultation, setConsultation] = useState<NSFWConsultation | null>(null);
  const [answers, setAnswers] = useState<string[]>([]);
  const [strategy, setStrategy] = useState<SavedStrategy | null>(null);
  const [history, setHistory] = useState<SavedStrategy[]>([]);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    const load = async () => {
      const saved = await storage.get<SavedStrategy[]>(STORES.NSFW_AI, 'strategies');
      if (saved) setHistory(saved);
    };
    load();
  }, []);

  useEffect(() => {
    storage.set(STORES.NSFW_AI, 'strategies', history).catch(console.error);
  }, [history]);

  const handleStartConsultation = async () => {
    if (!niche.trim()) return;
    setIsProcessing(true);
    try {
      const result = await generateNSFWConsultation(niche);
      setConsultation(result);
      setAnswers(new Array(result.questions.length).fill(''));
      setView('consult');
    } catch (e) {
      console.error(e);
      alert("Consultation failed. Try a different niche.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGenerateStrategy = async () => {
    if (!consultation) return;
    setIsProcessing(true);
    try {
      const result = await generateNSFWStrategy(niche, answers);
      const newStrategy: SavedStrategy = {
        id: Date.now().toString(),
        niche,
        createdAt: Date.now(),
        ...result
      };
      setStrategy(newStrategy);
      setHistory([newStrategy, ...history]);
      setView('strategy');
    } catch (e) {
      console.error(e);
      alert("Strategy generation failed.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExportToBrandKit = async () => {
    if (!strategy) return;
    setIsExporting(true);
    
    try {
      // Create a BrandKit object from the persona
      const brandKit = {
        id: Date.now().toString(),
        brandName: strategy.persona.archetype,
        slogan: strategy.persona.sirenCall,
        valueProposition: strategy.persona.hook,
        missionStatement: strategy.persona.bio,
        targetAudience: "Adult Content Consumers",
        colors: [
          { name: "Passion", hex: "#e11d48", usage: "Primary Accent" },
          { name: "Mystery", hex: "#1e1b4b", usage: "Background" },
          { name: "Skin", hex: "#fecdd3", usage: "Highlights" }
        ],
        typography: {
          headingFont: "Playfair Display",
          bodyFont: "Lato"
        },
        metrics: [
          { label: "Sub Conversion", target: "5%" },
          { label: "Retention", target: "85%" },
          { label: "Tips/PPV", target: "$50 avg" }
        ],
        pressKit: {
          shortBio: strategy.persona.bio,
          boilerplate: `Premium content creator specializing in ${strategy.niche}.`
        },
        createdAt: Date.now()
      };

      // Load existing kits, add new one, save
      const existingKits = await storage.get<any[]>(STORES.BRAND_KIT, 'kits') || [];
      await storage.set(STORES.BRAND_KIT, 'kits', [brandKit, ...existingKits]);
      
      setTimeout(() => {
        setIsExporting(false);
        alert("Persona exported to BrandKitAI!");
      }, 1000);
    } catch (e) {
      console.error(e);
      setIsExporting(false);
    }
  };

  const updateAnswer = (idx: number, text: string) => {
    const newAnswers = [...answers];
    newAnswers[idx] = text;
    setAnswers(newAnswers);
  };

  return (
    <div className="h-full bg-gradient-to-b from-[#1a0505] to-black text-white flex flex-col font-sans overflow-hidden">
      {/* Header */}
      <div className="h-16 px-6 flex items-center justify-between border-b border-white/5 bg-black/40 backdrop-blur-md shrink-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-600 to-pink-600 flex items-center justify-center shadow-lg shadow-red-900/40">
            <Heart size={20} className="text-white" fill="currentColor" />
          </div>
          <div>
            <h1 className="text-lg font-bold leading-none text-transparent bg-clip-text bg-gradient-to-r from-red-200 to-pink-400">NSFWAI</h1>
            <p className="text-[10px] text-red-200/50 font-medium uppercase tracking-widest mt-1">Revenue Strategy</p>
          </div>
        </div>
        <div className="flex gap-2">
          {history.length > 0 && view !== 'history' && (
            <button onClick={() => setView('history')} className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-full text-xs font-bold transition-colors">
              History
            </button>
          )}
          {view !== 'input' && (
            <button onClick={() => setView('input')} className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-full text-xs font-bold transition-colors">
              New
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 max-w-4xl mx-auto w-full">
        {view === 'input' && (
          <div className="h-full flex flex-col items-center justify-center space-y-8 animate-fade-in pb-20">
            <div className="text-center space-y-4">
              <h2 className="text-4xl md:text-6xl font-black tracking-tighter">
                Sell the <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-pink-500">Fantasy</span>.
              </h2>
              <p className="text-red-200/60 max-w-md mx-auto text-lg">
                Maximize revenue with a psychology-first approach. Safe for social media, deadly for wallets.
              </p>
            </div>

            <div className="w-full max-w-lg relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-red-600 to-pink-600 rounded-[2rem] opacity-20 blur-xl group-hover:opacity-30 transition-opacity" />
              <div className="relative bg-[#1a0505] border border-red-500/20 rounded-[2rem] p-2 flex items-center shadow-2xl">
                <div className="pl-6 text-red-500">
                  <Flame size={24} fill="currentColor" />
                </div>
                <input 
                  type="text" 
                  value={niche} 
                  onChange={(e) => setNiche(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleStartConsultation()}
                  placeholder="Enter your niche (e.g. Goth GF, Bratty Gamer)..."
                  className="w-full bg-transparent px-4 py-6 text-lg font-medium outline-none placeholder-red-900/50 text-white"
                />
                <button 
                  onClick={handleStartConsultation} 
                  disabled={isProcessing || !niche.trim()}
                  className="bg-gradient-to-r from-red-600 to-pink-600 text-white h-16 w-16 rounded-[1.5rem] flex items-center justify-center hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100"
                >
                  {isProcessing ? <Loader2 size={24} className="animate-spin" /> : <ArrowRight size={28} strokeWidth={3} />}
                </button>
              </div>
            </div>
          </div>
        )}

        {view === 'consult' && consultation && (
          <div className="animate-slide-up space-y-8 pb-20">
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-bold text-white">Deepen the Persona</h2>
              <p className="text-red-200/50">To sell the emotion, we need to understand the psychological hook.</p>
            </div>

            <div className="space-y-6">
              {consultation.questions.map((q, i) => (
                <div key={i} className="bg-white/5 border border-white/10 p-6 rounded-3xl space-y-4">
                  <h3 className="text-lg font-medium text-red-100 flex gap-3">
                    <span className="text-red-500 font-bold">{i + 1}.</span> {q}
                  </h3>
                  <textarea 
                    value={answers[i]}
                    onChange={(e) => updateAnswer(i, e.target.value)}
                    placeholder="Your answer..."
                    className="w-full bg-black/40 border border-white/5 rounded-xl p-4 text-sm focus:border-red-500/50 outline-none transition-all min-h-[80px]"
                  />
                </div>
              ))}
            </div>

            <button 
              onClick={handleGenerateStrategy}
              disabled={isProcessing || answers.some(a => !a.trim())}
              className="w-full py-5 bg-gradient-to-r from-red-600 to-pink-600 rounded-[2rem] font-black text-lg uppercase tracking-widest shadow-xl shadow-red-900/20 hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:grayscale"
            >
              {isProcessing ? <Loader2 size={24} className="animate-spin" /> : <><Zap size={24} fill="currentColor" /> Generate Revenue Plan</>}
            </button>
          </div>
        )}

        {view === 'strategy' && strategy && (
          <div className="animate-slide-up space-y-8 pb-20">
            {/* Persona Hero */}
            <div className="relative overflow-hidden rounded-[3rem] bg-gradient-to-br from-red-900/40 to-pink-900/20 border border-red-500/30 p-8 text-center">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 via-pink-500 to-red-500" />
              <h2 className="text-4xl font-black text-white mb-2">{strategy.persona.archetype}</h2>
              <p className="text-xl text-pink-200 font-medium italic mb-6">"{strategy.persona.sirenCall}"</p>
              <div className="bg-black/40 p-6 rounded-2xl border border-white/5 mx-auto max-w-2xl">
                <p className="text-gray-300 leading-relaxed">{strategy.persona.bio}</p>
              </div>
              
              <button 
                onClick={handleExportToBrandKit}
                disabled={isExporting}
                className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 bg-white/10 hover:bg-white/20 border border-white/10 rounded-full text-sm font-bold transition-all"
              >
                {isExporting ? <Loader2 size={16} className="animate-spin" /> : <PenTool size={16} />}
                Export to BrandKit
              </button>
            </div>

            {/* TOS Guide */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-[#1c1c1e] border border-white/5 rounded-3xl p-6">
                <h3 className="text-green-400 font-bold mb-4 flex items-center gap-2"><Check size={18} /> Safe for Socials</h3>
                <ul className="space-y-2">
                  {strategy.tosGuide.safeForSocials.map((item, i) => (
                    <li key={i} className="text-sm text-gray-400 flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-[#1c1c1e] border border-white/5 rounded-3xl p-6">
                <h3 className="text-red-400 font-bold mb-4 flex items-center gap-2"><Lock size={18} /> Premium Only</h3>
                <ul className="space-y-2">
                  {strategy.tosGuide.premiumOnly.map((item, i) => (
                    <li key={i} className="text-sm text-gray-400 flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* 7-Day Plan */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 px-2">
                <ShieldCheck size={20} className="text-pink-500" />
                <h3 className="text-lg font-bold">7-Day Revenue Cycle</h3>
              </div>
              {strategy.revenuePlan.map((day, i) => (
                <div key={i} className="bg-[#1c1c1e] border border-white/5 rounded-2xl p-6 hover:bg-[#252527] transition-all group">
                  <div className="flex flex-col md:flex-row gap-4 md:items-center">
                    <div className="w-24 shrink-0">
                      <span className="text-xs font-black uppercase text-gray-500 tracking-widest">{day.day}</span>
                      <div className="font-bold text-pink-400">{day.theme}</div>
                    </div>
                    <div className="flex-1 space-y-2">
                      <p className="font-medium text-white">{day.action}</p>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <MessageCircle size={12} />
                        <span>Psychology: {day.psychology}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {view === 'history' && (
          <div className="animate-fade-in space-y-6">
            <h2 className="text-3xl font-bold mb-6">Persona Vault</h2>
            <div className="grid gap-4">
              {history.map((s) => (
                <div 
                  key={s.id} 
                  onClick={() => { setStrategy(s); setView('strategy'); }}
                  className="bg-[#1c1c1e] border border-white/5 p-6 rounded-2xl cursor-pointer hover:bg-[#252527] transition-all flex justify-between items-center"
                >
                  <div>
                    <h3 className="font-bold text-lg text-white">{s.persona.archetype}</h3>
                    <p className="text-xs text-gray-500">{new Date(s.createdAt).toLocaleDateString()} • {s.niche}</p>
                  </div>
                  <ArrowRight size={20} className="text-gray-600" />
                </div>
              ))}
              {history.length === 0 && <p className="text-gray-500 text-center py-20">No strategies saved.</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NSFWAI;
