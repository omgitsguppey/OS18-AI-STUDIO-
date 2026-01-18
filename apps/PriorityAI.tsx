
import React, { useState, useEffect } from 'react';
import { 
  ListTodo, 
  Zap, 
  CheckCircle2, 
  Circle, 
  ArrowRight, 
  History, 
  Trash2, 
  Loader2, 
  Plus
} from 'lucide-react';
import { breakdownTask, PriorityPlan } from '../services/geminiService';
import { storage, STORES } from '../services/storageService';

const PriorityAI: React.FC = () => {
  const [view, setView] = useState<'input' | 'list' | 'history'>('input');
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentPlan, setCurrentPlan] = useState<PriorityPlan | null>(null);
  const [history, setHistory] = useState<PriorityPlan[]>([]);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const init = async () => {
      const saved = await storage.get<PriorityPlan[]>(STORES.PRIORITY, 'task_history');
      if (saved) {
        setHistory(saved);
        // Resume most recent unfinished plan if available
        const recent = saved[0];
        if (recent && recent.tasks.some(t => !t.completed)) {
          setCurrentPlan(recent);
          setView('list');
        }
      }
      setIsReady(true);
    };
    init();
  }, []);

  useEffect(() => {
    if (!isReady) return;
    storage.set(STORES.PRIORITY, 'task_history', history).catch(console.error);
  }, [history, isReady]);

  const handleGenerate = async () => {
    if (!input.trim()) return;
    setIsGenerating(true);
    try {
      const result = await breakdownTask(input);
      const newPlan: PriorityPlan = {
        id: Date.now().toString(),
        originalThought: input,
        createdAt: Date.now(),
        ...result
      };
      
      setCurrentPlan(newPlan);
      setHistory([newPlan, ...history]);
      setView('list');
      setInput('');
    } catch (e) {
      console.error(e);
      alert("Failed to prioritize. Try a simpler input.");
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleTask = (taskId: string) => {
    if (!currentPlan) return;
    
    const updatedPlan = {
      ...currentPlan,
      tasks: currentPlan.tasks.map(t => 
        t.id === taskId ? { ...t, completed: !t.completed } : t
      )
    };
    
    setCurrentPlan(updatedPlan);
    setHistory(prev => prev.map(h => h.id === updatedPlan.id ? updatedPlan : h));
  };

  const deletePlan = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setHistory(prev => prev.filter(h => h.id !== id));
    if (currentPlan?.id === id) {
      setCurrentPlan(null);
      setView('input');
    }
  };

  const loadPlan = (plan: PriorityPlan) => {
    setCurrentPlan(plan);
    setView('list');
  };

  const completedCount = currentPlan?.tasks.filter(t => t.completed).length || 0;
  const totalCount = currentPlan?.tasks.length || 0;
  const progress = totalCount === 0 ? 0 : (completedCount / totalCount) * 100;

  if (!isReady) return (
    <div className="h-full bg-black flex items-center justify-center">
      <Loader2 className="animate-spin text-cyan-500" size={32} />
    </div>
  );

  return (
    <div className="h-full bg-[#0a0a0a] text-white flex flex-col font-sans overflow-hidden">
      {/* Header */}
      <div className="h-16 border-b border-white/5 px-6 flex items-center justify-between bg-black/40 backdrop-blur-md shrink-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-teal-600 flex items-center justify-center shadow-lg shadow-cyan-900/20">
            <ListTodo size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold leading-none">PriorityAI</h1>
            <p className="text-[10px] text-gray-500 font-medium uppercase tracking-widest mt-1">Anti-Procrastination</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {view === 'list' && (
            <button onClick={() => setView('input')} className="p-2 bg-white/5 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors">
              <Plus size={18} />
            </button>
          )}
          {view !== 'history' && history.length > 0 && (
            <button onClick={() => setView('history')} className="p-2 bg-white/5 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors">
              <History size={18} />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 max-w-2xl mx-auto w-full">
        {view === 'input' && (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-10 pb-20 animate-fade-in">
            <div className="space-y-4">
              <h2 className="text-4xl font-black tracking-tight">Stop Thinking.<br/>Start Doing.</h2>
              <p className="text-gray-500 text-lg">Dump your complex, overwhelming thought below.</p>
            </div>
            
            <div className="w-full relative group">
              <textarea 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleGenerate()}
                placeholder="I need to launch a website but I don't know where to start..."
                className="w-full bg-[#1c1c1e] border border-white/10 rounded-[2rem] px-8 py-8 text-xl font-medium outline-none focus:border-cyan-500/50 min-h-[200px] resize-none placeholder-gray-600 transition-all shadow-inner"
                autoFocus
              />
              <button 
                onClick={handleGenerate}
                disabled={isGenerating || !input.trim()}
                className="absolute bottom-6 right-6 h-14 w-14 bg-cyan-500 text-black rounded-2xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-xl shadow-cyan-500/20 disabled:opacity-50 disabled:scale-100"
              >
                {isGenerating ? <Loader2 size={24} className="animate-spin" /> : <ArrowRight size={28} strokeWidth={3} />}
              </button>
            </div>
          </div>
        )}

        {view === 'list' && currentPlan && (
          <div className="h-full flex flex-col animate-slide-up pb-10">
            <div className="mb-8">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-3xl font-black">{currentPlan.title}</h2>
                <span className="text-2xl font-black text-cyan-500">{Math.round(progress)}%</span>
              </div>
              <div className="h-2 w-full bg-[#1c1c1e] rounded-full overflow-hidden">
                <div 
                  className="h-full bg-cyan-500 transition-all duration-500 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="mt-6 text-sm text-gray-400 italic border-l-2 border-cyan-500/30 pl-4 py-1">
                "{currentPlan.motivation}"
              </p>
            </div>

            <div className="space-y-3">
              {currentPlan.tasks.map((task, idx) => (
                <button 
                  key={task.id || idx}
                  onClick={() => toggleTask(task.id || idx.toString())}
                  className={`w-full flex items-center gap-4 p-5 rounded-2xl border transition-all text-left group ${task.completed ? 'bg-[#1c1c1e] border-white/5 opacity-60' : 'bg-[#1c1c1e] border-white/10 hover:border-cyan-500/30'}`}
                >
                  <div className={`shrink-0 transition-colors ${task.completed ? 'text-cyan-500' : 'text-gray-600 group-hover:text-cyan-500'}`}>
                    {task.completed ? <CheckCircle2 size={24} fill="rgba(6, 182, 212, 0.2)" /> : <Circle size={24} />}
                  </div>
                  <span className={`text-lg font-medium transition-all ${task.completed ? 'line-through text-gray-500' : 'text-white'}`}>
                    {task.text}
                  </span>
                </button>
              ))}
            </div>

            {progress === 100 && (
              <div className="mt-8 p-6 bg-cyan-500/10 border border-cyan-500/20 rounded-2xl text-center animate-pop-in">
                <Zap size={32} className="text-cyan-500 mx-auto mb-2" fill="currentColor" />
                <h3 className="text-xl font-bold text-white">Momentum Built!</h3>
                <p className="text-cyan-200 text-sm mb-4">You crushed it. Ready for the next block?</p>
                <button 
                  onClick={() => { setView('input'); setCurrentPlan(null); }}
                  className="px-6 py-3 bg-cyan-500 text-black font-bold rounded-xl hover:bg-cyan-400 transition-colors"
                >
                  Start New Session
                </button>
              </div>
            )}
          </div>
        )}

        {view === 'history' && (
          <div className="animate-fade-in space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-3xl font-black">History</h2>
              <button onClick={() => setView('input')} className="text-sm font-bold text-cyan-500">Back</button>
            </div>
            
            <div className="grid gap-3">
              {history.length === 0 ? (
                <div className="py-20 text-center text-gray-500 opacity-50">
                  <ListTodo size={48} className="mx-auto mb-4" />
                  <p>No past sessions.</p>
                </div>
              ) : (
                history.map((plan) => {
                  const done = plan.tasks.filter(t => t.completed).length;
                  const total = plan.tasks.length;
                  return (
                    <div 
                      key={plan.id}
                      onClick={() => loadPlan(plan)}
                      className="bg-[#1c1c1e] border border-white/5 p-5 rounded-2xl flex items-center justify-between cursor-pointer hover:bg-[#252527] group"
                    >
                      <div>
                        <h3 className="font-bold text-lg">{plan.title}</h3>
                        <p className="text-xs text-gray-500 mt-1">{done}/{total} Completed • {new Date(plan.createdAt).toLocaleDateString()}</p>
                      </div>
                      <button 
                        onClick={(e) => deletePlan(plan.id, e)}
                        className="p-2 text-gray-600 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PriorityAI;
