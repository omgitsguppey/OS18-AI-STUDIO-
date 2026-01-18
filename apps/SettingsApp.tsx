
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Bell, Volume2, Moon, Settings as SettingsIcon, Type, 
  LayoutGrid, Sparkles, Hand, Hammer, ChevronRight, 
  ArrowLeft, Search, Smartphone, Ghost, RotateCcw,
  HardDrive, Clock, Info, User, Check, Trash2,
  Lock, Zap, Database, Activity, Cpu, Network,
  Eye, FileText, Battery, Brain, Terminal,
  Radio, Shield
} from 'lucide-react';
import { storage, STORES, StoreStats } from '../services/storageService';
import { systemCore } from '../services/systemCore';
import { consoleService, LogEntry } from '../services/consoleService';
import { WALLPAPERS, ALL_APPS } from '../constants';

// --- Types & Defaults ---

type View = 'main' | 'general' | 'display' | 'notifications' | 'sounds' | 'focus' | 'privacy' | 'developer' | 'wallpaper' | 'gemini' | 'about' | 'storage' | 'date' | 'power' | 'backend';

interface SettingsState {
  // Display
  darkMode: boolean;
  nightShift: boolean;
  textSize: number;
  boldText: boolean;
  // System
  reducedMotion: boolean;
  haptics: boolean;
  notificationsEnabled: boolean;
  doNotDisturb: boolean;
  systemVolume: number;
  // General
  timeFormat24h: boolean;
  // Dev
  showFPS: boolean;
  debugBorders: boolean;
  // Power
  lowPowerMode: boolean;
  // AI
  aiTemperature: number;
}

const DEFAULT_SETTINGS: SettingsState = {
  darkMode: true,
  nightShift: false,
  textSize: 1,
  boldText: false,
  reducedMotion: false,
  haptics: true,
  notificationsEnabled: true,
  doNotDisturb: false,
  systemVolume: 0.8,
  timeFormat24h: false,
  showFPS: false,
  debugBorders: false,
  lowPowerMode: false,
  aiTemperature: 0.7
};

// --- UI Components ---

const Toggle = ({ value, onChange }: { value: boolean, onChange: (v: boolean) => void }) => (
  <div 
    onClick={(e) => { e.stopPropagation(); onChange(!value); }}
    className={`w-[50px] h-[30px] rounded-full p-[2px] transition-colors duration-300 cursor-pointer ${value ? 'bg-[#34C759]' : 'bg-[#E9E9EA] dark:bg-[#39393D]'}`}
  >
    <div className={`w-[26px] h-[26px] bg-white rounded-full shadow-md transform transition-transform duration-300 ${value ? 'translate-x-[20px]' : 'translate-x-0'}`} />
  </div>
);

const ListItem = ({ 
  icon: Icon, 
  color, 
  label, 
  value, 
  onClick, 
  isLink = false,
  control,
  destructive = false
}: any) => (
  <div 
    onClick={onClick}
    className={`flex items-center justify-between px-4 py-3 min-h-[48px] bg-white dark:bg-[#1C1C1E] active:bg-gray-100 dark:active:bg-[#2C2C2E] transition-colors ${onClick || isLink ? 'cursor-pointer' : ''}`}
  >
    <div className="flex items-center gap-3 min-w-0">
      {Icon && (
        <div className={`w-7 h-7 rounded-[7px] flex items-center justify-center text-white shrink-0 ${color}`}>
          <Icon size={16} fill="currentColor" strokeWidth={2.5} />
        </div>
      )}
      <span className={`text-[17px] truncate font-medium ${destructive ? 'text-red-500' : 'text-black dark:text-white'}`}>
        {label}
      </span>
    </div>
    <div className="flex items-center gap-2 pl-2">
      {control}
      {!control && value && <span className="text-[17px] text-gray-500 dark:text-gray-400 truncate max-w-[120px]">{value}</span>}
      {(onClick || isLink) && !control && <ChevronRight size={16} className="text-gray-400 opacity-60" />}
    </div>
  </div>
);

