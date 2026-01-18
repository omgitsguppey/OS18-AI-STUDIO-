
import React, { useState, useEffect } from 'react';
import { Repeat, Copy, Check, History, ExternalLink, Trash2, ArrowRight } from 'lucide-react';
import { storage, STORES } from '../services/storageService';

interface FlipHistory {
  id: string;
  original: string;
  flipped: string;
  timestamp: number;
}

const LinkFlipper: React.FC = () => {
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<FlipHistory[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const loadHistory = async () => {
      const saved = await storage.get<FlipHistory[]>(STORES.LINKS, 'flip_history');
      if (saved) setHistory(saved);
      setIsReady(true);
    };
    loadHistory();
  }, []);

  useEffect(() => {
    if (!isReady) return;
    storage.set(STORES.LINKS, 'flip_history', history).catch(console.error);
  }, [history, isReady]);

  const flipLink = () => {
    const shortsRegex = /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]+)/;
    const match = input.match(shortsRegex);

    if (match && match[1]) {
      const videoId = match[1];
      const flipped = `https://www.youtube.com/watch?v=${videoId}`;
      
      const newEntry: FlipHistory = {
        id: Date.now().toString(),
        original: input,
        flipped,
        timestamp: Date.now()
      };

      setHistory([newEntry, ...history]);
      setInput('');
    } else {
      alert("Please enter a valid YouTube Shorts link.");
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const deleteHistory = (id: string) => {
    setHistory(history.filter(item => item.id !== id));
  };

  return (
    <div className="h-full bg-[#0a0a0a] text-white flex flex-col font-sans overflow-hidden">
      <div className="h-14 border-b border-white/5 px-5 flex items-center gap-3 bg-black/40 backdrop-blur-xl shrink-0">
        <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
          <Repeat size={18} />
        </div>
        <span className="text-sm font-bold tracking-tight">LinkFlipper</span>
      </div>

      <div className="flex-1 overflow-y-auto p-6 max-w-xl mx-auto w-full">
        <div className="space-y-8 py-4">
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-black">Flip Shorts</h2>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-widest">YouTube Conversion Utility</p>
          </div>

          <div className="bg-[#1c1c1e] p-6 rounded-[2rem] border border-white/5 shadow-2xl space-y-4">
            <input 
              type="text" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Paste YouTube Shorts URL..."
              className="w-full bg-black/20 border border-white/10 rounded-2xl px-5 py-4 text-sm outline-none focus:border-indigo-500/50 transition-all"
            />
            <button 
              onClick={flipLink}
              disabled={!input.trim()}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-4 rounded-2xl font-bold text-sm transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2"
            >
              Flip Link <ArrowRight size={16} />
            </button>
          </div>

          {history.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 px-1 text-gray-500">
                <History size={14} />
                <span className="text-[10px] font-black uppercase tracking-widest">Flip History</span>
              </div>
              
              <div className="space-y-3">
                {history.map(item => (
                  <div key={item.id} className="bg-[#1c1c1e] border border-white/5 rounded-2xl p-4 flex flex-col gap-3 group animate-fade-in">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-gray-500 font-bold uppercase tracking-tighter">
                        {new Date(item.timestamp).toLocaleDateString()} • {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <button 
                        onClick={() => deleteHistory(item.id)}
                        className="text-gray-700 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className="flex-1 min-w-0 bg-black/30 px-3 py-2 rounded-lg border border-white/5">
                        <p className="text-xs font-medium text-indigo-400 truncate">{item.flipped}</p>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => copyToClipboard(item.flipped, item.id)}
                          className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-gray-400 transition-colors"
                        >
                          {copiedId === item.id ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                        </button>
                        <a 
                          href={item.flipped} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-gray-400 transition-colors"
                        >
                          <ExternalLink size={16} />
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LinkFlipper;
