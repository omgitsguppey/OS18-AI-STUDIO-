import React, { useState, useEffect, useCallback, memo, useRef } from 'react';
import { 
  Bell, Volume2, Moon, Settings as SettingsIcon, Type, 
  LayoutGrid, Activity, Hand, ChevronRight, 
  ArrowLeft, Brain, Terminal,
  Radio, Shield, User as UserIcon,
  Database, Zap, Hammer,
  Sun, Server, Play, Check, Eye, Mic, Battery
} from 'lucide-react';
import { storage, STORES, StoreStats } from '../services/storageService';
import { systemCore } from '../services/systemCore';
import { consoleService, LogEntry } from '../services/consoleService';
import { authService } from '../services/authService';
import { auth } from '../services/firebaseConfig';
import { User } from 'firebase/auth';
import { AppID } from '../types';
import { ALL_APPS, WALLPAPERS } from '../constants';

// --- Types & Defaults ---

type View = 'main' | 'general' | 'display' | 'notifications' | 'sounds' | 'focus' | 'privacy' | 'developer' | 'wallpaper' | 'gemini' | 'about' | 'storage' | 'backend' | 'profile' | 'app_detail' | 'power';

interface SettingsState {
  darkMode: boolean;
  nightShift: boolean;
  textSize: number;
  boldText: boolean;
  brightness: number;
  reducedMotion: boolean;
  haptics: boolean;
  notificationsEnabled: boolean;
  doNotDisturb: boolean;
  systemVolume: number;
  timeFormat24h: boolean;
  showFPS: boolean;
  debugBorders: boolean;
  lowPowerMode: boolean;
  aiTemperature: number;
  wallpaperDimming: boolean;
}

const DEFAULT_SETTINGS: SettingsState = {
  darkMode: true,
  nightShift: false,
  textSize: 1,
  boldText: false,
  brightness: 100,
  reducedMotion: false,
  haptics: true,
  notificationsEnabled: true,
  doNotDisturb: false,
  systemVolume: 0.8,
  timeFormat24h: false,
  showFPS: false,
  debugBorders: false,
  lowPowerMode: false,
  aiTemperature: 0.7,
  wallpaperDimming: false
};

// Map Stores to Apps for the Storage Manager
const STORE_APP_MAP: Record<string, AppID> = {
  [STORES.DRAMA]: AppID.DRAMA,
  [STORES.STRATEGY]: AppID.SELL_IT,
  [STORES.LYRICS]: AppID.LYRICS_AI,
  [STORES.ALBUMS]: AppID.ALBUMS_AI,
  [STORES.LINKS]: AppID.LINK_FLIPPER,
  [STORES.CAPTIONS]: AppID.CAPTIONS,
  [STORES.PASSWORDS]: AppID.PASSWORDS,
  [STORES.MARKUP]: AppID.MARKUP_AI,
  [STORES.CONTENT]: AppID.CONTENT_AI,
  [STORES.ANALYTICS]: AppID.ANALYTICS_AI,
  [STORES.CAREER]: AppID.CAREER_AI,
  [STORES.TRENDS]: AppID.TRENDS_AI,
  [STORES.GET_FAMOUS]: AppID.GET_FAMOUS,
  [STORES.PRIORITY]: AppID.PRIORITY_AI,
  [STORES.BRAND_KIT]: AppID.BRAND_KIT_AI,
  [STORES.VIRAL_PLAN]: AppID.VIRAL_PLAN_AI,
  [STORES.PLAYGROUND]: AppID.AI_PLAYGROUND,
  [STORES.PLAYLIST]: AppID.PLAYLIST_AI,
  [STORES.ACHIEVEMENTS]: AppID.ACHIEVEMENTS,
  [STORES.NSFW_AI]: AppID.NSFW_AI,
  [STORES.TRAP_AI]: AppID.TRAP_AI,
  [STORES.SPEECH_AI]: AppID.SPEECH_AI,
  [STORES.SHORTS_STUDIO]: AppID.SHORTS_STUDIO,
  [STORES.SYSTEM]: AppID.SETTINGS
};

// --- UI Components ---

const Toggle = memo(({ value, onChange }: { value: boolean, onChange: (v: boolean) => void }) => (
  <div 
    onClick={(e) => { e.stopPropagation(); onChange(!value); }}
    className={`w-[50px] h-[30px] rounded-full p-[2px] transition-colors duration-300 cursor-pointer ${value ? 'bg-[#34C759]' : 'bg-[#E9E9EA] dark:bg-[#39393D]'}`}
  >
    <div className={`w-[26px] h-[26px] bg-white rounded-full shadow-md transform transition-transform duration-300 ${value ? 'translate-x-[20px]' : 'translate-x-0'}`} />
  </div>
));

const Slider = memo(({ value, min = 0, max = 100, onChange }: { value: number, min?: number, max?: number, onChange: (v: number) => void }) => (
    <input 
        type="range" 
        min={min} 
        max={max} 
        value={value} 
        onChange={(e) => onChange(Number(e.target.value))}
        onClick={(e) => e.stopPropagation()}
        className="w-32 h-1 bg-gray-300 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-500"
    />
));

