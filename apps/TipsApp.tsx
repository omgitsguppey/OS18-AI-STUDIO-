
import React, { useState } from 'react';
import { 
  Lightbulb, 
  Search, 
  ChevronRight, 
  AppWindow, 
  Zap, 
  Shield, 
  PenTool, 
  DollarSign, 
  Music,
  BookOpen,
  Command,
  LayoutGrid
} from 'lucide-react';
import { ALL_APPS } from '../constants';

const COLLECTIONS = [
  { id: 'basics', title: 'OS Essentials', icon: AppWindow, color: 'bg-blue-500' },
  { id: 'business', title: 'Business Strategy', icon: DollarSign, color: 'bg-green-500' },
  { id: 'creative', title: 'Creative Studio', icon: PenTool, color: 'bg-purple-500' },
  { id: 'music', title: 'Music Industry', icon: Music, color: 'bg-pink-500' },
  { id: 'productivity', title: 'Productivity', icon: Zap, color: 'bg-amber-500' },
];

const TIPS_DATA: Record<string, { title: string, content: string, icon: React.ElementType }[]> = {
  basics: [
    { 
      title: "App Library", 
      content: "Swipe horizontally to navigate between pages of apps. The grid automatically organizes new installations.", 
      icon: LayoutGrid 
    },
    { 
      title: "Spotlight Search", 
      content: "Tap the search icon at the bottom or type anywhere if you have a keyboard to instantly find apps and tools.", 
      icon: Search 
    },
    { 
      title: "Edit Mode", 
      content: "Triple-click on the wallpaper background to enter 'Jiggle Mode'. You can uninstall apps or reorganize your home screen.", 
      icon: Command 
    }
  ],
  business: [
    {
      title: "Just Sell It",
      content: "Stuck on a product idea? Enter a name, and the AI will generate a full pricing model, audience profile, and value proposition.",
      icon: DollarSign
    },
    {
      title: "MarkupAI",
      content: "Find arbitrage opportunities. Enter a niche like 'Solar' to see affiliate programs and white-label services you can resell.",
      icon: TrendingUp
    }
  ],
  music: [
    {
      title: "LyricsAI",
      content: "Analyze your songwriting. The AI grades your lyrics on metaphor density, rhythm, and emotional resonance.",
      icon: Music
    },
    {
      title: "ViralPlanAI",
      content: "Don't just release music. Generate a 4-quarter marketing plan specifically designed for building burner accounts to promote your tracks.",
      icon: Megaphone
    }
  ]
};

// Import icons for mapping
import { TrendingUp, Megaphone } from 'lucide-react';

const TipsApp: React.FC = () => {
  const [activeCollection, setActiveCollection] = useState<string | null>(null);

  return (
    <div className="h-full bg-[#f2f2f7] dark:bg-[#000000] text-black dark:text-white font-sans flex flex-col overflow-hidden">
      {/* Header */}
      <div className="h-24 px-6 pb-4 flex items-end justify-between bg-white dark:bg-[#1c1c1e] shrink-0 border-b border-gray-200 dark:border-white/5">
        <div>
          <h1 className="text-3xl font-black tracking-tight flex items-center gap-2">
            <Lightbulb className="text-yellow-500" fill="currentColor" /> Tips
          </h1>
          <p className="text-sm text-gray-500 font-bold mt-1">User Guide</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 max-w-4xl mx-auto w-full">
        {!activeCollection ? (
          <div className="space-y-8 animate-fade-in">
            <div>
              <h2 className="text-xl font-bold mb-4">Collections</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {COLLECTIONS.map(col => (
                  <button
                    key={col.id}
                    onClick={() => setActiveCollection(col.id)}
                    className="bg-white dark:bg-[#1c1c1e] p-4 rounded-2xl border border-gray-200 dark:border-white/5 flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-[#252527] transition-all shadow-sm"
                  >
                    <div className={`w-12 h-12 rounded-xl ${col.color} flex items-center justify-center text-white shadow-lg`}>
                      <col.icon size={24} />
                    </div>
                    <div className="text-left flex-1">
                      <h3 className="font-bold text-lg">{col.title}</h3>
                      <p className="text-xs text-gray-500 font-medium">View Guides</p>
                    </div>
                    <ChevronRight size={20} className="text-gray-300" />
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h2 className="text-xl font-bold mb-4">App Directory</h2>
              <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl overflow-hidden border border-gray-200 dark:border-white/5 divide-y divide-gray-100 dark:divide-white/5">
                {Object.values(ALL_APPS).filter(app => !app.isSystem).map(app => (
                  <div key={app.id} className="p-4 flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${app.color} flex items-center justify-center text-white shrink-0`}>
                      <app.icon size={20} />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm">{app.name}</h4>
                      <p className="text-xs text-gray-500 line-clamp-1">{app.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="animate-slide-up space-y-6">
            <button 
              onClick={() => setActiveCollection(null)}
              className="text-sm font-bold text-blue-500 flex items-center gap-1 mb-2"
            >
              <ChevronRight size={16} className="rotate-180" /> Collections
            </button>
            
            <div className="space-y-4">
              {TIPS_DATA[activeCollection] ? TIPS_DATA[activeCollection].map((tip, idx) => (
                <div key={idx} className="bg-white dark:bg-[#1c1c1e] p-6 rounded-3xl border border-gray-200 dark:border-white/5 shadow-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <tip.icon size={24} className="text-yellow-500" />
                    <h3 className="text-xl font-black">{tip.title}</h3>
                  </div>
                  <p className="text-gray-600 dark:text-gray-300 leading-relaxed font-medium">{tip.content}</p>
                </div>
              )) : (
                <div className="text-center py-20 text-gray-500">More guides coming soon.</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TipsApp;
