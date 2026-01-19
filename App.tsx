import React, { useState, useEffect, useRef, Suspense, memo, useMemo } from 'react';
import { ALL_APPS, INITIAL_INSTALLED_APPS, WALLPAPERS } from './constants';
import { AppID, AppConfig } from './types';
import AppIcon from './components/AppIcon';
import Window from './components/Window';
import { Wifi, Battery, Search, Loader2 } from 'lucide-react';
import { systemCore } from './services/systemCore';
import { storage, STORES } from './services/storageService';
import { authService } from './services/authService';
import { syncService } from './services/syncService';
import { User } from 'firebase/auth';

// --- LAZY LOADED APPS ---
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

const LoadingFallback = () => (
  <div className="h-full flex items-center justify-center bg-[#1c1c1e] text-white">
    <Loader2 size={32} className="animate-spin opacity-50" />
  </div>
);

// Isolated Status Bar
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
  // --- AUTHENTICATION STATE ---
  const [user, setUser] = useState<User | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  // --- OS STATE ---
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
  const [wallpaperDimming, setWallpaperDimming] = useState(false);
  
  // Responsive Layout State
  const [layout, setLayout] = useState({ cols: 4, rows: 5, maxApps: 20, isLandscape: false });

  // FPS Counter
  const fpsRef = useRef(0);
  const framesRef = useRef(0);
  const lastTimeRef = useRef(performance.now());

  const scrollRef = useRef<HTMLDivElement>(null);
  const activeAppStartTimeRef = useRef<number>(0);

  // --- AUTH LISTENER ---
  useEffect(() => {
    const unsubscribe = authService.onUserChange((u) => {
      setUser(u);
      setLoadingAuth(false);
      if (u && authService.isAdmin(u)) {
        console.log("Welcome back, Administrator Johnson.");
      }
    });
    return () => unsubscribe();
  }, []);

  // --- LAYOUT & SYSTEM INIT ---
  useEffect(() => {
    const calculateLayout = () => {
        const width = window.innerWidth;
        const height = window.innerHeight;
        const isLandscape = width > height;

        const TOP_RESERVE = 60;
        // INCREASED RESERVE: Pushes grid higher to avoid overlapping with Search/Dock
        const BOTTOM_RESERVE = isLandscape && height < 500 ? 140 : 200; 

        const availableW = width - 40; 
        const availableH = height - TOP_RESERVE - BOTTOM_RESERVE;

        const SLOT_W = 90; 
        const SLOT_H = 105;

        let cols = Math.floor(availableW / SLOT_W);
        let rows = Math.floor(availableH / SLOT_H);

        cols = Math.max(3, Math.min(cols, 12)); 
        rows = Math.max(1, Math.min(rows, 8));

        setLayout({
            cols,
            rows,
            maxApps: cols * rows,
            isLandscape
        });
    };

    calculateLayout();
    window.addEventListener('resize', calculateLayout);
    return () => window.removeEventListener('resize', calculateLayout);
  }, []);

  // --- NEURAL BACKEND INITIALIZATION & LISTENERS ---
  useEffect(() => {
    if (!user) return; 

    syncService.init().catch(console.error);
    systemCore.init().catch(console.error);
    
    const isSensitiveTarget = (target: HTMLElement | null) => {
        if (!target) return false;
        if (target.closest('input, textarea, [contenteditable="true"]')) return true;
        if (target instanceof HTMLInputElement && target.type === 'password') return true;
        return false;
    };

    const getTelemetryLabel = (target: HTMLElement | null) => {
        if (!target) return 'UNKNOWN';
        const source = target.closest('[data-telemetry-id],[data-telemetry-label],[data-testid],[aria-label]');
        if (source) {
            const label = source.getAttribute('data-telemetry-id')
              || source.getAttribute('data-telemetry-label')
              || source.getAttribute('data-testid')
              || source.getAttribute('aria-label');
            if (label) return label.substring(0, 40);
        }
        const role = target.getAttribute('role');
        return `${target.tagName}${role ? `:${role}` : ''}`.substring(0, 40);
    };

    const handleGlobalClick = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        if (isSensitiveTarget(target)) return;
        if (!target.closest('.font-mono')) {
            systemCore.trackRawEvent('click', getTelemetryLabel(target));
        }
    };

    const handleGlobalKey = (e: KeyboardEvent) => {
        const target = e.target as HTMLElement | null;
        if (isSensitiveTarget(target)) return;
        systemCore.trackRawEvent('keypress', getTelemetryLabel(target));
    };

    window.addEventListener('click', handleGlobalClick);
    window.addEventListener('keydown', handleGlobalKey);
    
    // Initial Settings Load
    const loadSettings = async () => {
        const savedSettings = await storage.get<any>(STORES.SYSTEM, 'user_settings');
        const savedWp = await storage.get<string>(STORES.SYSTEM, 'wallpaper_id');
        
        if (savedSettings) {
            setDimLevel(savedSettings.dimLevel || 0);
            setReducedMotion(savedSettings.reducedMotion || false);
            setNightShift(savedSettings.nightShift || false);
            setShowFPS(savedSettings.showFPS || false);
            setWallpaperDimming(savedSettings.wallpaperDimming || false);
            
            document.documentElement.style.setProperty('--text-scale', savedSettings.textSize?.toString() || '1');
            if (savedSettings.boldText) document.body.classList.add('font-bold');
            else document.body.classList.remove('font-bold');
            
            if (savedSettings.debugBorders) document.body.classList.add('debug-borders');
            else document.body.classList.remove('debug-borders');
        }
        if (savedWp) setWallpaperId(savedWp);
    };
    loadSettings();

    const handleSettingsUpdate = (e: Event) => {
        const s = (e as CustomEvent).detail;
        if (s.dimLevel !== undefined) setDimLevel(s.dimLevel);
        if (s.reducedMotion !== undefined) setReducedMotion(s.reducedMotion);
        if (s.nightShift !== undefined) setNightShift(s.nightShift);
        if (s.showFPS !== undefined) setShowFPS(s.showFPS);
        if (s.wallpaperDimming !== undefined) setWallpaperDimming(s.wallpaperDimming);
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
    window.addEventListener('system_settings_change', handleSettingsUpdate);

    return () => {
        window.removeEventListener('click', handleGlobalClick);
        window.removeEventListener('keydown', handleGlobalKey);
        window.removeEventListener('sys_settings_update', handleSettingsUpdate);
        window.removeEventListener('system_settings_change', handleSettingsUpdate);
    };
  }, [user]);

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
    return (
      <Suspense fallback={<LoadingFallback />}>
        {(() => {
            switch (id) {
            case AppID.CALCULATOR: return <Calculator />;
            case AppID.STORE: return <AppStore installedApps={installedApps} onInstall={handleInstall} onLaunch={function (id: AppID): void {
                throw new Error('Function not implemented.');
              } } />;
            case AppID.TIPS: return <TipsApp />;
            
            // --- UPDATED SETTINGS CALL ---
            case AppID.SETTINGS: return (
                <SettingsApp 
                    currentWallpaperId={wallpaperId} 
                    onWallpaperChange={setWallpaperId}
                    installedApps={installedApps}
                    onUninstall={handleUninstall} 
                />
            );
            
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

  const pages = useMemo(() => {
    const p = [];
    const limit = layout.maxApps || 1;
    for (let i = 0; i < installedApps.length; i += limit) {
        p.push(installedApps.slice(i, i + limit));
    }
    if (p.length === 0) p.push([]);
    return p;
  }, [installedApps, layout.maxApps]);

  const currentWallpaper = WALLPAPERS.find(w => w.id === wallpaperId) || WALLPAPERS[0];
  const filteredApps = (Object.values(ALL_APPS) as AppConfig[]).filter(app => installedApps.includes(app.id) && (app.name.toLowerCase().includes(searchQuery.toLowerCase()) || app.description.toLowerCase().includes(searchQuery.toLowerCase()))).sort((a, b) => a.name.localeCompare(b.name));

  // --- LOGIN SCREEN RENDER ---
  if (loadingAuth) {
    return <div className="bg-black h-screen w-screen flex items-center justify-center text-white"><Loader2 className="animate-spin" /></div>;
  }

  if (!user) {
    return (
      <div className="h-screen w-screen bg-black flex flex-col items-center justify-center text-white space-y-8 relative overflow-hidden">
        {/* Background Ambient */}
        <div className="absolute inset-0 bg-gradient-to-tr from-blue-900/20 via-purple-900/20 to-black pointer-events-none" />
        
        <div className="z-10 text-center space-y-2">
            <h1 className="text-6xl font-bold tracking-tighter bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">OS 18</h1>
            <p className="text-white/50 text-sm tracking-widest uppercase">Web Experience</p>
        </div>

        <button 
            onClick={() => authService.login()}
            className="z-10 flex items-center gap-3 px-8 py-4 bg-white text-black rounded-full font-bold hover:scale-105 active:scale-95 transition-all shadow-xl shadow-white/10"
        >
            {/* Google G Icon */}
            <svg viewBox="0 0 24 24" className="w-5 h-5" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Sign in with Google
        </button>

        <p className="absolute bottom-10 text-xs text-white/20">Authorized Personnel Only</p>
      </div>
    );
  }

  // --- MAIN OS RENDER ---
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
      
      {/* 2. Dimming & Wallpaper Dimming */}
      <div 
        className="absolute inset-0 bg-black pointer-events-none transition-opacity duration-300 z-0"
        style={{ opacity: (dimLevel / 100) + (wallpaperDimming ? 0.3 : 0) }} 
      />

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

      {/* App Grid - Auto Correcting */}
      <div 
        ref={scrollRef} 
        onScroll={handleScroll} 
        className="absolute inset-0 flex overflow-x-auto overflow-y-hidden snap-x snap-mandatory no-scrollbar scroll-smooth z-10" 
        onClick={handleBackgroundClick} 
        style={{ scrollbarWidth: 'none' }}
      >
        {pages.map((pageApps, pageIdx) => (
          <div 
            key={pageIdx} 
            className="min-w-full h-full snap-start flex flex-col items-center pt-[calc(3rem+env(safe-area-inset-top))] pb-[calc(8rem+env(safe-area-inset-bottom))]"
          >
            {/* Dynamic Grid Container */}
            <div 
                className="w-full max-w-[90vw] h-full grid justify-items-center content-start gap-4 transition-all duration-500 ease-out"
                style={{ 
                    gridTemplateColumns: `repeat(${layout.cols}, minmax(0, 1fr))`,
                    gridTemplateRows: `repeat(${layout.rows}, minmax(0, 1fr))`,
                    paddingTop: '20px' 
                }}
            >
              {pageApps.map(appId => (
                <AppIcon key={appId} app={ALL_APPS[appId]} onClick={(e) => { e.stopPropagation(); launchApp(appId); }} isEditMode={isEditMode} canRemove={!ALL_APPS[appId].isSystem} onRemove={() => handleUninstall(appId)} />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Indicators */}
      {pages.length > 1 && (
        <div className="absolute bottom-[calc(9.5rem+env(safe-area-inset-bottom))] left-0 right-0 flex justify-center gap-2 z-40 pointer-events-none transition-all duration-300">
            {pages.map((_, i) => <div key={i} className={`w-2 h-2 rounded-full transition-all duration-300 ${currentPage === i ? 'bg-white scale-110 shadow-sm' : 'bg-white/30'}`} />)}
        </div>
      )}

      {/* Search Pill */}
      <div className="absolute bottom-[calc(7.5rem+env(safe-area-inset-bottom))] left-0 right-0 flex justify-center z-40 pointer-events-none">
        <button onClick={() => setIsSearchOpen(true)} className="pointer-events-auto bg-white/10 hover:bg-white/20 backdrop-blur-xl border border-white/5 px-5 py-2 rounded-full flex items-center gap-2 transition-all active:scale-95 group shadow-lg shadow-black/20">
            <Search size={14} className="text-white/70 group-hover:text-white" /><span className="text-xs font-medium text-white/70 group-hover:text-white">Search</span>
        </button>
      </div>

      {/* Edit Mode */}
      {isEditMode && <div className="absolute bottom-[calc(11rem+env(safe-area-inset-bottom))] left-0 right-0 text-center pointer-events-none animate-fade-in z-40"><span className="bg-black/40 backdrop-blur-md px-4 py-1.5 rounded-full text-xs font-bold text-white/90 border border-white/10 shadow-lg">Triple-click space to finish editing</span></div>}

      {/* Fixed Dock - Bumped Z-Index to 50 */}
      <div className="absolute bottom-[calc(1.5rem+env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 z-50 transition-all duration-300 w-auto max-w-[95vw]">
        <div 
            className="flex items-center gap-2 sm:gap-4 px-3 sm:px-5 py-3 sm:py-4 bg-white/10 backdrop-blur-3xl border border-white/20 rounded-[2rem] sm:rounded-[2.5rem] shadow-2xl shadow-black/60 transition-all duration-500 hover:scale-[1.02] hover:bg-white/15"
            style={{ transform: layout.isLandscape && window.innerHeight < 500 ? 'scale(0.8) translateY(10px)' : 'scale(1)' }}
        >
          {[AppID.DRAMA, AppID.SELL_IT, AppID.LYRICS_AI, AppID.CAPTIONS].map(id => (
             <div key={id} className="relative group shrink-0">
                 <AppIcon app={ALL_APPS[id]} size={layout.cols < 4 ? "sm" : "md"} showLabel={false} onClick={() => launchApp(id)} isEditMode={isEditMode} canRemove={false} />
                 {openApps.includes(id) && <div className="absolute -bottom-2 sm:-bottom-2.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-white/90 shadow-sm" />}
             </div>
          ))}
        </div>
      </div>

      {/* PHANTOM HOME BUTTON (Phase 0 Fix) */}
      {/* Invisible but large touch area for easier exit */}
      <div 
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-64 h-12 z-[100] cursor-pointer"
        onClick={() => {
            if (activeApp) setActiveApp(null); // Force home interaction
        }}
      />

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
            --app-safe-lift: 15px; /* Global Safe Area Lift */
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
