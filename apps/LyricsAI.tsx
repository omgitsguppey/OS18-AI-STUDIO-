
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Music4, 
  Plus, 
  Mic2, 
  ChevronRight, 
  ChevronDown,
  History as HistoryIcon, 
  Loader2,
  Sparkles,
  Layers,
  BookOpen,
  CloudRain,
  Brain,
  Hash,
  Waves,
  ListMusic,
  ArrowLeft,
  ArrowRight,
  Search,
  ChevronLeft,
  FileText,
  User
} from 'lucide-react';
import { analyzeLyrics, generateArtistProfile, LyricAnalysis, ArtistProfileAnalysis } from '../services/geminiService';
import { storage, STORES } from '../services/storageService';

interface Artist {
  id: string;
  name: string;
  genre: string;
  songs: LyricAnalysis[];
  profileAnalysis?: ArtistProfileAnalysis; // Cached profile
  createdAt: number;
}

const ACCENT_COLOR = 'text-[#E6E6FA]';
const ACCENT_BG = 'bg-[#E6E6FA]';
const ACCENT_BORDER = 'border-[#E6E6FA]/20';
const SONGS_PER_PAGE = 6;

const LyricsAI: React.FC = () => {
  const [artists, setArtists] = useState<Artist[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [view, setView] = useState<'hub' | 'artist' | 'new-artist' | 'new-song' | 'song-detail'>('hub');
  
  // Navigation State
  const [selectedArtistId, setSelectedArtistId] = useState<string | null>(null);
  const [selectedSongIdx, setSelectedSongIdx] = useState<number | null>(null);
  const [artistTab, setArtistTab] = useState<'songs' | 'profile'>('songs');
  
  // Analysis State
  const [expandedSection, setExpandedSection] = useState<string | null>(null); // For accordion in song detail
  const [songDetailTab, setSongDetailTab] = useState<'analysis' | 'lyrics'>('analysis');
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingProfile, setIsGeneratingProfile] = useState(false);

  // Search & Pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Forms
  const [newArtistName, setNewArtistName] = useState('');
  const [newArtistGenre, setNewArtistGenre] = useState('');
  const [newSongTitle, setNewSongTitle] = useState('');
  const [newSongLyrics, setNewSongLyrics] = useState('');

  // 1. Initial Load
  useEffect(() => {
    const loadData = async () => {
      try {
        const saved = await storage.get<Artist[]>(STORES.LYRICS, 'artists_list');
        if (saved) {
          setArtists(saved);
        }
      } catch (e) {
        console.error("LyricsAI: Storage load failed", e);
      } finally {
        setIsReady(true);
      }
    };
    loadData();
  }, []);

  // 2. Persist
  useEffect(() => {
    if (!isReady) return;
    const persistData = async () => {
      try {
        await storage.set(STORES.LYRICS, 'artists_list', artists);
        window.dispatchEvent(new Event('lyrics_updated'));
      } catch (e) {
        console.error("LyricsAI: Failed to persist", e);
      }
    };
    persistData();
  }, [artists, isReady]);

  const selectedArtist = useMemo(() => 
    artists.find(a => a.id === selectedArtistId), 
  [artists, selectedArtistId]);

  // Derived Songs List
  const visibleSongs = useMemo(() => {
    if (!selectedArtist) return [];
    let songs = selectedArtist.songs.map((s, i) => ({ ...s, originalIndex: i }));
    if (searchQuery) {
      const lowerQ = searchQuery.toLowerCase();
      songs = songs.filter(s => s.songTitle.toLowerCase().includes(lowerQ));
    }
    return songs.reverse(); // Newest first
  }, [selectedArtist, searchQuery]);

  const paginatedSongs = useMemo(() => {
    const start = (currentPage - 1) * SONGS_PER_PAGE;
    return visibleSongs.slice(start, start + SONGS_PER_PAGE);
  }, [visibleSongs, currentPage]);

  const totalPages = Math.ceil(visibleSongs.length / SONGS_PER_PAGE);

  // Metrics Calculation
  const artistMetrics = useMemo(() => {
    if (!selectedArtist || selectedArtist.songs.length === 0) {
      return { avgVocab: 0, avgMeta: 0, avgEmo: 0, avgStruct: 0, avgRhythm: 0, signatureScore: 0 };
    }
    const total = selectedArtist.songs.reduce((acc, song) => ({
      vocab: acc.vocab + (song.vocabularyComplexity || 0),
      meta: acc.meta + (song.metaphoricDensity || 0),
      emo: acc.emo + (song.emotionalResonance || 0),
      struct: acc.struct + (song.structuralInnovation || 0),
      rhythm: acc.rhythm + (song.rhythmicSophistication || 0)
    }), { vocab: 0, meta: 0, emo: 0, struct: 0, rhythm: 0 });
    
    const count = selectedArtist.songs.length;
    const avgVocab = Math.round(total.vocab / count);
    const avgMeta = Math.round(total.meta / count);
    const avgEmo = Math.round(total.emo / count);
    const avgStruct = Math.round(total.struct / count);
    const avgRhythm = Math.round(total.rhythm / count);
    const signatureScore = Math.round((avgVocab + avgMeta + avgEmo + avgStruct + avgRhythm) / 5);
    
    return { avgVocab, avgMeta, avgEmo, avgStruct, avgRhythm, signatureScore };
  }, [selectedArtist]);

  const handleCreateArtist = () => {
    if (!newArtistName.trim()) return;
    const artist: Artist = {
      id: Date.now().toString(),
      name: newArtistName,
      genre: newArtistGenre || 'General',
      songs: [],
      createdAt: Date.now()
    };
    setArtists(prev => [...prev, artist]);
    setNewArtistName('');
    setNewArtistGenre('');
    setView('hub');
  };

  const handleAddSong = async () => {
    if (!newSongTitle.trim() || !newSongLyrics.trim() || !selectedArtistId) return;
    setIsLoading(true);
    try {
      // Analyze and include original lyrics
      const analysis = await analyzeLyrics(newSongTitle, newSongLyrics);
      
      setArtists(prev => prev.map(a => 
        a.id === selectedArtistId 
          ? { ...a, songs: [...a.songs, analysis] } 
          : a
      ));
      
      setNewSongTitle('');
      setNewSongLyrics('');
      setView('artist');
      setArtistTab('songs');
      setSearchQuery('');
      setCurrentPage(1);
    } catch (e) {
      console.error("Analysis Error", e);
      alert("Analysis failed.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateProfile = async () => {
    if (!selectedArtist || selectedArtist.songs.length === 0) return;
    setIsGeneratingProfile(true);
    try {
        const profile = await generateArtistProfile(selectedArtist.name, selectedArtist.songs);
        setArtists(prev => prev.map(a => 
            a.id === selectedArtistId ? { ...a, profileAnalysis: profile } : a
        ));
    } catch (e) {
        console.error("Profile Gen Error", e);
    } finally {
        setIsGeneratingProfile(false);
    }
  };

  const deleteArtist = (id: string) => {
    if (confirm("Delete artist and all data?")) {
      setArtists(prev => prev.filter(a => a.id !== id));
      if (selectedArtistId === id) setSelectedArtistId(null);
      setView('hub');
    }
  };

  const CategoryToggle = ({ label, icon: Icon, value, description, id, currentExpanded }: any) => {
    const isOpen = currentExpanded === id;
    return (
      <div className="bg-black/20 rounded-xl overflow-hidden border border-white/5 transition-all">
        <button 
          onClick={() => setExpandedSection(isOpen ? null : id)}
          className="w-full px-4 py-3 flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <Icon size={16} className={isOpen ? ACCENT_COLOR : 'text-gray-500'} />
            <span className={`text-xs font-bold uppercase tracking-wider ${isOpen ? 'text-white' : 'text-gray-400 group-hover:text-gray-300'}`}>
              {label}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-sm font-black ${isOpen ? ACCENT_COLOR : 'text-gray-500'}`}>
              {Math.round(value)}
            </span>
            <ChevronDown size={14} className={`text-gray-600 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </div>
        </button>
        {isOpen && (
          <div className="px-4 pb-4 animate-fade-in">
            <p className="text-sm text-gray-300 leading-relaxed italic border-t border-white/5 pt-3">
              {description}
            </p>
          </div>
        )}
      </div>
    );
  };

  if (!isReady) return (
    <div className="h-full bg-black flex items-center justify-center">
      <Loader2 className="animate-spin text-white/20" size={32} />
    </div>
  );

  return (
    <div className="h-full bg-[#0a0a0a] text-white flex flex-col font-sans overflow-hidden">
      {/* App Header */}
      <div className="h-14 border-b border-white/5 px-5 flex items-center justify-between bg-black/40 backdrop-blur-xl shrink-0 z-20">
        <div className="flex items-center gap-2.5">
          <div className={`w-8 h-8 rounded-lg ${ACCENT_BG} flex items-center justify-center shadow-lg shadow-[#E6E6FA]/10`}>
            <Music4 size={18} className="text-black" />
          </div>
          <span className="text-sm font-bold tracking-tight">LyricsAI</span>
        </div>
        {view !== 'hub' && (
          <button 
            onClick={() => {
              if (view === 'song-detail') setView('artist');
              else if (view === 'new-song') setView('artist');
              else setView('hub');
            }}
            className="text-xs font-bold text-gray-400 hover:text-white px-3 py-1.5 bg-white/5 rounded-full transition-colors flex items-center gap-1"
          >
            <ArrowLeft size={12} /> Back
          </button>
        )}
      </div>

      <div className="flex-1 overflow-hidden relative">
        {/* VIEW: HUB */}
        {view === 'hub' && (
          <div className="h-full overflow-y-auto custom-scrollbar p-5">
            <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-black tracking-tight">Artists</h2>
                <button onClick={() => setView('new-artist')} className={`p-2 ${ACCENT_COLOR} bg-white/5 hover:bg-white/10 rounded-full transition-all`}>
                  <Plus size={20} />
                </button>
              </div>
              {artists.length === 0 ? (
                <div className="py-24 flex flex-col items-center justify-center text-center opacity-30">
                  <Mic2 size={48} className="mb-4" />
                  <p className="text-sm font-medium">Linguistic database is empty.</p>
                  <button onClick={() => setView('new-artist')} className="text-xs mt-4 underline decoration-gray-500">Create Profile</button>
                </div>
              ) : (
                <div className="grid gap-3">
                  {artists.map(artist => (
                    <div key={artist.id} onClick={() => { setSelectedArtistId(artist.id); setView('artist'); setArtistTab('songs'); }} className="group bg-[#1c1c1e] border border-white/5 rounded-2xl p-5 hover:bg-[#252527] cursor-pointer transition-all flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-gray-400 group-hover:${ACCENT_COLOR} transition-colors`}><Layers size={22} /></div>
                        <div>
                          <h3 className="font-bold text-lg leading-tight">{artist.name}</h3>
                          <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest">{artist.genre} • {artist.songs.length} songs</p>
                        </div>
                      </div>
                      <ChevronRight size={18} className="text-gray-600" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* VIEW: NEW ARTIST */}
        {view === 'new-artist' && (
          <div className="h-full overflow-y-auto p-8 flex flex-col items-center justify-center animate-fade-in">
            <div className="w-full max-w-sm space-y-8">
              <div className="text-center">
                <h2 className="text-3xl font-black mb-2">New Artist</h2>
                <p className="text-sm text-gray-500">Start a new persistent linguistic audit.</p>
              </div>
              <div className="space-y-3">
                <input type="text" value={newArtistName} onChange={(e) => setNewArtistName(e.target.value)} placeholder="Artist Name" className="w-full bg-[#1c1c1e] border border-white/10 rounded-xl px-5 py-4 outline-none focus:border-[#E6E6FA]/40 transition-all text-sm font-medium" />
                <input type="text" value={newArtistGenre} onChange={(e) => setNewArtistGenre(e.target.value)} placeholder="Genre (Optional)" className="w-full bg-[#1c1c1e] border border-white/10 rounded-xl px-5 py-4 outline-none focus:border-[#E6E6FA]/40 transition-all text-sm font-medium" />
                <button onClick={handleCreateArtist} className={`w-full ${ACCENT_BG} text-black py-4 rounded-xl font-black text-sm hover:brightness-110 active:scale-95 transition-all shadow-xl`}>Commit Artist</button>
              </div>
            </div>
          </div>
        )}

        {/* VIEW: ARTIST DETAIL */}
        {view === 'artist' && selectedArtist && (
          <div className="h-full flex flex-col animate-fade-in">
            {/* Artist Header */}
            <div className="px-6 pt-6 pb-2 shrink-0 bg-[#0a0a0a]">
                <div className="flex items-end justify-between mb-6">
                    <div>
                        <h2 className="text-4xl font-black tracking-tighter leading-none">{selectedArtist.name}</h2>
                        <p className={`text-[10px] ${ACCENT_COLOR} font-black uppercase tracking-[0.2em] mt-2`}>{selectedArtist.genre}</p>
                    </div>
                    <button onClick={() => setView('new-song')} className={`w-10 h-10 ${ACCENT_BG} text-black rounded-full flex items-center justify-center hover:scale-105 shadow-lg`}>
                        <Plus size={20} />
                    </button>
                </div>

                {/* Metrics Banner */}
                <div className="grid grid-cols-6 gap-2 mb-6">
                    <div className="bg-[#1c1c1e] p-2 rounded-xl border border-white/5 flex flex-col justify-center items-center text-center col-span-1">
                        <span className="text-[7px] uppercase font-black text-gray-500 tracking-tighter mb-1">Score</span>
                        <span className="text-lg font-black text-[#E6E6FA]">{artistMetrics.signatureScore}</span>
                    </div>
                    {[
                        { l: 'Vocab', v: artistMetrics.avgVocab },
                        { l: 'Meta', v: artistMetrics.avgMeta },
                        { l: 'Emo', v: artistMetrics.avgEmo },
                        { l: 'Struct', v: artistMetrics.avgStruct },
                        { l: 'Rhythm', v: artistMetrics.avgRhythm }
                    ].map(m => (
                        <div key={m.l} className="bg-[#1c1c1e] p-2 rounded-xl border border-white/5 flex flex-col items-center justify-center">
                            <span className="text-[6px] uppercase font-black text-gray-500 tracking-tighter mb-1 block">{m.l}</span>
                            <span className="text-xs font-bold">{m.v}</span>
                        </div>
                    ))}
                </div>

                {/* Tabs */}
                <div className="flex border-b border-white/10">
                    <button 
                        onClick={() => setArtistTab('songs')}
                        className={`flex-1 pb-3 text-xs font-bold uppercase tracking-widest transition-colors ${artistTab === 'songs' ? `text-white border-b-2 ${ACCENT_BORDER.replace('/20', '')}` : 'text-gray-600'}`}
                    >
                        Songs ({selectedArtist.songs.length})
                    </button>
                    <button 
                        onClick={() => setArtistTab('profile')}
                        className={`flex-1 pb-3 text-xs font-bold uppercase tracking-widest transition-colors ${artistTab === 'profile' ? `text-white border-b-2 ${ACCENT_BORDER.replace('/20', '')}` : 'text-gray-600'}`}
                    >
                        Holistic Profile
                    </button>
                </div>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-[#0a0a0a]">
                
                {/* SONGS TAB */}
                {artistTab === 'songs' && (
                    <div className="space-y-4 max-w-3xl mx-auto">
                        {/* Search & Pagination Controls */}
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
                                <input 
                                    type="text" 
                                    value={searchQuery}
                                    onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                                    placeholder="Search songs..."
                                    className="w-full bg-[#1c1c1e] border border-white/5 rounded-xl pl-9 pr-4 py-2.5 text-xs font-medium outline-none focus:border-white/20"
                                />
                            </div>
                            <div className="flex items-center bg-[#1c1c1e] rounded-xl border border-white/5 px-2">
                                <button 
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className="p-1.5 text-gray-400 hover:text-white disabled:opacity-30"
                                >
                                    <ChevronLeft size={14} />
                                </button>
                                <span className="text-[10px] font-mono w-12 text-center text-gray-500">{currentPage}/{Math.max(1, totalPages)}</span>
                                <button 
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages || totalPages === 0}
                                    className="p-1.5 text-gray-400 hover:text-white disabled:opacity-30"
                                >
                                    <ChevronRight size={14} />
                                </button>
                            </div>
                        </div>

                        {/* Song Grid */}
                        {visibleSongs.length === 0 ? (
                            <div className="text-center py-20 text-gray-500 text-xs">No songs found.</div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {paginatedSongs.map((song) => {
                                    const composite = Math.round(((song.vocabularyComplexity || 0) + (song.metaphoricDensity || 0) + (song.emotionalResonance || 0) + (song.structuralInnovation || 0) + (song.rhythmicSophistication || 0)) / 5);
                                    return (
                                        <button 
                                            key={song.originalIndex}
                                            onClick={() => { setSelectedSongIdx(song.originalIndex); setView('song-detail'); }}
                                            className="group text-left bg-[#1c1c1e] border border-white/5 hover:border-white/10 p-4 rounded-2xl transition-all hover:bg-[#252527]"
                                        >
                                            <div className="flex justify-between items-start mb-2">
                                                <span className={`text-xl font-black ${ACCENT_COLOR} group-hover:scale-110 transition-transform origin-left`}>{composite}</span>
                                                <ArrowRight size={14} className="text-gray-600 group-hover:text-white -rotate-45 group-hover:rotate-0 transition-all" />
                                            </div>
                                            <h4 className="font-bold text-sm truncate pr-2">{song.songTitle}</h4>
                                            <p className="text-[10px] text-gray-500 italic mt-1 line-clamp-1">"{song.linguisticSignature}"</p>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* PROFILE TAB */}
                {artistTab === 'profile' && (
                    <div className="max-w-3xl mx-auto space-y-6">
                        {!selectedArtist.profileAnalysis ? (
                            <div className="text-center py-20 bg-[#1c1c1e] border border-white/5 rounded-3xl">
                                <Sparkles size={32} className="mx-auto mb-4 text-gray-600" />
                                <h3 className="text-lg font-bold mb-2">Holistic Analysis</h3>
                                <p className="text-xs text-gray-500 max-w-xs mx-auto mb-6">
                                    Generate a deep-dive profile analyzing themes, vocabulary evolution, and signature style across all {selectedArtist.songs.length} songs.
                                </p>
                                <button 
                                    onClick={handleGenerateProfile}
                                    disabled={isGeneratingProfile}
                                    className={`px-6 py-3 ${ACCENT_BG} text-black rounded-full font-bold text-xs uppercase tracking-widest hover:scale-105 active:scale-95 transition-all flex items-center gap-2 mx-auto`}
                                >
                                    {isGeneratingProfile ? <Loader2 size={14} className="animate-spin" /> : <><Brain size={14} /> Generate Profile</>}
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-6 animate-slide-up">
                                <div className="bg-gradient-to-br from-indigo-900/20 to-purple-900/10 border border-indigo-500/20 p-6 rounded-3xl">
                                    <h3 className="text-xs font-black text-indigo-300 uppercase tracking-widest mb-3">Signature Style</h3>
                                    <p className="text-lg font-medium leading-relaxed">{selectedArtist.profileAnalysis.signatureStyle}</p>
                                </div>

                                <div className="grid md:grid-cols-2 gap-4">
                                    <div className="bg-[#1c1c1e] border border-white/5 p-5 rounded-2xl">
                                        <h4 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-2"><HistoryIcon size={12} /> Vocabulary Evolution</h4>
                                        <p className="text-sm text-gray-300 leading-relaxed">{selectedArtist.profileAnalysis.vocabularyEvolution}</p>
                                    </div>
                                    <div className="bg-[#1c1c1e] border border-white/5 p-5 rounded-2xl">
                                        <h4 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-2"><Waves size={12} /> Emotional Arc</h4>
                                        <p className="text-sm text-gray-300 leading-relaxed">{selectedArtist.profileAnalysis.emotionalArc}</p>
                                    </div>
                                </div>

                                <div className="bg-[#1c1c1e] border border-white/5 p-6 rounded-3xl">
                                    <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-4">Core Themes</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {selectedArtist.profileAnalysis.coreThemes.map(theme => (
                                            <span key={theme} className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs font-bold text-gray-300">
                                                {theme}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                <div className="bg-white/5 border border-white/10 p-6 rounded-3xl">
                                    <h3 className="text-xs font-black text-green-400 uppercase tracking-widest mb-3">Suggested Direction</h3>
                                    <p className="text-sm text-gray-200 leading-relaxed">{selectedArtist.profileAnalysis.suggestedCreativeDirection}</p>
                                </div>
                                
                                <button onClick={handleGenerateProfile} className="w-full py-4 text-xs font-bold text-gray-600 hover:text-white transition-colors">
                                    Refresh Profile
                                </button>
                            </div>
                        )}
                        
                        <div className="pt-10 border-t border-white/5">
                            <button onClick={() => deleteArtist(selectedArtist.id)} className="text-red-500/50 hover:text-red-500 text-xs font-bold uppercase tracking-widest transition-colors">
                                Delete Artist Profile
                            </button>
                        </div>
                    </div>
                )}
            </div>
          </div>
        )}

        {/* VIEW: SONG DETAIL (Full Page) */}
        {view === 'song-detail' && selectedArtist && selectedSongIdx !== null && (
            <div className="h-full flex flex-col bg-[#0a0a0a] animate-fade-in">
                {(() => {
                    const song = selectedArtist.songs[selectedSongIdx];
                    const composite = Math.round(((song.vocabularyComplexity || 0) + (song.metaphoricDensity || 0) + (song.emotionalResonance || 0) + (song.structuralInnovation || 0) + (song.rhythmicSophistication || 0)) / 5);
                    
                    return (
                        <>
                            {/* Detail Header */}
                            <div className="p-6 pb-2 border-b border-white/5 bg-[#0a0a0a] z-10">
                                <div className="flex justify-between items-start mb-6">
                                    <div>
                                        <h2 className="text-3xl font-black leading-tight max-w-md">{song.songTitle}</h2>
                                        <p className="text-sm text-gray-500 mt-1">{selectedArtist.name}</p>
                                    </div>
                                    <div className="text-center">
                                        <span className={`text-4xl font-black ${ACCENT_COLOR}`}>{composite}</span>
                                        <span className="block text-[8px] font-black uppercase tracking-widest text-gray-600 mt-1">Score</span>
                                    </div>
                                </div>
                                <div className="flex gap-4">
                                    <button 
                                        onClick={() => setSongDetailTab('analysis')}
                                        className={`pb-3 text-xs font-bold uppercase tracking-widest transition-colors border-b-2 ${songDetailTab === 'analysis' ? 'text-white border-white' : 'text-gray-600 border-transparent'}`}
                                    >
                                        Analysis
                                    </button>
                                    <button 
                                        onClick={() => setSongDetailTab('lyrics')}
                                        className={`pb-3 text-xs font-bold uppercase tracking-widest transition-colors border-b-2 ${songDetailTab === 'lyrics' ? 'text-white border-white' : 'text-gray-600 border-transparent'}`}
                                    >
                                        Full Lyrics
                                    </button>
                                </div>
                            </div>

                            {/* Detail Content */}
                            <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                                <div className="max-w-3xl mx-auto">
                                    {songDetailTab === 'analysis' && (
                                        <div className="space-y-6 animate-slide-up">
                                            <div className="bg-[#1c1c1e] p-6 rounded-2xl border border-white/5">
                                                <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-3">Linguistic Signature</h3>
                                                <p className="text-lg font-medium italic text-gray-200">"{song.linguisticSignature}"</p>
                                            </div>

                                            <div className="grid gap-3">
                                                <CategoryToggle id="vocab" label="Vocabulary" icon={BookOpen} value={song.vocabularyComplexity} description={song.detailedBreakdown.vocabulary} currentExpanded={expandedSection} />
                                                <CategoryToggle id="meta" label="Metaphor" icon={CloudRain} value={song.metaphoricDensity} description={song.detailedBreakdown.metaphors} currentExpanded={expandedSection} />
                                                <CategoryToggle id="emo" label="Emotional" icon={Brain} value={song.emotionalResonance} description={song.detailedBreakdown.emotion} currentExpanded={expandedSection} />
                                                <CategoryToggle id="struct" label="Structural" icon={Hash} value={song.structuralInnovation} description={song.detailedBreakdown.structure} currentExpanded={expandedSection} />
                                                <CategoryToggle id="rhythm" label="Rhythmic" icon={Waves} value={song.rhythmicSophistication} description={song.detailedBreakdown.rhythm} currentExpanded={expandedSection} />
                                            </div>

                                            <div className="bg-[#1c1c1e] p-6 rounded-2xl border border-white/5">
                                                <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-3">Key Metaphors</h3>
                                                <div className="flex flex-wrap gap-2">
                                                    {song.keyMetaphors.map((m, i) => (
                                                        <span key={i} className="px-3 py-1.5 bg-white/5 border border-white/5 rounded-lg text-xs font-medium text-gray-300">
                                                            {m}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {songDetailTab === 'lyrics' && (
                                        <div className="animate-slide-up">
                                            {song.originalLyrics ? (
                                                <div className="whitespace-pre-wrap font-medium text-lg leading-relaxed text-gray-300">
                                                    {song.originalLyrics}
                                                </div>
                                            ) : (
                                                <div className="py-20 text-center text-gray-500">
                                                    <FileText size={48} className="mx-auto mb-4 opacity-50" />
                                                    <p>Full lyrics were not saved for this track.</p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </>
                    );
                })()}
            </div>
        )}

        {/* VIEW: NEW SONG */}
        {view === 'new-song' && (
          <div className="h-full overflow-y-auto p-6 flex flex-col items-center justify-center animate-fade-in">
            <div className="w-full max-w-xl space-y-6">
                <div className="text-center">
                    <h2 className="text-2xl font-black">Linguistic Manuscript</h2>
                    <p className="text-gray-500 text-sm">Paste lyrics below for deep Gemini analysis.</p>
                </div>
                <div className="flex-1 flex flex-col space-y-4">
                    <input type="text" value={newSongTitle} onChange={(e) => setNewSongTitle(e.target.value)} placeholder="Song Title" className="w-full bg-[#1c1c1e] border border-white/10 rounded-xl px-5 py-4 outline-none focus:border-[#E6E6FA]/40 text-sm" />
                    <textarea value={newSongLyrics} onChange={(e) => setNewSongLyrics(e.target.value)} placeholder="Paste lyrics here..." className="flex-1 w-full bg-[#1c1c1e] border border-white/10 rounded-2xl px-5 py-4 outline-none focus:border-[#E6E6FA]/40 text-sm text-gray-300 leading-relaxed custom-scrollbar min-h-[300px]" />
                    <button onClick={handleAddSong} disabled={isLoading || !newSongTitle.trim() || !newSongLyrics.trim()} className={`w-full ${ACCENT_BG} text-black py-4 rounded-xl font-black text-sm hover:brightness-110 active:scale-95 transition-all disabled:opacity-40 flex items-center justify-center gap-2 shadow-xl`}>
                        {isLoading ? <Loader2 className="animate-spin" size={18} /> : <>Analyze and Persist</>}
                    </button>
                </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LyricsAI;
