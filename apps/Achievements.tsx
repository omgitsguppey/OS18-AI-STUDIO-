
import React, { useState, useEffect, useRef } from 'react';
import { 
  Award, 
  Upload, 
  ChevronRight, 
  Loader2, 
  Image as ImageIcon, 
  Download, 
  ArrowRight,
  Music2,
  Trash2
} from 'lucide-react';
import { storage, STORES } from '../services/storageService';
import { generateMilestoneImage, Achievement } from '../services/geminiService';
import { AppID } from '../types';

interface Artist {
  id: string;
  name: string;
}

const STYLES = [
  "Gold Plaque",
  "Platinum Disc",
  "Diamond",
  "Neon Cyberpunk",
  "Minimalist Matte",
  "Frosted Glass",
  "Vintage Vinyl"
];

const Achievements: React.FC<{ onNavigate?: (id: AppID) => void }> = ({ onNavigate }) => {
  const [view, setView] = useState<'create' | 'gallery'>('create');
  const [artists, setArtists] = useState<Artist[]>([]);
  const [history, setHistory] = useState<Achievement[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Form State
  const [selectedArtist, setSelectedArtist] = useState('');
  const [songTitle, setSongTitle] = useState('');
  const [streamCount, setStreamCount] = useState('');
  const [selectedStyle, setSelectedStyle] = useState(STYLES[0]);
  const [coverArt, setCoverArt] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load Data
  useEffect(() => {
    const init = async () => {
      try {
        const [loadedArtists, loadedHistory] = await Promise.all([
          storage.get<Artist[]>(STORES.LYRICS, 'artists_list'),
          storage.get<Achievement[]>(STORES.ACHIEVEMENTS, 'history')
        ]);
        if (loadedArtists) setArtists(loadedArtists);
        if (loadedHistory) setHistory(loadedHistory);
      } catch (e) {
        console.error("Achievements Load Error", e);
      } finally {
        setIsReady(true);
      }
    };
    init();
  }, []);

  // Persist History
  useEffect(() => {
    if (!isReady) return;
    storage.set(STORES.ACHIEVEMENTS, 'history', history).catch(console.error);
  }, [history, isReady]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setCoverArt(file);
      const url = URL.createObjectURL(file);
      setCoverPreview(url);
    }
  };

  const handleGenerate = async () => {
    if (!selectedArtist || !songTitle.trim() || !streamCount.trim()) return;
    setIsGenerating(true);
    
    try {
      const base64 = await generateMilestoneImage(
        selectedArtist,
        songTitle,
        streamCount,
        selectedStyle,
        coverArt || undefined
      );

      if (base64) {
        const newAchievement: Achievement = {
          id: Date.now().toString(),
          artistName: selectedArtist,
          songTitle,
          streamCount,
          style: selectedStyle,
          imageBase64: base64,
          timestamp: Date.now()
        };
        setHistory([newAchievement, ...history]);
        
        // Reset specific fields
        setSongTitle('');
        setStreamCount('');
        setCoverArt(null);
        setCoverPreview(null);
        setView('gallery');
      } else {
        alert("Generation failed. Please try again.");
      }
    } catch (e) {
      console.error(e);
      alert("Error generating award.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm("Delete this award?")) {
      setHistory(prev => prev.filter(h => h.id !== id));
    }
  };

  const downloadImage = (base64: string, name: string) => {
    const link = document.createElement('a');
    link.href = `data:image/png;base64,${base64}`;
    link.download = `award-${name.replace(/\s+/g, '-').toLowerCase()}.png`;
    link.click();
  };

  if (!isReady) return (
    <div className="h-full bg-black flex items-center justify-center">
      <Loader2 className="animate-spin text-yellow-500" size={32} />
    </div>
  );

  return (
    <div className="h-full bg-[#0a0a0a] text-white flex flex-col font-sans overflow-hidden">
      {/* Header */}
      <div className="h-16 border-b border-white/5 px-6 flex items-center justify-between bg-black/40 backdrop-blur-md shrink-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-900/20">
            <Award size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold leading-none">Achievements</h1>
            <p className="text-[10px] text-gray-500 font-medium uppercase tracking-widest mt-1">Milestone Generator</p>
          </div>
        </div>
        <div className="flex bg-white/5 p-1 rounded-xl">
          <button 
            onClick={() => setView('create')} 
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${view === 'create' ? 'bg-white text-black shadow-sm' : 'text-gray-400 hover:text-white'}`}
          >
            Create
          </button>
          <button 
            onClick={() => setView('gallery')} 
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${view === 'gallery' ? 'bg-white text-black shadow-sm' : 'text-gray-400 hover:text-white'}`}
          >
            Gallery
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 max-w-2xl mx-auto w-full">
        {view === 'create' && (
          <div className="space-y-8 animate-fade-in">
            {artists.length === 0 ? (
              <div className="py-20 text-center space-y-6 opacity-60">
                <Music2 size={64} className="mx-auto" />
                <div>
                  <h3 className="text-xl font-bold">No Artists Found</h3>
                  <p className="text-sm text-gray-400 mt-2">You must establish an artist profile in LyricsAI first.</p>
                </div>
                <button 
                  onClick={() => onNavigate?.(AppID.LYRICS_AI)}
                  className="bg-yellow-500 text-black px-6 py-3 rounded-full font-bold text-sm flex items-center justify-center gap-2 mx-auto hover:bg-yellow-400"
                >
                  Go to LyricsAI <ArrowRight size={16} />
                </button>
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  <label className="text-xs font-black uppercase text-gray-500 tracking-widest ml-1">Artist</label>
                  <select 
                    value={selectedArtist}
                    onChange={(e) => setSelectedArtist(e.target.value)}
                    className="w-full bg-[#1c1c1e] border border-white/10 rounded-xl px-4 py-4 text-sm font-bold outline-none focus:border-yellow-500/50 appearance-none cursor-pointer"
                  >
                    <option value="" disabled>Select Artist</option>
                    {artists.map(a => <option key={a.id} value={a.name}>{a.name}</option>)}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase text-gray-500 tracking-widest ml-1">Song/Album</label>
                    <input 
                      type="text"
                      value={songTitle}
                      onChange={(e) => setSongTitle(e.target.value)}
                      placeholder="Title"
                      className="w-full bg-[#1c1c1e] border border-white/10 rounded-xl px-4 py-4 text-sm font-medium outline-none focus:border-yellow-500/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase text-gray-500 tracking-widest ml-1">Count</label>
                    <input 
                      type="text"
                      value={streamCount}
                      onChange={(e) => setStreamCount(e.target.value)}
                      placeholder="e.g. 1,000,000"
                      className="w-full bg-[#1c1c1e] border border-white/10 rounded-xl px-4 py-4 text-sm font-medium outline-none focus:border-yellow-500/50"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black uppercase text-gray-500 tracking-widest ml-1">Cover Art (Optional)</label>
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className={`w-full h-32 rounded-2xl border-2 border-dashed flex items-center justify-center cursor-pointer transition-all overflow-hidden relative group ${coverPreview ? 'border-yellow-500/50' : 'border-white/10 hover:border-white/20 hover:bg-white/5'}`}
                  >
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                    {coverPreview ? (
                      <>
                        <img src={coverPreview} className="w-full h-full object-cover opacity-50 group-hover:opacity-30 transition-opacity" alt="Preview" />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="bg-black/50 px-3 py-1 rounded-full text-xs font-bold backdrop-blur-md">Change Image</span>
                        </div>
                      </>
                    ) : (
                      <div className="text-center text-gray-500">
                        <Upload size={24} className="mx-auto mb-2" />
                        <span className="text-xs font-bold">Upload Background</span>
                      </div>
                    )}
                  </div>
                  {coverPreview && <p className="text-[10px] text-yellow-500 flex items-center gap-1"><Loader2 size={10} className="animate-spin" /> Gemini Nano will edit this image</p>}
                </div>

                <div className="space-y-3">
                  <label className="text-xs font-black uppercase text-gray-500 tracking-widest ml-1">Aesthetic</label>
                  <div className="flex flex-wrap gap-2">
                    {STYLES.map(style => (
                      <button
                        key={style}
                        onClick={() => setSelectedStyle(style)}
                        className={`px-3 py-2 rounded-lg text-xs font-bold border transition-all ${selectedStyle === style ? 'bg-yellow-500 text-black border-yellow-500' : 'bg-[#1c1c1e] border-white/10 text-gray-400 hover:text-white'}`}
                      >
                        {style}
                      </button>
                    ))}
                  </div>
                </div>

                <button 
                  onClick={handleGenerate}
                  disabled={isGenerating || !selectedArtist || !songTitle.trim() || !streamCount.trim()}
                  className="w-full py-4 bg-gradient-to-r from-yellow-500 to-amber-600 rounded-2xl font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-amber-900/20 disabled:opacity-50 disabled:scale-100 text-black"
                >
                  {isGenerating ? <Loader2 size={18} className="animate-spin" /> : <><Award size={18} /> Generate Award</>}
                </button>
              </>
            )}
          </div>
        )}

        {view === 'gallery' && (
          <div className="space-y-6 animate-slide-up pb-20">
            {history.length === 0 ? (
              <div className="py-20 text-center text-gray-500 opacity-50">
                <ImageIcon size={48} className="mx-auto mb-4" />
                <p>No awards generated yet.</p>
              </div>
            ) : (
              <div className="grid gap-6">
                {history.map(item => (
                  <div key={item.id} className="bg-[#1c1c1e] border border-white/5 rounded-[2rem] p-6 group">
                    <div className="relative aspect-square rounded-2xl overflow-hidden shadow-2xl mb-4 border border-white/5">
                      <img src={`data:image/png;base64,${item.imageBase64}`} className="w-full h-full object-cover" alt="Award" />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 backdrop-blur-sm">
                        <button 
                          onClick={() => downloadImage(item.imageBase64, item.songTitle)}
                          className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-black hover:scale-110 transition-transform"
                        >
                          <Download size={20} />
                        </button>
                        <button 
                          onClick={() => handleDelete(item.id)}
                          className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center text-white hover:scale-110 transition-transform"
                        >
                          <Trash2 size={20} />
                        </button>
                      </div>
                    </div>
                    <div className="text-center space-y-1">
                      <h3 className="text-lg font-bold truncate">{item.songTitle}</h3>
                      <p className="text-xs text-yellow-500 font-black uppercase tracking-widest">{item.streamCount} Streams</p>
                      <p className="text-xs text-gray-500">{item.artistName}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Achievements;
