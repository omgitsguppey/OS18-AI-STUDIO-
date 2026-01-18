import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Bell, Volume2, Moon, Settings as SettingsIcon, Type, 
  LayoutGrid, Activity, Hand, ChevronRight, 
  ArrowLeft, Battery, Brain, Terminal,
  Radio, Shield, Trash2, User as UserIcon, LogOut,
  Wifi, Bluetooth, Database, Zap, Lock, Hammer,
  Info, Smartphone, HardDrive, RotateCcw,
  Check, AlertTriangle, Eye, Sun, Speaker, 
  Mic, Globe, Key, FileText, Server
} from 'lucide-react';
import { storage, STORES, StoreStats } from '../services/storageService';
import { systemCore } from '../services/systemCore';
import { consoleService, LogEntry } from '../services/consoleService';
import { authService } from '../services/authService';
import { auth } from '../services/firebaseConfig';
import { onAuthStateChanged, User } from 'firebase/auth';

// --- Types & Defaults ---

type View = 'main' | 'general' | 'display' | 'notifications' | 'sounds' | 'focus' | 'privacy' | 'developer' | 'wallpaper' | 'gemini' | 'about' | 'storage' | 'date' | 'power' | 'backend' | 'profile';

interface SettingsState {
  // Display
  darkMode: boolean;
  nightShift: boolean;
  textSize: number;
  boldText: boolean;
  brightness: number;
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

const Slider = ({ value, min = 0, max = 100, onChange }: { value: number, min?: number, max?: number, onChange: (v: number) => void }) => (
    <input 
        type="range" 
        min={min} 
        max={max} 
        value={value} 
        onChange={(e) => onChange(Number(e.target.value))}
        onClick={(e) => e.stopPropagation()}
        className="w-32 h-1 bg-gray-300 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-500"
    />
);

const ListItem = ({ 
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
    className={`flex items-center justify-between px-4 py-3 min-h-[48px] bg-white dark:bg-[#1C1C1E] active:bg-gray-100 dark:active:bg-[#2C2C2E] transition-colors ${onClick || isLink ? 'cursor-pointer' : ''}`}
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
);

const ListGroup = ({ title, footer, children }: any) => (
  <div className="mb-6">
    {title && <h3 className="px-4 mb-2 text-[13px] text-gray-500 uppercase font-medium ml-4">{title}</h3>}
    <div className="mx-4 overflow-hidden rounded-[12px] divide-y divide-gray-200 dark:divide-white/10 border border-gray-200 dark:border-transparent">
      {children}
    </div>
    {footer && <p className="px-4 mt-2 text-[13px] text-gray-500 leading-normal ml-4">{footer}</p>}
  </div>
);

// --- Main App ---

const SettingsApp: React.FC<{ currentWallpaperId: string, onWallpaperChange: (id: string) => void }> = ({ currentWallpaperId, onWallpaperChange }) => {
  const [viewStack, setViewStack] = useState<View[]>(['main']);
  const [settings, setSettings] = useState<SettingsState>(DEFAULT_SETTINGS);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [storeStats, setStoreStats] = useState<StoreStats[]>([]);
  
  // Auth State
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const isAdmin = user?.email === 'uylusjohnson@gmail.com';

  // Real-time Intelligence State
  const [sysMetrics, setSysMetrics] = useState<any>(null);
  const [recentEvents, setRecentEvents] = useState<any[]>([]);
  const [aiLatency, setAiLatency] = useState<number | null>(null);

  const currentView = viewStack[viewStack.length - 1];

  // 1. Auth Listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsub();
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
      // 1. Intelligence Metrics
      const m = systemCore.getMetrics();
      setSysMetrics(m);
      
      // 2. Raw Events (Backend View Only - High Frequency)
      if (currentView === 'backend' && isAdmin) {
          const events = systemCore.getRecentEvents(50);
          setRecentEvents(events);
      }

      // 3. Storage Stats (Only if in storage view)
      if (currentView === 'storage') {
        const statsPromises = Object.values(STORES).map(name => storage.getStoreStats(name));
        const stats = await Promise.all(statsPromises);
        setStoreStats(stats);
      }
    };

    const interval = setInterval(poll, currentView === 'backend' ? 1000 : 3000); 
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

  const pushView = (v: View) => setViewStack(prev => [...prev, v]);
  const popView = () => setViewStack(prev => prev.slice(0, -1));

  const handleClearStore = async (storeName: string) => {
    if (confirm(`Delete all data in ${storeName}? This cannot be undone.`)) {
        await storage.clearStore(storeName);
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

  const handleSignOut = async () => {
    if (confirm("Are you sure you want to sign out?")) {
        await authService.logout();
    }
  };
  
  const testAiLatency = async () => {
      setAiLatency(0); // Loading
      const start = performance.now();
      // Simple prompt to test roundtrip
      try {
        await systemCore.getOptimizedPrompt("Ping", "test");
        const end = performance.now();
        setAiLatency(Math.round(end - start));
      } catch (e) {
          setAiLatency(-1); // Error
      }
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

  // --- SUB-PAGES ---

  const ProfileView = () => (
      <div className="animate-slide-up pb-10">
          <div className="flex flex-col items-center pt-8 pb-6">
              <div className="w-24 h-24 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden mb-4 shadow-lg ring-4 ring-white dark:ring-white/10">
                  {user?.photoURL ? (
                      <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                          <UserIcon size={40} />
                      </div>
                  )}
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

          <div className="px-4">
              <button 
                  onClick={handleSignOut}
                  className="w-full py-3 bg-white dark:bg-[#1C1C1E] text-[#FF3B30] rounded-xl font-medium text-[17px] active:scale-95 transition-transform border border-gray-200 dark:border-transparent"
              >
                  Sign Out
              </button>
          </div>
      </div>
  );

  const BackendView = () => (
    <div className="animate-slide-up space-y-6 pb-20">
        <div className="px-4 py-2">
            <div className="bg-[#111] rounded-xl border border-white/10 p-4 font-mono text-xs text-green-500 overflow-hidden relative shadow-2xl">
                <div className="absolute top-2 right-2 flex gap-2">
                    <span className="animate-pulse">●</span> LIVE
                </div>
                <div className="h-64 overflow-y-auto custom-scrollbar flex flex-col-reverse gap-1">
                    {recentEvents.map((e, i) => (
                        <div key={i} className="whitespace-nowrap flex gap-2 opacity-80 hover:opacity-100 transition-opacity">
                            <span className="text-gray-500">[{new Date(e.timestamp).toLocaleTimeString().split(' ')[0]}]</span>
                            <span className="text-blue-400 font-bold">{e.appId}</span>
                            <span className="text-white">{e.action}</span>
                        </div>
                    ))}
                    {recentEvents.length === 0 && <div className="text-gray-600 italic">No events captured...</div>}
                </div>
            </div>
        </div>

        <ListGroup title="God Mode Controls">
            <ListItem 
                icon={Radio} 
                color="bg-green-500" 
                label="Global Telemetry" 
                control={<Toggle value={sysMetrics?.telemetryEnabled} onChange={(v) => systemCore.toggleTelemetry(v)} />} 
            />
            <ListItem 
                icon={Zap} 
                color="bg-yellow-500" 
                label="Session Score" 
                value={sysMetrics?.score || 0} 
            />
            <ListItem 
                icon={Brain} 
                color="bg-purple-500" 
                label="Learned Facts" 
                value={sysMetrics?.facts || 0}
            />
        </ListGroup>

        <div className="px-4">
            <button 
                onClick={handleLobotomy}
                className="w-full py-3 bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl font-bold text-sm uppercase tracking-widest hover:bg-red-500/20 transition-colors"
            >
                Purge Neural Memory
            </button>
        </div>
    </div>
  );

  const IntelligenceView = () => (
      <div className="animate-slide-up pb-10 pt-4">
          <div className="px-4 mb-6">
              <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg">
                  <div className="flex items-center gap-3 mb-2">
                      <Brain size={32} className="text-white/90" />
                      <h2 className="text-2xl font-bold">Gemini AI</h2>
                  </div>
                  <p className="opacity-90">Neural Engine v2.5 Active</p>
                  <div className="mt-4 flex gap-4">
                      <div className="bg-white/20 rounded-lg p-3 flex-1 text-center">
                          <div className="text-2xl font-bold">{sysMetrics?.facts || 0}</div>
                          <div className="text-xs uppercase tracking-wide opacity-75">Memories</div>
                      </div>
                      <div className="bg-white/20 rounded-lg p-3 flex-1 text-center">
                          <div className="text-2xl font-bold">{sysMetrics?.interactions || 0}</div>
                          <div className="text-xs uppercase tracking-wide opacity-75">Requests</div>
                      </div>
                  </div>
              </div>
          </div>
          
          <ListGroup title="Diagnostics">
              <ListItem 
                  label="API Latency" 
                  value={aiLatency === null ? 'Not Tested' : aiLatency === 0 ? 'Testing...' : aiLatency === -1 ? 'Error' : `${aiLatency}ms`}
                  onClick={testAiLatency}
                  icon={Activity}
                  color="bg-blue-500"
                  isLink
              />
              <ListItem 
                  label="Model Configuration" 
                  value="Gemini 1.5 Flash"
                  icon={Server}
                  color="bg-gray-500"
              />
          </ListGroup>

          <ListGroup title="Parameters" footer="Higher temperature allows for more creative but less predictable responses.">
               <ListItem 
                  label="Creativity (Temperature)" 
                  control={<Slider value={Math.round(settings.aiTemperature * 100)} onChange={(v) => updateSetting('aiTemperature', v / 100)} />}
               />
          </ListGroup>
      </div>
  );

  const MainView = () => (
    <div className="animate-slide-up pb-10">
      <div className="px-4 pt-6 pb-4">
        <h1 className="text-[34px] font-bold text-black dark:text-white tracking-tight">Settings</h1>
      </div>

      {/* Apple ID Style Banner */}
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

      {/* Group 1: Connectivity */}
      <ListGroup>
          <ListItem icon={Wifi} color="bg-[#007AFF]" label="Wi-Fi" value="Starlink-5G" isLink />
          <ListItem icon={Bluetooth} color="bg-[#007AFF]" label="Bluetooth" value="On" isLink />
          <ListItem icon={Radio} color="bg-[#34C759]" label="Cellular" isLink />
      </ListGroup>

      {/* Group 2: Intelligence */}
      <ListGroup>
        <ListItem 
            icon={Brain} 
            color="bg-indigo-600" 
            label="Gemini Intelligence" 
            onClick={() => pushView('gemini')} 
            value={sysMetrics ? `${sysMetrics.facts} Memories` : 'Active'} 
            isLink 
        />
        {/* Only Admin sees the Neural Backend entry */}
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

      {/* Group 3: System */}
      <ListGroup>
        <ListItem icon={SettingsIcon} color="bg-[#8E8E93]" label="General" onClick={() => pushView('general')} isLink />
        <ListItem icon={Type} color="bg-[#007AFF]" label="Display & Brightness" onClick={() => pushView('display')} isLink />
        <ListItem icon={LayoutGrid} color="bg-[#32ADE6]" label="Home Screen" onClick={() => pushView('wallpaper')} isLink />
        <ListItem icon={Database} color="bg-[#ff9f0a]" label="Storage" onClick={() => pushView('storage')} isLink />
      </ListGroup>

      {/* Group 4: Connectivity & Power */}
      <ListGroup>
        <ListItem icon={Bell} color="bg-[#FF3B30]" label="Notifications" onClick={() => pushView('notifications')} isLink />
        <ListItem icon={Volume2} color="bg-[#FF2D55]" label="Sounds & Haptics" onClick={() => pushView('sounds')} isLink />
        <ListItem icon={Moon} color="bg-[#5856D6]" label="Focus" onClick={() => pushView('focus')} value={settings.doNotDisturb ? "On" : ""} isLink />
        <ListItem icon={Battery} color="bg-[#34C759]" label="Battery" onClick={() => pushView('power')} isLink />
      </ListGroup>

      {/* Group 5: Privacy */}
      <ListGroup>
        <ListItem icon={Hand} color="bg-[#007AFF]" label="Privacy & Security" onClick={() => pushView('privacy')} isLink />
        <ListItem icon={Hammer} color="bg-[#8E8E93]" label="Developer" onClick={() => pushView('developer')} isLink />
      </ListGroup>
    </div>
  );

  return (
    <div className="h-full bg-[#F2F2F7] dark:bg-black font-sans flex flex-col text-black dark:text-white overflow-hidden">
      {viewStack.length > 1 && renderHeader(
        currentView === 'profile' ? 'Apple ID' :
        currentView === 'gemini' ? 'Intelligence' :
        currentView === 'backend' ? 'God Mode' :
        currentView.charAt(0).toUpperCase() + currentView.slice(1)
      )}

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {currentView === 'main' && <MainView />}
        {currentView === 'profile' && <ProfileView />}
        {currentView === 'backend' && isAdmin && <BackendView />}
        {currentView === 'gemini' && <IntelligenceView />}
        
        {/* General View */}
        {currentView === 'general' && (
            <div className="pt-6">
                <ListGroup>
                    <ListItem label="About" isLink />
                    <ListItem label="Software Update" value="OS 18.0.1" isLink />
                </ListGroup>
                <ListGroup>
                    <ListItem label="Date & Time" isLink />
                    <ListItem label="Keyboard" isLink />
                    <ListItem label="Fonts" isLink />
                    <ListItem label="Language & Region" isLink />
                </ListGroup>
            </div>
        )}

        {/* Notifications View */}
        {currentView === 'notifications' && (
            <div className="pt-6">
                <ListGroup title="Notification Style">
                    <ListItem 
                        label="Allow Notifications" 
                        control={<Toggle value={settings.notificationsEnabled} onChange={(v) => updateSetting('notificationsEnabled', v)} />} 
                    />
                    <ListItem label="Scheduled Summary" value="Off" isLink />
                    <ListItem label="Show Previews" value="Always" isLink />
                </ListGroup>
            </div>
        )}

        {/* Sounds View */}
        {currentView === 'sounds' && (
            <div className="pt-6">
                <ListGroup title="Ringer and Alerts">
                     <ListItem 
                        label="Volume" 
                        control={<Slider value={settings.systemVolume * 100} onChange={(v) => updateSetting('systemVolume', v / 100)} />} 
                    />
                    <ListItem label="Change with Buttons" control={<Toggle value={true} onChange={() => {}} />} />
                </ListGroup>
                <ListGroup>
                    <ListItem label="Ringtone" value="Reflection" isLink />
                    <ListItem label="Text Tone" value="Note" isLink />
                </ListGroup>
            </div>
        )}

        {/* Focus View */}
        {currentView === 'focus' && (
            <div className="pt-6">
                 <ListGroup>
                    <ListItem 
                        label="Do Not Disturb" 
                        icon={Moon}
                        color="bg-indigo-500"
                        control={<Toggle value={settings.doNotDisturb} onChange={(v) => updateSetting('doNotDisturb', v)} />} 
                    />
                     <ListItem label="Personal" icon={UserIcon} color="bg-purple-500" isLink />
                     <ListItem label="Work" icon={BriefcaseIconWrapper} color="bg-green-500" isLink />
                 </ListGroup>
            </div>
        )}

        {/* Privacy View */}
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

        {/* About View */}
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
        
        {/* Power View */}
        {currentView === 'power' && (
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
        )}

        {/* Display View */}
        {currentView === 'display' && (
            <div className="pt-6">
                <div className="mx-4 mb-6 p-6 bg-white dark:bg-[#1C1C1E] rounded-xl flex gap-4 justify-center">
                    <div 
                        onClick={() => updateSetting('darkMode', false)}
                        className={`flex-1 flex flex-col items-center gap-2 cursor-pointer ${!settings.darkMode ? 'opacity-100' : 'opacity-50'}`}
                    >
                        <div className="w-16 h-24 bg-[#E5E5E5] rounded-lg border-2 border-gray-300 flex flex-col items-center justify-center">
                             <div className="w-8 h-2 bg-gray-300 rounded mb-1"/>
                             <div className="w-10 h-2 bg-gray-300 rounded"/>
                        </div>
                        <span className="text-sm font-medium">Light</span>
                        {!settings.darkMode && <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center"><Check size={10} className="text-white"/></div>}
                    </div>
                    <div 
                        onClick={() => updateSetting('darkMode', true)}
                        className={`flex-1 flex flex-col items-center gap-2 cursor-pointer ${settings.darkMode ? 'opacity-100' : 'opacity-50'}`}
                    >
                         <div className="w-16 h-24 bg-[#333] rounded-lg border-2 border-gray-600 flex flex-col items-center justify-center">
                             <div className="w-8 h-2 bg-gray-500 rounded mb-1"/>
                             <div className="w-10 h-2 bg-gray-500 rounded"/>
                        </div>
                        <span className="text-sm font-medium">Dark</span>
                        {settings.darkMode && <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center"><Check size={10} className="text-white"/></div>}
                    </div>
                </div>

                <ListGroup title="Brightness">
                    <ListItem 
                        icon={Sun} 
                        color="bg-gray-400" 
                        label="Brightness" 
                        control={<Slider value={settings.brightness} onChange={(v) => updateSetting('brightness', v)} />} 
                    />
                    <ListItem label="True Tone" control={<Toggle value={true} onChange={() => {}} />} />
                </ListGroup>

                <ListGroup title="Appearance">
                    <ListItem 
                        icon={Activity} 
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
                    <ListItem 
                        label="Text Size" 
                        control={<Slider min={80} max={150} value={settings.textSize * 100} onChange={(v) => updateSetting('textSize', v / 100)} />} 
                    />
                </ListGroup>
            </div>
        )}

        {/* Storage View */}
        {currentView === 'storage' && (
            <div className="p-6 space-y-4">
                <h3 className="font-bold text-gray-500 text-xs uppercase tracking-widest">Cloud Database</h3>
                <div className="bg-[#1c1c1e] p-6 rounded-xl border border-white/5 text-center mb-6">
                    <Database size={32} className="mx-auto text-blue-500 mb-2" />
                    <h2 className="text-xl font-bold">Firestore Connected</h2>
                    <p className="text-gray-500 text-sm mt-1">{user?.email}</p>
                </div>

                {/* Visual Storage Bar */}
                <div className="bg-[#1c1c1e] p-4 rounded-xl border border-white/5 mb-6">
                     <div className="flex justify-between text-xs font-bold text-gray-400 mb-2">
                         <span>USED: {formatBytes(storeStats.reduce((acc, curr) => acc + curr.sizeBytes, 0))}</span>
                         <span>TOTAL: ∞</span>
                     </div>
                     <div className="w-full h-4 bg-gray-700 rounded-full overflow-hidden flex">
                         {storeStats.map((stat, i) => (
                             <div 
                                key={stat.name} 
                                style={{ width: `${Math.max(2, (stat.sizeBytes / 5000) * 100)}%` }} 
                                className={`h-full ${['bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-red-500', 'bg-purple-500'][i % 5]}`} 
                             />
                         ))}
                     </div>
                </div>

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

// Mock Icon for Work Focus
const BriefcaseIconWrapper = (props: any) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={props.size} height={props.size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <rect width="20" height="14" x="2" y="7" rx="2" ry="2" />
        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
);

export default SettingsApp;