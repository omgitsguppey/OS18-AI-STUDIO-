
import React, { useState, useEffect, useRef } from 'react';
import { 
  Type, Youtube, Instagram, Video, Send, Brain, Sparkles, Copy, Check, ChevronRight, ChevronLeft, Plus, Trash2, Loader2, AlertCircle, Hash, User, Users, ChevronDown, X, Target
} from 'lucide-react';
import { generateCaption, trainCaptionAI, CaptionOutput } from '../services/geminiService';
import { storage, STORES } from '../services/storageService';
import { AppID } from '../types';
import { useSystemIntelligence } from '../hooks/useSystemIntelligence'; // Import Hook

type Platform = 'YouTube' | 'TikTok' | 'Instagram';

interface CreatorProfile {
  username: string;
  learnedStyle: string;
  platforms: Platform[];
}

const CaptionsAI: React.FC = () => {
  const [view, setView] = useState<'studio' | 'brain'>('studio');
  const [platform, setPlatform] = useState<Platform>('YouTube');
  const [trainingPlatform, setTrainingPlatform] = useState<Platform>('YouTube');
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<CaptionOutput | null>(null);
  const [originalResult, setOriginalResult] = useState<CaptionOutput | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  
  const [creators, setCreators] = useState<CreatorProfile[]>([]);
  const [selectedCreator, setSelectedCreator] = useState<string>('');
  const [newCreatorName, setNewCreatorName] = useState('');
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  
  const [trainingExamples, setTrainingExamples] = useState('');
  const [isTraining, setIsTraining] = useState(false);
  const [isReady, setIsReady] = useState(false);

  // --- INTELLIGENCE HOOK ---
  // We use the hook here. ref will be attached to the result container.
  const { ref: resultRef, trackCopy, trackEdit } = useSystemIntelligence(AppID.CAPTIONS, result ? 'generated_caption' : undefined);

  useEffect(() => {
    const init = async () => {
      const saved = await storage.get<CreatorProfile[]>(STORES.CAPTIONS, 'creator_profiles');
      if (saved) setCreators(saved);
      setIsReady(true);
    };
    init();

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isReady) return;
    storage.set(STORES.CAPTIONS, 'creator_profiles', creators).catch(console.error);
  }, [creators, isReady]);

  const handleGenerate = async () => {
    if (!input.trim() || isGenerating) return;
    setIsGenerating(true);
    try {
      const creator = creators.find(c => c.username === selectedCreator);
      const data = await generateCaption(platform, input, creator?.learnedStyle);
      setResult(data);
      setOriginalResult(JSON.parse(JSON.stringify(data))); 
    } catch (e) {
      console.error(e);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleTrain = async () => {
    if (!selectedCreator || !trainingExamples.trim() || isTraining) return;
    setIsTraining(true);
    try {
      const style = await trainCaptionAI(selectedCreator, trainingPlatform, trainingExamples);
      setCreators(prev => prev.map(c => 
        c.username === selectedCreator ? { ...c, learnedStyle: style } : c
      ));
      setTrainingExamples('');
      alert(`Style learned for ${selectedCreator} on ${trainingPlatform}!`);
    } catch (e) {
      console.error(e);
    } finally {
      setIsTraining(false);
    }
  };

  // Enhanced Edit Handling with Intelligence Hook
  const handleSaveEdits = (key: keyof CaptionOutput, finalValue: string) => {
      const originalValue = originalResult ? originalResult[key] : '';
      if (originalValue && originalValue !== finalValue) {
          trackEdit(originalValue, finalValue); // Track semantic difference
      }
      setResult(prev => prev ? ({ ...prev, [key]: finalValue }) : null);
  };

  const handleAddCreator = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!newCreatorName.trim() || creators.some(c => c.username === newCreatorName)) return;
    const newProfile: CreatorProfile = {
      username: newCreatorName,
      learnedStyle: '',
      platforms: ['YouTube', 'TikTok', 'Instagram']
    };
    setCreators([...creators, newProfile]);
    setSelectedCreator(newCreatorName);
    setNewCreatorName('');
  };

  const removeCreator = (username: string) => {
    setCreators(prev => prev.filter(c => c.username !== username));
    if (selectedCreator === username) setSelectedCreator('');
  };

  // Enhanced Copy with Intelligence Hook
  const copy = (text: string, key: string) => {
    trackCopy(text); // Track keyword extraction
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  if (!isReady) return <div className="h-full bg-black flex items-center justify-center"><Loader2 className="animate-spin text-white/20" /></div>;

  return (
    <div className="h-full bg-[#0a0a0a] text-white flex flex-col font-sans overflow-hidden">
      {/* Header code same as before... */}
      <div className="h-16 px-6 border-b border-white/5 bg-black/40 backdrop-blur-2xl flex items-center justify-between shrink-0 z-[100]">
        <div className="flex items-center gap-4">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            {view === 'studio' ? <Type size={18} /> : <Brain size={18} />}
          </div>
          <div className="relative" ref={menuRef}>
            <button 
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="flex items-center gap-2.5 bg-white/5 hover:bg-white/10 px-4 py-2 rounded-2xl transition-all border border-white/5 group"
            >
              <div className="w-5 h-5 rounded-full bg-indigo-500/20 flex items-center justify-center">
                <User size={12} className="text-indigo-400" />
              </div>
              <span className="text-sm font-bold tracking-tight">
                {selectedCreator || 'Assistant'}
              </span>
              <ChevronDown size={14} className={`text-gray-500 transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`} />
            </button>
            {isUserMenuOpen && (
              <div className="absolute top-full left-0 mt-2 w-64 bg-[#1c1c1e] border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-pop-in">
                <div className="p-3 border-b border-white/5">
                  <form onSubmit={handleAddCreator} className="relative">
                    <input autoFocus type="text" value={newCreatorName} onChange={(e) => setNewCreatorName(e.target.value)} placeholder="Add username..." className="w-full bg-black/40 border border-white/10 rounded-xl pl-4 pr-10 py-2 text-xs outline-none focus:border-indigo-500/50" />
                    <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 text-indigo-400 hover:text-white"><Plus size={16} /></button>
                  </form>
                </div>
                <div className="max-h-60 overflow-y-auto py-1">
                  <button onClick={() => { setSelectedCreator(''); setIsUserMenuOpen(false); }} className={`w-full px-4 py-2.5 text-left text-xs font-bold hover:bg-white/5 flex items-center justify-between ${!selectedCreator ? 'text-indigo-400' : 'text-gray-400'}`}>Generic Assistant {!selectedCreator && <Check size={14} />}</button>
                  {creators.map(c => (
                    <div key={c.username} className="flex items-center group">
                      <button onClick={() => { setSelectedCreator(c.username); setIsUserMenuOpen(false); }} className={`flex-1 px-4 py-2.5 text-left text-xs font-bold hover:bg-white/5 flex items-center gap-2 ${selectedCreator === c.username ? 'text-indigo-400 bg-white/5' : 'text-gray-400'}`}>{c.username} {c.learnedStyle && <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />} {selectedCreator === c.username && <Check size={14} className="ml-auto" />}</button>
                      <button onClick={() => removeCreator(c.username)} className="px-3 py-2.5 text-gray-700 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><X size={14} /></button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {view === 'brain' ? (
            <button onClick={() => setView('studio')} className="text-xs font-bold text-white bg-white/10 px-4 py-2 rounded-2xl flex items-center gap-2 hover:bg-white/15 transition-all"><ChevronLeft size={14} /> Studio</button>
          ) : (
            <button onClick={() => setView('brain')} className="text-xs font-bold text-indigo-400 bg-indigo-400/10 px-4 py-2 rounded-2xl flex items-center gap-2 hover:bg-indigo-400/20 transition-all border border-indigo-400/20"><Brain size={14} /> Brain</button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 max-w-2xl mx-auto w-full">
        {view === 'studio' ? (
          <div className="space-y-8 animate-fade-in">
            {/* Input and Results */}
            <div className="space-y-4">
              <div className="flex gap-2">
                {(['YouTube', 'Instagram', 'TikTok'] as Platform[]).map(p => (
                  <button key={p} onClick={() => setPlatform(p)} className={`flex-1 py-3.5 rounded-2xl border transition-all flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest ${platform === p ? 'bg-white text-black border-white shadow-xl shadow-white/5' : 'bg-white/5 border-white/5 text-gray-500 hover:bg-white/10'}`}>
                    {p === 'YouTube' && <Youtube size={16} />}
                    {p === 'Instagram' && <Instagram size={16} />}
                    {p === 'TikTok' && <Video size={16} />}
                    {p === 'YouTube' ? 'Shorts' : p}
                  </button>
                ))}
              </div>
              <div className="relative group">
                <textarea value={input} onChange={(e) => setInput(e.target.value)} placeholder={`Briefly describe your ${platform} content ideas...`} className="w-full bg-[#1c1c1e] border border-white/5 rounded-[2rem] px-8 py-7 text-sm font-medium outline-none focus:border-indigo-500/50 min-h-[160px] resize-none transition-all shadow-inner" />
                <button onClick={handleGenerate} disabled={!input.trim() || isGenerating} className="absolute bottom-6 right-6 w-14 h-14 bg-indigo-600 rounded-[1.25rem] flex items-center justify-center shadow-2xl hover:bg-indigo-500 active:scale-95 transition-all disabled:opacity-50 disabled:grayscale">
                  {isGenerating ? <Loader2 size={24} className="animate-spin" /> : <Send size={24} className="ml-1" />}
                </button>
              </div>
              {selectedCreator && !creators.find(c => c.username === selectedCreator)?.learnedStyle && (
                <div className="flex items-center gap-2 px-4 py-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-[11px] text-amber-200"><AlertCircle size={14} /><span>Persona selected but not trained. Generate results will use generic style.</span></div>
              )}
            </div>

            {/* Results Grid - Wrapped in ref for Dwell tracking */}
            {result && (
              <div ref={resultRef} className="space-y-4 animate-slide-up pb-12">
                {platform === 'YouTube' ? (
                  <>
                    <ResultCard label="Shorts Title" value={result.title} onChange={(val: string) => handleSaveEdits('title', val)} onCopy={() => copy(result.title!, 'title')} isCopied={copiedKey === 'title'} />
                    <ResultCard label="Description" value={result.description} onChange={(val: string) => handleSaveEdits('description', val)} onCopy={() => copy(result.description!, 'desc')} isCopied={copiedKey === 'desc'} isMulti />
                    <ResultCard label="SEO Tags" value={result.tags} onChange={(val: string) => handleSaveEdits('tags', val)} onCopy={() => copy(result.tags!, 'tags')} isCopied={copiedKey === 'tags'} icon={Hash} />
                  </>
                ) : (
                  <>
                    <ResultCard label="Post Caption" value={result.postCaption} onChange={(val: string) => handleSaveEdits('postCaption', val)} onCopy={() => copy(result.postCaption!, 'pc')} isCopied={copiedKey === 'pc'} isMulti />
                    <ResultCard label="On-Post Text (Overlay)" value={result.onPostCaption} onChange={(val: string) => handleSaveEdits('onPostCaption', val)} onCopy={() => copy(result.onPostCaption!, 'opc')} isCopied={copiedKey === 'opc'} />
                  </>
                )}
              </div>
            )}
            {!result && (
              <div className="pt-12 text-center opacity-20">
                <Sparkles size={48} className="mx-auto mb-4" />
                <p className="text-sm font-medium">Ready to generate content</p>
              </div>
            )}
          </div>
        ) : (
          // BRAIN VIEW (omitted changes for brevity, logic remains same)
          <div className="space-y-8 animate-fade-in">
             <div className="text-center space-y-2 py-6"><h2 className="text-3xl font-black">Neural Training</h2><p className="text-sm text-gray-500 max-w-sm mx-auto">Feed existing content examples into the AI to replicate your brand's unique linguistic signature.</p></div>
             <div className="bg-[#1c1c1e] p-8 rounded-[2.5rem] border border-white/5 space-y-6 shadow-2xl">
                {!selectedCreator ? <div className="text-center py-8 space-y-4"><div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto text-gray-600"><Users size={32} /></div><p className="text-sm text-gray-400">Select a persona from the header to begin training.</p></div> : <div className="space-y-6 animate-slide-up">
                   <div className="flex items-center justify-between"><div className="space-y-1"><h3 className="text-xs font-black text-indigo-400 uppercase tracking-widest">Training Profile: {selectedCreator}</h3><p className="text-[10px] text-gray-500 italic">Style analysis via Gemini Vision</p></div>{creators.find(c => c.username === selectedCreator)?.learnedStyle && <div className="px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-full text-[10px] font-bold text-green-400">Knowledge Loaded</div>}</div>
                   <div className="space-y-3"><div className="flex items-center gap-2 px-1"><Target size={12} className="text-indigo-400" /><span className="text-[10px] font-black uppercase text-gray-500 tracking-widest">Learning Optimization</span></div><div className="flex gap-2">{(['YouTube', 'Instagram', 'TikTok'] as Platform[]).map(p => <button key={p} onClick={() => setTrainingPlatform(p)} className={`flex-1 py-2.5 rounded-xl border transition-all flex items-center justify-center gap-2 text-[10px] font-bold uppercase ${trainingPlatform === p ? 'bg-indigo-500 text-white border-indigo-500 shadow-lg shadow-indigo-500/20' : 'bg-white/5 border-white/5 text-gray-500 hover:bg-white/10'}`}>{p === 'YouTube' && <Youtube size={12} />}{p === 'Instagram' && <Instagram size={12} />}{p === 'TikTok' && <Video size={12} />}{p}</button>)}</div></div>
                   <textarea value={trainingExamples} onChange={(e) => setTrainingExamples(e.target.value)} placeholder={`Paste 3-5 existing ${trainingPlatform} posts here...`} className="w-full bg-black/30 border border-white/10 rounded-2xl px-6 py-5 text-sm font-medium outline-none focus:border-indigo-500/50 min-h-[200px] resize-none leading-relaxed" />
                   <div className="space-y-3"><button onClick={handleTrain} disabled={isTraining || !trainingExamples.trim()} className="w-full bg-white text-black py-5 rounded-[1.5rem] font-black text-sm flex items-center justify-center gap-3 active:scale-95 transition-all shadow-xl hover:bg-gray-100 disabled:opacity-50">{isTraining ? <Loader2 size={18} className="animate-spin" /> : <><Brain size={18} /> Learn Style</>}</button><p className="text-[10px] text-center text-gray-600 font-bold uppercase tracking-tight">This will optimize generation for {trainingPlatform} specifically.</p></div>
                </div>}
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

const ResultCard = ({ label, value, onChange, onCopy, isCopied, isMulti, icon: Icon }: any) => {
  if (!value) return null;
  return (
    <div className="bg-[#1c1c1e] border border-white/5 rounded-[2rem] p-7 space-y-4 group hover:bg-[#252527] transition-all shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400">
            {Icon ? <Icon size={14} /> : <Type size={14} />}
          </div>
          <span className="text-[11px] font-black text-gray-400 uppercase tracking-[0.15em]">{label}</span>
        </div>
        <button onClick={onCopy} className={`p-3 rounded-xl transition-all ${isCopied ? 'bg-green-500/20 text-green-500' : 'bg-white/5 hover:bg-white/10 text-gray-500'}`}>
          {isCopied ? <Check size={16} strokeWidth={3} /> : <Copy size={16} />}
        </button>
      </div>
      <div className={`bg-black/20 rounded-2xl p-2 border border-white/5 ${isMulti ? 'min-h-[100px]' : ''}`}>
        {isMulti ? (
            <textarea value={value} onChange={(e) => onChange(e.target.value)} className="w-full bg-transparent outline-none text-sm font-semibold leading-relaxed text-gray-200 resize-none p-3 h-full" />
        ) : (
            <input type="text" value={value} onChange={(e) => onChange(e.target.value)} className="w-full bg-transparent outline-none text-sm font-semibold text-gray-200 p-3" />
        )}
      </div>
    </div>
  );
};

export default CaptionsAI;
