
import React, { useState, useEffect } from 'react';
import { 
  Crosshair, 
  CheckCircle2, 
  ArrowRight, 
  RefreshCcw, 
  ShieldCheck, 
  Loader2,
  ListTodo
} from 'lucide-react';
import { storage, STORES } from '../services/storageService';
import { PriorityPlan } from '../services/geminiService';
import OnboardingOverlay from '../components/OnboardingOverlay';
import { AppID } from '../types';

const OperatorAI: React.FC<{ onNavigate?: (id: AppID) => void }> = ({ onNavigate }) => {
  const [activePlan, setActivePlan] = useState<PriorityPlan | null>(null);
  const [plans, setPlans] = useState<PriorityPlan[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [currentTaskIndex, setCurrentTaskIndex] = useState(-1);
  const [isCompleting, setIsCompleting] = useState(false);

  // Load PriorityAI Data
  useEffect(() => {
    const init = async () => {
      const savedPlans = await storage.get<PriorityPlan[]>(STORES.PRIORITY, 'task_history');
      if (savedPlans && savedPlans.length > 0) {
        setPlans(savedPlans);
        // Find the most recent plan that isn't 100% complete
        const actionablePlan = savedPlans.find(p => p.tasks.some(t => !t.completed));
        if (actionablePlan) {
          setActivePlan(actionablePlan);
          const firstUndone = actionablePlan.tasks.findIndex(t => !t.completed);
          setCurrentTaskIndex(firstUndone);
        }
      }
      setIsReady(true);
    };
    init();
  }, []);

  // Persist Updates to Storage
  useEffect(() => {
    if (!isReady || !plans.length) return;
    storage.set(STORES.PRIORITY, 'task_history', plans).catch(console.error);
  }, [plans, isReady]);

  const handleCompleteTask = () => {
    if (!activePlan || currentTaskIndex === -1) return;
    
    setIsCompleting(true);
    
    // Animate transition
    setTimeout(() => {
        const updatedTasks = [...activePlan.tasks];
        updatedTasks[currentTaskIndex].completed = true;
        
        const updatedPlan = { ...activePlan, tasks: updatedTasks };
        
        // Update local state and master list
        setActivePlan(updatedPlan);
        setPlans(prev => prev.map(p => p.id === updatedPlan.id ? updatedPlan : p));
        
        // Advance index
        const nextIndex = updatedTasks.findIndex(t => !t.completed);
        setCurrentTaskIndex(nextIndex);
        setIsCompleting(false);
    }, 600); // Animation delay
  };

  const hasTasks = activePlan && currentTaskIndex !== -1;

  if (!isReady) return (
    <div className="h-full bg-black flex items-center justify-center">
      <Loader2 className="animate-spin text-green-500" size={32} />
    </div>
  );

  return (
    <div className="h-full bg-black text-white flex flex-col font-sans overflow-hidden relative">
      <OnboardingOverlay 
        appId={AppID.OPERATOR}
        title="Operator"
        subtitle="Linear Execution Interface"
        features={[
          { icon: Crosshair, title: "Anti-Paralysis", description: "Hides everything except the single next step you need to take." },
          { icon: ShieldCheck, title: "Forced Order", description: "You cannot see step 2 until step 1 is marked complete." },
          { icon: RefreshCcw, title: "Syncs with PriorityAI", description: "Pulls your breakdown directly from the strategy engine." }
        ]}
      />

      {/* Header */}
      <div className="h-16 px-6 flex items-center justify-between border-b border-white/10 shrink-0 z-10 bg-black">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-white/10 flex items-center justify-center text-green-500 border border-green-500/20">
            <Crosshair size={18} />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-widest uppercase text-green-500">Operator Mode</h1>
            {activePlan && <p className="text-[10px] text-gray-500 font-mono">mission: {activePlan.title.toLowerCase()}</p>}
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-6 relative">
        {/* Background Grid */}
        <div className="absolute inset-0 opacity-10 pointer-events-none" 
             style={{ backgroundImage: 'linear-gradient(#333 1px, transparent 1px), linear-gradient(90deg, #333 1px, transparent 1px)', backgroundSize: '40px 40px' }} 
        />

        {hasTasks ? (
          <div className={`w-full max-w-lg transition-all duration-500 ${isCompleting ? 'opacity-0 translate-y-10 scale-95' : 'opacity-100 translate-y-0 scale-100'}`}>
            <div className="mb-12 text-center">
               <span className="inline-block px-3 py-1 bg-green-500/10 border border-green-500/20 rounded text-[10px] font-mono text-green-500 mb-4 animate-pulse">
                  CURRENT OBJECTIVE
               </span>
               <h2 className="text-3xl md:text-5xl font-black leading-tight tracking-tight">
                  {activePlan!.tasks[currentTaskIndex].text}
               </h2>
            </div>

            <button 
              onClick={handleCompleteTask}
              className="group relative w-full h-24 bg-green-600 hover:bg-green-500 active:scale-[0.98] transition-all rounded-lg overflow-hidden flex items-center justify-center shadow-[0_0_40px_rgba(34,197,94,0.3)]"
            >
               <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 mix-blend-overlay" />
               <div className="flex items-center gap-4 relative z-10">
                  <span className="text-2xl font-black tracking-widest uppercase">Mark Complete</span>
                  <div className="w-10 h-10 bg-black/20 rounded flex items-center justify-center group-hover:translate-x-2 transition-transform">
                     <CheckCircle2 size={24} />
                  </div>
               </div>
            </button>

            <div className="mt-8 flex justify-center gap-2">
               {activePlan!.tasks.map((_, idx) => (
                  <div 
                    key={idx} 
                    className={`h-1.5 rounded-full transition-all duration-500 ${
                        idx < currentTaskIndex ? 'w-4 bg-green-500' : 
                        idx === currentTaskIndex ? 'w-8 bg-white animate-pulse' : 
                        'w-4 bg-white/10'
                    }`} 
                  />
               ))}
            </div>
            
            <p className="text-center text-xs text-gray-600 font-mono mt-4">
               STEP {currentTaskIndex + 1} OF {activePlan!.tasks.length}
            </p>
          </div>
        ) : activePlan ? (
          <div className="text-center space-y-6 animate-fade-in">
             <div className="w-24 h-24 rounded-full border-4 border-green-500 flex items-center justify-center mx-auto shadow-[0_0_50px_rgba(34,197,94,0.4)]">
                <ShieldCheck size={48} className="text-green-500" />
             </div>
             <div>
                <h2 className="text-3xl font-black text-white">MISSION COMPLETE</h2>
                <p className="text-gray-500 mt-2">All tasks in "{activePlan.title}" executed successfully.</p>
             </div>
             <button 
                onClick={() => onNavigate?.(AppID.PRIORITY_AI)}
                className="px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm font-bold uppercase tracking-widest transition-all"
             >
                Initialize New Plan
             </button>
          </div>
        ) : (
          <div className="text-center space-y-6 opacity-50">
             <ListTodo size={64} className="mx-auto mb-4" />
             <h2 className="text-2xl font-bold">No Active Missions</h2>
             <p className="text-sm max-w-xs mx-auto">Operator requires a strategy plan. Launch PriorityAI to generate a tactical breakdown.</p>
             <button 
                onClick={() => onNavigate?.(AppID.PRIORITY_AI)}
                className="px-6 py-3 bg-white text-black rounded font-bold text-xs uppercase tracking-widest hover:bg-gray-200 transition-colors"
             >
                Launch PriorityAI
             </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default OperatorAI;