const ListItem = memo(({ 
  icon: Icon, 
  color, 
  label, 
  value, 
  onClick, 
  isLink = false,
  control,
  destructive = false,
  subtitle
}: any) => (
  <div 
    onClick={onClick}
    className={`flex items-center justify-between px-4 py-3 min-h-[44px] bg-white dark:bg-[#1C1C1E] active:bg-gray-100 dark:active:bg-[#2C2C2E] transition-colors ${onClick || isLink ? 'cursor-pointer' : ''}`}
  >
    <div className="flex items-center gap-3 min-w-0">
      {Icon && (
        <div className={`w-7 h-7 rounded-[7px] flex items-center justify-center text-white shrink-0 ${color}`}>
          <Icon size={16} fill="currentColor" strokeWidth={2.5} />
        </div>
      )}
      <div className="flex flex-col justify-center">
        <span className={`text-[17px] truncate font-medium leading-snug ${destructive ? 'text-red-500' : 'text-black dark:text-white'}`}>
            {label}
        </span>
        {subtitle && <span className="text-[12px] text-gray-500 leading-tight">{subtitle}</span>}
      </div>
    </div>
    <div className="flex items-center gap-2 pl-2">
      {control}
      {!control && value && <span className="text-[17px] text-gray-500 dark:text-gray-400 truncate max-w-[120px]">{value}</span>}
      {(onClick || isLink) && !control && <ChevronRight size={16} className="text-gray-400 opacity-60" />}
    </div>
  </div>
));

const ListGroup = ({ title, footer, children }: any) => (
  <div className="mb-6">
    {title && <h3 className="px-4 mb-2 text-[13px] text-gray-500 uppercase font-medium ml-4">{title}</h3>}
    <div className="mx-4 overflow-hidden rounded-[10px] divide-y divide-gray-200 dark:divide-white/10 border border-gray-200 dark:border-transparent">
      {children}
    </div>
    {footer && <p className="px-4 mt-2 text-[13px] text-gray-500 leading-normal ml-4">{footer}</p>}
  </div>
);

const Header = memo(({ title, canGoBack, onBack }: { title: string, canGoBack: boolean, onBack: () => void }) => (
    <div className="h-[52px] bg-[#F2F2F7] dark:bg-black sticky top-0 z-20 flex items-center px-2 border-b border-gray-200 dark:border-white/10 shrink-0 backdrop-blur-xl bg-opacity-90 dark:bg-opacity-90">
      <div className="flex-1">
        {canGoBack && (
          <button 
            onClick={onBack}
            className="flex items-center text-[#007AFF] px-2 active:opacity-50 transition-opacity font-medium text-[17px]"
          >
            <ArrowLeft size={22} className="mr-1" /> Back
          </button>
        )}
      </div>
      <h1 className="font-semibold text-[17px] text-black dark:text-white absolute left-1/2 -translate-x-1/2 whitespace-nowrap">{title}</h1>
      <div className="flex-1" />
    </div>
));

// --- SUB-VIEWS ---

