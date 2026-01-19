import React, { useMemo, useState } from 'react';
import { ALL_APPS } from '../constants';
import { AppID } from '../types';
import AppIcon from '../components/AppIcon';
import { Download, Search, ExternalLink } from 'lucide-react';
import Fuse from 'fuse.js';
import { systemCore } from '../services/systemCore';

interface AppStoreProps {
  installedApps: AppID[];
  onInstall: (id: AppID) => void;
  onLaunch: (id: AppID) => void; 
}

const AppStore: React.FC<AppStoreProps> = ({ installedApps, onInstall, onLaunch }) => {
  const [query, setQuery] = useState('');

  const fuse = useMemo(() => new Fuse(Object.values(ALL_APPS).filter(a => a.id !== AppID.STORE), {
    keys: ['name', 'description'],
    threshold: 0.4
  }), []);

  const visibleApps = useMemo(() => {
    if (!query) return Object.values(ALL_APPS).filter(app => app.id !== AppID.STORE);
    return fuse.search(query).map(r => r.item);
  }, [query, fuse]);

  const handleAction = (appId: AppID, isInstalled: boolean) => {
      if (isInstalled) {
          // FIX: Use 'open' which is a valid InteractionType
          void systemCore.trackEvent({
            appId: AppID.STORE,
            context: 'store',
            eventType: 'open',
            label: 'open_app',
            meta: { targetApp: appId }
          });
          onLaunch(appId);
      } else {
          // FIX: Use 'download' which is a valid InteractionType for installs
          void systemCore.trackEvent({
            appId: AppID.STORE,
            context: 'store',
            eventType: 'download',
            label: 'download_app',
            meta: { targetApp: appId }
          });
          onInstall(appId);
      }
  };

  return (
    <div className="h-full bg-[#1c1c1e] text-white overflow-y-auto">
      {/* Hero Section */}
      <div className="relative h-64 md:h-80 w-full overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-red-900 to-orange-900 opacity-80" />
        <div className="absolute inset-0 p-8 flex flex-col justify-end items-start max-w-4xl mx-auto">
           <span className="text-orange-400 font-bold tracking-wider text-xs uppercase mb-2">Editor's Choice</span>
           <h1 className="text-4xl font-bold mb-2">Stay in the Loop</h1>
           <p className="text-gray-300 mb-6 max-w-md">Track the latest internet controversy and timelines with the updated Drama Tracker tool.</p>
           {!installedApps.includes(AppID.DRAMA) && (
              <button 
                onClick={() => handleAction(AppID.DRAMA, false)}
                className="bg-white text-black px-6 py-2 rounded-full font-bold hover:bg-gray-200 transition-colors flex items-center gap-2"
              >
                <Download size={18} />
                GET
              </button>
           )}
        </div>
      </div>

      {/* App List */}
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Discover Tools</h2>
            <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input 
                    type="text" 
                    value={query} 
                    onChange={e => setQuery(e.target.value)}
                    placeholder="Fuzzy Search..." 
                    className="bg-black/30 border border-white/10 rounded-full pl-9 pr-4 py-2 text-sm outline-none focus:border-white/30 transition-all"
                />
            </div>
        </div>
        
        <div className="grid gap-4">
          {visibleApps.map((app) => {
            const isInstalled = installedApps.includes(app.id);
            
            return (
              <div key={app.id} className="bg-[#2c2c2e] p-4 rounded-xl flex items-center gap-4 group hover:bg-[#3a3a3c] transition-colors border border-white/5">
                <div className="shrink-0">
                    <AppIcon app={app} size="md" showLabel={false} />
                </div>
                
                <div className="flex-1">
                    <h3 className="font-semibold text-lg">{app.name}</h3>
                    <p className="text-gray-400 text-sm">{app.description}</p>
                </div>

                <button
                    onClick={() => handleAction(app.id, isInstalled)}
                    className={`
                        px-6 py-1.5 rounded-full font-bold text-sm transition-all flex items-center gap-1.5
                        ${isInstalled 
                            ? 'bg-gray-600/50 text-white hover:bg-gray-600' 
                            : 'bg-white text-[#007AFF] hover:bg-gray-100'}
                    `}
                >
                    {isInstalled ? 'OPEN' : 'GET'}
                </button>
              </div>
            );
          })}
          {visibleApps.length === 0 && <p className="text-center text-gray-500 py-8">No apps found.</p>}
        </div>
      </div>
    </div>
  );
};

export default AppStore;
