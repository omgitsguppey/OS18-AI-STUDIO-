import React, { useState, useEffect } from 'react';
import { 
  Palette, Sparkles, Download, Image as ImageIcon, Monitor, 
  Smartphone, Square, Maximize2, Loader2, Cloud, Check, 
  Layers, Grid, ArrowRight 
} from 'lucide-react';
import { generateWallpaper } from '../services/geminiService';
import { storage, STORES } from '../services/storageService';
import { systemCore } from '../services/systemCore'; 
import { AppID } from '../types';
import { useSystemIntelligence } from '../hooks/useSystemIntelligence';

const STYLES = ["Photorealistic", "Cyberpunk", "Minimalist", "Abstract 3D", "Oil Painting", "Anime", "Synthwave", "Nature Photography", "Dark Fantasy", "Geometric"];
const RESOLUTIONS = ["1K", "2K", "4K"] as const;
const RATIOS = [
  { label: "Phone", value: "9:16", icon: Smartphone },
  { label: "Desktop", value: "16:9", icon: Monitor },
  { label: "Square", value: "1:1", icon: Square }
] as const;

type Tab = 'studio' | 'preview' | 'collection';

const WallpaperAI: React.FC = () => {
  // --- STATE ---
  const [activeTab, setActiveTab] = useState<Tab>('studio');
  const [prompt, setPrompt] = useState('');
  const [selectedStyle, setSelectedStyle] = useState(STYLES[0]);
  const [resolution, setResolution] = useState<"1K" | "2K" | "4K">("1K");
  const [aspectRatio, setAspectRatio] = useState<"9:16" | "16:9" | "1:1">("9:16");
  
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [credits, setCredits] = useState(0); 
  const [isSaving, setIsSaving] = useState(false);
  
  // Local Collection State
  const [collection, setCollection] = useState<any[]>([]);

  // --- INTELLIGENCE HOOK ---
  const { ref: imageRef, trackDownload } = useSystemIntelligence(AppID.WALLPAPER_AI, generatedImage ? selectedStyle : undefined);

  // --- INIT & LISTENERS ---
  useEffect(() => {
      const init = async () => {
          await systemCore.init();
          setCredits(systemCore.getCredits());
          
          // Load Collection
          const saved = await storage.getAll<any>(STORES.WALLPAPERS);
          setCollection(saved.sort((a, b) => b.createdAt - a.createdAt));
      };
      init();
      
      const interval = setInterval(() => {
          setCredits(systemCore.getCredits());
      }, 5000);
      
      const handleNewWallpaper = (e: any) => {
          setCollection(prev => [e.detail, ...prev]);
      };
      window.addEventListener('sys_wallpaper_added', handleNewWallpaper);
      
      return () => {
          clearInterval(interval);
          window.removeEventListener('sys_wallpaper_added', handleNewWallpaper);
      };
  }, []);

  // --- HANDLERS ---

  const handleGenerate = async () => {
    if (!prompt.trim() || isGenerating || credits <= 0) return;
    
    setIsGenerating(true);
    // Don't clear image yet, so we don't flash empty if they switch tabs
    try {
      const success = await systemCore.useCredit(1);
      if (!success) {
          alert("Insufficient credits.");
          setIsGenerating(false);
          return;
      }
      setCredits(systemCore.getCredits()); 

      const base64 = await generateWallpaper(prompt, selectedStyle, resolution, aspectRatio);
      if (base64) {
        setGeneratedImage(base64);
        setActiveTab('preview'); // AUTO-SWITCH TO PREVIEW
      } else {
        alert("Generation failed. Please try again.");
      }
    } catch (e) {
      console.error(e);
      alert("Generation error. Check your API key quotas.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = (imgData: string) => {
    trackDownload(); 
    const link = document.createElement('a');
    link.href = `data:image/png;base64,${imgData}`;
    link.download = `wallpaper-${Date.now()}.png`;
    link.click();
  };

  const handleSaveToCloud = async () => {
      if (!generatedImage || isSaving) return;
      setIsSaving(true);
      try {
          const wallpaperId = `wp_${Date.now()}`;
          const wallpaperData = {
              id: wallpaperId,
              name: prompt.substring(0, 20) || "Untitled",
              thumbnail: `data:image/png;base64,${generatedImage}`, 
              style: { backgroundImage: `url(data:image/png;base64,${generatedImage})` },
              createdAt: Date.now()
          };

          await storage.add(STORES.WALLPAPERS, wallpaperData); 
          window.dispatchEvent(new CustomEvent('sys_wallpaper_added', { detail: wallpaperData }));
          alert("Saved to Collection!");
      } catch (e) {
          console.error("Save failed", e);
      } finally {
          setIsSaving(false);
      }
  };

  const handleSetWallpaper = async (imgData: string) => {
      try {
          await storage.set(STORES.SYSTEM, 'wallpaper_id', 'custom_generated');
          window.dispatchEvent(new CustomEvent('sys_settings_update', { 
              detail: { wallpaperImage: `data:image/png;base64,${imgData}` } 
          }));
          alert("Wallpaper updated!");
      } catch (e) {
          console.error(e);
      }
  };

  const restoreFromCollection = (item: any) => {
      // Strip the prefix if present to get raw base64 or usage
      const base64 = item.thumbnail.replace('url(', '').replace(')', '');
      setGeneratedImage(base64.replace('data:image/png;base64,', ''));
      setActiveTab('preview');
  };

  // --- RENDER HELPERS ---

  return (
    <div className="h-full bg-[#0a0a0a] text-white flex flex-col font-sans overflow-hidden">
      
      {/* Header */}
      <div className="h-16 border-b border-white/5 px-4 flex items-center justify-between bg-black/40 backdrop-blur-md shrink-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center shadow-lg shadow-pink-900/20">
            <Palette size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold leading-none">WallpaperAI</h1>
            <p className="text-[10px] text-gray-500 font-medium uppercase tracking-widest mt-0.5">{credits} Credits</p>
          </div>
        </div>
        
        {/* Tab Switcher (Desktop/Tablet) */}
        <div className="hidden md:flex bg-white/5 p-1 rounded-lg">
            {(['studio', 'preview', 'collection'] as Tab[]).map(t => (
                <button
                    key={t}
                    onClick={() => setActiveTab(t)}
                    className={`px-4 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-all ${activeTab === t ? 'bg-white text-black shadow-sm' : 'text-gray-400 hover:text-white'}`}
                >
                    {t}
                </button>
            ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar relative">
        
        {/* TAB: STUDIO */}
        {activeTab === 'studio' && (
            <div className="p-6 max-w-2xl mx-auto space-y-8 animate-fade-in">
                <div className="space-y-3">
                    <label className="text-xs font-black uppercase text-gray-500 tracking-widest flex justify-between">
                        <span>Vision Prompt</span>
                        <span className="text-pink-500">{prompt.length}/200</span>
                    </label>
                    <textarea 
                        value={prompt} 
                        onChange={(e) => setPrompt(e.target.value)} 
                        placeholder="Describe your dream wallpaper..." 
                        className="w-full h-32 bg-[#1c1c1e] border border-white/10 rounded-2xl p-4 text-sm font-medium outline-none focus:border-pink-500/50 resize-none transition-all placeholder-gray-600 focus:bg-black" 
                    />
                </div>

                <div className="space-y-3">
                    <label className="text-xs font-black uppercase text-gray-500 tracking-widest">Aesthetic</label>
                    <div className="flex flex-wrap gap-2">
                    {STYLES.map(style => (
                        <button key={style} onClick={() => setSelectedStyle(style)} className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all ${selectedStyle === style ? 'bg-pink-500 text-white border-pink-500' : 'bg-white/5 border-white/5 text-gray-400 hover:bg-white/10'}`}>{style}</button>
                    ))}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-3">
                        <label className="text-xs font-black uppercase text-gray-500 tracking-widest">Format</label>
                        <div className="space-y-2">
                            {RATIOS.map(r => (
                                <button key={r.value} onClick={() => setAspectRatio(r.value as any)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold border transition-all ${aspectRatio === r.value ? 'bg-white text-black border-white' : 'bg-white/5 border-white/5 text-gray-400 hover:bg-white/10'}`}>
                                    <r.icon size={16} /> {r.label}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="space-y-3">
                        <label className="text-xs font-black uppercase text-gray-500 tracking-widest">Quality</label>
                        <div className="space-y-2">
                            {RESOLUTIONS.map(res => (
                                <button key={res} onClick={() => setResolution(res)} className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-bold border transition-all ${resolution === res ? 'bg-white text-black border-white' : 'bg-white/5 border-white/5 text-gray-400 hover:bg-white/10'}`}>
                                    {res} {resolution === res && <Maximize2 size={14} />}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="h-20" /> {/* Spacer for FAB */}
            </div>
        )}

        {/* TAB: PREVIEW */}
        {activeTab === 'preview' && (
            <div className="h-full flex flex-col items-center justify-center p-6 animate-fade-in relative bg-black/50">
                <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, #333 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
                
                {generatedImage ? (
                    <div ref={imageRef} className="relative w-full h-full flex flex-col items-center justify-center gap-6">
                        <img 
                            src={`data:image/png;base64,${generatedImage}`} 
                            alt="Generated Wallpaper" 
                            className={`max-w-full max-h-[60vh] md:max-h-[70vh] shadow-2xl rounded-lg border border-white/10 object-contain ${aspectRatio === '9:16' ? 'aspect-[9/16]' : aspectRatio === '16:9' ? 'aspect-video' : 'aspect-square'}`} 
                        />
                        
                        <div className="flex flex-wrap justify-center gap-4 w-full max-w-md">
                            <button onClick={() => handleDownload(generatedImage!)} className="flex-1 py-3 bg-white/10 backdrop-blur-md border border-white/20 text-white rounded-xl font-bold text-sm shadow-xl flex items-center justify-center gap-2 hover:bg-white/20 transition-all">
                                <Download size={18} /> Save Device
                            </button>
                            <button onClick={handleSaveToCloud} disabled={isSaving} className="flex-1 py-3 bg-white/10 backdrop-blur-md border border-white/20 text-white rounded-xl font-bold text-sm shadow-xl flex items-center justify-center gap-2 hover:bg-white/20 transition-all">
                                {isSaving ? <Loader2 size={18} className="animate-spin"/> : <Cloud size={18} />} Collection
                            </button>
                            <button onClick={() => handleSetWallpaper(generatedImage!)} className="w-full py-3 bg-white text-black rounded-xl font-bold text-sm shadow-xl flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform">
                                <Check size={18} /> Set as System Wallpaper
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="text-center text-gray-500 opacity-60 flex flex-col items-center gap-4">
                        <ImageIcon size={64} strokeWidth={1} />
                        <p>No image generated yet.</p>
                        <button onClick={() => setActiveTab('studio')} className="text-pink-500 font-bold hover:underline">Go to Studio</button>
                    </div>
                )}
            </div>
        )}

        {/* TAB: COLLECTION */}
        {activeTab === 'collection' && (
            <div className="p-4 grid grid-cols-2 md:grid-cols-3 gap-4 animate-fade-in">
                {collection.length === 0 ? (
                    <div className="col-span-full text-center text-gray-500 py-20">
                        <Grid size={48} className="mx-auto mb-4 opacity-50" />
                        <p>Your collection is empty.</p>
                    </div>
                ) : (
                    collection.map((item) => (
                        <div key={item.id} onClick={() => restoreFromCollection(item)} className="aspect-[9/16] bg-gray-800 rounded-xl overflow-hidden border border-white/10 relative group cursor-pointer">
                            <div className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110" style={{ backgroundImage: item.thumbnail.includes('url') ? item.thumbnail : `url(${item.thumbnail})` }} />
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <ArrowRight className="text-white" />
                            </div>
                        </div>
                    ))
                )}
            </div>
        )}

      </div>

      {/* Floating Action Button (Generate) - Only on Studio Tab */}
      {activeTab === 'studio' && (
        <div className="absolute bottom-20 right-6 md:bottom-8 md:right-8 z-20">
            <button 
                onClick={handleGenerate} 
                disabled={isGenerating || !prompt.trim() || credits <= 0}
                className="h-16 px-8 bg-gradient-to-r from-pink-600 to-rose-600 rounded-full font-black text-lg uppercase tracking-wider flex items-center gap-3 hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-pink-900/40 disabled:opacity-50 disabled:scale-100 disabled:grayscale"
            >
                {isGenerating ? <Loader2 size={24} className="animate-spin" /> : <><Sparkles size={24} /> Generate</>}
            </button>
        </div>
      )}

      {/* Mobile Bottom Tab Bar */}
      <div className="md:hidden h-16 bg-[#1c1c1e] border-t border-white/10 flex items-center justify-around shrink-0 z-20 safe-area-pb">
        <button onClick={() => setActiveTab('studio')} className={`flex flex-col items-center gap-1 ${activeTab === 'studio' ? 'text-pink-500' : 'text-gray-500'}`}>
            <Layers size={20} />
            <span className="text-[10px] font-bold uppercase tracking-wide">Studio</span>
        </button>
        <button onClick={() => setActiveTab('preview')} className={`flex flex-col items-center gap-1 ${activeTab === 'preview' ? 'text-pink-500' : 'text-gray-500'}`}>
            <ImageIcon size={20} />
            <span className="text-[10px] font-bold uppercase tracking-wide">Preview</span>
        </button>
        <button onClick={() => setActiveTab('collection')} className={`flex flex-col items-center gap-1 ${activeTab === 'collection' ? 'text-pink-500' : 'text-gray-500'}`}>
            <Grid size={20} />
            <span className="text-[10px] font-bold uppercase tracking-wide">Collection</span>
        </button>
      </div>

    </div>
  );
};

export default WallpaperAI;