import React, { useState, useEffect } from 'react';
import { Palette, Sparkles, Download, Image as ImageIcon, Monitor, Smartphone, Square, Maximize2, Loader2, Cloud, Check } from 'lucide-react';
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

const WallpaperAI: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [selectedStyle, setSelectedStyle] = useState(STYLES[0]);
  const [resolution, setResolution] = useState<"1K" | "2K" | "4K">("1K");
  const [aspectRatio, setAspectRatio] = useState<"9:16" | "16:9" | "1:1">("9:16");
  
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [credits, setCredits] = useState(0); 
  const [isSaving, setIsSaving] = useState(false);

  // --- INTELLIGENCE HOOK ---
  const { ref: imageRef, trackDownload } = useSystemIntelligence(AppID.WALLPAPER_AI, generatedImage ? selectedStyle : undefined);

  // Load Credits from Central System Core
  useEffect(() => {
      const init = async () => {
          await systemCore.init();
          setCredits(systemCore.getCredits());
      };
      init();
      
      const interval = setInterval(() => {
          setCredits(systemCore.getCredits());
      }, 5000);
      
      return () => clearInterval(interval);
  }, []);

  const handleGenerate = async () => {
    if (!prompt.trim() || isGenerating || credits <= 0) return;
    
    setIsGenerating(true);
    setGeneratedImage(null);
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

  const handleDownload = () => {
    if (!generatedImage) return;
    trackDownload(); 
    const link = document.createElement('a');
    link.href = `data:image/png;base64,${generatedImage}`;
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

          // FIXED: Now saves to the dedicated WALLPAPERS store
          await storage.add(STORES.WALLPAPERS, wallpaperData); 
          
          window.dispatchEvent(new CustomEvent('sys_wallpaper_added', { detail: wallpaperData }));
          alert("Saved to your collection!");
      } catch (e) {
          console.error("Save failed", e);
          alert("Failed to save wallpaper.");
      } finally {
          setIsSaving(false);
      }
  };

  const handleSetWallpaper = async () => {
      if (!generatedImage) return;
      try {
          await storage.set(STORES.SYSTEM, 'wallpaper_id', 'custom_generated');
          window.dispatchEvent(new CustomEvent('sys_settings_update', { 
              detail: { wallpaperImage: `data:image/png;base64,${generatedImage}` } 
          }));
          alert("Wallpaper updated!");
      } catch (e) {
          console.error(e);
      }
  };

  return (
    <div className="h-full bg-[#0a0a0a] text-white flex flex-col font-sans overflow-hidden">
      {/* Header */}
      <div className="h-16 border-b border-white/5 px-6 flex items-center justify-between bg-black/40 backdrop-blur-md shrink-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center shadow-lg shadow-pink-900/20">
            <Palette size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold leading-none">WallpaperAI</h1>
            <div className="flex items-center gap-2 mt-1">
                <p className="text-[10px] text-gray-500 font-medium uppercase tracking-widest">Gemini 3 Image Gen</p>
                <span className={`text-[10px] px-1.5 py-0.5 rounded ${credits > 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                    {credits} Credits Left
                </span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Controls Sidebar */}
        <div className="w-full md:w-96 flex flex-col p-6 border-r border-white/5 overflow-y-auto custom-scrollbar bg-[#1c1c1e]/50">
          <div className="space-y-8">
            <div className="space-y-3">
              <label className="text-xs font-black uppercase text-gray-500 tracking-widest">Vision Prompt</label>
              <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Describe your dream wallpaper..." className="w-full h-32 bg-[#000000]/40 border border-white/10 rounded-2xl p-4 text-sm font-medium outline-none focus:border-pink-500/50 resize-none transition-all placeholder-gray-600" />
            </div>
            <div className="space-y-3">
              <label className="text-xs font-black uppercase text-gray-500 tracking-widest">Aesthetic</label>
              <div className="flex flex-wrap gap-2">
                {STYLES.map(style => (
                  <button key={style} onClick={() => setSelectedStyle(style)} className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${selectedStyle === style ? 'bg-pink-500 text-white border-pink-500' : 'bg-white/5 border-white/5 text-gray-400 hover:bg-white/10'}`}>{style}</button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <label className="text-xs font-black uppercase text-gray-500 tracking-widest">Format</label>
                <div className="flex flex-col gap-2">
                  {RATIOS.map(r => (
                    <button key={r.value} onClick={() => setAspectRatio(r.value as any)} className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold border transition-all ${aspectRatio === r.value ? 'bg-white text-black border-white' : 'bg-white/5 border-white/5 text-gray-400 hover:bg-white/10'}`}><r.icon size={14} /> {r.label}</button>
                  ))}
                </div>
              </div>
              <div className="space-y-3">
                <label className="text-xs font-black uppercase text-gray-500 tracking-widest">Quality</label>
                <div className="flex flex-col gap-2">
                  {RESOLUTIONS.map(res => (
                    <button key={res} onClick={() => setResolution(res)} className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold border transition-all ${resolution === res ? 'bg-white text-black border-white' : 'bg-white/5 border-white/5 text-gray-400 hover:bg-white/10'}`}>{res} {resolution === res && <Maximize2 size={12} />}</button>
                  ))}
                </div>
              </div>
            </div>
            <button onClick={handleGenerate} disabled={isGenerating || !prompt.trim() || credits <= 0} className="w-full py-4 bg-gradient-to-r from-pink-600 to-rose-600 rounded-2xl font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-pink-900/20 disabled:opacity-50 disabled:scale-100">
              {isGenerating ? <Loader2 size={18} className="animate-spin" /> : <><Sparkles size={18} /> {credits > 0 ? 'Generate' : 'No Credits'}</>}
            </button>
          </div>
        </div>

        {/* Preview Area */}
        <div className="flex-1 bg-black relative flex items-center justify-center p-8 overflow-hidden">
          <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, #333 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
          {generatedImage ? (
            <div ref={imageRef} className="relative group max-w-full max-h-full flex flex-col items-center">
              <img src={`data:image/png;base64,${generatedImage}`} alt="Generated Wallpaper" className={`max-w-full max-h-[80vh] shadow-2xl rounded-lg border border-white/10 object-contain ${aspectRatio === '9:16' ? 'aspect-[9/16]' : aspectRatio === '16:9' ? 'aspect-video' : 'aspect-square'}`} />
              <div className="absolute bottom-6 flex gap-3 opacity-0 group-hover:opacity-100 transition-opacity translate-y-2 group-hover:translate-y-0 duration-300">
                <button onClick={handleDownload} className="px-6 py-3 bg-white/10 backdrop-blur-md border border-white/20 text-white rounded-full font-bold text-sm shadow-xl flex items-center gap-2 hover:bg-white/20 transition-all"><Download size={18} /> Save</button>
                <button onClick={handleSaveToCloud} disabled={isSaving} className="px-6 py-3 bg-white/10 backdrop-blur-md border border-white/20 text-white rounded-full font-bold text-sm shadow-xl flex items-center gap-2 hover:bg-white/20 transition-all">{isSaving ? <Loader2 size={18} className="animate-spin"/> : <Cloud size={18} />} Cloud</button>
                <button onClick={handleSetWallpaper} className="px-6 py-3 bg-white text-black rounded-full font-bold text-sm shadow-xl flex items-center gap-2 hover:scale-105 transition-transform"><Check size={18} /> Set Wallpaper</button>
              </div>
            </div>
          ) : (
            <div className="text-center text-gray-600 opacity-50 select-none">
              {isGenerating ? (
                <div className="flex flex-col items-center gap-4"><div className="w-16 h-16 border-4 border-pink-500/30 border-t-pink-500 rounded-full animate-spin" /><p className="text-sm font-bold tracking-widest uppercase animate-pulse">Dreaming...</p></div>
              ) : (
                <div className="flex flex-col items-center gap-4"><ImageIcon size={64} strokeWidth={1} /><p className="text-lg font-medium">Your canvas is empty.</p></div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WallpaperAI;