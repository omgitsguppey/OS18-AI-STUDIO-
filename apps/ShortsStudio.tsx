
import React, { useState, useEffect } from 'react';
import { 
  Film, 
  Users, 
  Zap, 
  Image as ImageIcon, 
  Video, 
  Loader2, 
  Play, 
  Download, 
  RefreshCw,
  LayoutGrid,
  Mic,
  Music,
  Volume2,
  X,
  Settings2,
  Lightbulb
} from 'lucide-react';
import { storage, STORES } from '../services/storageService';
import { generateShortsConcepts, generateShortsThumbnail, generateShortsVideo, ShortConcept } from '../services/ai/shorts';
import OnboardingOverlay from '../components/OnboardingOverlay';
import { AppID } from '../types';

interface ViralPlan { nicheAccounts: { niche: string; accountNameIdea: string }[] }
interface PasswordEntry { service: string; email: string; accountType?: string }

const CONTENT_NICHES = [
  "ASMR Triggers", 
  "Slime Mixing", 
  "Kinetic Sand", 
  "Soap Cutting",
  "Hydraulic Press", 
  "Rug Cleaning", 
  "Power Washing", 
  "Wood Turning",
  "Paint Mixing", 
  "Ice Crushing", 
  "Marble Run", 
  "Domino Falls",
  "Musician",
  "Brand",
  "Creator",
  "Influencer"
];

// Keyword Dictionary for Auto-Matching
const NICHE_KEYWORDS: Record<string, string[]> = {
    "Musician": ["beats", "music", "song", "rap", "prod", "records", "band"],
    "ASMR Triggers": ["asmr", "whisper", "sound", "tingles"],
    "Slime Mixing": ["slime", "goo", "mix", "texture"],
    "Brand": ["store", "shop", "app", "llc", "official"],
    "Creator": ["vlog", "life", "daily"],
    "Food": ["eats", "cook", "chef", "kitchen", "recipe"]
};

interface GeneratedAsset {
  id: string;
  type: 'image' | 'video' | 'audio';
  url: string; 
  conceptTitle: string;
  timestamp: number;
}

