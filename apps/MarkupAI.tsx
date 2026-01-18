
import React, { useState, useEffect } from 'react';
import { 
  BadgePercent, 
  Search, 
  ChevronRight, 
  Loader2, 
  Briefcase, 
  Tag, 
  Globe, 
  DollarSign, 
  ArrowUpRight, 
  History, 
  Bookmark,
  TrendingUp,
  Save,
  Trash2
} from 'lucide-react';
import { generateMarkupStrategy, MarkupStrategy, MarkupOpportunity } from '../services/geminiService';
import { storage, STORES } from '../services/storageService';

const MarkupAI: React.FC = () => {
  const [view, setView] = useState<'search' | 'results' | 'history'>('search');
  const [niche, setNiche] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentStrategy, setCurrentStrategy] = useState<MarkupStrategy | null>(null);
  const [history, setHistory] = useState<MarkupStrategy[]>([]);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const load = async () => {
      const saved = await storage.get<MarkupStrategy[]>(STORES.MARKUP, 'history');
      if (saved) setHistory(saved);
      setIsReady(true);
    };
    load();
  }, []);

  useEffect(() => {
    if (!isReady) return;
    storage.set(STORES.MARKUP, 'history', history).catch(console.error);
  }, [history, isReady]);

  const handleGenerate = async () => {
    if (!niche.trim()) return;
    setIsLoading(true);
    try {
      const data = await generateMarkupStrategy(niche);
      setCurrentStrategy(data);
      setView('results');
    } catch (e) {
      console.error(e);
      alert('Failed to generate arbitrage opportunities.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = () => {
    if (!currentStrategy) return;
    if (!history.find(h => h.niche === currentStrategy.niche)) {
      setHistory([currentStrategy, ...history]);
    }
    alert('Strategy saved to history!');
  };

  const deleteFromHistory = (nicheName: string) => {
    setHistory(prev => prev.filter(h => h.niche !== nicheName));
  };

  const getBadgeColor = (type: string) => {
    switch (type) {
      case 'Affiliate': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'White Label': return 'bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/20';
      case 'DFY Service': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      default: return 'bg-gray-500/10 text-gray-400';
    }
  };

  const OpportunityCard: React.FC<{ opp: MarkupOpportunity }> = ({ opp }) => (
    <div className="bg-[#1c1c1e] border border-white/5 rounded-2xl p-6 hover:bg-[#252527] transition-colors group">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
            <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${getBadgeColor(opp.type)}`}>
                {opp.type}
            </div>
            <h3 className="font-bold text-lg leading-tight">{opp.name}</h3>
        </div>
        <div className="p-2 bg-white/5 rounded-lg text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
            <ArrowUpRight size={16} />
        </div>
      </div>
      
      <p className="text-sm text-gray-400 mb-6 leading-relaxed">
        {opp.description}
      </p>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="p-3 bg-black/20 rounded-xl border border-white/5">
            <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest block mb-1">Provider Cost</span>
            <span className="text-sm font-medium text-gray-300">{opp.baseCost}</span>
        </div>
        <div className="p-3 bg-gradient-to-br from-white/10 to-white/5 rounded-xl border border-white/10">
            <span className="text-[10px] text-white/60 font-black uppercase tracking-widest block mb-1">Markup Price</span>
            <span className="text-lg font-black text-white">{opp.markupPrice}</span>
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-white/5">
         <div className="flex items-center gap-2">
            <TrendingUp size={14} className="text-green-500" />
            <span className="text-xs font-bold text-green-500">Margin: {opp.profitMargin}</span>
         </div>
         <div className="flex items-center gap-1.5 text-gray-500">
            <Tag size={12} />
            <span className="text-[10px] font-bold uppercase">{opp.provider}</span>
         </div>
      </div>
      
      <div className="mt-4 p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
        <p className="text-xs text-indigo-300 font-medium">
            <span className="font-bold uppercase text-[10px] tracking-wide opacity-70 block mb-1">Marketing Angle</span>
            {opp.marketingAngle}
        </p>
      </div>
    </div>
  );

  if (!isReady) return (
    <div className="h-full bg-black flex items-center justify-center">
      <Loader2 className="animate-spin text-white/20" size={32} />
    </div>
  );

  return (
    <div className="h-full bg-[#0a0a0a] text-white flex flex-col font-sans overflow-hidden">
      {/* Header */}
      <div className="h-16 border-b border-white/5 px-6 flex items-center justify-between bg-black/40 backdrop-blur-md shrink-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-fuchsia-600 to-rose-600 flex items-center justify-center shadow-lg shadow-fuchsia-900/20">
            <BadgePercent size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold leading-none">MarkupAI</h1>
            <p className="text-[10px] text-gray-500 font-medium uppercase tracking-widest mt-1">Flash Lite Powered</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
            {view !== 'search' && (
                <button onClick={() => setView('search')} className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-full text-xs font-bold transition-colors">
                    New Search
                </button>
            )}
            {view !== 'history' && history.length > 0 && (
                <button onClick={() => setView('history')} className="p-2.5 bg-white/5 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white">
                    <History size={18} />
                </button>
            )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 max-w-4xl mx-auto w-full">
        {view === 'search' && (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-10 -mt-10">
            <div className="space-y-4">
                <h2 className="text-5xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-br from-white via-gray-200 to-gray-600">
                    Find the markup.
                </h2>
                <p className="text-gray-500 max-w-md mx-auto text-lg">
                    Identify high-ticket affiliate programs, white-label services, and arbitrage opportunities in seconds.
                </p>
            </div>
            
            <div className="w-full max-w-xl relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-fuchsia-600 to-rose-600 rounded-[2rem] opacity-20 group-hover:opacity-30 blur-xl transition-opacity" />
              <div className="relative bg-[#1c1c1e] border border-white/10 rounded-[2rem] p-2 flex items-center shadow-2xl">
                <div className="pl-6 text-gray-500">
                    <Search size={24} />
                </div>
                <input 
                    type="text" 
                    value={niche} 
                    onChange={(e) => setNiche(e.target.value)}
                    placeholder="Enter a niche (e.g. 'Solar Sales', 'Coffee', 'SaaS')..."
                    className="w-full bg-transparent px-4 py-6 text-xl font-medium outline-none placeholder-gray-600"
                    onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                />
                <button 
                    onClick={handleGenerate} 
                    disabled={isLoading || !niche.trim()}
                    className="bg-white text-black h-16 w-16 rounded-[1.5rem] flex items-center justify-center hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100"
                >
                    {isLoading ? <Loader2 size={24} className="animate-spin" /> : <ChevronRight size={28} strokeWidth={3} />}
                </button>
              </div>
            </div>

            <div className="flex flex-wrap justify-center gap-3 opacity-60">
                {['Real Estate', 'Supplement Brand', 'AI Agency', 'Pet Grooming'].map(tag => (
                    <button key={tag} onClick={() => setNiche(tag)} className="px-4 py-2 rounded-full border border-white/10 hover:bg-white/5 text-xs font-bold transition-colors">
                        {tag}
                    </button>
                ))}
            </div>
          </div>
        )}

        {view === 'results' && currentStrategy && (
            <div className="animate-fade-in space-y-8 pb-20">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-3xl font-black capitalize">{currentStrategy.niche}</h2>
                        <p className="text-sm text-gray-500 mt-1">Opportunity Analysis</p>
                    </div>
                    <button onClick={handleSave} className="flex items-center gap-2 bg-white text-black px-6 py-3 rounded-xl font-bold hover:bg-gray-200 transition-colors">
                        <Save size={18} /> Save
                    </button>
                </div>

                <div className="bg-gradient-to-br from-fuchsia-900/20 to-rose-900/20 border border-fuchsia-500/20 p-6 rounded-3xl">
                    <h3 className="text-fuchsia-400 font-bold text-sm uppercase tracking-widest mb-3">Executive Summary</h3>
                    <p className="text-lg font-medium leading-relaxed">{currentStrategy.summary}</p>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                    {currentStrategy.opportunities.map((opp, idx) => (
                        <OpportunityCard key={idx} opp={opp} />
                    ))}
                </div>
            </div>
        )}

        {view === 'history' && (
            <div className="animate-fade-in space-y-6">
                <h2 className="text-3xl font-black">Saved Strategies</h2>
                {history.length === 0 ? (
                    <div className="py-20 text-center text-gray-500">
                        <Bookmark size={48} className="mx-auto mb-4 opacity-20" />
                        <p>No saved strategies found.</p>
                    </div>
                ) : (
                    <div className="grid gap-3">
                        {history.map((h, idx) => (
                            <div 
                                key={idx} 
                                onClick={() => { setCurrentStrategy(h); setView('results'); }}
                                className="bg-[#1c1c1e] border border-white/5 p-5 rounded-2xl flex items-center justify-between cursor-pointer hover:bg-white/5 group"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-fuchsia-600/20 to-rose-600/20 flex items-center justify-center text-fuchsia-400 font-bold text-lg">
                                        {h.niche.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg capitalize">{h.niche}</h3>
                                        <p className="text-xs text-gray-500">{h.opportunities.length} Opportunities Identified</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <ChevronRight size={20} className="text-gray-600" />
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); deleteFromHistory(h.niche); }}
                                        className="p-2 text-gray-700 hover:text-red-500 transition-colors"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        )}
      </div>
    </div>
  );
};

export default MarkupAI;
