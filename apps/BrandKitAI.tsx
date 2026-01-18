
import React, { useState, useEffect } from 'react';
import { 
  PenTool, 
  Palette, 
  Type, 
  FileText, 
  TrendingUp, 
  Plus, 
  ChevronDown, 
  Loader2,
  Trash2,
  Copy,
  Check,
  Music,
  ArrowRight,
  MessageSquare
} from 'lucide-react';
import { generateBrandKit, generateBrandQuestions, BrandKit } from '../services/geminiService';
import { storage, STORES } from '../services/storageService';

interface Artist { id: string; name: string; }

const BrandKitAI: React.FC = () => {
  const [kits, setKits] = useState<BrandKit[]>([]);
  const [selectedKitId, setSelectedKitId] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [inputName, setInputName] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'visuals' | 'press'>('overview');
  const [copiedColor, setCopiedColor] = useState<string | null>(null);

  // New Features State
  const [artists, setArtists] = useState<Artist[]>([]);
  const [viewState, setViewState] = useState<'idle' | 'consulting' | 'viewing'>('idle');
  const [questions, setQuestions] = useState<string[]>([]);
  const [answers, setAnswers] = useState<string[]>([]);
  const [draftName, setDraftName] = useState('');

  useEffect(() => {
    const init = async () => {
      const [savedKits, savedArtists] = await Promise.all([
        storage.get<BrandKit[]>(STORES.BRAND_KIT, 'kits'),
        storage.get<Artist[]>(STORES.LYRICS, 'artists_list')
      ]);

      if (savedKits && savedKits.length > 0) {
        setKits(savedKits);
        setSelectedKitId(savedKits[0].id);
        setViewState('viewing');
      }
      if (savedArtists) setArtists(savedArtists);
      
      setIsReady(true);
    };
    init();
  }, []);

  useEffect(() => {
    if (!isReady) return;
    storage.set(STORES.BRAND_KIT, 'kits', kits).catch(console.error);
  }, [kits, isReady]);

  const activeKit = kits.find(k => k.id === selectedKitId);

  // Step 1: Start Process - Generate Questions
  const handleStartConsultation = async (name: string) => {
    if (!name.trim()) return;
    setIsGenerating(true);
    setDraftName(name);
    try {
      const qs = await generateBrandQuestions(name);
      setQuestions(qs);
      setAnswers(new Array(qs.length).fill(''));
      setViewState('consulting');
      setIsMenuOpen(false);
    } catch (e) {
      console.error(e);
      alert("Failed to initialize consultation.");
    } finally {
      setIsGenerating(false);
    }
  };

  // Step 2: Finish Process - Generate Kit
  const handleFinalizeKit = async () => {
    setIsGenerating(true);
    try {
      const qaPairs = questions.map((q, i) => ({ q, a: answers[i] }));
      const result = await generateBrandKit(draftName, qaPairs);
      
      const newKit: BrandKit = {
        id: Date.now().toString(),
        createdAt: Date.now(),
        ...result
      };
      
      setKits([newKit, ...kits]);
      setSelectedKitId(newKit.id);
      setViewState('viewing');
      setQuestions([]);
      setAnswers([]);
      setDraftName('');
      setInputName('');
    } catch (e) {
      console.error(e);
      alert("Failed to generate brand kit.");
    } finally {
      setIsGenerating(false);
    }
  };

  const deleteKit = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm("Delete this brand kit?")) {
      const remaining = kits.filter(k => k.id !== id);
      setKits(remaining);
      if (remaining.length > 0) {
        if (selectedKitId === id) setSelectedKitId(remaining[0].id);
      } else {
        setSelectedKitId(null);
        setViewState('idle');
      }
    }
  };

  const copyColor = (hex: string) => {
    navigator.clipboard.writeText(hex);
    setCopiedColor(hex);
    setTimeout(() => setCopiedColor(null), 1500);
  };

  const updateAnswer = (idx: number, val: string) => {
    const newAnswers = [...answers];
    newAnswers[idx] = val;
    setAnswers(newAnswers);
  };

  if (!isReady) return (
    <div className="h-full bg-black flex items-center justify-center">
      <Loader2 className="animate-spin text-violet-500" size={32} />
    </div>
  );

  return (
    <div className="h-full bg-[#0a0a0a] text-white flex flex-col font-sans overflow-hidden">
      {/* Header */}
      <div className="h-16 px-6 border-b border-white/5 bg-black/40 backdrop-blur-md flex items-center justify-between shrink-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-900/20">
            <PenTool size={20} className="text-white" />
          </div>
          
          <div className="relative">
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="flex items-center gap-2 bg-white/5 hover:bg-white/10 px-4 py-2 rounded-2xl transition-all border border-white/5 group"
            >
              <span className="text-sm font-bold tracking-tight">
                {viewState === 'consulting' ? 'New Brand Setup' : activeKit?.brandName || 'Select Brand'}
              </span>
              <ChevronDown size={14} className={`text-gray-500 transition-transform ${isMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {isMenuOpen && (
              <div className="absolute top-full left-0 mt-2 w-80 bg-[#1c1c1e] border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-pop-in z-50">
                <div className="p-4 border-b border-white/5 bg-black/20 space-y-3">
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={inputName}
                      onChange={(e) => setInputName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleStartConsultation(inputName)}
                      placeholder="New brand name..."
                      className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs outline-none focus:border-violet-500 transition-all"
                      autoFocus
                    />
                    <button 
                      onClick={() => handleStartConsultation(inputName)}
                      disabled={!inputName.trim() || isGenerating}
                      className="bg-violet-600 hover:bg-violet-500 text-white rounded-xl w-8 flex items-center justify-center transition-colors disabled:opacity-50"
                    >
                      {isGenerating ? <Loader2 size={14} className="animate-spin" /> : <Plus size={16} />}
                    </button>
                  </div>
                  
                  {artists.length > 0 && (
                    <div>
                      <p className="text-[10px] text-gray-500 uppercase font-bold mb-2">Import from LyricsAI</p>
                      <div className="flex flex-wrap gap-2">
                        {artists.map(artist => (
                          <button
                            key={artist.id}
                            onClick={() => handleStartConsultation(artist.name)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-500/10 hover:bg-violet-500/20 text-violet-300 rounded-lg text-[10px] font-bold transition-colors border border-violet-500/10"
                          >
                            <Music size={10} /> {artist.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="max-h-64 overflow-y-auto py-1">
                  {kits.length === 0 && <p className="text-center py-4 text-xs text-gray-500">No kits yet.</p>}
                  {kits.map(kit => (
                    <div 
                      key={kit.id}
                      onClick={() => { setSelectedKitId(kit.id); setViewState('viewing'); setIsMenuOpen(false); }}
                      className={`flex items-center justify-between px-4 py-3 hover:bg-white/5 cursor-pointer ${selectedKitId === kit.id ? 'bg-white/5 text-violet-400' : 'text-gray-300'}`}
                    >
                      <span className="text-sm font-bold truncate flex-1">{kit.brandName}</span>
                      <button onClick={(e) => deleteKit(e, kit.id)} className="p-1 hover:text-red-500 text-gray-600 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {viewState === 'viewing' && activeKit && (
          <div className="flex gap-1 bg-white/5 p-1 rounded-xl">
            {[
              { id: 'overview', icon: TrendingUp, label: 'Overview' },
              { id: 'visuals', icon: Palette, label: 'Visuals' },
              { id: 'press', icon: FileText, label: 'Press' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === tab.id ? 'bg-violet-600 text-white shadow-md' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
              >
                <tab.icon size={14} /> <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
        
        {/* VIEW: IDLE / HERO */}
        {viewState === 'idle' && (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-6 opacity-60">
            <div className="w-20 h-20 rounded-full bg-violet-500/10 flex items-center justify-center text-violet-500">
              <PenTool size={40} />
            </div>
            <div>
              <h2 className="text-2xl font-bold">BrandKitAI</h2>
              <p className="text-sm text-gray-400 mt-2">Generate a complete brand identity in seconds.</p>
            </div>
            <button 
              onClick={() => setIsMenuOpen(true)}
              className="bg-violet-600 text-white px-6 py-3 rounded-full font-bold text-sm hover:bg-violet-500 transition-all shadow-lg animate-pulse"
            >
              Start New Brand
            </button>
          </div>
        )}

        {/* VIEW: CONSULTATION */}
        {viewState === 'consulting' && (
          <div className="max-w-2xl mx-auto space-y-8 animate-slide-up pb-20">
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-black">Refine {draftName}</h2>
              <p className="text-gray-400 text-sm">Help the AI understand your vision for a more accurate brand kit.</p>
            </div>

            <div className="space-y-6">
              {questions.map((q, i) => (
                <div key={i} className="bg-[#1c1c1e] border border-white/5 p-6 rounded-2xl space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-violet-500/20 text-violet-400 flex items-center justify-center text-xs font-bold shrink-0">
                      {i + 1}
                    </div>
                    <p className="font-medium text-gray-200 text-sm pt-0.5">{q}</p>
                  </div>
                  <input 
                    type="text" 
                    value={answers[i]}
                    onChange={(e) => updateAnswer(i, e.target.value)}
                    placeholder="Type your answer..."
                    className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-violet-500/50 transition-all"
                  />
                </div>
              ))}
            </div>

            <button 
              onClick={handleFinalizeKit}
              disabled={isGenerating || answers.some(a => !a.trim())}
              className="w-full py-5 bg-gradient-to-r from-violet-600 to-purple-600 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-purple-900/20 hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:scale-100"
            >
              {isGenerating ? <Loader2 size={18} className="animate-spin" /> : <><MessageSquare size={18} /> Generate Final Kit</>}
            </button>
          </div>
        )}

        {/* VIEW: VIEWING (DASHBOARD) */}
        {viewState === 'viewing' && activeKit && (
          <div className="max-w-4xl mx-auto space-y-8 animate-fade-in pb-20">
            {/* Hero Section */}
            <div className="text-center py-8 space-y-4">
              <h1 className="text-5xl font-black tracking-tight">{activeKit.brandName}</h1>
              <p className="text-xl text-violet-200 font-medium italic">"{activeKit.slogan}"</p>
            </div>

            {activeTab === 'overview' && (
              <div className="grid gap-6 animate-slide-up">
                <div className="bg-[#1c1c1e] border border-white/5 p-8 rounded-3xl">
                  <h3 className="text-xs font-black text-violet-400 uppercase tracking-widest mb-3">Value Proposition</h3>
                  <p className="text-lg leading-relaxed font-medium">{activeKit.valueProposition}</p>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-[#1c1c1e] border border-white/5 p-6 rounded-3xl">
                    <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-3">Mission</h3>
                    <p className="text-sm text-gray-300 leading-relaxed">{activeKit.missionStatement}</p>
                  </div>
                  <div className="bg-[#1c1c1e] border border-white/5 p-6 rounded-3xl">
                    <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-3">Target Audience</h3>
                    <p className="text-sm text-gray-300 leading-relaxed">{activeKit.targetAudience}</p>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-violet-900/20 to-purple-900/20 border border-violet-500/20 p-6 rounded-3xl">
                  <h3 className="text-xs font-black text-violet-300 uppercase tracking-widest mb-4">Key Growth Metrics</h3>
                  <div className="grid sm:grid-cols-3 gap-4">
                    {activeKit.metrics.map((m, i) => (
                      <div key={i} className="bg-black/20 p-4 rounded-2xl border border-white/5 text-center">
                        <div className="text-lg font-black text-white mb-1">{m.target}</div>
                        <div className="text-[10px] uppercase text-violet-200/70 font-bold">{m.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'visuals' && (
              <div className="space-y-8 animate-slide-up">
                <div>
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Palette size={18} /> Color Palette</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                    {activeKit.colors.map((c, i) => (
                      <div key={i} className="group cursor-pointer" onClick={() => copyColor(c.hex)}>
                        <div 
                          className="h-32 rounded-2xl shadow-lg mb-3 border border-white/10 relative flex items-center justify-center transition-transform group-hover:scale-105"
                          style={{ backgroundColor: c.hex }}
                        >
                          {copiedColor === c.hex && (
                            <div className="bg-black/50 backdrop-blur rounded-full p-2 text-white animate-pop-in">
                              <Check size={20} />
                            </div>
                          )}
                        </div>
                        <div className="space-y-1">
                          <p className="font-bold text-sm">{c.name}</p>
                          <p className="text-xs text-gray-500 font-mono uppercase">{c.hex}</p>
                          <p className="text-[10px] text-gray-600">{c.usage}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-[#1c1c1e] border border-white/5 p-6 rounded-3xl">
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Type size={18} /> Typography</h3>
                    <div className="space-y-6">
                      <div>
                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-2">Heading Font</span>
                        <div className="text-3xl font-bold text-white">{activeKit.typography.headingFont}</div>
                        <p className="text-xs text-gray-500 mt-1">The quick brown fox jumps over the lazy dog.</p>
                      </div>
                      <div className="h-px bg-white/5" />
                      <div>
                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-2">Body Font</span>
                        <div className="text-xl font-medium text-gray-300">{activeKit.typography.bodyFont}</div>
                        <p className="text-xs text-gray-500 mt-1">Used for all standard paragraphs and UI elements.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'press' && (
              <div className="grid gap-6 animate-slide-up">
                <div className="bg-[#1c1c1e] border border-white/5 p-8 rounded-3xl">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest">Short Bio</h3>
                    <button onClick={() => navigator.clipboard.writeText(activeKit.pressKit.shortBio)} className="text-violet-500 hover:text-white transition-colors">
                      <Copy size={14} />
                    </button>
                  </div>
                  <p className="text-base text-gray-300 leading-relaxed whitespace-pre-wrap">{activeKit.pressKit.shortBio}</p>
                </div>

                <div className="bg-[#1c1c1e] border border-white/5 p-8 rounded-3xl">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest">Boilerplate</h3>
                    <button onClick={() => navigator.clipboard.writeText(activeKit.pressKit.boilerplate)} className="text-violet-500 hover:text-white transition-colors">
                      <Copy size={14} />
                    </button>
                  </div>
                  <div className="bg-black/30 p-4 rounded-xl border border-white/5 font-mono text-xs text-gray-400 leading-relaxed">
                    {activeKit.pressKit.boilerplate}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default BrandKitAI;
