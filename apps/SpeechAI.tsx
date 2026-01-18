
import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, 
  Play, 
  Pause, 
  Download, 
  Copy, 
  Trash2, 
  Settings2, 
  Loader2, 
  Check,
  Volume2,
  Wind,
  Library,
  Share,
  Clapperboard,
  FileText,
  Film
} from 'lucide-react';
import { generateSpeech, SpeechGeneration } from '../services/geminiService';
import { storage, STORES } from '../services/storageService';
import OnboardingOverlay from '../components/OnboardingOverlay';
import { AppID } from '../types';

const VOICES = [
  { id: 'Puck', gender: 'Male', style: 'Deep, Narrative' },
  { id: 'Charon', gender: 'Male', style: 'Authoritative' },
  { id: 'Kore', gender: 'Female', style: 'Calm, Soothing' },
  { id: 'Fenrir', gender: 'Male', style: 'Energetic' },
  { id: 'Zephyr', gender: 'Female', style: 'Bright, Clear' }
];

interface ContentSeason { id: string; episodes: any[] }

const SpeechAI: React.FC = () => {
  const [view, setView] = useState<'studio' | 'library'>('studio');
  const [generations, setGenerations] = useState<SpeechGeneration[]>([]);
  const [text, setText] = useState('');
  const [selectedVoice, setSelectedVoice] = useState(VOICES[0].id);
  const [isGenerating, setIsGenerating] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Sliders
  const [speed, setSpeed] = useState(1.0); // 0.5 - 2.0
  const [stability, setStability] = useState(0.5); // 0.0 - 1.0
  const [tone, setTone] = useState('Neutral'); // Dropdown/Slider equivalent

  useEffect(() => {
    const init = async () => {
      try {
        const saved = await storage.get<SpeechGeneration[]>(STORES.SPEECH_AI, 'generations');
        if (saved && Array.isArray(saved)) {
            setGenerations(saved);
        }
      } catch (e) {
        console.error("SpeechAI init error:", e);
      } finally {
        setIsReady(true);
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (!isReady) return;
    storage.set(STORES.SPEECH_AI, 'generations', generations).catch(console.error);
  }, [generations, isReady]);

  const handleGenerate = async () => {
    if (!text.trim()) return;
    setIsGenerating(true);
    try {
      const result = await generateSpeech(text, selectedVoice, speed, stability, tone);
      setGenerations(prev => [result, ...prev]);
      setText(''); // Clear input
      setView('library'); // Auto-switch to library to see result
    } catch (e) {
      console.error(e);
      alert("Speech generation failed. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const playAudio = (id: string, base64: string) => {
    if (playingId === id) {
      audioRef.current?.pause();
      setPlayingId(null);
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
    }

    const audio = new Audio(`data:audio/mp3;base64,${base64}`);
    audioRef.current = audio;
    audio.play().catch(e => console.error("Playback failed:", e));
    setPlayingId(id);
    audio.onended = () => setPlayingId(null);
  };

  const deleteGen = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setGenerations(prev => prev.filter(g => g.id !== id));
    if (playingId === id) {
        audioRef.current?.pause();
        setPlayingId(null);
    }
  };

  const copyText = (txt: string) => {
    navigator.clipboard.writeText(txt);
  };

  // Integration Handlers
  const handleExportToShorts = async (gen: SpeechGeneration) => {
    try {
        const currentAssets = await storage.get<any[]>(STORES.SHORTS_STUDIO, 'assets') || [];
        const newAsset = {
            id: gen.id,
            type: 'audio',
            url: `data:audio/mp3;base64,${gen.audioBase64}`,
            conceptTitle: gen.text.length > 50 ? gen.text.substring(0, 50) + '...' : gen.text,
            timestamp: Date.now()
        };
        await storage.set(STORES.SHORTS_STUDIO, 'assets', [newAsset, ...currentAssets]);
        alert("Voiceover exported to Shorts Studio Library!");
    } catch (e) {
        console.error(e);
        alert("Export failed.");
    }
  };

  const handleExportToContent = async (gen: SpeechGeneration) => {
    try {
        const seasons = await storage.get<ContentSeason[]>(STORES.CONTENT, 'seasons') || [];
        // Find most recent season or create one
        let targetSeason = seasons[seasons.length - 1];
        if (!targetSeason) {
            targetSeason = { id: Date.now().toString(), episodes: [] } as any;
            seasons.push(targetSeason);
        }
        
        // Create a basic episode draft
        const newEpisode = {
            id: Date.now().toString(),
            seasonId: targetSeason.id,
            title: "Voiceover Import",
            format: "Short Form",
            platform: "TikTok",
            pov: "First Person",
            hook: "Imported Audio Hook",
            script: gen.text, // Use the generated text as script
            arcNotes: "Imported from SpeechAI",
            episodeNumber: targetSeason.episodes.length + 1,
            createdAt: Date.now()
        };
        
        targetSeason.episodes.unshift(newEpisode);
        await storage.set(STORES.CONTENT, 'seasons', seasons);
        alert("Script exported to ContentAI as new Episode Draft!");
    } catch (e) {
        console.error(e);
        alert("Export failed.");
    }
  };

  if (!isReady) return (
    <div className="h-full bg-black flex items-center justify-center">
      <Loader2 className="animate-spin text-sky-500" size={32} />
    </div>
  );

  return (
    <div className="h-full bg-[#0a0a0a] text-white flex flex-col font-sans overflow-hidden relative">
      <OnboardingOverlay 
        appId={AppID.SPEECH_AI}
        title="SpeechAI"
        subtitle="Neural Text-to-Speech"
        features={[
          { icon: Mic, title: "Gemini TTS", description: "Uses the ultra-fast Gemini 2.5 Flash model for instant synthesis." },
          { icon: Settings2, title: "Granular Control", description: "Adjust speed, stability, and emotional tone to perfect the delivery." },
          { icon: Library, title: "Asset Library", description: "Manage generations and export directly to Shorts Studio." }
        ]}
      />

      {/* Header */}
      <div className="h-16 px-4 md:px-6 border-b border-white/5 bg-black/40 backdrop-blur-md flex items-center justify-between shrink-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center shadow-lg shadow-sky-900/20">
            <Mic size={20} className="text-white" />
          </div>
          <div className="hidden sm:block">
            <h1 className="text-lg font-bold leading-none">SpeechAI</h1>
            <p className="text-[10px] text-gray-500 font-medium uppercase tracking-widest mt-1">Neural Synth</p>
          </div>
        </div>

        <div className="flex bg-white/5 p-1 rounded-xl">
            <button 
                onClick={() => setView('studio')}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${view === 'studio' ? 'bg-white text-black shadow-sm' : 'text-gray-400 hover:text-white'}`}
            >
                <Settings2 size={14} /> Studio
            </button>
            <button 
                onClick={() => setView('library')}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${view === 'library' ? 'bg-white text-black shadow-sm' : 'text-gray-400 hover:text-white'}`}
            >
                <Library size={14} /> Library
            </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden min-h-0 bg-[#0a0a0a]">
        
        {/* VIEW: STUDIO */}
        {view === 'studio' && (
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
                    
                    {/* Voice Selector */}
                    <div>
                        <h3 className="text-xs font-black uppercase text-gray-500 tracking-widest mb-3">Select Voice</h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {VOICES.map(v => (
                            <button
                                key={v.id}
                                onClick={() => setSelectedVoice(v.id)}
                                className={`px-4 py-3 rounded-2xl border transition-all text-left group ${selectedVoice === v.id ? 'bg-sky-500/10 border-sky-500 shadow-[0_0_20px_rgba(14,165,233,0.15)]' : 'bg-[#1c1c1e] border-white/5 hover:bg-white/5'}`}
                            >
                                <div className="flex items-center justify-between mb-1">
                                <span className={`text-sm font-bold ${selectedVoice === v.id ? 'text-sky-400' : 'text-white'}`}>{v.id}</span>
                                {selectedVoice === v.id && <Check size={14} className="text-sky-500" />}
                                </div>
                                <span className="text-[10px] text-gray-500 block">{v.gender} • {v.style}</span>
                            </button>
                            ))}
                        </div>
                    </div>

                    {/* Text Input */}
                    <div>
                        <h3 className="text-xs font-black uppercase text-gray-500 tracking-widest mb-3">Script</h3>
                        <textarea 
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            placeholder="Enter text to synthesize..."
                            className="w-full bg-[#1c1c1e] border border-white/10 rounded-3xl p-6 text-lg font-medium outline-none focus:border-sky-500/50 resize-none h-48 transition-all placeholder-gray-600 leading-relaxed"
                        />
                    </div>

                    {/* Settings */}
                    <div className="bg-[#1c1c1e] rounded-3xl p-6 border border-white/5 space-y-6">
                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <div className="flex justify-between mb-2">
                                    <label className="text-[10px] font-bold text-gray-500 uppercase">Speed</label>
                                    <span className="text-[10px] font-mono text-sky-400">{speed}x</span>
                                </div>
                                <input 
                                    type="range" min="0.5" max="2.0" step="0.1" 
                                    value={speed} onChange={(e) => setSpeed(parseFloat(e.target.value))}
                                    className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-sky-500"
                                />
                            </div>
                            <div>
                                <div className="flex justify-between mb-2">
                                    <label className="text-[10px] font-bold text-gray-500 uppercase">Stability</label>
                                    <span className="text-[10px] font-mono text-sky-400">{Math.round(stability * 100)}%</span>
                                </div>
                                <input 
                                    type="range" min="0.0" max="1.0" step="0.1" 
                                    value={stability} onChange={(e) => setStability(parseFloat(e.target.value))}
                                    className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-sky-500"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-gray-500 uppercase mb-3 block">Emotional Tone</label>
                            <div className="flex gap-2">
                                {['Neutral', 'Happy', 'Serious', 'Whisper'].map(t => (
                                <button 
                                    key={t}
                                    onClick={() => setTone(t)}
                                    className={`flex-1 py-2 rounded-xl text-[10px] font-bold uppercase transition-all ${tone === t ? 'bg-sky-600 text-white shadow-lg shadow-sky-900/20' : 'bg-black/30 text-gray-500 hover:text-white hover:bg-white/5'}`}
                                >
                                    {t}
                                </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <button 
                        onClick={handleGenerate}
                        disabled={!text.trim() || isGenerating}
                        className="w-full py-5 bg-gradient-to-r from-sky-600 to-blue-600 text-white rounded-[2rem] font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl shadow-sky-900/20 hover:scale-[1.01] active:scale-95 transition-all disabled:opacity-50 disabled:scale-100"
                    >
                        {isGenerating ? <Loader2 size={18} className="animate-spin" /> : <><Volume2 size={18} /> Generate Speech</>}
                    </button>
                </div>
            </div>
        )}

        {/* VIEW: LIBRARY (REDESIGNED) */}
        {view === 'library' && (
           <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
              <div className="max-w-4xl mx-auto space-y-6 animate-slide-up pb-20">
                 <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold">Recent Generations</h2>
                    <span className="text-xs text-gray-500 font-medium">{generations.length} items</span>
                 </div>
                 
                 {generations.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 opacity-30 text-center">
                       <Wind size={64} className="mb-4" />
                       <p className="text-sm font-medium">No audio generated yet.</p>
                       <button onClick={() => setView('studio')} className="mt-4 text-xs font-bold text-sky-500 hover:underline">Create New</button>
                    </div>
                 ) : (
                    <div className="space-y-4">
                        {generations.map(gen => (
                            <div key={gen.id} className="bg-[#1c1c1e] border border-white/5 rounded-2xl p-4 md:p-6 hover:bg-[#252527] transition-all group relative overflow-hidden">
                                {playingId === gen.id && (
                                    <div className="absolute inset-0 bg-sky-500/5 pointer-events-none animate-pulse" />
                                )}
                                
                                <div className="flex flex-col md:flex-row gap-6 items-start md:items-center relative z-10">
                                    {/* Play Button */}
                                    <button 
                                        onClick={() => playAudio(gen.id, gen.audioBase64)}
                                        className={`w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-lg shrink-0 ${playingId === gen.id ? 'bg-sky-500 text-white scale-105' : 'bg-white text-black hover:scale-105'}`}
                                    >
                                        {playingId === gen.id ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" className="ml-1" />}
                                    </button>

                                    {/* Info & Visual */}
                                    <div className="flex-1 min-w-0 space-y-2">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-lg text-white">{gen.voice}</span>
                                                <span className="text-xs text-gray-500 font-mono">{new Date(gen.timestamp).toLocaleDateString()}</span>
                                            </div>
                                            <div className="flex gap-2">
                                                <button onClick={() => handleExportToShorts(gen)} className="p-2 text-gray-400 hover:text-red-500 bg-white/5 hover:bg-white/10 rounded-lg transition-colors" title="Export to Shorts Studio">
                                                    <Film size={16} />
                                                </button>
                                                <button onClick={() => handleExportToContent(gen)} className="p-2 text-gray-400 hover:text-pink-500 bg-white/5 hover:bg-white/10 rounded-lg transition-colors" title="Draft Episode in ContentAI">
                                                    <Clapperboard size={16} />
                                                </button>
                                            </div>
                                        </div>
                                        
                                        <div className="flex items-center gap-4">
                                            {/* Visualizer Simulation */}
                                            <div className="flex-1 h-8 flex items-center gap-1 opacity-50">
                                                {[...Array(20)].map((_, i) => (
                                                    <div 
                                                        key={i} 
                                                        className={`w-1 bg-white rounded-full transition-all duration-300 ${playingId === gen.id ? 'animate-bounce' : 'h-1'}`}
                                                        style={{ 
                                                            height: playingId === gen.id ? `${Math.random() * 24 + 4}px` : '4px',
                                                            animationDelay: `${i * 0.05}s`
                                                        }} 
                                                    />
                                                ))}
                                            </div>
                                        </div>

                                        <p className="text-xs text-gray-400 line-clamp-2 font-medium">{gen.text}</p>
                                    </div>

                                    {/* Secondary Actions */}
                                    <div className="flex items-center gap-2 md:flex-col shrink-0">
                                        <button onClick={() => copyText(gen.text)} className="p-2 text-gray-500 hover:text-white transition-colors"><Copy size={16} /></button>
                                        <a href={`data:audio/mp3;base64,${gen.audioBase64}`} download={`speech-${gen.id}.mp3`} className="p-2 text-gray-500 hover:text-sky-400 transition-colors"><Download size={16} /></a>
                                        <button onClick={(e) => deleteGen(gen.id, e)} className="p-2 text-gray-500 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                 )}
              </div>
           </div>
        )}
      </div>
    </div>
  );
};

export default SpeechAI;
