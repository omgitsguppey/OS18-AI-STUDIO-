
import React, { useState, useEffect, useRef, Suspense, memo } from 'react';
import { ALL_APPS, INITIAL_INSTALLED_APPS, WALLPAPERS } from './constants';
import { AppID, AppConfig } from './types';
import AppIcon from './components/AppIcon';
import Window from './components/Window';
import { Wifi, Battery, Search, Loader2 } from 'lucide-react';
import { systemCore } from './services/systemCore';
import { storage, STORES } from './services/storageService';

// --- LAZY LOADED APPS (Code Splitting) ---
const Calculator = React.lazy(() => import('./apps/Calculator'));
const AppStore = React.lazy(() => import('./apps/AppStore'));
const TipsApp = React.lazy(() => import('./apps/TipsApp'));
const SettingsApp = React.lazy(() => import('./apps/SettingsApp'));
const DramaTracker = React.lazy(() => import('./apps/DramaTracker'));
const JustSellIt = React.lazy(() => import('./apps/JustSellIt'));
const LyricsAI = React.lazy(() => import('./apps/LyricsAI'));
const AlbumsAI = React.lazy(() => import('./apps/AlbumsAI'));
const LinkFlipper = React.lazy(() => import('./apps/LinkFlipper'));
const CaptionsAI = React.lazy(() => import('./apps/CaptionsAI'));
const PasswordsApp = React.lazy(() => import('./apps/PasswordsApp'));
const MarkupAI = React.lazy(() => import('./apps/MarkupAI'));
const ConvertAI = React.lazy(() => import('./apps/ConvertAI'));
const ContentAI = React.lazy(() => import('./apps/ContentAI'));
const AnalyticsAI = React.lazy(() => import('./apps/AnalyticsAI'));
const CareerAI = React.lazy(() => import('./apps/CareerAI'));
const TrendsAI = React.lazy(() => import('./apps/TrendsAI'));
const WallpaperAI = React.lazy(() => import('./apps/WallpaperAI'));
const GetFamous = React.lazy(() => import('./apps/GetFamous'));
const PriorityAI = React.lazy(() => import('./apps/PriorityAI'));
const BrandKitAI = React.lazy(() => import('./apps/BrandKitAI'));
const ViralPlanAI = React.lazy(() => import('./apps/ViralPlanAI'));
const AIPlayground = React.lazy(() => import('./apps/AIPlayground'));
const PlaylistAI = React.lazy(() => import('./apps/PlaylistAI'));
const Achievements = React.lazy(() => import('./apps/Achievements'));
const NSFWAI = React.lazy(() => import('./apps/NSFWAI'));
const TrapAI = React.lazy(() => import('./apps/TrapAI'));
const OperatorAI = React.lazy(() => import('./apps/OperatorAI'));
const SpeechAI = React.lazy(() => import('./apps/SpeechAI'));
const ShortsStudio = React.lazy(() => import('./apps/ShortsStudio'));

const APPS_PER_PAGE = 24;

const LoadingFallback = () => (
  <div className="h-full flex items-center justify-center bg-[#1c1c1e] text-white">
    <Loader2 size={32} className="animate-spin opacity-50" />
  </div>
);

// Isolated Status Bar to prevent parent re-renders on clock tick
const StatusBar = memo(() => {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="absolute top-[env(safe-area-inset-top)] left-0 right-0 h-10 flex items-center justify-between px-6 text-sm font-medium z-[100] text-white/90 bg-transparent pointer-events-none">
       <div className="flex items-center gap-4"><span className="font-bold tracking-tight">OS 18</span></div>
       <div className="flex items-center gap-4">
           <div className="flex items-center gap-2"><Wifi size={16} /><div className="relative flex items-center justify-center"><div className="absolute top-[27%] left-[12%] h-[45%] w-[52%] bg-white rounded-[1.5px]" /><Battery size={20} className="relative z-10" /></div></div>
           <span className="tabular-nums">{time.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>
       </div>
    </div>
  );
});