const ListGroup = ({ title, footer, children }: any) => (
  <div className="mb-6">
    {title && <h3 className="px-4 mb-2 text-[13px] text-gray-500 uppercase font-medium ml-1">{title}</h3>}
    <div className="mx-4 overflow-hidden rounded-[12px] divide-y divide-gray-200 dark:divide-white/10 border border-gray-200 dark:border-transparent">
      {children}
    </div>
    {footer && <p className="px-4 mt-2 text-[13px] text-gray-500 leading-normal ml-1">{footer}</p>}
  </div>
);

// --- Main App ---

const SettingsApp: React.FC<{ currentWallpaperId: string, onWallpaperChange: (id: string) => void }> = ({ currentWallpaperId, onWallpaperChange }) => {
  const [viewStack, setViewStack] = useState<View[]>(['main']);
  const [settings, setSettings] = useState<SettingsState>(DEFAULT_SETTINGS);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [storeStats, setStoreStats] = useState<StoreStats[]>([]);
  
  // Real-time Intelligence State
  const [sysMetrics, setSysMetrics] = useState<any>(null);
  const [memoryFacts, setMemoryFacts] = useState<any[]>([]);
  const [recentEvents, setRecentEvents] = useState<any[]>([]);
  const [activeContextPrompt, setActiveContextPrompt] = useState('');

  const currentView = viewStack[viewStack.length - 1];

  // 1. Safe Load
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

  // 2. Real-time System Monitoring (Poller)
  useEffect(() => {
    const poll = async () => {
      // 1. Intelligence Metrics
      const m = systemCore.getMetrics();
      setSysMetrics(m);
      
      // 2. Memory Facts
      const facts = systemCore.getMemory();
      setMemoryFacts(facts);

      // 3. Prompt Preview
      const samplePrompt = systemCore.getOptimizedPrompt("Hello world", "settings_preview", "Global");
      setActiveContextPrompt(samplePrompt);

      // 4. Raw Events (Backend View Only - High Frequency)
      if (currentView === 'backend') {
          const events = systemCore.getRecentEvents(30);
          setRecentEvents(events);
      }

      // 5. Storage Stats (Only if in storage view to save resources)
      if (currentView === 'storage') {
        const statsPromises = Object.values(STORES).map(name => storage.getStoreStats(name));
        const stats = await Promise.all(statsPromises);
        setStoreStats(stats);
      }
    };

    const interval = setInterval(poll, currentView === 'backend' ? 500 : 2000); 
    poll(); // Initial call

    return () => clearInterval(interval);
  }, [currentView]);

  // 3. Safe Update Handler
  const updateSetting = useCallback((key: keyof SettingsState, val: any) => {
    setSettings(prev => {
      const next = { ...prev, [key]: val };
      storage.set(STORES.SYSTEM, 'user_settings', next).catch(console.error);
      window.dispatchEvent(new CustomEvent('sys_settings_update', { detail: next }));
      
      // Side Effects
      if (key === 'darkMode') {
        document.documentElement.classList.toggle('dark', !!val);
      }
      if (key === 'lowPowerMode') {
        systemCore.setLowPowerMode(!!val);
      }
      
      return next;
    });
  }, []);

  useEffect(() => {
    if (currentView === 'developer') {
      return consoleService.subscribe(setLogs);
    }
  }, [currentView]);

  const pushView = (v: View) => setViewStack(prev => [...prev, v]);
  const popView = () => setViewStack(prev => prev.slice(0, -1));

  const handleClearStore = async (storeName: string) => {
    if (confirm(`Delete all data in ${storeName}? This cannot be undone.`)) {
        await storage.clearStore(storeName);
        // Force refresh stats
        const stats = await Promise.all(Object.values(STORES).map(name => storage.getStoreStats(name)));
        setStoreStats(stats);
    }
  };

  const handleLobotomy = async () => {
      if (confirm("WARNING: This will wipe all learned user patterns, insights, and session scoring. Continue?")) {
          await systemCore.lobotomy();
          alert("System memory reset.");
      }
  };

  const handleToggleTelemetry = async (val: boolean) => {
      await systemCore.toggleTelemetry(val);
  };

  const formatBytes = (bytes: number) => {
      if (bytes === 0) return '0 B';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // --- Views ---

  const renderHeader = (title: string) => (
    <div className="h-[52px] bg-[#F2F2F7] dark:bg-black sticky top-0 z-20 flex items-center px-2 border-b border-gray-200 dark:border-white/10 shrink-0 backdrop-blur-xl bg-opacity-90 dark:bg-opacity-90">
      <div className="flex-1">
        {viewStack.length > 1 && (
          <button 
            onClick={popView}
            className="flex items-center text-[#007AFF] px-2 active:opacity-50 transition-opacity font-medium text-[17px]"
          >
            <ArrowLeft size={22} className="mr-1" /> Back
          </button>
        )}
      </div>
      <h1 className="font-semibold text-[17px] text-black dark:text-white absolute left-1/2 -translate-x-1/2 whitespace-nowrap">{title}</h1>
      <div className="flex-1" />
    </div>
  );

  const BackendView = () => (
    <div className="animate-slide-up space-y-6 pb-20">
        <div className="px-4 py-2">
            <div className="bg-[#111] rounded-xl border border-white/10 p-4 font-mono text-xs text-green-500 overflow-hidden relative">
                <div className="absolute top-2 right-2 flex gap-2">
                    <span className="animate-pulse">●</span> LIVE
                </div>
                <div className="h-64 overflow-y-auto custom-scrollbar flex flex-col-reverse gap-1">
                    {recentEvents.map((e, i) => (
                        <div key={i} className="whitespace-nowrap flex gap-2 opacity-80 hover:opacity-100 transition-opacity">
                            <span className="text-gray-500">[{new Date(e.timestamp).toLocaleTimeString().split(' ')[0]}]</span>
                            <span className="text-blue-400 font-bold">{e.appId}</span>
                            <span className="text-white">{e.action}</span>
                            <span className="text-gray-600 truncate max-w-[200px]">{JSON.stringify(e.metadata)}</span>
                        </div>
                    ))}
                    {recentEvents.length === 0 && <div className="text-gray-600 italic">Waiting for events...</div>}
                </div>
            </div>
        </div>

        <ListGroup title="Algorithm Status">
            <ListItem 
                icon={Radio} 
                color="bg-green-500" 
                label="Global Telemetry" 
                control={<Toggle value={sysMetrics?.telemetryEnabled} onChange={handleToggleTelemetry} />} 
            />
            <ListItem 
                icon={Zap} 
                color="bg-yellow-500" 
                label="Session Score" 
                value={sysMetrics?.score || 0} 
            />
            <ListItem 
                icon={Activity} 
                color="bg-blue-500" 
                label="Interactions" 
                value={sysMetrics?.interactions || 0} 
            />
        </ListGroup>

        {sysMetrics?.insights?.length > 0 && (
            <div className="px-4">
                <h3 className="mb-2 text-[13px] text-gray-500 uppercase font-medium">Neural Insights</h3>
                <div className="space-y-2">
                    {sysMetrics.insights.map((insight: any) => (
                        <div key={insight.id} className="bg-[#1c1c1e] p-4 rounded-xl border border-white/5 flex gap-3 items-start">
                            <div className={`mt-1 w-2 h-2 rounded-full ${insight.type === 'pattern' ? 'bg-blue-500' : insight.type === 'anomaly' ? 'bg-red-500' : 'bg-green-500'}`} />
                            <div>
                                <p className="text-sm font-medium text-white">{insight.message}</p>
                                <p className="text-xs text-gray-500 mt-1">Confidence: {Math.round(insight.confidence * 100)}%</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        <div className="px-4">
            <button 
                onClick={handleLobotomy}
                className="w-full py-3 bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl font-bold text-sm uppercase tracking-widest hover:bg-red-500/20 transition-colors"
            >
                Lobotomize System
            </button>
            <p className="text-center text-[10px] text-gray-600 mt-2">Wipes all learned patterns and session data.</p>
        </div>
    </div>
  );

  const MainView = () => (
    <div className="animate-slide-up pb-10">
      <div className="px-4 pt-6 pb-4">
        <h1 className="text-[34px] font-bold text-black dark:text-white tracking-tight">Settings</h1>
      </div>

      <div className="mx-4 mb-8 flex items-center gap-4 p-4 bg-white dark:bg-[#1C1C1E] rounded-[12px] border border-gray-200 dark:border-transparent active:scale-[0.98] transition-transform cursor-pointer">
        <div className="w-[60px] h-[60px] rounded-full bg-gradient-to-tr from-gray-400 to-gray-600 flex items-center justify-center text-white text-2xl font-bold shadow-md">
          <span className="mt-0.5"><User size={32} /></span>
        </div>
        <div>
          <h2 className="text-[20px] text-black dark:text-white font-medium">Local User</h2>
          <p className="text-[14px] text-gray-500">Offline Profile • {formatBytes(sysMetrics?.totalTokens || 0)} Tokens Used</p>
        </div>
      </div>

      {/* Group 1: Intelligence */}
      <ListGroup>
        <ListItem 
            icon={Brain} 
            color="bg-indigo-600" 
            label="Gemini Intelligence" 
            onClick={() => pushView('gemini')} 
            value={sysMetrics ? `${sysMetrics.facts} Memories` : 'Active'} 
            isLink 
        />
        <ListItem 
            icon={Terminal} 
            color="bg-black border border-white/20" 
            label="Neural Backend" 
            onClick={() => pushView('backend')} 
            value={sysMetrics?.telemetryEnabled ? "Monitoring" : "Off"}
            isLink 
        />
      </ListGroup>

      {/* Group 2: Connectivity & Power */}
      <ListGroup>
        <ListItem icon={Bell} color="bg-[#FF3B30]" label="Notifications" onClick={() => pushView('notifications')} isLink />
        <ListItem icon={Volume2} color="bg-[#FF2D55]" label="Sounds & Haptics" onClick={() => pushView('sounds')} isLink />
        <ListItem icon={Moon} color="bg-[#5856D6]" label="Focus" onClick={() => pushView('focus')} value={settings.doNotDisturb ? "On" : ""} isLink />
        <ListItem icon={Battery} color="bg-[#34C759]" label="Power & Battery" onClick={() => pushView('power')} isLink />
      </ListGroup>

      {/* Group 3: System */}
      <ListGroup>
        <ListItem icon={SettingsIcon} color="bg-[#8E8E93]" label="General" onClick={() => pushView('general')} isLink />
        <ListItem icon={Type} color="bg-[#007AFF]" label="Display & Brightness" onClick={() => pushView('display')} isLink />
        <ListItem icon={LayoutGrid} color="bg-[#32ADE6]" label="Home Screen" onClick={() => pushView('wallpaper')} isLink />
        <ListItem icon={HardDrive} color="bg-[#ff9f0a]" label="Storage" onClick={() => pushView('storage')} isLink />
      </ListGroup>

      {/* Group 4: Privacy */}
      <ListGroup>
        <ListItem icon={Hand} color="bg-[#007AFF]" label="Privacy & Security" onClick={() => pushView('privacy')} isLink />
        <ListItem icon={Hammer} color="bg-[#8E8E93]" label="Developer" onClick={() => pushView('developer')} isLink />
      </ListGroup>
    </div>
  );

  return (
    <div className="h-full bg-[#F2F2F7] dark:bg-black font-sans flex flex-col text-black dark:text-white overflow-hidden">
      {viewStack.length > 1 && renderHeader(
        currentView === 'gemini' ? 'Intelligence' :
        currentView === 'backend' ? 'System Algorithm' :
        currentView.charAt(0).toUpperCase() + currentView.slice(1)
      )}

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {currentView === 'main' && <MainView />}
        {currentView === 'backend' && <BackendView />}
        {/* Placeholder Views for standard settings omitted for brevity, reusing generic text */}
        {['general', 'notifications', 'sounds', 'focus', 'privacy', 'about', 'date'].includes(currentView) && (
            <div className="p-8 text-center text-gray-500">
                <SettingsIcon size={48} className="mx-auto mb-4 opacity-20" />
                <p>System setting panel placeholder.</p>
            </div>
        )}
        
        {/* Power View */}
        {currentView === 'power' && (
            <div className="pt-6">
                <ListGroup title="Battery">
                    <ListItem 
                        icon={Battery} 
                        color="bg-yellow-500" 
                        label="Low Power Mode" 
                        control={<Toggle value={settings.lowPowerMode} onChange={(v) => updateSetting('lowPowerMode', v)} />} 
                    />
                </ListGroup>
                <p className="px-8 text-xs text-gray-500">Low Power Mode reduces background activity and pauses the Neural Backend learning loop.</p>
            </div>
        )}

        {/* Display View */}
        {currentView === 'display' && (
            <div className="pt-6">
                <ListGroup title="Appearance">
                    <ListItem 
                        icon={Moon} 
                        color="bg-black border border-white/20" 
                        label="Dark Mode" 
                        control={<Toggle value={settings.darkMode} onChange={(v) => updateSetting('darkMode', v)} />} 
                    />
                    <ListItem 
                        icon={Eye} 
                        color="bg-orange-500" 
                        label="Night Shift" 
                        control={<Toggle value={settings.nightShift} onChange={(v) => updateSetting('nightShift', v)} />} 
                    />
                </ListGroup>
                <ListGroup title="Text">
                    <ListItem 
                        icon={Type} 
                        color="bg-blue-500" 
                        label="Bold Text" 
                        control={<Toggle value={settings.boldText} onChange={(v) => updateSetting('boldText', v)} />} 
                    />
                </ListGroup>
            </div>
        )}

        {/* Storage View */}
        {currentView === 'storage' && (
            <div className="p-6 space-y-4">
                <h3 className="font-bold text-gray-500 text-xs uppercase tracking-widest">IndexedDB Usage</h3>
                {storeStats.length === 0 && <p className="text-gray-500">Calculating...</p>}
                {storeStats.map(stat => (
                    <div key={stat.name} className="bg-[#1c1c1e] p-4 rounded-xl border border-white/5 flex justify-between items-center">
                        <div>
                            <p className="font-bold text-sm text-white">{stat.name.replace('_data', '').toUpperCase()}</p>
                            <p className="text-xs text-gray-500">{stat.count} items • {formatBytes(stat.sizeBytes)}</p>
                        </div>
                        <button onClick={() => handleClearStore(stat.name)} className="text-red-500 p-2 hover:bg-white/5 rounded-lg">
                            <Trash2 size={16} />
                        </button>
                    </div>
                ))}
            </div>
        )}

        {/* Developer View */}
        {currentView === 'developer' && (
            <div className="h-full flex flex-col">
                <div className="p-4 border-b border-white/10">
                    <ListGroup>
                        <ListItem 
                            icon={Activity} 
                            color="bg-green-500" 
                            label="Show FPS" 
                            control={<Toggle value={settings.showFPS} onChange={(v) => updateSetting('showFPS', v)} />} 
                        />
                        <ListItem 
                            icon={Shield} 
                            color="bg-red-500" 
                            label="Debug Borders" 
                            control={<Toggle value={settings.debugBorders} onChange={(v) => updateSetting('debugBorders', v)} />} 
                        />
                    </ListGroup>
                </div>
                <div className="flex-1 bg-[#111] p-4 font-mono text-[10px] overflow-auto custom-scrollbar">
                    {logs.map((log, i) => (
                        <div key={i} className={`mb-1 ${log.type === 'error' ? 'text-red-400' : log.type === 'warn' ? 'text-yellow-400' : 'text-gray-300'}`}>
                            <span className="opacity-50">[{new Date(log.timestamp).toLocaleTimeString()}]</span> {log.message}
                        </div>
                    ))}
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default SettingsApp;