const MainView = ({ user, isAdmin, sysMetrics, pushView }: any) => (
    <div className="animate-slide-up pb-10">
      <div className="px-4 pt-6 pb-4">
        <h1 className="text-[34px] font-bold text-black dark:text-white tracking-tight">Settings</h1>
      </div>

      <div 
        onClick={() => pushView('profile')}
        className="mx-4 mb-8 flex items-center gap-4 p-4 bg-white dark:bg-[#1C1C1E] rounded-[12px] border border-gray-200 dark:border-transparent active:bg-gray-50 dark:active:bg-[#2C2C2E] transition-colors cursor-pointer"
      >
        <div className="w-[60px] h-[60px] rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden flex items-center justify-center text-white text-2xl font-bold shadow-sm shrink-0">
          {user?.photoURL ? (
              <img src={user.photoURL} alt="User" className="w-full h-full object-cover" />
          ) : (
              <UserIcon size={30} className="text-gray-400" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-[20px] text-black dark:text-white font-medium truncate">{user?.displayName || 'Sign In'}</h2>
          <p className="text-[14px] text-gray-500 truncate">Apple ID, iCloud, Media & Purchases</p>
        </div>
        <ChevronRight size={20} className="text-gray-400" />
      </div>

      <ListGroup>
        <ListItem 
            icon={Brain} 
            color="bg-indigo-600" 
            label="Gemini Intelligence" 
            onClick={() => pushView('gemini')} 
            value={sysMetrics ? `${sysMetrics.facts} Memories` : 'Active'} 
            isLink 
        />
        {isAdmin && (
            <ListItem 
                icon={Terminal} 
                color="bg-black border border-white/20" 
                label="Neural Backend" 
                onClick={() => pushView('backend')} 
                value="God Mode"
                isLink 
            />
        )}
      </ListGroup>

      <ListGroup>
        <ListItem icon={SettingsIcon} color="bg-[#8E8E93]" label="General" onClick={() => pushView('general')} isLink />
        <ListItem icon={Type} color="bg-[#007AFF]" label="Display & Brightness" onClick={() => pushView('display')} isLink />
        <ListItem icon={LayoutGrid} color="bg-[#32ADE6]" label="Wallpaper" onClick={() => pushView('wallpaper')} isLink />
        <ListItem icon={Database} color="bg-[#ff9f0a]" label="Storage & Apps" onClick={() => pushView('storage')} isLink />
      </ListGroup>

      <ListGroup>
        <ListItem icon={Bell} color="bg-[#FF3B30]" label="Notifications" onClick={() => pushView('notifications')} isLink />
        <ListItem icon={Volume2} color="bg-[#FF2D55]" label="Sounds & Haptics" onClick={() => pushView('sounds')} isLink />
        <ListItem icon={Moon} color="bg-[#5856D6]" label="Focus" onClick={() => pushView('focus')} value="Personal" isLink />
        <ListItem icon={Battery} color="bg-[#34C759]" label="Battery" onClick={() => pushView('power')} isLink />
      </ListGroup>

      <ListGroup>
        <ListItem icon={Hand} color="bg-[#007AFF]" label="Privacy & Security" onClick={() => pushView('privacy')} isLink />
        <ListItem icon={Hammer} color="bg-[#8E8E93]" label="Developer" onClick={() => pushView('developer')} isLink />
      </ListGroup>
    </div>
);

const WallpaperView = ({ settings, updateSetting, currentWallpaperId, onWallpaperChange }: any) => {
    // --- Phase 0: Integrated User Wallpapers ---
    const [userWallpapers, setUserWallpapers] = useState<any[]>([]);

    useEffect(() => {
        const loadUserWallpapers = async () => {
            // Fetch from the new dedicated store
            const papers = await storage.getAll<any>(STORES.WALLPAPERS);
            setUserWallpapers(papers.sort((a, b) => b.createdAt - a.createdAt)); // Newest first
        };
        loadUserWallpapers();

        // Listen for new saves
        const handleNewWallpaper = (e: any) => {
            const newWp = e.detail;
            setUserWallpapers(prev => [newWp, ...prev]);
        };
        window.addEventListener('sys_wallpaper_added', handleNewWallpaper);
        return () => window.removeEventListener('sys_wallpaper_added', handleNewWallpaper);
    }, []);

    // Merge built-in wallpapers with user creations
    const allWallpapers = [...userWallpapers, ...WALLPAPERS]; 
    const currentWp = allWallpapers.find(w => w.id === currentWallpaperId) || WALLPAPERS[0];

    return (
        <div className="animate-slide-up pb-10 pt-6">
            <div className="px-6 flex justify-center mb-8">
                <div className="relative w-[200px] h-[400px] rounded-[24px] overflow-hidden shadow-2xl border-4 border-white/10 ring-1 ring-black/50">
                    <div 
                        className="absolute inset-0 bg-cover bg-center transition-all duration-500"
                        style={{ 
                            backgroundImage: currentWp?.style.backgroundImage,
                            filter: settings.wallpaperDimming ? 'brightness(0.6)' : 'none'
                        }}
                    />
                    <div className="absolute top-4 left-0 right-0 text-center text-white/90 font-medium text-lg drop-shadow-md">
                        9:41
                    </div>
                    <div className="absolute bottom-8 left-4 right-4 flex justify-between px-2">
                        <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-xl" />
                        <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-xl" />
                        <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-xl" />
                        <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-xl" />
                    </div>
                </div>
            </div>

            <ListGroup>
                <ListItem 
                    label="Dark Appearance Dims Wallpaper" 
                    control={<Toggle value={settings.wallpaperDimming} onChange={(v) => updateSetting('wallpaperDimming', v)} />} 
                />
            </ListGroup>

            <div className="px-4">
                <h3 className="px-4 mb-2 text-[13px] text-gray-500 uppercase font-medium">Collections</h3>
                <div className="grid grid-cols-2 gap-4">
                    {allWallpapers.map(wp => (
                        <button 
                            key={wp.id}
                            onClick={() => onWallpaperChange(wp.id)}
                            className={`relative aspect-[3/5] rounded-xl overflow-hidden border-2 transition-all ${currentWallpaperId === wp.id ? 'border-blue-500 scale-105' : 'border-transparent hover:scale-105'}`}
                        >
                            <div 
                                className="w-full h-full bg-cover bg-center" 
                                style={{ backgroundImage: wp.thumbnail.startsWith('data:') ? `url(${wp.thumbnail})` : `url(${wp.thumbnail})` }} 
                            />
                            {/* <img src={wp.thumbnail} alt={wp.name} className="w-full h-full object-cover" /> */}
                            <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/60 to-transparent">
                                <span className="text-white text-xs font-medium truncate block">{wp.name}</span>
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

const StorageView = ({ storeStats, user, formatBytes, installedApps, handleSelectApp }: any) => (
    <div className="p-6 space-y-4 animate-slide-up">
        <h3 className="font-bold text-gray-500 text-xs uppercase tracking-widest">System Storage</h3>
        <div className="bg-[#1c1c1e] p-6 rounded-xl border border-white/5 text-center mb-6">
            <Database size={32} className="mx-auto text-blue-500 mb-2" />
            <h2 className="text-xl font-bold">Cloud Database</h2>
            <div className="flex justify-center gap-4 mt-2 text-sm">
                <span className="text-gray-400">{formatBytes(storeStats.reduce((acc: number, curr: any) => acc + curr.sizeBytes, 0))} Used</span>
                <span className="text-gray-600">Encrypted</span>
            </div>
        </div>

        {/* Visual Storage Bar */}
        <div className="bg-[#1c1c1e] p-4 rounded-xl border border-white/5 mb-6">
             <div className="flex justify-between text-xs font-bold text-gray-400 mb-2">
                 <span>USAGE BREAKDOWN</span>
             </div>
             <div className="w-full h-4 bg-gray-700 rounded-full overflow-hidden flex">
                 {storeStats.map((stat: any, i: number) => (
                     <div 
                        key={stat.name} 
                        style={{ width: `${Math.max(1, (stat.sizeBytes / 5000) * 100)}%` }} 
                        className={`h-full ${['bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-red-500', 'bg-purple-500'][i % 5]}`} 
                     />
                 ))}
             </div>
        </div>

        <ListGroup title="Installed Apps">
            {installedApps.map((appId: AppID) => {
                const app = ALL_APPS[appId];
                // Find matching store stat if any (Reverse lookup or filter)
                const storeKey = Object.keys(STORE_APP_MAP).find(key => STORE_APP_MAP[key] === appId);
                const stat = storeKey ? storeStats.find((s: any) => s.name === storeKey) : null;
                const size = stat ? stat.sizeBytes : 0;

                return (
                    <ListItem 
                        key={appId}
                        label={app.name}
                        icon={app.icon}
                        color={`bg-gradient-to-br ${app.color}`}
                        value={formatBytes(size + 20000)} // Fake base size + real data
                        onClick={() => handleSelectApp(appId, size)}
                        isLink
                    />
                );
            })}
        </ListGroup>
    </div>
);

const AppDetailView = ({ selectedAppId, selectedAppSize, formatBytes, handleUninstall, handleClearData }: any) => {
    const app = ALL_APPS[selectedAppId];
    if (!app) return null;

    return (
        <div className="animate-slide-up pt-6">
            <div className="flex flex-col items-center mb-8">
                <div className={`w-24 h-24 rounded-[22px] bg-gradient-to-br ${app.color} flex items-center justify-center text-white shadow-xl mb-4`}>
                    <app.icon size={48} />
                </div>
                <h2 className="text-2xl font-bold">{app.name}</h2>
                <p className="text-gray-500 text-sm mt-1">{app.description}</p>
            </div>

            <ListGroup>
                <ListItem label="App Size" value="20 MB" />
                <ListItem label="Documents & Data" value={formatBytes(selectedAppSize)} />
            </ListGroup>

            <div className="px-4 space-y-4">
                <button 
                    onClick={() => handleClearData(selectedAppId)}
                    className="w-full py-3 bg-white dark:bg-[#1C1C1E] text-blue-500 rounded-xl font-medium text-[17px] active:scale-95 transition-transform border border-gray-200 dark:border-transparent"
                >
                    Delete Documents & Data
                </button>
                
                {!app.isSystem && (
                    <button 
                        onClick={() => handleUninstall(selectedAppId)}
                        className="w-full py-3 bg-white dark:bg-[#1C1C1E] text-red-500 rounded-xl font-medium text-[17px] active:scale-95 transition-transform border border-gray-200 dark:border-transparent"
                    >
                        Offload App
                    </button>
                )}
                
                {app.isSystem && (
                    <p className="text-center text-xs text-gray-500 mt-2">This is a core system application and cannot be uninstalled.</p>
                )}
            </div>
        </div>
    );
};

const BackendView = memo(({ recentEvents, sysMetrics, handleLobotomy }: any) => (
    <div className="animate-slide-up space-y-6 pb-20">
        <div className="px-4 py-2">
            <div className="bg-[#111] rounded-xl border border-white/10 p-4 font-mono text-xs text-green-500 overflow-hidden relative shadow-2xl">
                <div className="absolute top-2 right-2 flex gap-2">
                    <span className="animate-pulse">●</span> LIVE
                </div>
                <div className="h-64 overflow-y-auto custom-scrollbar flex flex-col-reverse gap-1">
                    {recentEvents.map((e: any) => (
                        <div key={`${e.timestamp}-${e.action}`} className="whitespace-nowrap flex gap-2 opacity-80 hover:opacity-100 transition-opacity">
                            <span className="text-gray-500">[{new Date(e.timestamp).toLocaleTimeString().split(' ')[0]}]</span>
                            <span className="text-blue-400 font-bold">{e.appId}</span>
                            <span className="text-white">{e.action}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
        <ListGroup title="God Mode Controls">
            <ListItem icon={Radio} color="bg-green-500" label="Global Telemetry" control={<Toggle value={sysMetrics?.telemetryEnabled} onChange={(v) => systemCore.toggleTelemetry(v)} />} />
            <ListItem icon={Zap} color="bg-yellow-500" label="Session Score" value={sysMetrics?.score || 0} />
            <ListItem icon={Brain} color="bg-purple-500" label="Learned Facts" value={sysMetrics?.facts || 0} />
        </ListGroup>
        <div className="px-4"><button onClick={handleLobotomy} className="w-full py-3 bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl font-bold text-sm uppercase tracking-widest hover:bg-red-500/20 transition-colors">Purge Neural Memory</button></div>
    </div>
));

const IntelligenceView = memo(({ sysMetrics, aiLatency, testAiLatency, settings, updateSetting, testPrompt, setTestPrompt, testResponse, isTestingAi, isCoolingDown, handleTestPrompt }: any) => (
    <div className="animate-slide-up pb-10 pt-4">
        <div className="px-4 mb-6">
            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg">
                <div className="flex items-center gap-3 mb-2"><Brain size={32} className="text-white/90" /><h2 className="text-2xl font-bold">Gemini AI</h2></div>
                <p className="opacity-90">Neural Engine v2.5 Active</p>
                <div className="mt-4 flex gap-4">
                    <div className="bg-white/20 rounded-lg p-3 flex-1 text-center"><div className="text-2xl font-bold">{sysMetrics?.facts || 0}</div><div className="text-xs uppercase tracking-wide opacity-75">Memories</div></div>
                    <div className="bg-white/20 rounded-lg p-3 flex-1 text-center"><div className="text-2xl font-bold">{sysMetrics?.interactions || 0}</div><div className="text-xs uppercase tracking-wide opacity-75">Requests</div></div>
                </div>
            </div>
        </div>
        <ListGroup title="Diagnostics">
            <ListItem label="API Latency" value={aiLatency === null ? 'Not Tested' : aiLatency === 0 ? 'Testing...' : aiLatency === -1 ? 'Error' : `${aiLatency}ms`} onClick={testAiLatency} icon={Activity} color="bg-blue-500" isLink />
            <ListItem label="Model Configuration" value="Gemini 1.5 Flash" icon={Server} color="bg-gray-500" />
        </ListGroup>
        <div className="px-4 mb-6">
            <h3 className="px-4 mb-2 text-[13px] text-gray-500 uppercase font-medium ml-1">Live Test Console</h3>
            <div className="bg-white dark:bg-[#1C1C1E] p-4 rounded-xl border border-gray-200 dark:border-transparent">
                <div className="flex gap-2 mb-3">
                    <input type="text" value={testPrompt} onChange={(e) => setTestPrompt(e.target.value)} placeholder="Ask Gemini something..." className="flex-1 bg-gray-100 dark:bg-black/50 border border-transparent focus:border-blue-500 rounded-lg px-3 py-2 text-sm outline-none transition-all" onKeyDown={(e) => e.key === 'Enter' && handleTestPrompt()} />
                    <button onClick={handleTestPrompt} disabled={isTestingAi || isCoolingDown || !testPrompt.trim()} className="bg-blue-500 text-white p-2 rounded-lg disabled:opacity-50">{isTestingAi ? <Activity className="animate-spin" size={18} /> : <Play size={18} />}</button>
                </div>
                {isCoolingDown && <div className="mb-2 text-[11px] uppercase tracking-widest text-gray-400">Cooling Down</div>}
                {testResponse && <div className="p-3 bg-gray-50 dark:bg-black/30 rounded-lg text-xs font-mono text-gray-700 dark:text-gray-300 whitespace-pre-wrap max-h-32 overflow-y-auto custom-scrollbar">{testResponse}</div>}
            </div>
        </div>
        <ListGroup title="Parameters" footer="Higher temperature allows for more creative but less predictable responses.">
                <ListItem label="Creativity (Temperature)" control={<Slider value={Math.round(settings.aiTemperature * 100)} onChange={(v) => updateSetting('aiTemperature', v / 100)} />} />
        </ListGroup>
    </div>
));

const ProfileView = memo(({ user, isAdmin, sysMetrics, handleSignOut, formatBytes }: any) => (
    <div className="animate-slide-up pb-10">
        <div className="flex flex-col items-center pt-8 pb-6">
            <div className="w-24 h-24 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden mb-4 shadow-lg ring-4 ring-white dark:ring-white/10">
                {user?.photoURL ? <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-400"><UserIcon size={40} /></div>}
            </div>
            <h2 className="text-2xl font-bold text-black dark:text-white">{user?.displayName || 'User'}</h2>
            <p className="text-gray-500">{user?.email}</p>
            {isAdmin && <span className="mt-2 px-3 py-1 bg-blue-500/10 text-blue-500 text-xs font-bold rounded-full uppercase tracking-wider">Administrator</span>}
        </div>
        <ListGroup>
            <ListItem label="Name, Phone Numbers, Email" isLink />
            <ListItem label="Password & Security" isLink />
            <ListItem label="Payment & Shipping" isLink />
        </ListGroup>
        <ListGroup>
            <ListItem label="iCloud" icon={Brain} color="bg-blue-500" isLink value={formatBytes(sysMetrics?.totalTokens || 0)} />
            <ListItem label="Media & Purchases" icon={Activity} color="bg-blue-500" isLink />
            <ListItem label="Find My" icon={Radio} color="bg-green-500" isLink value="On" />
        </ListGroup>
        <div className="px-4"><button onClick={handleSignOut} className="w-full py-3 bg-white dark:bg-[#1C1C1E] text-[#FF3B30] rounded-xl font-medium text-[17px] active:scale-95 transition-transform border border-gray-200 dark:border-transparent">Sign Out</button></div>
    </div>
));

const DisplayView = memo(({ settings, updateSetting }: any) => (
    <div className="pt-6">
        <div className="mx-4 mb-6 p-6 bg-white dark:bg-[#1C1C1E] rounded-xl flex gap-4 justify-center">
            <div onClick={() => updateSetting('darkMode', false)} className={`flex-1 flex flex-col items-center gap-2 cursor-pointer ${!settings.darkMode ? 'opacity-100' : 'opacity-50'}`}>
                <div className="w-16 h-24 bg-[#E5E5E5] rounded-lg border-2 border-gray-300 flex flex-col items-center justify-center"><div className="w-8 h-2 bg-gray-300 rounded mb-1"/><div className="w-10 h-2 bg-gray-300 rounded"/></div>
                <span className="text-sm font-medium">Light</span>
                {!settings.darkMode && <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center"><Check size={10} className="text-white"/></div>}
            </div>
            <div onClick={() => updateSetting('darkMode', true)} className={`flex-1 flex flex-col items-center gap-2 cursor-pointer ${settings.darkMode ? 'opacity-100' : 'opacity-50'}`}>
                    <div className="w-16 h-24 bg-[#333] rounded-lg border-2 border-gray-600 flex flex-col items-center justify-center"><div className="w-8 h-2 bg-gray-500 rounded mb-1"/><div className="w-10 h-2 bg-gray-500 rounded"/></div>
                <span className="text-sm font-medium">Dark</span>
                {settings.darkMode && <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center"><Check size={10} className="text-white"/></div>}
            </div>
        </div>
        <ListGroup title="Brightness">
            <ListItem icon={Sun} color="bg-gray-400" label="Brightness" control={<Slider value={settings.brightness} onChange={(v) => updateSetting('brightness', v)} />} />
            <ListItem label="True Tone" control={<Toggle value={true} onChange={() => {}} />} />
        </ListGroup>
        <ListGroup title="Appearance">
            <ListItem icon={Activity} color="bg-orange-500" label="Night Shift" control={<Toggle value={settings.nightShift} onChange={(v) => updateSetting('nightShift', v)} />} />
        </ListGroup>
        <ListGroup title="Text">
            <ListItem icon={Type} color="bg-blue-500" label="Bold Text" control={<Toggle value={settings.boldText} onChange={(v) => updateSetting('boldText', v)} />} />
            <ListItem label="Text Size" control={<Slider min={80} max={150} value={settings.textSize * 100} onChange={(v) => updateSetting('textSize', v / 100)} />} />
        </ListGroup>
    </div>
));

const DeveloperView = memo(({ settings, updateSetting, logs }: any) => (
    <div className="h-full flex flex-col">
        <div className="p-4 border-b border-white/10">
            <ListGroup>
                <ListItem icon={Activity} color="bg-green-500" label="Show FPS" control={<Toggle value={settings.showFPS} onChange={(v) => updateSetting('showFPS', v)} />} />
                <ListItem icon={Shield} color="bg-red-500" label="Debug Borders" control={<Toggle value={settings.debugBorders} onChange={(v) => updateSetting('debugBorders', v)} />} />
            </ListGroup>
        </div>
        <div className="flex-1 bg-[#111] p-4 font-mono text-[10px] overflow-auto custom-scrollbar">
            {logs.map((log: any) => (
                <div key={`${log.timestamp}-${log.message}`} className={`mb-1 ${log.type === 'error' ? 'text-red-400' : log.type === 'warn' ? 'text-yellow-400' : 'text-gray-300'}`}>
                    <span className="opacity-50">[{new Date(log.timestamp).toLocaleTimeString()}]</span> {log.message}
                </div>
            ))}
        </div>
    </div>
));

const PowerView = ({ settings, updateSetting }: any) => (
    <div className="pt-6">
        <div className="px-6 pb-6 text-center">
            <div className="text-5xl font-bold text-green-500 mb-2">94%</div>
            <p className="text-gray-500">Last charged to 100% at 8:42 AM</p>
        </div>
        <ListGroup title="Battery Mode">
            <ListItem 
                icon={Battery} 
                color="bg-yellow-500" 
                label="Low Power Mode" 
                control={<Toggle value={settings.lowPowerMode} onChange={(v) => updateSetting('lowPowerMode', v)} />} 
            />
        </ListGroup>
        <ListGroup title="Battery Health">
                <ListItem label="Maximum Capacity" value="100%" isLink />
                <ListItem label="Clean Energy Charging" value="On" isLink />
        </ListGroup>
        <p className="px-8 text-xs text-gray-500">Low Power Mode reduces background activity and pauses the Neural Backend learning loop.</p>
    </div>
);

const GeneralView = memo(({ pushView }: any) => (
    <div className="pt-6">
        <ListGroup>
            <ListItem label="About" isLink onClick={() => pushView('about')} />
            <ListItem label="Software Update" value="OS 18.0.1" isLink />
        </ListGroup>
        <ListGroup>
            <ListItem label="Date & Time" isLink />
            <ListItem label="Keyboard" isLink />
            <ListItem label="Fonts" isLink />
            <ListItem label="Language & Region" isLink />
        </ListGroup>
    </div>
));

// --- Main App Logic ---

interface SettingsAppProps {
    currentWallpaperId: string;
    onWallpaperChange: (id: string) => void;
    installedApps?: AppID[];
    onUninstall?: (id: AppID) => void;
}

const SettingsApp: React.FC<SettingsAppProps> = ({ 
    currentWallpaperId, 
    onWallpaperChange, 
    installedApps = [], 
    onUninstall 
}) => {
  const [viewStack, setViewStack] = useState<View[]>(['main']);
  const [settings, setSettings] = useState<SettingsState>(DEFAULT_SETTINGS);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [storeStats, setStoreStats] = useState<StoreStats[]>([]);
  
  // Auth State
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [isAdmin, setIsAdmin] = useState(false);

  // App Selection State
  const [selectedAppId, setSelectedAppId] = useState<AppID | null>(null);
  const [selectedAppSize, setSelectedAppSize] = useState<number>(0);

  // Real-time Intelligence State
  const [sysMetrics, setSysMetrics] = useState<any>(null);
  const [recentEvents, setRecentEvents] = useState<any[]>([]);
  const [aiLatency, setAiLatency] = useState<number | null>(null);
  const [testPrompt, setTestPrompt] = useState('');
  const [testResponse, setTestResponse] = useState('');
  const [isTestingAi, setIsTestingAi] = useState(false);
  const [isCoolingDown, setIsCoolingDown] = useState(false);

  // Throttling for Logs
  const logUpdateRef = useRef<number>(0);
  const testCooldownRef = useRef<number | null>(null);

  const currentView = viewStack[viewStack.length - 1];

  // 1. Auth Listener
  useEffect(() => {
    const unsubscribeUser = authService.onUserChange((u) => setUser(u));
    const unsubscribeAdmin = authService.onAdminClaimChange((claim) => setIsAdmin(claim));
    return () => {
      unsubscribeUser();
      unsubscribeAdmin();
    };
  }, []);

  // 2. Safe Load Settings
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const saved = await storage.get<SettingsState>(STORES.SYSTEM, 'user_settings');
        if (saved && mounted) {
          setSettings(prev => ({ ...prev, ...saved }));
        }
      } catch (e) {
        console.error("Failed to load settings", e);
      }
    };
    load();
    return () => { mounted = false; };
  }, []);

  // 3. Real-time System Monitoring (Poller)
  useEffect(() => {
    const poll = async () => {
      // 1. Metrics
      const m = systemCore.getMetrics();
      // Only update state if metrics actually changed to avoid re-renders
      setSysMetrics(prev => JSON.stringify(prev) !== JSON.stringify(m) ? m : prev);
      
      // 2. Events (Only for Backend View) - THROTTLED to once per 2s
      if (currentView === 'backend' && isAdmin) {
          const now = Date.now();
          if (now - logUpdateRef.current > 2000) {
              const events = systemCore.getRecentEvents(50);
              setRecentEvents(events);
              logUpdateRef.current = now;
          }
      }

      // 3. Storage
      if (currentView === 'storage') {
        const statsPromises = Object.values(STORES).map(name => storage.getStoreStats(name));
        const stats = await Promise.all(statsPromises);
        setStoreStats(prev => JSON.stringify(prev) !== JSON.stringify(stats) ? stats : prev);
      }
    };

    const interval = setInterval(poll, currentView === 'backend' ? 500 : 3000); 
    poll(); // Initial call

    return () => clearInterval(interval);
  }, [currentView, isAdmin]);

  // 4. Update Setting Handler
  const updateSetting = useCallback((key: keyof SettingsState, val: any) => {
    setSettings(prev => {
      const next = { ...prev, [key]: val };
      storage.set(STORES.SYSTEM, 'user_settings', next).catch(console.error);
      window.dispatchEvent(new CustomEvent('sys_settings_update', { detail: next }));
      window.dispatchEvent(new CustomEvent('system_settings_change', { detail: next }));
      
      if (key === 'darkMode') document.documentElement.classList.toggle('dark', !!val);
      if (key === 'lowPowerMode') systemCore.setLowPowerMode(!!val);
      if (key === 'textSize') document.documentElement.style.setProperty('--text-scale', val.toString());
      if (key === 'boldText') {
          if (val) document.body.classList.add('font-bold');
          else document.body.classList.remove('font-bold');
      }
      
      return next;
    });
  }, []);

  useEffect(() => {
    if (currentView === 'developer' || currentView === 'backend') {
      return consoleService.subscribe(setLogs);
    }
  }, [currentView]);

  useEffect(() => {
    return () => {
      if (testCooldownRef.current) {
        window.clearTimeout(testCooldownRef.current);
      }
    };
  }, []);

  const pushView = useCallback((v: View) => setViewStack(prev => [...prev, v]), []);
  const popView = useCallback(() => setViewStack(prev => prev.slice(0, -1)), []);

  const handleLobotomy = useCallback(async () => {
      if (confirm("WARNING: This will wipe all learned user patterns, insights, and session scoring. Continue?")) {
          await systemCore.lobotomy();
          alert("System memory reset.");
      }
  }, []);

  const handleSignOut = useCallback(async () => {
    if (confirm("Are you sure you want to sign out?")) {
        await authService.logout();
    }
  }, []);
  
  const testAiLatency = useCallback(async () => {
      setAiLatency(0); // Loading
      const start = performance.now();
      try {
        await systemCore.getOptimizedPrompt("Ping", "test");
        const end = performance.now();
        setAiLatency(Math.round(end - start));
      } catch (e) {
          setAiLatency(-1); // Error
      }
  }, []);

  const handleTestPrompt = useCallback(async () => {
      if (!testPrompt.trim()) return;
      if (isCoolingDown) return;
      setIsCoolingDown(true);
      if (testCooldownRef.current) {
        window.clearTimeout(testCooldownRef.current);
      }
      testCooldownRef.current = window.setTimeout(() => {
        setIsCoolingDown(false);
        testCooldownRef.current = null;
      }, 2000);
      setIsTestingAi(true);
      try {
          const response = await systemCore.getOptimizedPrompt(testPrompt, "test_console");
          setTestResponse(response);
      } catch (e) {
          setTestResponse("Error: Failed to fetch response.");
      } finally {
          setIsTestingAi(false);
      }
  }, [testPrompt, isCoolingDown]);

  const formatBytes = useCallback((bytes: number) => {
      if (bytes === 0) return '0 B';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }, []);

  // --- App Management Handlers ---
  
  const handleSelectApp = useCallback((appId: AppID, size: number) => {
      setSelectedAppId(appId);
      setSelectedAppSize(size);
      pushView('app_detail');
  }, [pushView]);

  const handleClearAppData = useCallback(async (appId: AppID) => {
      // Find store
      const storeKey = Object.keys(STORE_APP_MAP).find(key => STORE_APP_MAP[key] === appId);
      if (!storeKey) {
          alert("No data found for this app.");
          return;
      }
      
      if (confirm(`Are you sure you want to delete all documents and data for this app? This action cannot be undone.`)) {
          await storage.clearStore(storeKey);
          // Refresh stats
          const statsPromises = Object.values(STORES).map(name => storage.getStoreStats(name));
          const stats = await Promise.all(statsPromises);
          setStoreStats(stats);
          setSelectedAppSize(0);
          alert("Data cleared.");
      }
  }, []);

  const handleUninstallApp = useCallback((appId: AppID) => {
      if (confirm("Delete this app? Deleting this app will also delete its data.")) {
          onUninstall?.(appId);
          popView();
      }
  }, [onUninstall, popView]);

  return (
    <div className="h-full bg-[#F2F2F7] dark:bg-black font-sans flex flex-col text-black dark:text-white overflow-hidden">
      {viewStack.length > 1 && (
          <Header 
            title={
                currentView === 'profile' ? 'Apple ID' :
                currentView === 'gemini' ? 'Intelligence' :
                currentView === 'backend' ? 'God Mode' :
                currentView === 'app_detail' ? (selectedAppId ? ALL_APPS[selectedAppId]?.name : 'App Info') :
                currentView.charAt(0).toUpperCase() + currentView.slice(1)
            } 
            canGoBack={true} 
            onBack={popView} 
          />
      )}

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {currentView === 'main' && <MainView user={user} isAdmin={isAdmin} sysMetrics={sysMetrics} pushView={pushView} />}
        {currentView === 'profile' && <ProfileView user={user} isAdmin={isAdmin} sysMetrics={sysMetrics} handleSignOut={handleSignOut} formatBytes={formatBytes} />}
        {currentView === 'backend' && isAdmin && <BackendView recentEvents={recentEvents} sysMetrics={sysMetrics} handleLobotomy={handleLobotomy} />}
        {currentView === 'gemini' && <IntelligenceView sysMetrics={sysMetrics} aiLatency={aiLatency} testAiLatency={testAiLatency} settings={settings} updateSetting={updateSetting} testPrompt={testPrompt} setTestPrompt={setTestPrompt} testResponse={testResponse} isTestingAi={isTestingAi} isCoolingDown={isCoolingDown} handleTestPrompt={handleTestPrompt} />}
        {currentView === 'general' && <GeneralView pushView={pushView} />}
        {currentView === 'display' && <DisplayView settings={settings} updateSetting={updateSetting} />}
        {currentView === 'wallpaper' && <WallpaperView settings={settings} updateSetting={updateSetting} currentWallpaperId={currentWallpaperId} onWallpaperChange={onWallpaperChange} />}
        {currentView === 'storage' && <StorageView storeStats={storeStats} user={user} formatBytes={formatBytes} installedApps={installedApps} handleSelectApp={handleSelectApp} />}
        {currentView === 'app_detail' && <AppDetailView selectedAppId={selectedAppId} selectedAppSize={selectedAppSize} formatBytes={formatBytes} handleUninstall={handleUninstallApp} handleClearData={handleClearAppData} />}
        {currentView === 'power' && <PowerView settings={settings} updateSetting={updateSetting} />}
        
        {currentView === 'notifications' && (
            <div className="pt-6">
                <ListGroup title="Notification Style">
                    <ListItem label="Allow Notifications" control={<Toggle value={settings.notificationsEnabled} onChange={(v) => updateSetting('notificationsEnabled', v)} />} />
                    <ListItem label="Scheduled Summary" value="Off" isLink />
                    <ListItem label="Show Previews" value="Always" isLink />
                </ListGroup>
            </div>
        )}
        {currentView === 'sounds' && (
            <div className="pt-6">
                <ListGroup title="Ringer and Alerts">
                     <ListItem label="Volume" control={<Slider value={settings.systemVolume * 100} onChange={(v) => updateSetting('systemVolume', v / 100)} />} />
                    <ListItem label="Change with Buttons" control={<Toggle value={true} onChange={() => {}} />} />
                </ListGroup>
                <ListGroup>
                    <ListItem label="Ringtone" value="Reflection" isLink />
                    <ListItem label="Text Tone" value="Note" isLink />
                </ListGroup>
            </div>
        )}
        {currentView === 'focus' && (
            <div className="pt-6">
                 <ListGroup>
                    <ListItem label="Do Not Disturb" icon={Moon} color="bg-indigo-500" control={<Toggle value={settings.doNotDisturb} onChange={(v) => updateSetting('doNotDisturb', v)} />} />
                     <ListItem label="Personal" icon={UserIcon} color="bg-purple-500" isLink />
                     <ListItem label="Work" icon={BriefcaseIconWrapper} color="bg-green-500" isLink />
                 </ListGroup>
            </div>
        )}
        {currentView === 'privacy' && (
             <div className="pt-6">
                 <ListGroup title="Permissions">
                     <ListItem label="Location Services" icon={Radio} color="bg-blue-500" value="On" isLink />
                     <ListItem label="Tracking" icon={Hand} color="bg-orange-500" isLink />
                 </ListGroup>
                 <ListGroup title="Hardware">
                     <ListItem label="Microphone" icon={Mic} color="bg-red-500" isLink />
                     <ListItem label="Camera" icon={Eye} color="bg-gray-500" isLink />
                 </ListGroup>
            </div>
        )}
        {currentView === 'about' && (
             <div className="pt-6 px-4 text-center">
                 <h2 className="text-2xl font-bold mb-2">OS 18 Web Experience</h2>
                 <p className="text-gray-500 mb-6">Version 1.0 (Build 2026.01.17)</p>
                 <ListGroup>
                     <ListItem label="Name" value="OS 18" />
                     <ListItem label="Model Name" value="iPhone 16 Pro Max" />
                     <ListItem label="Serial Number" value="H4X0R-1337-CODE" />
                 </ListGroup>
            </div>
        )}
        {currentView === 'developer' && <DeveloperView settings={settings} updateSetting={updateSetting} logs={logs} />}
      </div>
    </div>
  );
};

// Mock Icon for Work Focus
const BriefcaseIconWrapper = memo((props: any) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={props.size} height={props.size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <rect width="20" height="14" x="2" y="7" rx="2" ry="2" />
        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
));

export default memo(SettingsApp);
