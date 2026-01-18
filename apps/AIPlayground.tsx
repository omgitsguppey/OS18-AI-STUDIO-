
import React, { useState, useEffect } from 'react';
import { 
  Gamepad2, 
  Grid3X3, 
  Mic2, 
  FlaskConical, 
  Dog, 
  GitBranch, 
  ChevronRight, 
  RotateCcw,
  Sparkles,
  Loader2,
  ThumbsUp,
  ThumbsDown,
  ArrowRight,
  Zap,
  Leaf,
  Plus
} from 'lucide-react';
import { 
  evolvePixelGrid, 
  generateRap, 
  combineEmojis, 
  feedPet, 
  generateStoryNode,
  PetState
} from '../services/geminiService';

type WidgetType = 'pixel' | 'rap' | 'alchemy' | 'pet' | 'story' | null;

const AIPlayground: React.FC = () => {
  const [activeWidget, setActiveWidget] = useState<WidgetType>(null);

  // === WIDGET 1: PIXEL EVOLVER ===
  const [pixelPrompt, setPixelPrompt] = useState('A fire flower');
  const [grid, setGrid] = useState<string[]>(Array(64).fill('#111'));
  const [pixelLoading, setPixelLoading] = useState(false);
  const handleEvolve = async (feedback: string = "") => {
    setPixelLoading(true);
    try {
      const newGrid = await evolvePixelGrid(pixelPrompt, grid, feedback);
      if (newGrid && newGrid.length === 64) setGrid(newGrid);
    } finally {
      setPixelLoading(false);
    }
  };

  // === WIDGET 2: FLOW STATE ===
  const [rapTopic, setRapTopic] = useState('Coding at 3AM');
  const [rapVerses, setRapVerses] = useState<string[]>([]);
  const [rapLevel, setRapLevel] = useState(1);
  const [rapLoading, setRapLoading] = useState(false);
  const handleRap = async () => {
    setRapLoading(true);
    try {
      const res = await generateRap(rapTopic, rapLevel);
      setRapVerses(res.verses);
    } finally {
      setRapLoading(false);
    }
  };

  // === WIDGET 3: ALCHEMY ===
  const [itemA, setItemA] = useState('Fire');
  const [itemB, setItemB] = useState('Water');
  const [inventory, setInventory] = useState(['Fire', 'Water', 'Earth', 'Air', 'Metal', 'Life']);
  const [craftResult, setCraftResult] = useState<{name: string, emoji: string} | null>(null);
  const [craftLoading, setCraftLoading] = useState(false);
  const handleCraft = async () => {
    setCraftLoading(true);
    try {
      const res = await combineEmojis(itemA, itemB);
      setCraftResult({ name: res.result, emoji: res.emoji });
      if (res.isNew && !inventory.includes(res.result)) {
        setInventory([...inventory, res.result]);
      }
    } finally {
      setCraftLoading(false);
    }
  };

  // === WIDGET 4: FACT EATER ===
  const [petState, setPetState] = useState<PetState>({ name: 'Bit', mood: 'Happy', level: 1, knownFacts: [] });
  const [factInput, setFactInput] = useState('');
  const [petResponse, setPetResponse] = useState('Feed me data!');
  const [petLoading, setPetLoading] = useState(false);
  const handleFeed = async () => {
    if (!factInput.trim()) return;
    setPetLoading(true);
    try {
      const res = await feedPet(factInput, petState);
      setPetResponse(res.response);
      setPetState(prev => ({
        ...prev,
        mood: res.newMood as any,
        level: res.leveledUp ? prev.level + 1 : prev.level,
        knownFacts: [...prev.knownFacts, factInput]
      }));
      setFactInput('');
    } finally {
      setPetLoading(false);
    }
  };

  // === WIDGET 5: STORY BRANCH ===
  const [storyText, setStoryText] = useState('You wake up in a neon-lit alleyway.');
  const [storyOptions, setStoryOptions] = useState(['Look around', 'Check pockets']);
  const [storyHistory, setStoryHistory] = useState<string[]>(['Start']);
  const [storyLoading, setStoryLoading] = useState(false);
  const handleStoryChoice = async (choice: string) => {
    setStoryLoading(true);
    try {
      const context = storyHistory.slice(-3).join(' '); // Limit context
      const res = await generateStoryNode(context, choice);
      setStoryText(res.text);
      setStoryOptions(res.options);
      setStoryHistory([...storyHistory, `Choice: ${choice}. Result: ${res.text}`]);
    } finally {
      setStoryLoading(false);
    }
  };

  const WidgetCard = ({ id, title, icon: Icon, color, children }: any) => (
    <div 
      onClick={() => setActiveWidget(id)}
      className={`bg-[#1c1c1e] border border-white/5 rounded-3xl p-6 cursor-pointer hover:scale-[1.02] transition-all group relative overflow-hidden ${activeWidget === id ? 'hidden' : 'block'}`}
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${color} opacity-0 group-hover:opacity-10 transition-opacity`} />
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-xl bg-gradient-to-br ${color} text-white shadow-lg`}>
          <Icon size={24} />
        </div>
        <ChevronRight className="text-gray-600 group-hover:text-white transition-colors" />
      </div>
      <h3 className="text-xl font-bold">{title}</h3>
      <p className="text-xs text-gray-500 mt-2 font-medium uppercase tracking-widest">Flash Lite Powered</p>
    </div>
  );

  return (
    <div className="h-full bg-[#0a0a0a] text-white flex flex-col font-sans overflow-hidden">
      {/* Header */}
      <div className="h-16 border-b border-white/5 px-6 flex items-center justify-between bg-black/40 backdrop-blur-md shrink-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow-lg shadow-teal-900/20">
            <Gamepad2 size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold leading-none">AI Playground</h1>
            <p className="text-[10px] text-gray-500 font-medium uppercase tracking-widest mt-1">Gamified Experiments</p>
          </div>
        </div>
        {activeWidget && (
          <button 
            onClick={() => setActiveWidget(null)}
            className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-full text-xs font-bold transition-colors"
          >
            Exit Widget
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
        {!activeWidget ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto">
            <WidgetCard id="pixel" title="Pixel Darwin" icon={Grid3X3} color="from-pink-500 to-rose-500" />
            <WidgetCard id="rap" title="Flow State" icon={Mic2} color="from-orange-500 to-red-500" />
            <WidgetCard id="alchemy" title="Emoji Alchemy" icon={FlaskConical} color="from-purple-500 to-indigo-500" />
            <WidgetCard id="pet" title="Fact Eater" icon={Dog} color="from-green-500 to-emerald-500" />
            <WidgetCard id="story" title="Story Branch" icon={GitBranch} color="from-blue-500 to-cyan-500" />
          </div>
        ) : (
          <div className="max-w-3xl mx-auto h-full flex flex-col animate-slide-up">
            
            {/* WIDGET 1: PIXEL EVOLVER */}
            {activeWidget === 'pixel' && (
              <div className="flex flex-col items-center gap-6">
                <div className="text-center">
                  <h2 className="text-3xl font-black mb-2">Pixel Darwin</h2>
                  <p className="text-gray-500">Train the AI to draw with feedback loops.</p>
                </div>
                <div className="grid grid-cols-8 gap-1 p-2 bg-[#111] rounded-xl border border-white/10 shadow-2xl">
                  {grid.map((color, i) => (
                    <div key={i} className="w-8 h-8 sm:w-12 sm:h-12 rounded-sm transition-colors duration-500" style={{ backgroundColor: color }} />
                  ))}
                </div>
                <div className="w-full max-w-md space-y-4">
                  <input 
                    type="text" 
                    value={pixelPrompt} 
                    onChange={(e) => setPixelPrompt(e.target.value)} 
                    className="w-full bg-[#1c1c1e] border border-white/10 rounded-xl px-4 py-3 outline-none text-center"
                  />
                  <div className="flex gap-2">
                    <button onClick={() => handleEvolve("Looks random")} className="flex-1 py-3 bg-red-500/10 text-red-500 rounded-xl font-bold hover:bg-red-500/20"><ThumbsDown size={18} className="mx-auto" /></button>
                    <button onClick={() => handleEvolve()} disabled={pixelLoading} className="flex-1 py-3 bg-white text-black rounded-xl font-bold flex items-center justify-center gap-2">
                      {pixelLoading ? <Loader2 className="animate-spin" /> : <><Sparkles size={18} /> Evolve</>}
                    </button>
                    <button onClick={() => handleEvolve("Getting closer, refine edges")} className="flex-1 py-3 bg-green-500/10 text-green-500 rounded-xl font-bold hover:bg-green-500/20"><ThumbsUp size={18} className="mx-auto" /></button>
                  </div>
                </div>
              </div>
            )}

            {/* WIDGET 2: FLOW STATE */}
            {activeWidget === 'rap' && (
              <div className="flex flex-col h-full bg-[#111] border border-white/10 rounded-3xl p-6 font-mono relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-500 to-red-500" />
                <div className="flex-1 space-y-6 overflow-y-auto mb-4">
                  {rapVerses.length > 0 ? (
                    rapVerses.map((line, i) => (
                      <p key={i} className="text-lg md:text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400 animate-slide-up" style={{ animationDelay: `${i * 0.1}s` }}>
                        {line}
                      </p>
                    ))
                  ) : (
                    <div className="h-full flex items-center justify-center opacity-30">
                      <Mic2 size={64} />
                    </div>
                  )}
                </div>
                <div className="space-y-4 pt-4 border-t border-white/10">
                  <div className="flex justify-between text-xs text-gray-500 uppercase font-bold">
                    <span>Level {rapLevel}</span>
                    <span>Gemini MC</span>
                  </div>
                  <input 
                    type="text" 
                    value={rapTopic}
                    onChange={(e) => setRapTopic(e.target.value)}
                    className="w-full bg-[#222] border-none rounded-xl px-4 py-3 text-orange-500 outline-none font-bold"
                  />
                  <div className="flex gap-2">
                    <button onClick={() => setRapLevel(Math.max(1, rapLevel - 1))} className="px-4 bg-[#222] rounded-xl text-gray-400">-</button>
                    <button onClick={handleRap} disabled={rapLoading} className="flex-1 bg-orange-500 text-black font-bold py-3 rounded-xl flex items-center justify-center gap-2">
                      {rapLoading ? <Loader2 className="animate-spin" /> : "Spit Fire"}
                    </button>
                    <button onClick={() => setRapLevel(Math.min(3, rapLevel + 1))} className="px-4 bg-[#222] rounded-xl text-gray-400">+</button>
                  </div>
                </div>
              </div>
            )}

            {/* WIDGET 3: ALCHEMY */}
            {activeWidget === 'alchemy' && (
              <div className="flex flex-col h-full items-center">
                <div className="flex-1 flex flex-col items-center justify-center gap-8 w-full">
                  <div className="flex items-center gap-4">
                    <div className="w-24 h-24 bg-[#1c1c1e] border-2 border-dashed border-purple-500/30 rounded-2xl flex items-center justify-center text-xs font-bold text-center p-2 select-none">
                      {itemA}
                    </div>
                    <Plus className="text-purple-500" />
                    <div className="w-24 h-24 bg-[#1c1c1e] border-2 border-dashed border-purple-500/30 rounded-2xl flex items-center justify-center text-xs font-bold text-center p-2 select-none">
                      {itemB}
                    </div>
                  </div>
                  
                  <button onClick={handleCraft} disabled={craftLoading} className="w-16 h-16 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 flex items-center justify-center shadow-xl shadow-purple-900/40 hover:scale-110 transition-transform disabled:opacity-50 disabled:scale-100">
                    {craftLoading ? <Loader2 className="animate-spin" /> : <FlaskConical fill="white" />}
                  </button>

                  {craftResult && (
                    <div className="text-center animate-pop-in">
                      <div className="text-6xl mb-2">{craftResult.emoji}</div>
                      <h3 className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-400">{craftResult.name}</h3>
                    </div>
                  )}
                </div>

                <div className="w-full bg-[#1c1c1e] border-t border-white/5 p-4 rounded-t-3xl">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Inventory</p>
                  <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto custom-scrollbar">
                    {inventory.map(item => (
                      <button 
                        key={item} 
                        onClick={() => itemA === item ? null : setItemA(item) || setItemB(item)}
                        className="px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-xs font-bold transition-colors"
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* WIDGET 4: FACT EATER */}
            {activeWidget === 'pet' && (
              <div className="flex flex-col items-center justify-center h-full space-y-8">
                <div className="relative">
                  <div className={`w-40 h-40 rounded-full flex items-center justify-center text-6xl shadow-[0_0_50px_rgba(16,185,129,0.2)] transition-all duration-500 ${petState.mood === 'Excited' ? 'scale-110 bg-emerald-500/20' : 'bg-emerald-500/10'}`}>
                    {petState.mood === 'Happy' ? '😸' : petState.mood === 'Sad' ? '😿' : petState.mood === 'Excited' ? '😻' : '🙀'}
                  </div>
                  <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-[#1c1c1e] px-4 py-1 rounded-full border border-white/10 text-xs font-bold whitespace-nowrap">
                    Lvl {petState.level} • {petState.name}
                  </div>
                </div>

                <div className="bg-[#1c1c1e] p-6 rounded-2xl border border-white/5 max-w-sm w-full text-center">
                  <p className="text-emerald-400 font-medium text-sm mb-4">"{petResponse}"</p>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={factInput} 
                      onChange={(e) => setFactInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleFeed()}
                      placeholder="Feed me a fact..."
                      className="flex-1 bg-black/30 rounded-xl px-4 py-2 text-sm outline-none border border-white/5 focus:border-emerald-500/50"
                    />
                    <button onClick={handleFeed} disabled={petLoading} className="p-2 bg-emerald-500 text-black rounded-xl hover:bg-emerald-400 disabled:opacity-50">
                      {petLoading ? <Loader2 size={18} className="animate-spin" /> : <Zap size={18} fill="currentColor" />}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* WIDGET 5: STORY BRANCH */}
            {activeWidget === 'story' && (
              <div className="flex flex-col h-full max-w-lg mx-auto py-10">
                <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6 animate-fade-in">
                  <div className="w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-400 mb-4">
                    <GitBranch size={32} />
                  </div>
                  <p className="text-xl font-medium leading-relaxed">{storyText}</p>
                </div>
                
                <div className="grid gap-3 mt-8">
                  {storyLoading ? (
                    <div className="py-8 flex justify-center"><Loader2 className="animate-spin text-blue-500" /></div>
                  ) : (
                    storyOptions.map((opt, i) => (
                      <button 
                        key={i} 
                        onClick={() => handleStoryChoice(opt)}
                        className="w-full py-4 bg-[#1c1c1e] border border-white/10 hover:border-blue-500/50 hover:bg-blue-500/10 rounded-2xl font-bold text-sm transition-all flex items-center justify-between px-6 group"
                      >
                        {opt}
                        <ArrowRight size={16} className="opacity-0 group-hover:opacity-100 transition-opacity text-blue-500" />
                      </button>
                    ))
                  )}
                  <button onClick={() => { setStoryText('You wake up in a neon-lit alleyway.'); setStoryHistory([]); setStoryOptions(['Look around', 'Check pockets']); }} className="mt-4 text-xs text-gray-500 flex items-center justify-center gap-2 hover:text-white">
                    <RotateCcw size={12} /> Reset Story
                  </button>
                </div>
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  );
};

export default AIPlayground;
