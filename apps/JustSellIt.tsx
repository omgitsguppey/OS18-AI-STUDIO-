
import React, { useState, useEffect } from 'react';
import { 
  BadgeDollarSign, 
  ArrowLeft, 
  Save, 
  ChevronRight, 
  Loader2,
  History,
  TrendingUp,
  Brain,
  Target,
  Trophy,
  PenTool,
  Zap,
  CheckCircle,
  Megaphone,
  ShieldAlert,
  ArrowDown
} from 'lucide-react';
import { generateProductStrategy, ProductStrategy } from '../services/geminiService';
import { storage, STORES } from '../services/storageService';
import OnboardingOverlay from '../components/OnboardingOverlay';
import { AppID } from '../types';
import { systemCore } from '../services/systemCore';

const REFINEMENT_TAGS = ["Digital Product", "Physical Good", "High Ticket", "Subscription", "Service"];

const JustSellIt: React.FC = () => {
  const [view, setView] = useState<'home' | 'result' | 'saved'>('home');
  const [productName, setProductName] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [currentStrategy, setCurrentStrategy] = useState<ProductStrategy | null>(null);
  const [savedStrategies, setSavedStrategies] = useState<ProductStrategy[]>([]);
  const [isExporting, setIsExporting] = useState(false);

  // 1. Initial Load from IndexedDB
  useEffect(() => {
    const init = async () => {
      try {
        const saved = await storage.get<ProductStrategy[]>(STORES.STRATEGY, 'saved_strategies');
        if (saved) setSavedStrategies(saved);
      } catch (e) {
        console.error('Failed to load strategies', e);
      } finally {
        setIsReady(true);
      }
    };
    init();
  }, []);

  // 2. Persist to IndexedDB
  useEffect(() => {
    if (!isReady) return;
    storage.set(STORES.STRATEGY, 'saved_strategies', savedStrategies).catch(console.error);
  }, [savedStrategies, isReady]);

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };

  const handleGenerate = async () => {
    if (!productName.trim()) return;
    setIsLoading(true);
    try {
      const strategy = await generateProductStrategy(productName, selectedTags);
      setCurrentStrategy(strategy);
      setView('result');
    } catch (error) {
      console.error(error);
      alert("Generation failed.");
    } finally {
      setIsLoading(false);
    }
  };

  const saveStrategy = () => {
    if (currentStrategy && !savedStrategies.some(s => s.productName === currentStrategy.productName)) {
      setSavedStrategies([currentStrategy, ...savedStrategies]);
    }
  };

  const markAsGolden = (strategy: ProductStrategy) => {
      // Learn from success
      systemCore.trackInteraction(AppID.SELL_IT, 'success', { template: strategy });
      alert("Strategy marked as Gold. System will use this structure for future plans.");
  };

  const handleExportToBrandKit = async () => {
    if (!currentStrategy) return;
    setIsExporting(true);
    
    try {
        const brandKit = {
            id: Date.now().toString(),
            brandName: currentStrategy.productName,
            slogan: currentStrategy.emotionalValueProp.split('.')[0] + '.', // First sentence as slogan
            valueProposition: currentStrategy.emotionalValueProp,
            missionStatement: `To solve the problem of ${currentStrategy.painPoints[0].problem} by providing ${currentStrategy.painPoints[0].solution}.`,
            targetAudience: currentStrategy.audience.demographics,
            colors: [
                { name: "Sales Green", hex: "#10b981", usage: "CTA Buttons" },
                { name: "Trust Blue", hex: "#3b82f6", usage: "Headers" },
                { name: "Urgency Red", hex: "#ef4444", usage: "Alerts" }
            ],
            typography: {
                headingFont: "Inter",
                bodyFont: "Roboto"
            },
            metrics: [
                { label: "Price", target: currentStrategy.pricing.oneTime },
                { label: "Target MRR", target: currentStrategy.pricing.subscriptionMonthly },
                { label: "Funnel Steps", target: "4" }
            ],
            pressKit: {
                shortBio: `The ultimate solution for ${currentStrategy.audience.psychographics.split(' ').slice(0, 5).join(' ')}...`,
                boilerplate: currentStrategy.emotionalValueProp
            },
            createdAt: Date.now()
        };

        const existingKits = await storage.get<any[]>(STORES.BRAND_KIT, 'kits') || [];
        await storage.set(STORES.BRAND_KIT, 'kits', [brandKit, ...existingKits]);
        
        setTimeout(() => {
            setIsExporting(false);
            alert("Strategy exported to BrandKitAI!");
        }, 800);
    } catch (e) {
        console.error(e);
        setIsExporting(false);
        alert("Export failed.");
    }
  };

  const ResultDashboard = ({ strategy }: { strategy: ProductStrategy }) => (
    <div className="space-y-6 pb-20 animate-slide-up">
      {/* Hero Card */}
      <div className="bg-gradient-to-br from-emerald-500 to-teal-700 rounded-[2.5rem] p-8 text-white shadow-2xl shadow-emerald-900/20 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="relative z-10">
            <div className="flex items-start justify-between mb-6">
                <div>
                    <h2 className="text-3xl font-black tracking-tight">{strategy.productName}</h2>
                    <p className="text-emerald-100 font-medium mt-1">Strategic Overview</p>
                </div>
                <div className="flex flex-col items-end">
                    <span className="text-sm font-bold uppercase tracking-wider opacity-70">Target Price</span>
                    <span className="text-4xl font-black">{strategy.pricing.oneTime}</span>
                </div>
            </div>
            
            <div className="bg-black/20 backdrop-blur-md rounded-2xl p-6 border border-white/10">
                <span className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-2 block">Value Proposition</span>
                <p className="text-xl font-medium leading-relaxed">{strategy.emotionalValueProp}</p>
            </div>
        </div>
      </div>

      {/* Pricing Tiers Row */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-[#1c1c1e] p-5 rounded-3xl border border-white/5 flex flex-col justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Subscription</span>
            <div>
                <span className="text-2xl font-black text-white">{strategy.pricing.subscriptionMonthly}</span>
                <span className="text-sm text-gray-500">/mo</span>
            </div>
        </div>
        <div className="bg-[#1c1c1e] p-5 rounded-3xl border border-white/5 flex flex-col justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Annual</span>
            <div>
                <span className="text-2xl font-black text-emerald-400">{strategy.pricing.subscriptionYearly}</span>
                <span className="text-sm text-gray-500">/yr</span>
            </div>
        </div>
      </div>

      {/* Sales Funnel */}
      <div className="bg-[#1c1c1e] p-6 rounded-[2.5rem] border border-white/5">
        <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
            <TrendingUp size={20} className="text-emerald-500" /> Sales Funnel
        </h3>
        <div className="space-y-0">
            {strategy.salesFunnel?.map((step, i) => (
                <div key={i} className="flex gap-4 relative">
                    <div className="flex flex-col items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs border-2 z-10 ${i === 0 ? 'bg-emerald-500 border-emerald-500 text-black' : 'bg-[#1c1c1e] border-gray-600 text-gray-400'}`}>
                            {i + 1}
                        </div>
                        {i < strategy.salesFunnel.length - 1 && <div className="w-0.5 h-full bg-gray-800 -my-1" />}
                    </div>
                    <div className="pb-8">
                        <h4 className="text-sm font-bold text-white mb-1">{step.stage}</h4>
                        <p className="text-sm text-gray-400 leading-relaxed">{step.tactic}</p>
                    </div>
                </div>
            ))}
        </div>
      </div>

      {/* Target Audience */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-[#1c1c1e] p-6 rounded-3xl border border-white/5">
            <div className="flex items-center gap-2 mb-3 text-blue-400">
                <Target size={18} />
                <h3 className="font-bold text-sm uppercase tracking-wide">Demographics</h3>
            </div>
            <p className="text-sm text-gray-300 leading-relaxed">{strategy.audience.demographics}</p>
        </div>
        <div className="bg-[#1c1c1e] p-6 rounded-3xl border border-white/5">
            <div className="flex items-center gap-2 mb-3 text-purple-400">
                <Brain size={18} />
                <h3 className="font-bold text-sm uppercase tracking-wide">Psychographics</h3>
            </div>
            <p className="text-sm text-gray-300 leading-relaxed">{strategy.audience.psychographics}</p>
        </div>
      </div>

      {/* Marketing Channels */}
      <div className="bg-[#1c1c1e] p-6 rounded-3xl border border-white/5">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Megaphone size={18} className="text-orange-500" /> Best Channels
        </h3>
        <div className="flex flex-wrap gap-2">
            {strategy.marketingChannels?.map((channel, i) => (
                <span key={i} className="px-4 py-2 bg-orange-500/10 text-orange-400 border border-orange-500/20 rounded-xl text-sm font-bold">
                    {channel}
                </span>
            ))}
        </div>
      </div>

      {/* Objection Handling */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest px-2">Objection Handling</h3>
        {strategy.objections?.map((obj, i) => (
            <div key={i} className="bg-[#1c1c1e] p-5 rounded-2xl border border-white/5">
                <div className="flex gap-3 mb-2">
                    <ShieldAlert size={18} className="text-red-400 shrink-0" />
                    <p className="font-bold text-white text-sm">"{obj.objection}"</p>
                </div>
                <div className="pl-8 text-sm text-gray-400 border-l-2 border-emerald-500/20 ml-2">
                    <span className="text-emerald-500 font-bold block mb-1">Rebuttal:</span>
                    {obj.rebuttal}
                </div>
            </div>
        ))}
      </div>
    </div>
  );

  if (!isReady) return (
    <div className="h-full bg-black flex items-center justify-center">
      <Loader2 className="animate-spin text-white/20" size={32} />
    </div>
  );

  return (
    <div className="h-full bg-[#0a0a0a] text-white flex flex-col font-sans overflow-hidden relative">
      <OnboardingOverlay 
        appId={AppID.SELL_IT}
        title="Just Sell It"
        subtitle="Revenue Strategy Engine"
        features={[
          { icon: Brain, title: "Psychological Hooks", description: "Generates deep emotional value props tailored to your audience." },
          { icon: TrendingUp, title: "Sales Funnels", description: "Builds a step-by-step path from awareness to purchase." },
          { icon: ShieldAlert, title: "Objection Killer", description: "Prepares you for the top reasons customers say 'no'." }
        ]}
      />

      <div className="h-16 border-b border-white/10 px-6 flex items-center justify-between bg-black/50 backdrop-blur-md shrink-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-900/20">
            <BadgeDollarSign size={22} className="text-white" />
          </div>
          <h1 className="text-lg font-bold">Just Sell It</h1>
        </div>
        
        <div className="flex gap-2">
            {view === 'result' && (
                <>
                    <button 
                        onClick={handleExportToBrandKit}
                        disabled={isExporting}
                        className="bg-purple-500/10 text-purple-400 border border-purple-500/20 px-4 py-1.5 rounded-full font-bold text-xs flex items-center gap-2 hover:bg-purple-500/20 transition-all"
                    >
                        {isExporting ? <Loader2 size={14} className="animate-spin" /> : <PenTool size={14} />}
                        BrandKit
                    </button>
                    <button 
                        onClick={saveStrategy}
                        className="bg-white text-black px-4 py-1.5 rounded-full font-bold text-xs flex items-center gap-2 hover:bg-gray-200 transition-colors"
                    >
                        <Save size={14} /> Save
                    </button>
                </>
            )}
            {view !== 'home' && (
                <button onClick={() => setView('home')} className="text-xs font-bold text-gray-400 px-3 py-1.5 border border-white/10 rounded-full hover:text-white transition-colors bg-white/5">
                    Close
                </button>
            )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 max-w-3xl mx-auto w-full">
        {view === 'home' && (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-10 animate-fade-in">
            <div className="space-y-4">
              <h2 className="text-6xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-b from-white to-gray-500">
                Sell It.
              </h2>
              <p className="text-gray-400 text-lg max-w-md mx-auto">
                Turn any idea into a complete revenue model, sales funnel, and pricing strategy instantly.
              </p>
            </div>
            
            <div className="w-full max-w-xl space-y-4">
              <div className="relative group">
                  <div className="absolute inset-0 bg-emerald-500/20 rounded-[2rem] blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <div className="relative bg-[#1c1c1e] border border-white/10 rounded-[2rem] p-2 flex items-center shadow-2xl transition-transform group-hover:scale-[1.01]">
                    <div className="pl-6 pr-4 text-emerald-500">
                        <Zap size={24} fill="currentColor" />
                    </div>
                    <input 
                        type="text" 
                        value={productName} 
                        onChange={(e) => setProductName(e.target.value)}
                        placeholder="What are you selling?"
                        className="w-full bg-transparent py-6 text-xl font-bold outline-none placeholder-gray-600 text-white"
                        onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                    />
                    <button 
                        onClick={handleGenerate} 
                        disabled={isLoading || !productName.trim()}
                        className="bg-white text-black h-14 w-14 rounded-[1.5rem] flex items-center justify-center hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:scale-95 shadow-lg"
                    >
                        {isLoading ? <Loader2 size={24} className="animate-spin" /> : <ChevronRight size={28} strokeWidth={3} />}
                    </button>
                  </div>
              </div>

              <div className="flex flex-wrap justify-center gap-2">
                {REFINEMENT_TAGS.map(tag => (
                  <button 
                    key={tag} 
                    onClick={() => toggleTag(tag)} 
                    className={`px-4 py-2 rounded-full text-xs font-bold border transition-all ${selectedTags.includes(tag) ? 'bg-emerald-500 text-black border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.4)]' : 'bg-[#1c1c1e] border-white/10 text-gray-500 hover:text-white'}`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            {savedStrategies.length > 0 && (
              <div className="w-full pt-10 border-t border-white/5">
                <div className="flex items-center justify-between mb-4 px-2">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Recent Strategies</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {savedStrategies.slice(0, 3).map((s, idx) => (
                    <div 
                        key={idx} 
                        onClick={() => { setCurrentStrategy(s); setView('result'); }} 
                        className="bg-[#1c1c1e] border border-white/5 rounded-2xl p-5 cursor-pointer hover:bg-[#252527] transition-all text-left group"
                    >
                      <div className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center mb-3 text-gray-400 group-hover:text-emerald-400 group-hover:bg-emerald-500/10 transition-colors">
                        <BadgeDollarSign size={20} />
                      </div>
                      <span className="font-bold block truncate text-sm mb-1">{s.productName}</span>
                      <span className="text-[10px] text-gray-500">{s.pricing.oneTime}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {view === 'result' && currentStrategy && (
            <ResultDashboard strategy={currentStrategy} />
        )}
      </div>
    </div>
  );
};

export default JustSellIt;