const App: React.FC = () => {
  const [installedApps, setInstalledApps] = useState<AppID[]>(INITIAL_INSTALLED_APPS);
  const [openApps, setOpenApps] = useState<AppID[]>([]);
  const [activeApp, setActiveApp] = useState<AppID | null>(null);
  const [zIndices, setZIndices] = useState<Record<AppID, number>>({} as any);
  const [isEditMode, setIsEditMode] = useState(false);
  const [wallpaperId, setWallpaperId] = useState('ios18');
  const [currentPage, setCurrentPage] = useState(0);
  
  // Search State
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // System Settings State
  const [dimLevel, setDimLevel] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [nightShift, setNightShift] = useState(false);
  const [showFPS, setShowFPS] = useState(false);
  
  // FPS Counter
  const fpsRef = useRef(0);
  const framesRef = useRef(0);
  const lastTimeRef = useRef(performance.now());

  const scrollRef = useRef<HTMLDivElement>(null);
  const activeAppStartTimeRef = useRef<number>(0);

  useEffect(() => {
    systemCore.init().catch(console.error);
    
    // Initial Settings Load
    const loadSettings = async () => {
        const savedSettings = await storage.get<any>(STORES.SYSTEM, 'user_settings');
        const savedWp = await storage.get<string>(STORES.SYSTEM, 'wallpaper_id');
        
        if (savedSettings) {
            setDimLevel(savedSettings.dimLevel || 0); // Kept for legacy support if needed
            setReducedMotion(savedSettings.reducedMotion || false);
            setNightShift(savedSettings.nightShift || false);
            setShowFPS(savedSettings.showFPS || false);
            
            // Apply text size
            document.documentElement.style.setProperty('--text-scale', savedSettings.textSize?.toString() || '1');
            if (savedSettings.boldText) document.body.classList.add('font-bold');
            else document.body.classList.remove('font-bold');
            
            // Debug Borders
            if (savedSettings.debugBorders) document.body.classList.add('debug-borders');
            else document.body.classList.remove('debug-borders');
        }
        if (savedWp) setWallpaperId(savedWp);
    };
    loadSettings();

    // Listen for changes from SettingsApp (unified event)
    const handleSettingsUpdate = (e: Event) => {
        const s = (e as CustomEvent).detail;
        if (s.dimLevel !== undefined) setDimLevel(s.dimLevel); // Legacy
        if (s.reducedMotion !== undefined) setReducedMotion(s.reducedMotion);
        if (s.nightShift !== undefined) setNightShift(s.nightShift);
        if (s.showFPS !== undefined) setShowFPS(s.showFPS);
        if (s.textSize !== undefined) document.documentElement.style.setProperty('--text-scale', s.textSize.toString());
        if (s.boldText !== undefined) {
             if (s.boldText) document.body.classList.add('font-bold');
             else document.body.classList.remove('font-bold');
        }
        if (s.debugBorders !== undefined) {
            if (s.debugBorders) document.body.classList.add('debug-borders');
            else document.body.classList.remove('debug-borders');
        }
    };
    window.addEventListener('sys_settings_update', handleSettingsUpdate);
    // Legacy support
    window.addEventListener('system_settings_change', handleSettingsUpdate);

    return () => {
        window.removeEventListener('sys_settings_update', handleSettingsUpdate);
        window.removeEventListener('system_settings_change', handleSettingsUpdate);
    };
  }, []);

  // FPS Loop
  useEffect(() => {
      if (!showFPS) return;
      let frameId: number;
      const loop = (time: number) => {
          framesRef.current++;
          if (time - lastTimeRef.current >= 1000) {
              fpsRef.current = framesRef.current;
              framesRef.current = 0;
              lastTimeRef.current = time;
              // Force re-render of just the FPS counter part if we stored state, 
              // but purely Ref approach avoids full app re-render.
              const el = document.getElementById('fps-counter');
              if (el) el.innerText = `${fpsRef.current} FPS`;
          }
          frameId = requestAnimationFrame(loop);
      };
      frameId = requestAnimationFrame(loop);
      return () => cancelAnimationFrame(frameId);
  }, [showFPS]);

  // Track app session duration
  useEffect(() => {
    if (activeApp) {
        activeAppStartTimeRef.current = Date.now();
        systemCore.trackInteraction(activeApp, 'open');
    }
    return () => {
        if (activeApp && activeAppStartTimeRef.current > 0) {
            const duration = (Date.now() - activeAppStartTimeRef.current) / 1000;
            if (duration > 1) {
                systemCore.trackInteraction(activeApp, 'dwell', { durationSeconds: duration });
            }
        }
    };
  }, [activeApp]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const scrollLeft = e.currentTarget.scrollLeft;
    const width = e.currentTarget.offsetWidth;
    const page = Math.round(scrollLeft / width);
    if (page !== currentPage) setCurrentPage(page);
  };

  const handleInstall = (id: AppID) => {
    if (!installedApps.includes(id)) setInstalledApps([...installedApps, id]);
  };

  const handleUninstall = (id: AppID) => {
    if (ALL_APPS[id].isSystem) return;
    setInstalledApps(prev => prev.filter(appId => appId !== id));
    if (openApps.includes(id)) closeApp(id);
  };

  const launchApp = (id: AppID) => {
    if (isEditMode) return;
    if (!openApps.includes(id)) setOpenApps([...openApps, id]);
    bringToFront(id);
  };

  const closeApp = (id: AppID) => {
    setOpenApps(openApps.filter(appId => appId !== id));
    if (activeApp === id) setActiveApp(null);
  };

  const bringToFront = (id: AppID) => {
    setActiveApp(id);
    const values = Object.values(zIndices) as number[];
    const maxZ = values.length > 0 ? Math.max(0, ...values) : 0;
    setZIndices(prev => ({ ...prev, [id]: maxZ + 1 }));
  };

  const navigateToApp = (fromId: AppID, toId: AppID) => {
    closeApp(fromId);
    setTimeout(() => launchApp(toId), 50);
  };

  const handleBackgroundClick = (e: React.MouseEvent) => {
    setActiveApp(null);
    if (e.detail === 3) setIsEditMode(prev => !prev);
  };

  const handleSearchLaunch = (id: AppID) => {
    launchApp(id);
    setIsSearchOpen(false);
    setSearchQuery('');
  };

  const renderAppContent = (id: AppID) => {
    // Suspense Wrapper ensures lazy loading
    return (
      <Suspense fallback={<LoadingFallback />}>
        {(() => {
            switch (id) {
            case AppID.CALCULATOR: return <Calculator />;
            case AppID.STORE: return <AppStore installedApps={installedApps} onInstall={handleInstall} />;
            case AppID.TIPS: return <TipsApp />;
            case AppID.SETTINGS: return <SettingsApp currentWallpaperId={wallpaperId} onWallpaperChange={setWallpaperId} />;
            case AppID.DRAMA: return <DramaTracker onNavigate={(toId: AppID) => navigateToApp(AppID.DRAMA, toId)} />;
            case AppID.SELL_IT: return <JustSellIt />;
            case AppID.LYRICS_AI: return <LyricsAI />;
            case AppID.ALBUMS_AI: return <AlbumsAI onNavigate={(toId: AppID) => navigateToApp(AppID.ALBUMS_AI, toId)} />;
            case AppID.LINK_FLIPPER: return <LinkFlipper />;
            case AppID.CAPTIONS: return <CaptionsAI />;
            case AppID.PASSWORDS: return <PasswordsApp />;
            case AppID.MARKUP_AI: return <MarkupAI />;
            case AppID.CONVERT_AI: return <ConvertAI />;
            case AppID.CONTENT_AI: return <ContentAI />;
            case AppID.ANALYTICS_AI: return <AnalyticsAI />;
            case AppID.CAREER_AI: return <CareerAI />;
            case AppID.TRENDS_AI: return <TrendsAI />;
            case AppID.WALLPAPER_AI: return <WallpaperAI />;
            case AppID.GET_FAMOUS: return <GetFamous />;
            case AppID.PRIORITY_AI: return <PriorityAI />;
            case AppID.BRAND_KIT_AI: return <BrandKitAI />;
            case AppID.VIRAL_PLAN_AI: return <ViralPlanAI />;
            case AppID.AI_PLAYGROUND: return <AIPlayground />;
            case AppID.PLAYLIST_AI: return <PlaylistAI />;
            case AppID.ACHIEVEMENTS: return <Achievements onNavigate={(toId: AppID) => navigateToApp(AppID.ACHIEVEMENTS, toId)} />;
            case AppID.NSFW_AI: return <NSFWAI />;
            case AppID.TRAP_AI: return <TrapAI />;
            case AppID.OPERATOR: return <OperatorAI onNavigate={(toId: AppID) => navigateToApp(AppID.OPERATOR, toId)} />;
            case AppID.SPEECH_AI: return <SpeechAI />;
            case AppID.SHORTS_STUDIO: return <ShortsStudio />;
            default: return <div className="h-full bg-black" />;
            }
        })()}
      </Suspense>
    );
  };

  const pages = [];
  for (let i = 0; i < installedApps.length; i += APPS_PER_PAGE) {
    pages.push(installedApps.slice(i, i + APPS_PER_PAGE));
  }
  if (pages.length === 0) pages.push([]);

  const currentWallpaper = WALLPAPERS.find(w => w.id === wallpaperId) || WALLPAPERS[0];
  const filteredApps = Object.values(ALL_APPS).filter(app => installedApps.includes(app.id) && (app.name.toLowerCase().includes(searchQuery.toLowerCase()) || app.description.toLowerCase().includes(searchQuery.toLowerCase()))).sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div 
      className="relative w-screen h-[100dvh] overflow-hidden text-white font-sans selection:bg-blue-500/30 transition-all duration-700 ease-in-out" 
      style={currentWallpaper.style}
    >
      {/* GLOBAL OVERLAYS */}
      {/* 1. Night Shift (Warm Overlay) */}
      {nightShift && (
          <div className="absolute inset-0 bg-orange-500/20 pointer-events-none z-[9999] mix-blend-multiply" />
      )}
      
      {/* 2. Dimming */}
      {dimLevel > 0 && (
          <div 
            className="absolute inset-0 bg-black pointer-events-none transition-opacity duration-300 z-0"
            style={{ opacity: dimLevel / 100 }} 
          />
      )}

      {/* 3. FPS Counter */}
      {showFPS && (
          <div id="fps-counter" className="absolute top-12 left-6 z-[9999] bg-black/50 text-green-400 font-mono text-xs px-2 py-1 rounded border border-green-500/30 pointer-events-none">
              -- FPS
          </div>
      )}

      <StatusBar />

      {/* Spotlight */}
      {isSearchOpen && (
        <div className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-2xl flex flex-col pt-24 px-6 animate-fade-in" onClick={() => setIsSearchOpen(false)}>
            <div className="w-full max-w-lg mx-auto flex flex-col h-[80vh]" onClick={e => e.stopPropagation()}>
                <div className="relative mb-6 shrink-0">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50" size={20} />
                    <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search Apps" className="w-full bg-[#1c1c1e] border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-lg text-white outline-none placeholder-white/30 shadow-2xl" autoFocus />
                </div>
                <div className="space-y-2 overflow-y-auto custom-scrollbar pb-10">
                    {filteredApps.map(app => (
                        <button key={app.id} onClick={() => handleSearchLaunch(app.id)} className="w-full flex items-center gap-4 p-3 rounded-2xl hover:bg-white/10 transition-colors bg-[#1c1c1e]/50 border border-white/5">
                            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${app.color} flex items-center justify-center text-white shadow-sm shrink-0`}><app.icon size={18} /></div>
                            <div className="text-left min-w-0"><span className="block font-bold text-white truncate">{app.name}</span><span className="text-xs text-white/50 truncate block">{app.description}</span></div>
                        </button>
                    ))}
                </div>
            </div>
        </div>
      )}

      {/* App Grid */}
      <div ref={scrollRef} onScroll={handleScroll} className="absolute inset-0 flex overflow-x-auto overflow-y-hidden snap-x snap-mandatory no-scrollbar scroll-smooth z-10" onClick={handleBackgroundClick} style={{ scrollbarWidth: 'none' }}>
        {pages.map((pageApps, pageIdx) => (
          <div key={pageIdx} className="min-w-full h-full snap-start pt-[calc(3rem+env(safe-area-inset-top))] pb-[calc(11rem+env(safe-area-inset-bottom))] px-4 md:px-12 flex flex-col overflow-hidden">
            <div className="grid grid-cols-4 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-6 gap-x-4 sm:gap-x-6 gap-y-6 sm:gap-y-8 md:gap-y-12 justify-items-center content-start max-w-5xl mx-auto w-full h-full">
              {pageApps.map(appId => (
                <AppIcon key={appId} app={ALL_APPS[appId]} onClick={(e) => { e.stopPropagation(); launchApp(appId); }} isEditMode={isEditMode} canRemove={!ALL_APPS[appId].isSystem} onRemove={() => handleUninstall(appId)} />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Indicators */}
      {pages.length > 1 && <div className="absolute bottom-[calc(10.5rem+env(safe-area-inset-bottom))] left-0 right-0 flex justify-center gap-2 z-40 pointer-events-none">{pages.map((_, i) => <div key={i} className={`w-2 h-2 rounded-full transition-all duration-300 ${currentPage === i ? 'bg-white scale-110 shadow-sm' : 'bg-white/30'}`} />)}</div>}

      {/* Search Pill */}
      <div className="absolute bottom-[calc(8rem+env(safe-area-inset-bottom))] left-0 right-0 flex justify-center z-40 pointer-events-none">
        <button onClick={() => setIsSearchOpen(true)} className="pointer-events-auto bg-white/10 hover:bg-white/20 backdrop-blur-xl border border-white/5 px-5 py-2 rounded-full flex items-center gap-2 transition-all active:scale-95 group shadow-lg shadow-black/20">
            <Search size={14} className="text-white/70 group-hover:text-white" /><span className="text-xs font-medium text-white/70 group-hover:text-white">Search</span>
        </button>
      </div>

      {/* Edit Mode */}
      {isEditMode && <div className="absolute bottom-[calc(12rem+env(safe-area-inset-bottom))] left-0 right-0 text-center pointer-events-none animate-fade-in z-40"><span className="bg-black/40 backdrop-blur-md px-4 py-1.5 rounded-full text-xs font-bold text-white/90 border border-white/10 shadow-lg">Triple-click space to finish editing</span></div>}

      {/* Fixed Dock */}
      <div className="absolute bottom-[calc(1.5rem+env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 z-40 transition-transform duration-300">
        <div className="flex items-center gap-4 px-5 py-4 bg-white/10 backdrop-blur-3xl border border-white/20 rounded-[2.5rem] shadow-2xl shadow-black/60 transition-all duration-500 hover:scale-[1.02] hover:bg-white/15">
          {[AppID.DRAMA, AppID.SELL_IT, AppID.LYRICS_AI, AppID.CAPTIONS].map(id => (
             <div key={id} className="relative group">
                 <AppIcon app={ALL_APPS[id]} size="md" showLabel={false} onClick={() => launchApp(id)} isEditMode={isEditMode} canRemove={false} />
                 {openApps.includes(id) && <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-white/90 shadow-sm" />}
             </div>
          ))}
        </div>
      </div>

      {/* Windows Layer - With Reduced Motion Logic */}
      {openApps.map(appId => (
        <div 
            key={appId} 
            className={reducedMotion ? "motion-reduce" : ""}
            style={reducedMotion ? { transition: 'none' } : {}}
        >
            <Window app={ALL_APPS[appId]} isOpen={true} isActive={activeApp === appId} onClose={() => closeApp(appId)} onFocus={() => bringToFront(appId)} zIndex={zIndices[appId] || 10}>
            {renderAppContent(appId)}
            </Window>
        </div>
      ))}

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; } 
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; } 
        .motion-reduce * { transition-duration: 0.01ms !important; animation-duration: 0.01ms !important; scroll-behavior: auto !important; }
        
        /* Dynamic Font Scaling */
        :root {
            font-size: calc(16px * var(--text-scale, 1));
        }
        
        /* Debug Borders */
        .debug-borders * {
            outline: 1px solid rgba(255, 0, 0, 0.3) !important;
        }
      `}</style>
    </div>
  );
};

export default App;
