
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Library, 
  Plus, 
  ChevronRight, 
  Disc, 
  Music, 
  Check, 
  PlusCircle,
  FolderPlus,
  LayoutGrid,
  Loader2,
  Mic2,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { storage, STORES } from '../services/storageService';
import { AppID } from '../types';

interface LyricAnalysis {
  songTitle: string;
  linguisticSignature: string;
}

interface Artist {
  id: string;
  name: string;
  songs: LyricAnalysis[];
}

interface Album {
  id: string;
  artistId: string;
  title: string;
  songTitles: string[];
  createdAt: number;
}

interface AlbumsAIProps {
  onNavigate?: (appId: AppID) => void;
}

const ACCENT_COLOR = 'text-[#007AFF]';
const ACCENT_BG = 'bg-[#007AFF]';

const AlbumsAI: React.FC<AlbumsAIProps> = ({ onNavigate }) => {
  const [artists, setArtists] = useState<Artist[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [view, setView] = useState<'hub' | 'artist-detail' | 'new-album' | 'album-detail'>('hub');
  const [selectedArtistId, setSelectedArtistId] = useState<string | null>(null);
  const [selectedAlbumId, setSelectedAlbumId] = useState<string | null>(null);

  // Form State
  const [newAlbumTitle, setNewAlbumTitle] = useState('');

  // Initial Sync from IndexedDB
  useEffect(() => {
    const loadData = async () => {
      try {
        const [a, alb] = await Promise.all([
          storage.get<Artist[]>(STORES.LYRICS, 'artists_list'),
          storage.get<Album[]>(STORES.ALBUMS, 'projects_list')
        ]);
        if (a) setArtists(a);
        if (alb) setAlbums(alb);
      } catch (e) {
        console.error("Albums storage load failed", e);
      } finally {
        setIsReady(true);
      }
    };
    loadData();

    // Listen for updates from LyricsAI
    const sync = () => loadData();
    window.addEventListener('lyrics_updated', sync);
    return () => window.removeEventListener('lyrics_updated', sync);
  }, []);

  // Save albums to IndexedDB
  useEffect(() => {
    if (!isReady) return;
    storage.set(STORES.ALBUMS, 'projects_list', albums).catch(console.error);
  }, [albums, isReady]);

  const selectedArtist = useMemo(() => artists.find(a => a.id === selectedArtistId), [artists, selectedArtistId]);
  const selectedAlbum = useMemo(() => albums.find(a => a.id === selectedAlbumId), [albums, selectedAlbumId]);
  
  const albumsForSelectedArtist = useMemo(() => 
    albums.filter(alb => alb.artistId === selectedArtistId), 
  [albums, selectedArtistId]);

  const handleCreateAlbum = () => {
    if (!newAlbumTitle.trim() || !selectedArtistId) return;
    const newAlbum: Album = {
      id: Date.now().toString(),
      artistId: selectedArtistId,
      title: newAlbumTitle,
      songTitles: [],
      createdAt: Date.now()
    };
    setAlbums([...albums, newAlbum]);
    setNewAlbumTitle('');
    setView('artist-detail');
  };

  const toggleSongInAlbum = (albumId: string, songTitle: string) => {
    setAlbums(prev => prev.map(alb => {
      if (alb.id === albumId) {
        const hasSong = alb.songTitles.includes(songTitle);
        return {
          ...alb,
          songTitles: hasSong 
            ? alb.songTitles.filter(t => t !== songTitle)
            : [...alb.songTitles, songTitle]
        };
      }
      return alb;
    }));
  };

  const deleteAlbum = (id: string) => {
    if (confirm("Delete this album project? Data manuscripts remain in IndexedDB.")) {
      setAlbums(prev => prev.filter(a => a.id !== id));
      setView('artist-detail');
    }
  };

  if (!isReady) return (
    <div className="h-full bg-black flex items-center justify-center">
      <Loader2 className="animate-spin text-white/20" size={32} />
    </div>
  );

  return (
    <div className="h-full bg-[#0a0a0a] text-white flex flex-col font-sans overflow-hidden">
      <div className="h-14 border-b border-white/5 px-5 flex items-center justify-between bg-black/40 backdrop-blur-xl shrink-0">
        <div className="flex items-center gap-2.5">
          <div className={`w-8 h-8 rounded-lg ${ACCENT_BG} flex items-center justify-center shadow-lg shadow-blue-500/20`}>
            <Library size={18} className="text-white" />
          </div>
          <span className="text-sm font-bold tracking-tight">AlbumsAI</span>
        </div>
        {view !== 'hub' && (
          <button 
            onClick={() => {
              if (view === 'artist-detail') setView('hub');
              else if (view === 'new-album' || view === 'album-detail') setView('artist-detail');
            }}
            className="text-sm text-gray-400 font-semibold px-3 py-1 hover:bg-white/5 rounded-full"
          >
            Back
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-5 max-w-2xl mx-auto w-full">
        {view === 'hub' && (
          <div className="space-y-6 animate-fade-in">
            <h2 className="text-2xl font-black tracking-tight">Artist Registry</h2>
            {artists.length === 0 ? (
              <div className="py-16 px-6 bg-[#1c1c1e] border border-white/5 rounded-[2rem] flex flex-col items-center justify-center text-center">
                <div className="w-20 h-20 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 mb-6">
                  <Mic2 size={40} />
                </div>
                <h3 className="text-xl font-bold mb-2">Registry is Empty</h3>
                <p className="text-gray-400 text-sm mb-8 leading-relaxed max-w-xs">
                  AlbumsAI organizes data from your linguistic analysis sessions. Analyze songs in the LyricsAI app to populate this registry.
                </p>
                <div className="w-full space-y-3">
                  <div className="flex items-center gap-3 p-4 bg-white/5 rounded-2xl border border-white/5 text-left">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
                      <Sparkles size={16} />
                    </div>
                    <div>
                      <p className="text-xs font-bold">Step 1: Analyze</p>
                      <p className="text-[10px] text-gray-500">Use LyricsAI to audit song manuscripts.</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-4 bg-white/5 rounded-2xl border border-white/5 text-left opacity-50">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
                      <LayoutGrid size={16} />
                    </div>
                    <div>
                      <p className="text-xs font-bold">Step 2: Organize</p>
                      <p className="text-[10px] text-gray-500">Group those findings into album projects here.</p>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => onNavigate?.(AppID.LYRICS_AI)}
                  className="mt-8 text-[11px] font-black uppercase tracking-widest text-white flex items-center gap-2 bg-white/10 hover:bg-white/20 px-6 py-3 rounded-full transition-all active:scale-95"
                >
                  Visit LyricsAI to begin <ArrowRight size={12} className="text-blue-500" />
                </button>
              </div>
            ) : (
              <div className="grid gap-3">
                {artists.map(artist => {
                  const artistAlbumCount = albums.filter(a => a.artistId === artist.id).length;
                  return (
                    <div key={artist.id} onClick={() => { setSelectedArtistId(artist.id); setView('artist-detail'); }} className="group bg-[#1c1c1e] border border-white/5 rounded-2xl p-5 hover:bg-[#252527] cursor-pointer transition-all flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-gray-400 group-hover:text-blue-400 transition-colors">
                          <Disc size={22} />
                        </div>
                        <div>
                          <h3 className="font-bold text-lg leading-tight">{artist.name}</h3>
                          <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest">{artist.songs.length} Track Pool • {artistAlbumCount} Albums</p>
                        </div>
                      </div>
                      <ChevronRight size={18} className="text-gray-600" />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {view === 'artist-detail' && selectedArtist && (
          <div className="space-y-8 animate-fade-in">
            <div className="flex items-end justify-between border-b border-white/5 pb-6">
              <div>
                <h2 className="text-4xl font-black tracking-tighter leading-none">{selectedArtist.name}</h2>
                <p className={`text-[10px] ${ACCENT_COLOR} font-black uppercase tracking-[0.2em] mt-2`}>Projects</p>
              </div>
              <button onClick={() => setView('new-album')} className={`w-10 h-10 ${ACCENT_BG} text-white rounded-full flex items-center justify-center hover:scale-105 active:scale-95 shadow-lg`}>
                <PlusCircle size={20} />
              </button>
            </div>
            <div className="grid gap-4">
              {albumsForSelectedArtist.length === 0 ? (
                <div className="py-20 border-2 border-dashed border-white/5 rounded-[2rem] flex flex-col items-center justify-center text-gray-500">
                  <FolderPlus size={32} className="mb-4 opacity-20" />
                  <p className="text-sm font-bold">No projects for this artist.</p>
                  <button onClick={() => setView('new-album')} className="text-xs text-blue-500 mt-3 font-bold flex items-center gap-1.5 bg-blue-500/10 px-4 py-2 rounded-full">
                    Create Your First Album <Plus size={14} />
                  </button>
                </div>
              ) : (
                albumsForSelectedArtist.map(album => (
                  <div key={album.id} onClick={() => { setSelectedAlbumId(album.id); setView('album-detail'); }} className="bg-[#1c1c1e] border border-white/5 rounded-2xl p-5 hover:bg-[#252527] transition-all cursor-pointer flex items-center justify-between group">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center text-blue-400">
                        <LayoutGrid size={20} />
                      </div>
                      <div>
                        <h4 className="font-bold">{album.title}</h4>
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{album.songTitles.length} Selections</p>
                      </div>
                    </div>
                    <ChevronRight size={18} className="text-gray-700" />
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {view === 'new-album' && (
          <div className="h-full flex flex-col animate-fade-in space-y-8 py-10">
            <h2 className="text-3xl font-black text-center">New Project</h2>
            <div className="space-y-4">
              <input type="text" value={newAlbumTitle} onChange={(e) => setNewAlbumTitle(e.target.value)} placeholder="Title" className="w-full bg-[#1c1c1e] border border-white/10 rounded-xl px-5 py-4 outline-none text-sm font-medium" />
              <button onClick={handleCreateAlbum} className={`w-full ${ACCENT_BG} text-white py-4 rounded-xl font-black text-sm active:scale-95 transition-all shadow-xl`}>Commit Project</button>
            </div>
          </div>
        )}

        {view === 'album-detail' && selectedAlbum && selectedArtist && (
          <div className="space-y-8 animate-fade-in">
            <h2 className="text-3xl font-black tracking-tight">{selectedAlbum.title}</h2>
            <div className="space-y-3">
              <h3 className="text-[10px] font-black uppercase text-gray-500 tracking-widest">Available Track Selections</h3>
              {selectedArtist.songs.length === 0 ? (
                <p className="text-xs text-gray-500 italic p-4 text-center">No source data in IndexedDB.</p>
              ) : (
                <div className="grid gap-2">
                  {selectedArtist.songs.map((song, idx) => {
                    const isSelected = selectedAlbum.songTitles.includes(song.songTitle);
                    return (
                      <button key={idx} onClick={() => toggleSongInAlbum(selectedAlbum.id, song.songTitle)} className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all ${isSelected ? 'bg-blue-500/10 border-blue-500/30' : 'bg-[#1c1c1e] border-white/5 hover:bg-[#252527]'}`}>
                        <div className="flex items-center gap-3 text-left">
                          <div className={`p-1.5 rounded-lg ${isSelected ? 'bg-blue-500 text-white' : 'bg-white/5 text-gray-600'}`}>
                            {isSelected ? <Check size={12} strokeWidth={4} /> : <Plus size={12} />}
                          </div>
                          <span className={`text-sm font-bold ${isSelected ? 'text-white' : 'text-gray-300'}`}>{song.songTitle}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="pt-8 flex flex-col gap-3">
              <button onClick={() => setView('artist-detail')} className="w-full py-4 bg-white/5 text-white font-bold rounded-2xl text-xs uppercase tracking-widest">Back to Projects</button>
              <button onClick={() => deleteAlbum(selectedAlbum.id)} className="w-full py-4 text-red-500/40 text-[10px] font-black uppercase tracking-widest">Delete Project</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AlbumsAI;