const ShortsStudio: React.FC = () => {
  const [view, setView] = useState<'setup' | 'concepts' | 'library'>('setup');
  const [accounts, setAccounts] = useState<{ name: string; niche: string }[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<{ name: string; niche: string } | null>(null);
  const [selectedNiche, setSelectedNiche] = useState(CONTENT_NICHES[0]);
  
  // Audio Settings
  const [audioConfig, setAudioConfig] = useState({
    voiceover: false,
    music: false,
    sfx: true
  });

  const [concepts, setConcepts] = useState<ShortConcept[]>([]);
  const [assets, setAssets] = useState<GeneratedAsset[]>([]);
  const [isGeneratingConcepts, setIsGeneratingConcepts] = useState(false);
  const [processingAssetId, setProcessingAssetId] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [previewAsset, setPreviewAsset] = useState<GeneratedAsset | null>(null);
  const [hasVeoKey, setHasVeoKey] = useState(false);

  useEffect(() => {
    const init = async () => {
      const viralPlans = await storage.get<ViralPlan[]>(STORES.VIRAL_PLAN, 'plans') || [];
      const passwords = await storage.get<PasswordEntry[]>(STORES.PASSWORDS, 'entries') || [];
      const savedAssets = await storage.get<GeneratedAsset[]>(STORES.SHORTS_STUDIO, 'assets') || [];

      const burnerAccounts = viralPlans.flatMap(p => p.nicheAccounts.map(na => ({ name: na.accountNameIdea, niche: na.niche })));
      const existingAccounts = passwords
        .filter(p => ['tiktok', 'instagram', 'youtube', 'snapchat'].some(s => p.service.toLowerCase().includes(s)))
        .map(p => ({ 
            name: p.email, 
            niche: p.accountType && p.accountType !== 'Personal' ? p.accountType : 'General' 
        }));

      const importedAccounts = [...burnerAccounts, ...existingAccounts];
      setAccounts(importedAccounts);
      if (importedAccounts.length > 0) {
          setSelectedAccount(importedAccounts[0]);
      }
      setAssets(savedAssets);

      // @ts-ignore
      if (window.aistudio && window.aistudio.hasSelectedApiKey) {
         // @ts-ignore
         setHasVeoKey(await window.aistudio.hasSelectedApiKey());
      } else {
         setHasVeoKey(true);
      }

      setIsReady(true);
    };
    init();
  }, []);

  useEffect(() => {
    if (isReady) {
      storage.set(STORES.SHORTS_STUDIO, 'assets', assets).catch(console.error);
    }
  }, [assets, isReady]);

  // Auto-Match Niche Logic
  useEffect(() => {
      if (selectedAccount) {
          let matchedNiche = selectedAccount.niche;
          
          // 1. Try exact match in supported niches
          if (CONTENT_NICHES.includes(matchedNiche)) {
              setSelectedNiche(matchedNiche);
              return;
          }

          // 2. Keyword Matching
          const nameLower = selectedAccount.name.toLowerCase();
          for (const [niche, keywords] of Object.entries(NICHE_KEYWORDS)) {
              if (keywords.some(kw => nameLower.includes(kw))) {
                  // If keyword matches, and the niche is in our supported list (or close enough)
                  if (CONTENT_NICHES.includes(niche)) {
                      setSelectedNiche(niche);
                      return;
                  }
              }
          }
      }
  }, [selectedAccount]);

  const handleSelectKey = async () => {
    // @ts-ignore
    if (window.aistudio && window.aistudio.openSelectKey) {
        // @ts-ignore
        await window.aistudio.openSelectKey();
        setHasVeoKey(true);
    }
  };

  const getAudioContextString = () => {
    const parts = [];
    if (audioConfig.voiceover) parts.push("Voiceover narration");
    if (audioConfig.music) parts.push("Background music");
    if (audioConfig.sfx) parts.push("Pronounced sound effects (ASMR/Crunch)");
    return parts.join(", ");
  };

  const handleGenerateConcepts = async () => {
    if (!selectedAccount) return;
    setIsGeneratingConcepts(true);
    try {
      const audioCtx = getAudioContextString();
      const newConcepts = await generateShortsConcepts(selectedNiche, selectedAccount.name, audioCtx);
      setConcepts(newConcepts);
      setView('concepts');
    } catch (e) {
      console.error(e);
      alert("Failed to generate concepts.");
    } finally {
      setIsGeneratingConcepts(false);
    }
  };

  const handleCreateAsset = async (concept: ShortConcept, type: 'image' | 'video') => {
    if (type === 'video' && !hasVeoKey) {
        await handleSelectKey();
        return;
    }

    setProcessingAssetId(concept.id + type);
    try {
      let url: string | null = null;
      if (type === 'image') {
        url = await generateShortsThumbnail(concept.visualPrompt, selectedNiche);
        if (url) url = `data:image/png;base64,${url}`;
      } else {
        const audioCtx = getAudioContextString();
        url = await generateShortsVideo(concept.visualPrompt, selectedNiche, audioCtx);
      }

      if (url) {
        const newAsset: GeneratedAsset = {
          id: Date.now().toString(),
          type,
          url,
          conceptTitle: concept.title,
          timestamp: Date.now()
        };
        setAssets([newAsset, ...assets]);
      } else {
        alert("Generation failed.");
      }
    } catch (e) {
      console.error(e);
      alert("Error during generation. Check limits.");
    } finally {
      setProcessingAssetId(null);
    }
  };

  const toggleAudioConfig = (key: keyof typeof audioConfig) => {
    setAudioConfig(prev => ({ ...prev, [key]: !prev[key] }));
  };

  if (!isReady) return (
    <div className="h-full bg-black flex items-center justify-center">
      <Loader2 className="animate-spin text-red-500" size={32} />
    </div>
  );

  return (
    <div className="h-full bg-[#0a0a0a] text-white flex flex-col font-sans overflow-hidden relative">
      <OnboardingOverlay 
        appId={AppID.SHORTS_STUDIO}
        title="Shorts Studio"
        subtitle="Automated Content Factory"
        features={[
          { icon: Zap, title: "Zero Typing", description: "Fully automated workflow. Select niche, select audio style, generate." },
          { icon: Video, title: "Veo & Nano", description: "Uses Veo Fast for video and Gemini Nano for thumbnails." },
          { icon: Users, title: "Account Aware", description: "Imports your burner profiles from ViralPlanAI automatically." }
        ]}
      />

      {/* Header */}
      <div className="h-16 px-4 md:px-6 border-b border-white/5 bg-black/40 backdrop-blur-md flex items-center justify-between shrink-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-600 to-pink-600 flex items-center justify-center shadow-lg shadow-red-900/20">
            <Film size={20} className="text-white" />
          </div>
          <div className="hidden sm:block">
            <h1 className="text-lg font-bold leading-none">Shorts Studio</h1>
            <p className="text-[10px] text-gray-500 font-medium uppercase tracking-widest mt-1">Veo Powered</p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-white/5 p-1 rounded-xl">
            <button 
                onClick={() => setView('setup')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${view === 'setup' ? 'bg-white text-black shadow-sm' : 'text-gray-400 hover:text-white'}`}
            >
                <Settings2 size={14} /> Setup
            </button>
            <button 
                onClick={() => setView('concepts')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${view === 'concepts' ? 'bg-white text-black shadow-sm' : 'text-gray-400 hover:text-white'}`}
            >
                <Lightbulb size={14} /> Concepts
            </button>
            <button 
                onClick={() => setView('library')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${view === 'library' ? 'bg-white text-black shadow-sm' : 'text-gray-400 hover:text-white'}`}
            >
                <LayoutGrid size={14} /> Library
            </button>
        </div>
        
        <div className="hidden md:block w-20">
            {!hasVeoKey && (
                <button 
                    onClick={handleSelectKey} 
                    className="px-3 py-1.5 bg-red-500/10 text-red-500 border border-red-500/20 rounded-full text-xs font-bold animate-pulse whitespace-nowrap"
                >
                    Unlock Veo
                </button>
            )}
        </div>
      </div>

      <div className="flex-1 overflow-hidden relative flex flex-col">
        
        {/* VIEW: SETUP */}
        {view === 'setup' && (
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-[#0a0a0a]">
                <div className="max-w-2xl mx-auto space-y-8 animate-fade-in pb-20">
                    <div className="text-center py-4">
                        <h2 className="text-3xl font-black mb-2">Campaign Setup</h2>
                        <p className="text-gray-500 text-sm">Configure your next viral video batch.</p>
                    </div>

                    {/* Account Selection */}
                    <div className="space-y-3">
                        <h3 className="text-xs font-black uppercase text-gray-500 tracking-widest ml-1">Target Account</h3>
                        <div className="grid grid-cols-2 gap-3">
                            {accounts.length === 0 && (
                                <div className="col-span-2 text-gray-500 text-xs text-center py-6 bg-white/5 rounded-2xl border border-white/5 border-dashed">
                                    No accounts found.<br/>Check ViralPlanAI or Passwords.
                                </div>
                            )}
                            {accounts.map((acc, i) => (
                                <button
                                    key={i}
                                    onClick={() => { setSelectedAccount(acc); setConcepts([]); }}
                                    className={`text-left p-4 rounded-2xl border transition-all ${selectedAccount?.name === acc.name ? 'bg-red-500/10 border-red-500 text-white' : 'bg-[#1c1c1e] border-white/5 text-gray-400 hover:bg-white/5'}`}
                                >
                                    <span className="block font-bold text-sm truncate">{acc.name}</span>
                                    <span className="text-[10px] opacity-70 uppercase tracking-wide">{acc.niche}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Niche Selection */}
                    <div className="space-y-3">
                        <h3 className="text-xs font-black uppercase text-gray-500 tracking-widest ml-1">Content Niche</h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {CONTENT_NICHES.map(s => (
                                <button 
                                    key={s} 
                                    onClick={() => setSelectedNiche(s)}
                                    className={`px-3 py-3 rounded-xl text-xs font-bold border transition-all ${selectedNiche === s ? 'bg-white text-black border-white' : 'bg-[#1c1c1e] border-white/5 text-gray-400 hover:text-white'}`}
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Audio Config */}
                    <div className="space-y-3">
                        <h3 className="text-xs font-black uppercase text-gray-500 tracking-widest ml-1">Audio Experience</h3>
                        <div className="flex flex-col sm:flex-row gap-3">
                            <button 
                                onClick={() => toggleAudioConfig('voiceover')}
                                className={`flex-1 flex items-center justify-between p-4 rounded-2xl border transition-all ${audioConfig.voiceover ? 'bg-blue-500/10 border-blue-500/50 text-blue-400' : 'bg-[#1c1c1e] border-white/5 text-gray-500'}`}
                            >
                                <div className="flex items-center gap-2">
                                    <Mic size={16} /> <span className="text-sm font-bold">Voiceover</span>
                                </div>
                                {audioConfig.voiceover && <div className="w-2 h-2 rounded-full bg-blue-500" />}
                            </button>
                            <button 
                                onClick={() => toggleAudioConfig('music')}
                                className={`flex-1 flex items-center justify-between p-4 rounded-2xl border transition-all ${audioConfig.music ? 'bg-purple-500/10 border-purple-500/50 text-purple-400' : 'bg-[#1c1c1e] border-white/5 text-gray-500'}`}
                            >
                                <div className="flex items-center gap-2">
                                    <Music size={16} /> <span className="text-sm font-bold">Music</span>
                                </div>
                                {audioConfig.music && <div className="w-2 h-2 rounded-full bg-purple-500" />}
                            </button>
                            <button 
                                onClick={() => toggleAudioConfig('sfx')}
                                className={`flex-1 flex items-center justify-between p-4 rounded-2xl border transition-all ${audioConfig.sfx ? 'bg-green-500/10 border-green-500/50 text-green-400' : 'bg-[#1c1c1e] border-white/5 text-gray-500'}`}
                            >
                                <div className="flex items-center gap-2">
                                    <Volume2 size={16} /> <span className="text-sm font-bold">Sound FX</span>
                                </div>
                                {audioConfig.sfx && <div className="w-2 h-2 rounded-full bg-green-500" />}
                            </button>
                        </div>
                    </div>

                    <div className="pt-4">
                        <button 
                            onClick={handleGenerateConcepts}
                            disabled={!selectedAccount || isGeneratingConcepts}
                            className="w-full py-5 bg-gradient-to-r from-red-600 to-pink-600 rounded-2xl font-black text-sm uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-red-900/20 disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {isGeneratingConcepts ? <Loader2 size={18} className="animate-spin" /> : <><RefreshCw size={18} /> Generate Ideas</>}
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* VIEW: CONCEPTS */}
        {view === 'concepts' && (
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-[#0a0a0a]">
                <div className="max-w-6xl mx-auto">
                    <div className="flex items-center justify-between mb-6 sticky top-0 bg-[#0a0a0a] py-2 z-10">
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            <Lightbulb size={20} className="text-yellow-500" /> Generated Concepts
                        </h2>
                        {concepts.length > 0 && (
                            <button 
                                onClick={() => setView('setup')} 
                                className="text-xs font-bold text-gray-500 hover:text-white flex items-center gap-1"
                            >
                                <RefreshCw size={12} /> New Batch
                            </button>
                        )}
                    </div>
                    
                    {concepts.length === 0 ? (
                        <div className="h-[60vh] flex flex-col items-center justify-center opacity-30 text-center">
                            <Lightbulb size={48} className="mb-4" />
                            <p className="text-sm font-medium">No active concepts.</p>
                            <button onClick={() => setView('setup')} className="mt-4 text-xs font-bold text-red-500 hover:underline">Go to Setup</button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-20 animate-slide-up">
                            {concepts.map(concept => (
                                <div key={concept.id} className="bg-[#1c1c1e] border border-white/5 rounded-3xl p-6 hover:border-white/10 transition-all group flex flex-col h-full">
                                    <div className="mb-4">
                                        <h3 className="font-bold text-lg mb-2 leading-tight">{concept.title}</h3>
                                        <div className="flex gap-2 mb-3">
                                            <span className="px-2 py-1 bg-white/5 rounded-lg text-[10px] text-gray-400 font-bold uppercase">{concept.niche}</span>
                                            <span className="px-2 py-1 bg-white/5 rounded-lg text-[10px] text-gray-400 font-bold uppercase">{concept.style}</span>
                                        </div>
                                        <p className="text-sm text-gray-400 leading-relaxed bg-black/20 p-3 rounded-xl border border-white/5 min-h-[80px]">
                                            {concept.visualPrompt}
                                        </p>
                                    </div>
                                    
                                    <div className="flex gap-3 mt-auto pt-4 border-t border-white/5">
                                        <button 
                                            onClick={() => handleCreateAsset(concept, 'image')}
                                            disabled={!!processingAssetId}
                                            className="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                                        >
                                            {processingAssetId === concept.id + 'image' ? <Loader2 size={14} className="animate-spin" /> : <><ImageIcon size={14} /> Thumbnail</>}
                                        </button>
                                        <button 
                                            onClick={() => handleCreateAsset(concept, 'video')}
                                            disabled={!!processingAssetId}
                                            className="flex-1 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                                        >
                                            {processingAssetId === concept.id + 'video' ? <Loader2 size={14} className="animate-spin" /> : <><Video size={14} /> Veo Video</>}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        )}

        {/* VIEW: LIBRARY */}
        {view === 'library' && (
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-[#0a0a0a]">
                <div className="max-w-6xl mx-auto">
                    <h2 className="text-xl font-bold mb-6 flex items-center gap-2 sticky top-0 bg-[#0a0a0a] py-2 z-10">
                        <LayoutGrid size={20} className="text-blue-500" /> Asset Library
                    </h2>
                    
                    {assets.length === 0 ? (
                        <div className="h-[60vh] flex flex-col items-center justify-center opacity-30 text-center">
                            <Film size={48} className="mx-auto mb-4" />
                            <p className="text-sm font-medium">No assets generated yet.</p>
                            <button onClick={() => setView('setup')} className="mt-4 text-xs font-bold text-red-500 hover:underline">Start Creating</button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 animate-fade-in pb-20">
                            {assets.map(asset => (
                                <div 
                                    key={asset.id} 
                                    onClick={() => setPreviewAsset(asset)}
                                    className="bg-[#1c1c1e] border border-white/5 rounded-xl overflow-hidden group relative aspect-[9/16] cursor-pointer hover:border-white/20 transition-all"
                                >
                                    {asset.type === 'image' ? (
                                        <img src={asset.url} alt={asset.conceptTitle} className="w-full h-full object-cover" />
                                    ) : asset.type === 'video' ? (
                                        <div className="relative w-full h-full">
                                            <video src={asset.url} className="w-full h-full object-cover" muted loop playsInline onMouseOver={e => e.currentTarget.play()} onMouseOut={e => e.currentTarget.pause()} />
                                            <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-transparent transition-colors pointer-events-none">
                                                <Play size={32} className="text-white opacity-80 group-hover:opacity-0 transition-opacity" fill="currentColor" />
                                            </div>
                                        </div>
                                    ) : (
                                        // Audio Asset Visualization
                                        <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-indigo-900 to-black p-4 text-center">
                                            <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center mb-2">
                                                <Volume2 size={24} className="text-indigo-300" />
                                            </div>
                                            <p className="text-[10px] text-indigo-200 line-clamp-3 font-medium px-2">{asset.conceptTitle}</p>
                                        </div>
                                    )}
                                    <div className={`absolute top-2 right-2 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur ${asset.type === 'video' ? 'bg-red-500/80' : asset.type === 'audio' ? 'bg-indigo-500/80' : 'bg-black/60'}`}>
                                        {asset.type === 'video' ? 'Veo' : asset.type === 'audio' ? 'Voice' : 'Nano'}
                                    </div>
                                    <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/90 to-transparent pt-8">
                                        <p className="text-[10px] text-white font-bold truncate">{asset.conceptTitle}</p>
                                        <p className="text-[9px] text-gray-400 mt-0.5">{new Date(asset.timestamp).toLocaleDateString()}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        )}
      </div>

      {/* Media Viewer Modal */}
      {previewAsset && (
        <div className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-xl flex flex-col items-center justify-center p-4 animate-fade-in">
            <button 
                onClick={() => setPreviewAsset(null)}
                className="absolute top-6 right-6 p-2 bg-white/10 rounded-full text-white hover:bg-white/20 transition-colors z-50"
            >
                <X size={24} />
            </button>

            <div className="w-full max-w-md bg-[#111] rounded-3xl overflow-hidden border border-white/10 shadow-2xl relative aspect-[9/16] flex items-center justify-center">
                {previewAsset.type === 'image' ? (
                    <img src={previewAsset.url} alt={previewAsset.conceptTitle} className="w-full h-full object-cover" />
                ) : previewAsset.type === 'video' ? (
                    <video 
                        src={previewAsset.url} 
                        controls 
                        autoPlay 
                        className="w-full h-full object-cover" 
                    />
                ) : (
                    <div className="flex flex-col items-center gap-6 p-8">
                        <div className="w-24 h-24 rounded-full bg-indigo-500/20 flex items-center justify-center animate-pulse">
                            <Volume2 size={48} className="text-indigo-400" />
                        </div>
                        <audio src={previewAsset.url} controls className="w-full" />
                        <p className="text-center text-sm text-gray-300 max-w-xs">{previewAsset.conceptTitle}</p>
                    </div>
                )}
            </div>

            <div className="mt-6 flex flex-col items-center gap-4">
                <h3 className="text-xl font-bold text-center px-4 max-w-md truncate">{previewAsset.conceptTitle}</h3>
                <a 
                    href={previewAsset.url} 
                    download={`asset-${previewAsset.id}.${previewAsset.type === 'image' ? 'png' : previewAsset.type === 'video' ? 'mp4' : 'mp3'}`}
                    className="px-8 py-3 bg-white text-black rounded-full font-bold text-sm flex items-center gap-2 hover:scale-105 transition-transform"
                >
                    <Download size={18} /> Save {previewAsset.type.charAt(0).toUpperCase() + previewAsset.type.slice(1)}
                </a>
            </div>
        </div>
      )}
    </div>
  );
};

export default ShortsStudio;
