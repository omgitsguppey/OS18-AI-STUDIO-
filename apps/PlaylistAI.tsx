
import React, { useState, useEffect } from 'react';
import { 
  ListMusic, 
  Sparkles, 
  Music2, 
  Clock, 
  MoreHorizontal, 
  Play, 
  Shuffle, 
  Heart, 
  Download, 
  Loader2,
  ChevronLeft,
  Search,
  CheckCircle2
} from 'lucide-react';
import { generatePlaylistMetadata, generatePlaylistCover, GeneratedPlaylist } from '../services/geminiService';
import { storage, STORES } from '../services/storageService';

const MOODS = [
  "Chill", "Hype", "Melancholy", "Focus", "Party", 
  "Romantic", "Workout", "Sleep", "Road Trip", "Nostalgia"
];

const COLORS = [
  { name: "Midnight", hex: "#1e1b4b" },
  { name: "Crimson", hex: "#991b1b" },
  { name: "Emerald", hex: "#065f46" },
  { name: "Violet", hex: "#5b21b6" },
  { name: "Amber", hex: "#92400e" },
  { name: "Black", hex: "#000000" },
  { name: "Pink", hex: "#be185d" },
];

const PlaylistAI: React.FC = () => {
  const [view, setView] = useState<'create' | 'player'>('create');
  const [history, setHistory] = useState<GeneratedPlaylist[]>([]);
  const [currentPlaylist, setCurrentPlaylist] = useState<GeneratedPlaylist | null>(null);
  
  // Inputs
  const [selectedMoods, setSelectedMoods] = useState<string[]>([]);
  const [aesthetic, setAesthetic] = useState('');
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);
  const [length, setLength] = useState(15);
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [genStep, setGenStep] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    const init = async () => {
      const saved = await storage.get<GeneratedPlaylist[]>(STORES.PLAYLIST, 'history');
      if (saved) setHistory(saved);
    };
    init();
  }, []);

  useEffect(() => {
    storage.set(STORES.PLAYLIST, 'history', history).catch(console.error);
  }, [history]);

  const toggleMood = (m: string) => {
    setSelectedMoods(prev => prev.includes(m) ? prev.filter(i => i !== m) : [...prev, m]);
  };

  const handleGenerate = async () => {
    if (selectedMoods.length === 0 && !aesthetic) return;
    
    setIsGenerating(true);
    setGenStep('Curating tracks...');
    
    try {
      // 1. Generate Metadata & Tracks
      const metadata = await generatePlaylistMetadata(
        selectedMoods, 
        aesthetic || "General", 
        length, 
        selectedColor.name
      );
      
      setGenStep('Painting cover art...');
      
      // 2. Generate Cover Art
      const coverBase64 = await generatePlaylistCover(
        metadata.title, 
        aesthetic || selectedMoods.join(' '), 
        selectedColor.name
      );

      const newPlaylist: GeneratedPlaylist = {
        id: Date.now().toString(),
        createdAt: Date.now(),
        moods: selectedMoods,
        aesthetic: aesthetic,
        primaryColor: selectedColor.hex, // Use user selected color as fallback or AI suggestion
        ...metadata,
        coverImageBase64: coverBase64 || undefined
      };

      setHistory([newPlaylist, ...history]);
      setCurrentPlaylist(newPlaylist);
      setView('player');
    } catch (e) {
      console.error(e);
      alert("Generation failed. Please check quotas.");
    } finally {
      setIsGenerating(false);
      setGenStep('');
    }
  };

  const handleExport = () => {
    setIsExporting(true);
    setTimeout(() => {
      setIsExporting(false);
      alert(`Playlist "${currentPlaylist?.title}" exported to library!`);
    }, 1500);
  };

  const openInSpotify = (title: string, artist: string) => {
    const query = encodeURIComponent(`${title} ${artist}`);
    window.open(`https://open.spotify.com/search/${query}`, '_blank');
  };

  return (
    <div className="h-full bg-[#121212] text-white flex flex-col font-sans overflow-hidden">
      {/* Header */}
      {view === 'create' ? (
        <div className="h-16 px-6 flex items-center justify-between border-b border-white/5 bg-[#121212] shrink-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-black">
              <ListMusic size={18} />
            </div>
            <span className="font-bold">Playlist AI</span>
          </div>
          {history.length > 0 && (
            <button onClick={() => { setCurrentPlaylist(history[0]); setView('player'); }} className="text-xs font-bold text-gray-400 hover:text-white">
              History
            </button>
          )}
        </div>
      ) : (
        <div className="h-16 px-6 flex items-center gap-4 shrink-0 z-10 absolute top-0 left-0 right-0 bg-gradient-to-b from-black/60 to-transparent">
          <button onClick={() => setView('create')} className="w-8 h-8 rounded-full bg-black/50 flex items-center justify-center hover:bg-black/80 transition-colors backdrop-blur-md">
            <ChevronLeft size={20} />
          </button>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {view === 'create' ? (
          <div className="p-6 max-w-xl mx-auto space-y-8 animate-fade-in pb-20">
            <div className="text-center py-6">
              <h2 className="text-3xl font-black mb-2">Vibe Tuner</h2>
              <p className="text-gray-400 text-sm">Curate a sonic atmosphere with AI.</p>
            </div>

            <div className="space-y-4">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Moods</label>
              <div className="flex flex-wrap gap-2">
                {MOODS.map(m => (
                  <button
                    key={m}
                    onClick={() => toggleMood(m)}
                    className={`px-4 py-2 rounded-full text-xs font-bold transition-all border ${selectedMoods.includes(m) ? 'bg-green-500 text-black border-green-500' : 'bg-white/5 border-white/10 text-gray-300 hover:border-white/30'}`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Aesthetic</label>
              <input 
                type="text" 
                value={aesthetic}
                onChange={(e) => setAesthetic(e.target.value)}
                placeholder="e.g. Cyberpunk, Cottagecore, 90s Grunge..."
                className="w-full bg-[#2a2a2a] border border-white/10 rounded-xl px-4 py-3 outline-none text-sm focus:border-green-500/50 transition-all placeholder-gray-500"
              />
            </div>

            <div className="space-y-4">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Color Theme</label>
              <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
                {COLORS.map(c => (
                  <button
                    key={c.name}
                    onClick={() => setSelectedColor(c)}
                    className={`w-10 h-10 rounded-full shrink-0 border-2 transition-transform ${selectedColor.name === c.name ? 'border-white scale-110' : 'border-transparent'}`}
                    style={{ backgroundColor: c.hex }}
                    title={c.name}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Length</label>
                <span className="text-xs font-bold text-green-500">{length} Songs</span>
              </div>
              <input 
                type="range" 
                min="5" 
                max="30" 
                step="5"
                value={length}
                onChange={(e) => setLength(parseInt(e.target.value))}
                className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-green-500"
              />
            </div>

            <button 
              onClick={handleGenerate}
              disabled={isGenerating || (selectedMoods.length === 0 && !aesthetic)}
              className="w-full py-4 bg-green-500 text-black rounded-full font-bold text-sm uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-2 shadow-lg shadow-green-900/20"
            >
              {isGenerating ? <Loader2 className="animate-spin" /> : <><Sparkles size={18} fill="black" /> Generate Playlist</>}
            </button>
            
            {isGenerating && (
              <p className="text-center text-xs text-green-500 font-bold animate-pulse">{genStep}</p>
            )}
          </div>
        ) : currentPlaylist && (
          <div className="h-full flex flex-col bg-gradient-to-b from-gray-900 to-[#121212] animate-fade-in relative">
            {/* Dynamic Background Gradient */}
            <div 
              className="absolute top-0 left-0 right-0 h-96 opacity-40 blur-3xl pointer-events-none"
              style={{ background: `linear-gradient(to bottom, ${currentPlaylist.primaryColor || selectedColor.hex}, transparent)` }}
            />

            <div className="flex-1 overflow-y-auto custom-scrollbar relative z-10">
              <div className="p-6 pt-20 flex flex-col md:flex-row gap-6 items-end">
                {/* Cover Art */}
                <div className="w-48 h-48 md:w-56 md:h-56 shrink-0 shadow-2xl shadow-black/50 rounded-lg overflow-hidden bg-white/5 relative group">
                  {currentPlaylist.coverImageBase64 ? (
                    <img src={`data:image/png;base64,${currentPlaylist.coverImageBase64}`} className="w-full h-full object-cover" alt="Cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-800">
                      <Music2 size={48} className="text-gray-600" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 space-y-2 mb-2">
                  <span className="text-xs font-bold uppercase tracking-widest text-white/80">Public Playlist</span>
                  <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-none">{currentPlaylist.title}</h1>
                  <p className="text-white/60 text-sm font-medium line-clamp-2">{currentPlaylist.description}</p>
                  
                  <div className="flex items-center gap-4 pt-2">
                    <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center text-black font-bold text-[10px]">AI</div>
                    <span className="text-sm font-bold">Gemini • {currentPlaylist.tracks.length} songs</span>
                  </div>
                </div>
              </div>

              {/* Actions Toolbar */}
              <div className="px-6 py-4 flex items-center justify-between sticky top-0 bg-[#121212]/80 backdrop-blur-xl z-20 border-b border-white/5">
                <div className="flex items-center gap-4">
                  <button className="w-14 h-14 rounded-full bg-green-500 flex items-center justify-center text-black hover:scale-105 active:scale-95 transition-all shadow-lg">
                    <Play size={24} fill="black" className="ml-1" />
                  </button>
                  <button className="text-gray-400 hover:text-white transition-colors"><Heart size={24} /></button>
                  <button className="text-gray-400 hover:text-white transition-colors"><Download size={24} /></button>
                  <button className="text-gray-400 hover:text-white transition-colors"><MoreHorizontal size={24} /></button>
                </div>
                
                <button 
                  onClick={handleExport}
                  className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-full text-xs font-bold transition-colors border border-white/10"
                >
                  {isExporting ? <Loader2 size={14} className="animate-spin" /> : <img src="https://storage.googleapis.com/pr-newsroom-wp/1/2018/11/Spotify_Logo_RGB_White.png" className="h-4 w-auto" alt="Spotify" />}
                  {isExporting ? 'Syncing...' : 'Export'}
                </button>
              </div>

              {/* Tracklist */}
              <div className="px-6 pb-20">
                <div className="grid grid-cols-[16px_1fr_auto] gap-4 py-2 text-xs font-bold text-gray-400 border-b border-white/10 mb-2 uppercase tracking-wider px-2">
                  <span>#</span>
                  <span>Title</span>
                  <div className="flex justify-end"><Clock size={14} /></div>
                </div>
                
                {currentPlaylist.tracks.map((track, i) => (
                  <div 
                    key={i} 
                    className="group grid grid-cols-[16px_1fr_auto] gap-4 py-3 px-2 rounded-lg hover:bg-white/10 transition-colors items-center cursor-pointer"
                    onClick={() => openInSpotify(track.title, track.artist)}
                  >
                    <span className="text-sm font-medium text-gray-400 group-hover:text-white">{i + 1}</span>
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-white truncate flex items-center gap-2">
                        {track.title}
                        {track.explicit && <span className="text-[8px] border border-gray-500 text-gray-400 px-1 rounded-[2px]">E</span>}
                      </div>
                      <div className="text-xs text-gray-400 truncate group-hover:text-white/70">{track.artist}</div>
                    </div>
                    <div className="text-xs font-medium text-gray-400 flex items-center gap-4">
                      <button className="opacity-0 group-hover:opacity-100 transition-opacity hover:scale-110">
                        <Search size={14} />
                      </button>
                      <span>{track.duration}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PlaylistAI;
