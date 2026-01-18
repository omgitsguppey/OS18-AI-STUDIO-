
import React, { useState, useEffect, useRef } from 'react';
import { 
  Briefcase, 
  User, 
  Plus, 
  ChevronDown, 
  Check, 
  Trash2, 
  Sparkles, 
  ArrowRight,
  Loader2,
  Send,
  Calendar,
  Trophy,
  Target
} from 'lucide-react';
import { storage, STORES } from '../services/storageService';
import { generateCareerQuestion, CareerQuestion } from '../services/geminiService';

interface CareerEntry {
  id: string;
  date: number;
  questionPrompt: string;
  answer: string;
  category?: string;
}

interface CareerProfile {
  id: string;
  name: string;
  role: string;
  entries: CareerEntry[];
  lastUpdated: number;
}

const CareerAI: React.FC = () => {
  const [profiles, setProfiles] = useState<CareerProfile[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isReady, setIsReady] = useState(false);
  
  // Interaction State
  const [currentQuestion, setCurrentQuestion] = useState<CareerQuestion | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [answerInput, setAnswerInput] = useState('');
  
  // New Profile State
  const [newProfileName, setNewProfileName] = useState('');
  const [newProfileRole, setNewProfileRole] = useState('');

  const menuRef = useRef<HTMLDivElement>(null);

  // Load from Storage
  useEffect(() => {
    const init = async () => {
      const saved = await storage.get<CareerProfile[]>(STORES.CAREER, 'profiles');
      if (saved && saved.length > 0) {
        setProfiles(saved);
        setActiveProfileId(saved[0].id);
      }
      setIsReady(true);
    };
    init();

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Save to Storage
  useEffect(() => {
    if (!isReady) return;
    storage.set(STORES.CAREER, 'profiles', profiles).catch(console.error);
  }, [profiles, isReady]);

  const activeProfile = profiles.find(p => p.id === activeProfileId);

  // Auto-generate question if profile exists but no question active
  useEffect(() => {
    if (activeProfile && !currentQuestion && !isGenerating) {
      handleGenerateQuestion();
    }
  }, [activeProfileId]);

  const handleCreateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProfileName.trim()) return;
    
    const newProfile: CareerProfile = {
      id: Date.now().toString(),
      name: newProfileName,
      role: newProfileRole || 'Professional',
      entries: [],
      lastUpdated: Date.now()
    };
    
    setProfiles([...profiles, newProfile]);
    setActiveProfileId(newProfile.id);
    setNewProfileName('');
    setNewProfileRole('');
    setIsMenuOpen(false);
    setCurrentQuestion(null); // Reset for new generation
  };

  const handleDeleteProfile = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('Delete this career profile?')) {
      const newProfiles = profiles.filter(p => p.id !== id);
      setProfiles(newProfiles);
      if (activeProfileId === id) {
        setActiveProfileId(newProfiles[0]?.id || null);
      }
    }
  };

  const handleGenerateQuestion = async () => {
    if (!activeProfile) return;
    setIsGenerating(true);
    try {
      const summary = activeProfile.entries.map(e => `Q: ${e.questionPrompt} A: ${e.answer}`);
      const question = await generateCareerQuestion(activeProfile.name, summary.slice(-10)); // Context window
      setCurrentQuestion(question);
    } catch (e) {
      console.error(e);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAnswer = (answer: string) => {
    if (!activeProfile || !currentQuestion) return;

    const newEntry: CareerEntry = {
      id: Date.now().toString(),
      date: Date.now(),
      questionPrompt: currentQuestion.question,
      answer: answer,
      category: 'Achievement'
    };

    const updatedProfile = {
      ...activeProfile,
      entries: [newEntry, ...activeProfile.entries], // Newest first
      lastUpdated: Date.now()
    };

    setProfiles(prev => prev.map(p => p.id === activeProfile.id ? updatedProfile : p));
    setAnswerInput('');
    setCurrentQuestion(null); // Clear to trigger next generation
  };

  if (!isReady) return (
    <div className="h-full bg-black flex items-center justify-center">
      <Loader2 className="animate-spin text-white/20" size={32} />
    </div>
  );

  return (
    <div className="h-full bg-[#f2f2f7] dark:bg-[#000000] text-black dark:text-white font-sans flex flex-col overflow-hidden relative">
      {/* Header */}
      <div className="h-16 px-6 border-b border-gray-200 dark:border-white/10 flex items-center justify-between bg-white/50 dark:bg-white/5 backdrop-blur-xl shrink-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Briefcase size={18} className="text-white" />
          </div>
          <div className="relative" ref={menuRef}>
             <button 
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
             >
                <div className="text-left">
                   <h1 className="text-sm font-bold leading-none">{activeProfile?.name || 'CareerAI'}</h1>
                   <p className="text-[10px] text-gray-500 font-medium leading-none mt-1">{activeProfile?.role || 'Select Profile'}</p>
                </div>
                <ChevronDown size={14} className="text-gray-400" />
             </button>

             {isMenuOpen && (
                <div className="absolute top-full left-0 mt-2 w-72 bg-white dark:bg-[#1c1c1e] rounded-2xl shadow-2xl border border-gray-200 dark:border-white/10 overflow-hidden animate-pop-in">
                   <div className="p-4 border-b border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-black/20">
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Switch Profile</p>
                      <div className="space-y-1 max-h-40 overflow-y-auto">
                         {profiles.map(p => (
                            <div 
                               key={p.id}
                               onClick={() => { setActiveProfileId(p.id); setIsMenuOpen(false); setCurrentQuestion(null); }}
                               className={`flex items-center justify-between p-2 rounded-lg cursor-pointer ${activeProfileId === p.id ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' : 'hover:bg-gray-100 dark:hover:bg-white/5'}`}
                            >
                               <span className="text-sm font-bold truncate">{p.name}</span>
                               <div className="flex items-center gap-2">
                                  {activeProfileId === p.id && <Check size={14} />}
                                  <button onClick={(e) => handleDeleteProfile(e, p.id)} className="p-1 hover:text-red-500 text-gray-400"><Trash2 size={14} /></button>
                               </div>
                            </div>
                         ))}
                      </div>
                   </div>
                   <form onSubmit={handleCreateProfile} className="p-4">
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">New Profile</p>
                      <input 
                         type="text" 
                         value={newProfileName}
                         onChange={(e) => setNewProfileName(e.target.value)}
                         placeholder="Full Name"
                         className="w-full mb-2 bg-gray-100 dark:bg-black/40 px-3 py-2 rounded-lg text-sm outline-none border border-transparent focus:border-blue-500 transition-all"
                      />
                      <input 
                         type="text" 
                         value={newProfileRole}
                         onChange={(e) => setNewProfileRole(e.target.value)}
                         placeholder="Current Role (e.g. Designer)"
                         className="w-full mb-3 bg-gray-100 dark:bg-black/40 px-3 py-2 rounded-lg text-sm outline-none border border-transparent focus:border-blue-500 transition-all"
                      />
                      <button type="submit" className="w-full py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition-colors">
                         Create Profile
                      </button>
                   </form>
                </div>
             )}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-6 pb-40 custom-scrollbar">
         {!activeProfile ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 opacity-60">
               <User size={64} className="mb-4 stroke-1" />
               <p className="text-lg font-medium">No profile selected.</p>
               <p className="text-sm">Create one in the menu to start.</p>
            </div>
         ) : (
            <div className="max-w-2xl mx-auto space-y-8 animate-fade-in">
               {/* Timeline Header */}
               <div className="text-center py-6">
                  <div className="w-20 h-20 mx-auto bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-3xl font-bold shadow-xl mb-4">
                     {activeProfile.name.charAt(0)}
                  </div>
                  <h2 className="text-2xl font-black">{activeProfile.name}</h2>
                  <p className="text-gray-500 font-medium">{activeProfile.role}</p>
               </div>

               {/* Timeline Entries */}
               <div className="relative pl-8 border-l-2 border-gray-200 dark:border-white/10 space-y-8">
                  {activeProfile.entries.length === 0 && (
                     <div className="absolute top-0 left-8 right-0 p-6 bg-white dark:bg-[#1c1c1e] rounded-2xl border border-dashed border-gray-300 dark:border-white/10 text-center text-gray-500 text-sm">
                        No career history yet. Answer the AI's questions to build your portfolio.
                     </div>
                  )}
                  {activeProfile.entries.map((entry, idx) => (
                     <div key={entry.id} className="relative group">
                        <div className="absolute -left-[41px] top-4 w-5 h-5 rounded-full bg-blue-500 border-4 border-[#f2f2f7] dark:border-black shadow-sm" />
                        <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-white/5 transition-all hover:scale-[1.01]">
                           <div className="flex items-center justify-between mb-2">
                              <span className="text-[10px] font-bold uppercase tracking-widest text-blue-500">
                                 {new Date(entry.date).toLocaleDateString()}
                              </span>
                              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                 <button className="p-1.5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg text-gray-400"><Trash2 size={14} /></button>
                              </div>
                           </div>
                           <h3 className="text-sm font-bold text-gray-500 mb-2">{entry.questionPrompt}</h3>
                           <p className="text-base font-medium leading-relaxed">{entry.answer}</p>
                        </div>
                     </div>
                  ))}
               </div>
            </div>
         )}
      </div>

      {/* AI Question Interface - Fixed Bottom */}
      {activeProfile && (
         <div className="absolute bottom-0 left-0 right-0 bg-white dark:bg-[#1c1c1e] border-t border-gray-200 dark:border-white/10 p-6 z-40 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] transition-transform duration-500">
            <div className="max-w-2xl mx-auto">
               <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-blue-600 rounded-lg text-white animate-pulse">
                     <Sparkles size={16} fill="currentColor" />
                  </div>
                  <span className="text-xs font-black uppercase tracking-widest text-blue-600">AI Interviewer</span>
               </div>

               {isGenerating ? (
                  <div className="py-8 flex flex-col items-center justify-center text-gray-400 gap-3">
                     <Loader2 className="animate-spin" size={24} />
                     <p className="text-sm font-medium animate-pulse">Analyzing career trajectory...</p>
                  </div>
               ) : currentQuestion ? (
                  <div className="animate-slide-up space-y-4">
                     <h3 className="text-xl font-bold leading-tight">{currentQuestion.question}</h3>
                     
                     {currentQuestion.type === 'choice' && currentQuestion.options ? (
                        <div className="flex flex-wrap gap-2">
                           {currentQuestion.options.map(opt => (
                              <button 
                                 key={opt}
                                 onClick={() => handleAnswer(opt)}
                                 className="px-5 py-3 rounded-full bg-gray-100 dark:bg-white/5 border border-transparent hover:border-blue-500 hover:text-blue-500 transition-all font-bold text-sm"
                              >
                                 {opt}
                              </button>
                           ))}
                        </div>
                     ) : currentQuestion.type === 'boolean' ? (
                        <div className="flex gap-4">
                           <button onClick={() => handleAnswer('Yes')} className="flex-1 py-3 bg-gray-100 dark:bg-white/5 hover:bg-blue-500 hover:text-white rounded-xl font-bold transition-colors">Yes</button>
                           <button onClick={() => handleAnswer('No')} className="flex-1 py-3 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 rounded-xl font-bold transition-colors">No</button>
                        </div>
                     ) : (
                        <div className="relative">
                           <input 
                              type="text" 
                              value={answerInput}
                              onChange={(e) => setAnswerInput(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && handleAnswer(answerInput)}
                              placeholder="Type your answer..."
                              className="w-full bg-gray-100 dark:bg-black/30 border border-gray-200 dark:border-white/10 rounded-2xl pl-5 pr-12 py-4 outline-none focus:border-blue-500 transition-all"
                              autoFocus
                           />
                           <button 
                              onClick={() => handleAnswer(answerInput)}
                              disabled={!answerInput.trim()}
                              className="absolute right-2 top-2 bottom-2 w-10 bg-blue-600 text-white rounded-xl flex items-center justify-center disabled:opacity-50 disabled:grayscale transition-all active:scale-90"
                           >
                              <ArrowRight size={20} />
                           </button>
                        </div>
                     )}
                  </div>
               ) : (
                  <div className="py-8 text-center">
                     <button onClick={handleGenerateQuestion} className="text-blue-500 font-bold flex items-center justify-center gap-2 mx-auto hover:underline">
                        <Sparkles size={16} /> Generate Next Question
                     </button>
                  </div>
               )}
            </div>
         </div>
      )}
    </div>
  );
};

export default CareerAI;
