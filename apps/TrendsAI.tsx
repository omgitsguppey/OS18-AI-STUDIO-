
import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Search, 
  Zap, 
  ArrowRight, 
  Loader2, 
  ExternalLink, 
  BarChart2, 
  Clock, 
  Target, 
  Activity,
  Users,
  MessageCircle,
  Hash,
  Globe
} from 'lucide-react';
import { 
  fetchRawTrends, 
  searchGoogleTrends, 
  analyzeTrendPattern, 
  TrendItem, 
  TrendAnalysis 
} from '../services/geminiService';
import { storage, STORES } from '../services/storageService';

interface TrendCardProps {
  trend: TrendItem;
  onAnalyze: (trend: TrendItem) => void;
}

const TrendCard: React.FC<TrendCardProps> = ({ trend, onAnalyze }) => (
  <div className="bg-[#1c1c1e] border border-white/5 rounded-2xl p-5 hover:bg-[#252527] transition-all group">
    <div className="flex justify-between items-start mb-2">
      <div className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${
        trend.source === 'Reddit' ? 'bg-orange-500/10 text-orange-500 border-orange-500/20' :
        trend.source === 'Google' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' :
        'bg-gray-500/10 text-gray-400 border-gray-500/20'
      }`}>
        {trend.source}
      </div>
      <div className="text-xs font-mono text-gray-500">{trend.volume || 'N/A'}</div>
    </div>
    
    <h3 className="font-bold text-lg mb-2 leading-tight">{trend.title}</h3>
    <p className="text-sm text-gray-400 line-clamp-2 mb-4 font-medium">{trend.snippet}</p>
    
    <div className="flex items-center gap-2 mt-auto">
      <button 
        onClick={() => onAnalyze(trend)}
        className="flex-1 bg-white/5 hover:bg-white/10 text-white text-xs font-bold py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
      >
        <Zap size={12} className="text-yellow-400" /> Compute Metrics
      </button>
      {trend.url && (
        <a 
          href={trend.url} 
          target="_blank" 
          rel="noopener noreferrer"
          className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-gray-400"
        >
          <ExternalLink size={14} />
        </a>
      )}
    </div>
  </div>
);

const MetricBox = ({ label, value, icon: Icon, colorClass, subtext }: any) => (
  <div className="bg-[#1c1c1e] border border-white/5 p-4 rounded-2xl flex flex-col justify-between h-full">
    <div className="flex items-center justify-between mb-2">
      <span className="text-[10px] font-black uppercase text-gray-500 tracking-widest">{label}</span>
      <Icon size={14} className={colorClass} />
    </div>
    <div>
      <span className="text-2xl font-black tracking-tight">{value}</span>
      {subtext && <span className="text-[10px] text-gray-500 block font-medium">{subtext}</span>}
    </div>
  </div>
);

const TrendsAI: React.FC = () => {
  const [mode, setMode] = useState<'raw' | 'search' | 'analyze'>('raw');
  const [trends, setTrends] = useState<TrendItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTrend, setSelectedTrend] = useState<TrendItem | null>(null);
  const [analysis, setAnalysis] = useState<TrendAnalysis | null>(null);
  const [analysisHistory, setAnalysisHistory] = useState<Record<string, TrendAnalysis>>({});
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const init = async () => {
      // Load raw trends immediately on mount
      const raw = await fetchRawTrends();
      setTrends(raw);

      // Load analysis history
      const hist = await storage.get<Record<string, TrendAnalysis>>(STORES.TRENDS, 'analysis_history');
      if (hist) setAnalysisHistory(hist);
      
      setIsReady(true);
    };
    init();
  }, []);

  useEffect(() => {
    if (!isReady) return;
    storage.set(STORES.TRENDS, 'analysis_history', analysisHistory).catch(console.error);
  }, [analysisHistory, isReady]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsLoading(true);
    try {
      const results = await searchGoogleTrends(searchQuery);
      setTrends(results);
      setMode('search');
    } catch (e) {
      console.error(e);
      alert('Search failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnalyze = async (trend: TrendItem) => {
    setSelectedTrend(trend);
    setMode('analyze');
    
    if (analysisHistory[trend.title]) {
      setAnalysis(analysisHistory[trend.title]);
      return;
    }

    setIsLoading(true);
    try {
      const result = await analyzeTrendPattern(trend.title, trend.snippet || '');
      const fullAnalysis = { ...result, trendId: trend.id };
      setAnalysis(fullAnalysis);
      
      setAnalysisHistory(prev => ({
        ...prev,
        [trend.title]: fullAnalysis
      }));
    } catch (e) {
      console.error(e);
      alert('Analysis failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const switchToRaw = async () => {
    setMode('raw');
    setIsLoading(true);
    const raw = await fetchRawTrends();
    setTrends(raw);
    setIsLoading(false);
  };

  return (
    <div className="h-full bg-[#0a0a0a] text-white flex flex-col font-sans overflow-hidden">
      {/* Header */}
      <div className="h-16 border-b border-white/5 px-6 flex items-center justify-between bg-black/40 backdrop-blur-md shrink-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-900/20">
            <TrendingUp size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold leading-none">TrendsAI</h1>
            <p className="text-[10px] text-gray-500 font-medium uppercase tracking-widest mt-1">Data Dashboard</p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex p-1 bg-white/5 rounded-xl border border-white/5">
          <button 
            onClick={switchToRaw}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${mode === 'raw' ? 'bg-white text-black shadow-sm' : 'text-gray-400 hover:text-white'}`}
          >
            Live Feed
          </button>
          <button 
            onClick={() => setMode('search')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${mode === 'search' ? 'bg-white text-black shadow-sm' : 'text-gray-400 hover:text-white'}`}
          >
            Search
          </button>
          <button 
            onClick={() => { if (analysis) setMode('analyze'); }}
            disabled={!analysis}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${mode === 'analyze' ? 'bg-white text-black shadow-sm' : 'text-gray-400 hover:text-white disabled:opacity-30'}`}
          >
            Analytics
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 max-w-6xl mx-auto w-full">
        
        {/* RAW FEED / SEARCH RESULTS */}
        {(mode === 'raw' || mode === 'search') && (
          <div className="space-y-6 animate-fade-in">
            {mode === 'search' && (
              <div className="flex gap-2 mb-6">
                <div className="relative flex-1">
                  <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input 
                    type="text" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    placeholder="Search global datasets..."
                    className="w-full bg-[#1c1c1e] border border-white/10 rounded-xl pl-10 pr-4 py-3 outline-none focus:border-indigo-500/50 text-sm font-medium"
                  />
                </div>
                <button 
                  onClick={handleSearch}
                  disabled={isLoading}
                  className="bg-white text-black px-6 rounded-xl font-bold text-sm hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                >
                  {isLoading ? <Loader2 className="animate-spin" size={18} /> : <ArrowRight size={18} />}
                </button>
              </div>
            )}

            {isLoading && mode === 'raw' ? (
              <div className="flex justify-center py-20"><Loader2 className="animate-spin text-indigo-500" size={32} /></div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {trends.map((trend) => (
                  <TrendCard key={trend.id} trend={trend} onAnalyze={handleAnalyze} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ANALYZER VIEW */}
        {mode === 'analyze' && analysis && selectedTrend && (
          <div className="animate-slide-up space-y-6 pb-20">
            <div className="flex items-center justify-between">
              <button onClick={() => setMode('raw')} className="text-xs font-bold text-gray-500 hover:text-white flex items-center gap-1">
                <ArrowRight size={14} className="rotate-180" /> Return to Index
              </button>
              <div className="flex items-center gap-2">
                 <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded">
                    Gemini 3.0 Pro
                 </span>
                 <span className="text-[10px] font-black uppercase tracking-widest text-blue-400 bg-blue-500/10 px-2 py-1 rounded flex items-center gap-1">
                    <Globe size={10} /> Google Search Grounding
                 </span>
              </div>
            </div>

            <div className="bg-[#1c1c1e] border border-white/5 rounded-[2.5rem] p-8 relative overflow-hidden">
               {/* Background Pattern */}
               <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
               
               <div className="relative z-10">
                  <h2 className="text-3xl font-black mb-2">{selectedTrend.title}</h2>
                  <p className="text-gray-400 font-medium text-sm max-w-2xl">{analysis.summary}</p>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
                     <MetricBox 
                        label="Growth Velocity" 
                        value={analysis.growthRate} 
                        icon={Activity} 
                        colorClass="text-green-500"
                        subtext="WoW Change"
                     />
                     <MetricBox 
                        label="Est. Reach" 
                        value={analysis.estimatedReach} 
                        icon={Users} 
                        colorClass="text-blue-500"
                        subtext="Unique Impressions"
                     />
                     <MetricBox 
                        label="Engagement" 
                        value={analysis.engagementRatio} 
                        icon={MessageCircle} 
                        colorClass="text-orange-500"
                        subtext="Interaction Rate"
                     />
                     <MetricBox 
                        label="Lifespan" 
                        value={`${analysis.lifespanDays} Days`} 
                        icon={Clock} 
                        colorClass="text-purple-500"
                        subtext="Predicted Relevance"
                     />
                  </div>
               </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
               {/* Virality Score Gauge */}
               <div className="bg-[#1c1c1e] border border-white/5 rounded-3xl p-6">
                  <div className="flex justify-between items-center mb-6">
                     <h3 className="text-sm font-bold">Virality Probability</h3>
                     <span className="text-2xl font-black text-indigo-400">{analysis.viralityScore}%</span>
                  </div>
                  <div className="h-4 w-full bg-black/40 rounded-full overflow-hidden mb-2">
                     <div 
                        className="h-full bg-gradient-to-r from-indigo-600 to-purple-500 transition-all duration-1000"
                        style={{ width: `${analysis.viralityScore}%` }}
                     />
                  </div>
                  <div className="flex justify-between text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                     <span>Niche</span>
                     <span>Mainstream</span>
                  </div>
               </div>

               {/* Sentiment Bar */}
               <div className="bg-[#1c1c1e] border border-white/5 rounded-3xl p-6">
                  <div className="flex justify-between items-center mb-6">
                     <h3 className="text-sm font-bold">Sentiment Index</h3>
                     <span className={`text-2xl font-black ${analysis.sentimentScore > 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {analysis.sentimentScore > 0 ? '+' : ''}{analysis.sentimentScore}
                     </span>
                  </div>
                  <div className="relative h-4 w-full bg-black/40 rounded-full overflow-hidden mb-2 flex">
                     <div className="w-1/2 h-full border-r border-white/10 relative">
                        {analysis.sentimentScore < 0 && (
                           <div 
                              className="absolute right-0 top-0 bottom-0 bg-red-500 transition-all duration-1000"
                              style={{ width: `${Math.abs(analysis.sentimentScore)}%` }}
                           />
                        )}
                     </div>
                     <div className="w-1/2 h-full relative">
                        {analysis.sentimentScore > 0 && (
                           <div 
                              className="absolute left-0 top-0 bottom-0 bg-green-500 transition-all duration-1000"
                              style={{ width: `${analysis.sentimentScore}%` }}
                           />
                        )}
                     </div>
                  </div>
                  <div className="flex justify-between text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                     <span>Negative</span>
                     <span>Neutral</span>
                     <span>Positive</span>
                  </div>
               </div>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
               {/* Platform Distribution */}
               <div className="md:col-span-2 bg-[#1c1c1e] border border-white/5 rounded-3xl p-6">
                  <h3 className="text-sm font-bold mb-6">Share of Voice</h3>
                  <div className="space-y-4">
                     {analysis.platformDistribution.map((pd, i) => (
                        <div key={pd.platform} className="space-y-1">
                           <div className="flex justify-between text-xs font-bold">
                              <span>{pd.platform}</span>
                              <span className="text-gray-400">{pd.percentage}%</span>
                           </div>
                           <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                              <div 
                                 className="h-full bg-white transition-all duration-1000"
                                 style={{ 
                                    width: `${pd.percentage}%`,
                                    opacity: 1 - (i * 0.2) 
                                 }}
                              />
                           </div>
                        </div>
                     ))}
                  </div>
               </div>

               {/* Keyword Cloud */}
               <div className="bg-[#1c1c1e] border border-white/5 rounded-3xl p-6">
                  <h3 className="text-sm font-bold mb-4">Semantic Tags</h3>
                  <div className="flex flex-wrap gap-2">
                     {analysis.keyKeywords.map(kw => (
                        <span key={kw} className="px-3 py-1.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 rounded-lg text-xs font-bold flex items-center gap-1">
                           <Hash size={10} /> {kw}
                        </span>
                     ))}
                  </div>
               </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TrendsAI;
