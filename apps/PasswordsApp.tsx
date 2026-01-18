
import React, { useState, useEffect, useRef } from 'react';
import { 
  KeyRound, 
  Plus, 
  Search, 
  ChevronRight, 
  Copy, 
  Eye, 
  EyeOff, 
  Trash2, 
  ArrowLeft, 
  Check, 
  Lock,
  Loader2,
  Globe,
  Mail,
  StickyNote,
  Camera,
  User,
  Briefcase,
  Music,
  Megaphone,
  Star
} from 'lucide-react';
import { storage, STORES } from '../services/storageService';
import { fileToBase64 } from '../services/ai/core';

interface PasswordEntry {
  id: string;
  service: string;
  email: string;
  password: string;
  notes: string;
  updatedAt: number;
  profileImage?: string; // Base64
  accountType?: string;
}

const ACCOUNT_TYPES = [
  { label: 'Personal', icon: User },
  { label: 'Creator', icon: Star },
  { label: 'Brand', icon: Briefcase },
  { label: 'Musician', icon: Music },
  { label: 'Influencer', icon: Megaphone },
  { label: 'Business', icon: Globe },
];

const PasswordsApp: React.FC = () => {
  const [entries, setEntries] = useState<PasswordEntry[]>([]);
  const [view, setView] = useState<'list' | 'edit'>('list');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  // Form State
  const [formService, setFormService] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formAccountType, setFormAccountType] = useState('Personal');
  const [formImage, setFormImage] = useState<string | null>(null);
  
  const [showPassword, setShowPassword] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const load = async () => {
      const saved = await storage.get<PasswordEntry[]>(STORES.PASSWORDS, 'entries');
      if (saved) setEntries(saved);
      setIsReady(true);
    };
    load();
  }, []);

  useEffect(() => {
    if (!isReady) return;
    storage.set(STORES.PASSWORDS, 'entries', entries).catch(console.error);
  }, [entries, isReady]);

  const filteredEntries = entries
    .filter(e => e.service.toLowerCase().includes(search.toLowerCase()) || e.email.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => a.service.localeCompare(b.service));

  const handleEdit = (entry: PasswordEntry) => {
    setSelectedId(entry.id);
    setFormService(entry.service);
    setFormEmail(entry.email);
    setFormPassword(entry.password);
    setFormNotes(entry.notes);
    setFormAccountType(entry.accountType || 'Personal');
    setFormImage(entry.profileImage || null);
    setShowPassword(false);
    setView('edit');
  };

  const handleCreate = () => {
    setSelectedId(null);
    setFormService('');
    setFormEmail('');
    setFormPassword('');
    setFormNotes('');
    setFormAccountType('Personal');
    setFormImage(null);
    setShowPassword(false);
    setView('edit');
  };

  const handleSave = () => {
    if (!formService.trim()) return;

    const newEntry: PasswordEntry = {
      id: selectedId || Date.now().toString(),
      service: formService,
      email: formEmail,
      password: formPassword,
      notes: formNotes,
      accountType: formAccountType,
      profileImage: formImage || undefined,
      updatedAt: Date.now()
    };

    setEntries(prev => {
      if (selectedId) {
        return prev.map(e => e.id === selectedId ? newEntry : e);
      }
      return [...prev, newEntry];
    });
    setView('list');
  };

  const handleDelete = () => {
    if (selectedId && confirm('Delete this account?')) {
      setEntries(prev => prev.filter(e => e.id !== selectedId));
      setView('list');
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      try {
        const base64 = await fileToBase64(e.target.files[0]);
        setFormImage(base64);
      } catch (err) {
        console.error("Image upload failed", err);
      }
    }
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  if (!isReady) return (
    <div className="h-full bg-black flex items-center justify-center">
      <Loader2 className="animate-spin text-gray-500" size={32} />
    </div>
  );

  return (
    <div className="h-full bg-[#f2f2f7] dark:bg-black text-black dark:text-white font-sans overflow-hidden flex flex-col">
      {view === 'list' && (
        <>
          <div className="px-5 pt-8 pb-2 bg-[#f2f2f7] dark:bg-black sticky top-0 z-10">
             <div className="flex justify-between items-end mb-4">
                <h1 className="text-[34px] font-bold tracking-tight">Identity</h1>
                <button 
                  onClick={handleCreate}
                  className="w-8 h-8 rounded-full bg-gray-200 dark:bg-white/10 flex items-center justify-center text-[#007AFF] hover:bg-gray-300 dark:hover:bg-white/20 transition-colors mb-2"
                >
                  <Plus size={20} />
                </button>
             </div>
             <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                <input 
                  type="text" 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search accounts" 
                  className="w-full bg-gray-200 dark:bg-[#1c1c1e] text-black dark:text-white placeholder-gray-500 rounded-xl pl-9 pr-4 py-2 text-[17px] outline-none focus:bg-gray-300 dark:focus:bg-[#2c2c2e] transition-colors"
                />
             </div>
          </div>

          <div className="flex-1 overflow-y-auto px-5 pb-20 custom-scrollbar">
            {filteredEntries.length === 0 ? (
               <div className="py-20 flex flex-col items-center justify-center text-center opacity-40">
                  <div className="w-16 h-16 rounded-full bg-gray-200 dark:bg-white/10 flex items-center justify-center mb-4">
                     <KeyRound size={32} />
                  </div>
                  <p className="font-semibold text-lg">No Accounts</p>
                  <p className="text-sm">Tap + to add an identity.</p>
               </div>
            ) : (
               <div className="bg-white dark:bg-[#1c1c1e] rounded-xl overflow-hidden mt-4">
                 {filteredEntries.map((entry, idx) => (
                   <div 
                     key={entry.id}
                     onClick={() => handleEdit(entry)}
                     className={`
                        pl-4 pr-4 py-3 flex items-center gap-4 active:bg-gray-100 dark:active:bg-white/5 cursor-pointer
                        ${idx !== filteredEntries.length - 1 ? 'border-b border-gray-100 dark:border-white/5' : ''}
                     `}
                   >
                     <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-white/10 flex items-center justify-center text-gray-500 dark:text-gray-400 font-bold text-lg shrink-0 overflow-hidden">
                        {entry.profileImage ? (
                            <img src={`data:image/png;base64,${entry.profileImage}`} className="w-full h-full object-cover" alt="Profile" />
                        ) : (
                            entry.service.charAt(0).toUpperCase()
                        )}
                     </div>
                     <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <h3 className="text-[17px] font-semibold truncate">{entry.service}</h3>
                            {entry.accountType && entry.accountType !== 'Personal' && (
                                <span className="text-[10px] px-1.5 py-0.5 bg-gray-200 dark:bg-white/10 rounded text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">
                                    {entry.accountType}
                                </span>
                            )}
                        </div>
                        <p className="text-[15px] text-gray-500 truncate">{entry.email}</p>
                     </div>
                     <ChevronRight size={18} className="text-gray-300 dark:text-gray-600" />
                   </div>
                 ))}
               </div>
            )}
            <div className="py-8 text-center text-xs text-gray-400">
               {filteredEntries.length} Accounts • Secured Locally
            </div>
          </div>
        </>
      )}

      {view === 'edit' && (
        <div className="h-full flex flex-col bg-[#f2f2f7] dark:bg-black">
           <div className="px-4 py-4 flex items-center justify-between bg-[#f2f2f7] dark:bg-black shrink-0">
              <button 
                onClick={() => setView('list')} 
                className="flex items-center gap-1 text-[#007AFF] text-[17px] font-medium active:opacity-50"
              >
                 <ArrowLeft size={22} /> Accounts
              </button>
              <button 
                onClick={handleSave} 
                disabled={!formService.trim()}
                className="text-[#007AFF] text-[17px] font-bold active:opacity-50 disabled:opacity-30"
              >
                 Done
              </button>
           </div>

           <div className="flex-1 overflow-y-auto px-5 pb-10 custom-scrollbar">
              <div className="flex justify-center py-6">
                 <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="w-24 h-24 rounded-full bg-gray-200 dark:bg-[#1c1c1e] shadow-inner flex items-center justify-center text-gray-400 font-bold text-4xl overflow-hidden cursor-pointer relative group border border-gray-300 dark:border-white/10"
                 >
                    {formImage ? (
                        <img src={`data:image/png;base64,${formImage}`} className="w-full h-full object-cover" alt="Profile" />
                    ) : (
                        formService ? formService.charAt(0).toUpperCase() : <User size={40} />
                    )}
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Camera size={24} className="text-white" />
                    </div>
                 </div>
                 <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
              </div>

              {/* Account Type Selector */}
              <div className="bg-white dark:bg-[#1c1c1e] rounded-xl overflow-hidden mb-6 p-1 flex overflow-x-auto no-scrollbar gap-1">
                 {ACCOUNT_TYPES.map(type => (
                     <button
                        key={type.label}
                        onClick={() => setFormAccountType(type.label)}
                        className={`flex-1 min-w-[70px] py-2 flex flex-col items-center gap-1 rounded-lg transition-all ${formAccountType === type.label ? 'bg-[#007AFF] text-white shadow-md' : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5'}`}
                     >
                         <type.icon size={16} />
                         <span className="text-[10px] font-bold">{type.label}</span>
                     </button>
                 ))}
              </div>

              <div className="bg-white dark:bg-[#1c1c1e] rounded-xl overflow-hidden mb-6">
                 <div className="pl-4 py-0 flex items-center border-b border-gray-100 dark:border-white/5">
                    <div className="w-8 flex justify-center mr-2"><Globe size={18} className="text-gray-400" /></div>
                    <input 
                       type="text" 
                       value={formService} 
                       onChange={e => setFormService(e.target.value)}
                       placeholder="Account Name (e.g. Instagram)"
                       className="flex-1 py-3.5 bg-transparent outline-none text-[17px] placeholder-gray-400 text-black dark:text-white"
                    />
                 </div>
                 <div className="pl-4 py-0 flex items-center border-b border-gray-100 dark:border-white/5 group">
                    <div className="w-8 flex justify-center mr-2"><Mail size={18} className="text-gray-400" /></div>
                    <input 
                       type="text" 
                       value={formEmail} 
                       onChange={e => setFormEmail(e.target.value)}
                       placeholder="Username / Email"
                       className="flex-1 py-3.5 bg-transparent outline-none text-[17px] placeholder-gray-400 text-black dark:text-white"
                    />
                    {formEmail && (
                       <button onClick={() => copyToClipboard(formEmail, 'email')} className="px-4 text-gray-400 active:text-[#007AFF]">
                          {copiedField === 'email' ? <Check size={18} className="text-green-500" /> : <Copy size={18} />}
                       </button>
                    )}
                 </div>
                 <div className="pl-4 py-0 flex items-center group">
                    <div className="w-8 flex justify-center mr-2"><KeyRound size={18} className="text-gray-400" /></div>
                    <input 
                       type={showPassword ? "text" : "password"} 
                       value={formPassword} 
                       onChange={e => setFormPassword(e.target.value)}
                       placeholder="Password"
                       className="flex-1 py-3.5 bg-transparent outline-none text-[17px] placeholder-gray-400 text-black dark:text-white font-mono"
                    />
                    <div className="flex items-center px-2">
                       <button onClick={() => setShowPassword(!showPassword)} className="p-2 text-gray-400 active:text-white">
                          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                       </button>
                       {formPassword && (
                          <button onClick={() => copyToClipboard(formPassword, 'pass')} className="p-2 text-gray-400 active:text-[#007AFF]">
                             {copiedField === 'pass' ? <Check size={18} className="text-green-500" /> : <Copy size={18} />}
                          </button>
                       )}
                    </div>
                 </div>
              </div>

              <div className="bg-white dark:bg-[#1c1c1e] rounded-xl overflow-hidden mb-8 flex items-start pl-4 py-2">
                 <div className="w-8 flex justify-center mr-2 mt-1.5"><StickyNote size={18} className="text-gray-400" /></div>
                 <textarea 
                    value={formNotes}
                    onChange={e => setFormNotes(e.target.value)}
                    placeholder="Notes, Recovery Codes, Security Qs..."
                    className="flex-1 py-1.5 bg-transparent outline-none text-[17px] placeholder-gray-400 text-black dark:text-white min-h-[100px] resize-none"
                 />
              </div>

              {selectedId && (
                 <button 
                    onClick={handleDelete} 
                    className="w-full bg-white dark:bg-[#1c1c1e] text-red-500 text-[17px] py-3.5 rounded-xl font-medium active:bg-gray-100 dark:active:bg-white/5 transition-colors"
                 >
                    Delete Account
                 </button>
              )}
           </div>
        </div>
      )}
    </div>
  );
};

export default PasswordsApp;
