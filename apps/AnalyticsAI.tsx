
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  BarChart3, 
  Upload, 
  FileText, 
  Plus, 
  Trash2, 
  Edit2, 
  Save, 
  X, 
  TrendingUp, 
  DollarSign, 
  Music, 
  Disc,
  Filter,
  ChevronDown,
  Loader2,
  Table as TableIcon
} from 'lucide-react';
import { storage, STORES } from '../services/storageService';
import { RevenueRecord } from '../services/geminiService';

const AnalyticsAI: React.FC = () => {
  const [view, setView] = useState<'dashboard' | 'data'>('dashboard');
  const [data, setData] = useState<RevenueRecord[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState<string>('All Labels');
  const [isReady, setIsReady] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const workerRef = useRef<Worker | null>(null);

  // Edit Mode State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<RevenueRecord>>({});

  const initWorker = () => {
    try {
      const worker = new Worker(new URL('./analyticsRevenueWorker.ts', import.meta.url), { type: 'module' });
      workerRef.current = worker;
      worker.onmessage = (event) => {
        const { records, error } = event.data || {};
        if (error) {
          console.error(error);
          alert("Failed to parse file. Please ensure it's a valid music revenue statement.");
        } else if (records) {
          const newRecords = records.map((r: Omit<RevenueRecord, 'id'>) => ({
            ...r,
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9)
          }));
          setData(prev => [...prev, ...newRecords]);
          alert(`Successfully parsed ${newRecords.length} records.`);
        }
        setIsProcessing(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      };
      worker.onerror = (err) => {
        console.error(err);
        alert("Failed to parse file. Please ensure it's a valid music revenue statement.");
        setIsProcessing(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
        workerRef.current = null;
      };
      return worker;
    } catch (error) {
      console.error('Failed to initialize analytics worker', error);
      workerRef.current = null;
      return null;
    }
  };

  useEffect(() => {
    const init = async () => {
      try {
        const savedData = await storage.get<RevenueRecord[]>(STORES.ANALYTICS, 'revenue_records');
        if (savedData) setData(savedData);
      } catch (e) {
        console.error("Failed to load analytics data", e);
      } finally {
        setIsReady(true);
      }
    };
    init();
  }, []);

  useEffect(() => {
    // Web Worker keeps CSV/PDF parsing off the main thread to preserve UI responsiveness.
    const worker = initWorker();
    return () => {
      worker?.terminate();
      workerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!isReady) return;
    storage.set(STORES.ANALYTICS, 'revenue_records', data).catch(console.error);
  }, [data, isReady]);

  const uniqueLabels = useMemo(() => {
    const labels = new Set(data.map(d => d.label).filter(Boolean));
    return ['All Labels', ...Array.from(labels)];
  }, [data]);

  const filteredData = useMemo(() => {
    if (selectedLabel === 'All Labels') return data;
    return data.filter(d => d.label === selectedLabel);
  }, [data, selectedLabel]);

  const stats = useMemo(() => {
    const totalRevenue = filteredData.reduce((sum, item) => sum + (item.revenueAmount || 0), 0);
    
    // Top Track
    const trackMap = new Map<string, number>();
    filteredData.forEach(item => {
      const current = trackMap.get(item.trackTitle) || 0;
      trackMap.set(item.trackTitle, current + item.revenueAmount);
    });
    let topTrackName = 'N/A';
    let topTrackRev = 0;
    for (const [name, rev] of trackMap.entries()) {
      if (rev > topTrackRev) {
        topTrackRev = rev;
        topTrackName = name;
      }
    }

    // Platform Breakdown
    const platformMap = new Map<string, number>();
    filteredData.forEach(item => {
      const current = platformMap.get(item.platform) || 0;
      platformMap.set(item.platform, current + item.revenueAmount);
    });
    const platforms = Array.from(platformMap.entries())
      .map(([name, val]) => ({ name, val }))
      .sort((a, b) => b.val - a.val);

    return { totalRevenue, topTrackName, topTrackRev, platforms };
  }, [filteredData]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setIsProcessing(true);
    const worker = workerRef.current ?? initWorker();
    if (!worker) {
      setIsProcessing(false);
      alert("Failed to parse file. Please ensure it's a valid music revenue statement.");
      return;
    }
    worker.postMessage({ file });
  };

  const handleAddRow = () => {
    const newRow: RevenueRecord = {
      id: Date.now().toString(),
      date: new Date().toISOString().split('T')[0],
      label: 'New Label',
      trackTitle: 'New Track',
      artist: 'Artist Name',
      platform: 'Platform',
      revenueAmount: 0,
      currency: 'USD'
    };
    setData([newRow, ...data]);
    setEditingId(newRow.id);
    setEditForm(newRow);
  };

  const startEdit = (record: RevenueRecord) => {
    setEditingId(record.id);
    setEditForm(record);
  };

  const saveEdit = () => {
    if (!editingId) return;
    setData(prev => prev.map(r => r.id === editingId ? { ...r, ...editForm } as RevenueRecord : r));
    setEditingId(null);
  };

  const deleteRow = (id: string) => {
    if (confirm("Delete this record?")) {
      setData(prev => prev.filter(r => r.id !== id));
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  if (!isReady) return (
    <div className="h-full bg-black flex items-center justify-center">
      <Loader2 className="animate-spin text-white/20" size={32} />
    </div>
  );

  return (
    <div className="h-full bg-[#f2f2f7] dark:bg-[#000000] text-black dark:text-white font-sans flex flex-col overflow-hidden">
      {/* Header */}
      <div className="h-16 px-6 border-b border-gray-200 dark:border-white/10 flex items-center justify-between bg-white/50 dark:bg-white/5 backdrop-blur-xl shrink-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-lg shadow-green-500/20">
            <BarChart3 size={18} className="text-white" />
          </div>
          <span className="text-lg font-bold tracking-tight">AnalyticsAI</span>
        </div>

        <div className="flex items-center gap-2">
           {view === 'dashboard' && (
             <div className="relative group">
                <select 
                  value={selectedLabel} 
                  onChange={(e) => setSelectedLabel(e.target.value)}
                  className="appearance-none bg-gray-200 dark:bg-white/10 text-sm font-bold pl-4 pr-10 py-2 rounded-lg outline-none cursor-pointer hover:bg-gray-300 dark:hover:bg-white/20 transition-colors"
                >
                  {uniqueLabels.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-50" />
             </div>
           )}
           <button 
             onClick={() => setView(view === 'dashboard' ? 'data' : 'dashboard')}
             className={`p-2 rounded-lg transition-colors ${view === 'data' ? 'bg-emerald-500 text-white' : 'bg-gray-200 dark:bg-white/10 text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white'}`}
           >
             {view === 'dashboard' ? <TableIcon size={18} /> : <BarChart3 size={18} />}
           </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
        {view === 'dashboard' ? (
          <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
             {/* Key Metrics */}
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-[#1c1c1e] p-6 rounded-[2rem] border border-gray-100 dark:border-white/5 shadow-sm">
                   <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 bg-emerald-500/10 rounded-full text-emerald-500"><DollarSign size={20} /></div>
                      <span className="text-xs font-bold uppercase text-gray-400 tracking-wider">Total Revenue</span>
                   </div>
                   <p className="text-3xl font-black tracking-tight">{formatCurrency(stats.totalRevenue)}</p>
                </div>
                
                <div className="bg-white dark:bg-[#1c1c1e] p-6 rounded-[2rem] border border-gray-100 dark:border-white/5 shadow-sm">
                   <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 bg-blue-500/10 rounded-full text-blue-500"><Music size={20} /></div>
                      <span className="text-xs font-bold uppercase text-gray-400 tracking-wider">Top Performing Track</span>
                   </div>
                   <p className="text-lg font-bold truncate">{stats.topTrackName}</p>
                   <p className="text-sm text-gray-500">{formatCurrency(stats.topTrackRev)} generated</p>
                </div>

                <div className="bg-white dark:bg-[#1c1c1e] p-6 rounded-[2rem] border border-gray-100 dark:border-white/5 shadow-sm">
                   <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 bg-purple-500/10 rounded-full text-purple-500"><TrendingUp size={20} /></div>
                      <span className="text-xs font-bold uppercase text-gray-400 tracking-wider">Top Platform</span>
                   </div>
                   <p className="text-lg font-bold truncate">{stats.platforms[0]?.name || 'N/A'}</p>
                   <p className="text-sm text-gray-500">{stats.platforms.length > 0 ? `${((stats.platforms[0].val / stats.totalRevenue) * 100).toFixed(1)}% of total` : 'No Data'}</p>
                </div>
             </div>

             {/* Visualization Section */}
             <div className="grid md:grid-cols-3 gap-6">
                {/* Platform Distribution Bar */}
                <div className="md:col-span-2 bg-white dark:bg-[#1c1c1e] p-8 rounded-[2.5rem] border border-gray-100 dark:border-white/5 shadow-sm">
                   <h3 className="text-lg font-bold mb-6">Platform Distribution</h3>
                   <div className="space-y-4">
                      {stats.platforms.map((p, i) => (
                         <div key={p.name} className="space-y-2">
                            <div className="flex justify-between text-sm font-medium">
                               <span>{p.name}</span>
                               <span>{formatCurrency(p.val)}</span>
                            </div>
                            <div className="h-2 w-full bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden">
                               <div 
                                  className="h-full rounded-full transition-all duration-1000" 
                                  style={{ 
                                     width: `${(p.val / stats.totalRevenue) * 100}%`,
                                     backgroundColor: i === 0 ? '#10b981' : i === 1 ? '#3b82f6' : i === 2 ? '#a855f7' : '#6b7280'
                                  }} 
                               />
                            </div>
                         </div>
                      ))}
                      {stats.platforms.length === 0 && <p className="text-gray-500 text-center py-4">No data available.</p>}
                   </div>
                </div>
                
                {/* Recent Activity List */}
                <div className="bg-white dark:bg-[#1c1c1e] p-8 rounded-[2.5rem] border border-gray-100 dark:border-white/5 shadow-sm flex flex-col">
                   <h3 className="text-lg font-bold mb-6">Recent Records</h3>
                   <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar max-h-[300px]">
                      {filteredData.slice(0, 10).map(item => (
                         <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-white/5 rounded-xl">
                            <div className="flex items-center gap-3 overflow-hidden">
                               <div className="w-8 h-8 rounded-lg bg-gray-200 dark:bg-white/10 flex items-center justify-center shrink-0">
                                  <Disc size={14} className="text-gray-500" />
                               </div>
                               <div className="min-w-0">
                                  <p className="text-sm font-bold truncate">{item.trackTitle}</p>
                                  <p className="text-[10px] text-gray-500 truncate">{item.platform}</p>
                               </div>
                            </div>
                            <span className="text-xs font-bold text-emerald-500 ml-2">+{formatCurrency(item.revenueAmount)}</span>
                         </div>
                      ))}
                      {filteredData.length === 0 && <p className="text-gray-500 text-center py-4">No records found.</p>}
                   </div>
                </div>
             </div>
          </div>
        ) : (
          // DATA VIEW
          <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
             <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                   <h2 className="text-3xl font-black">Data Sources</h2>
                   <p className="text-gray-500 text-sm">Manage revenue records manually or import from statements.</p>
                </div>
                <div className="flex gap-2">
                   <button 
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isProcessing}
                      className="bg-white dark:bg-[#1c1c1e] border border-gray-200 dark:border-white/10 text-black dark:text-white px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                   >
                      {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                      Import PDF/CSV
                   </button>
                   <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleFileUpload} 
                      className="hidden" 
                      accept=".csv,.pdf,image/*" 
                   />
                   <button 
                      onClick={handleAddRow}
                      className="bg-emerald-500 text-white px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-emerald-600 transition-colors"
                   >
                      <Plus size={16} /> Add Row
                   </button>
                </div>
             </div>

             <div className="bg-white dark:bg-[#1c1c1e] rounded-[1.5rem] border border-gray-100 dark:border-white/5 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                   <table className="w-full text-left border-collapse">
                      <thead>
                         <tr className="bg-gray-50 dark:bg-white/5 border-b border-gray-100 dark:border-white/5 text-xs font-bold uppercase text-gray-500 tracking-wider">
                            <th className="p-4">Date</th>
                            <th className="p-4">Label</th>
                            <th className="p-4">Track</th>
                            <th className="p-4">Platform</th>
                            <th className="p-4 text-right">Revenue</th>
                            <th className="p-4 text-center">Actions</th>
                         </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-white/5 text-sm">
                         {data.map(item => (
                            <tr key={item.id} className="group hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                               {editingId === item.id ? (
                                  <>
                                     <td className="p-2"><input type="date" value={editForm.date} onChange={e => setEditForm({...editForm, date: e.target.value})} className="w-full bg-transparent border border-blue-500 rounded px-2 py-1 outline-none" /></td>
                                     <td className="p-2"><input type="text" value={editForm.label} onChange={e => setEditForm({...editForm, label: e.target.value})} className="w-full bg-transparent border border-blue-500 rounded px-2 py-1 outline-none" /></td>
                                     <td className="p-2"><input type="text" value={editForm.trackTitle} onChange={e => setEditForm({...editForm, trackTitle: e.target.value})} className="w-full bg-transparent border border-blue-500 rounded px-2 py-1 outline-none" /></td>
                                     <td className="p-2"><input type="text" value={editForm.platform} onChange={e => setEditForm({...editForm, platform: e.target.value})} className="w-full bg-transparent border border-blue-500 rounded px-2 py-1 outline-none" /></td>
                                     <td className="p-2"><input type="number" value={editForm.revenueAmount} onChange={e => setEditForm({...editForm, revenueAmount: parseFloat(e.target.value)})} className="w-full bg-transparent border border-blue-500 rounded px-2 py-1 outline-none text-right" /></td>
                                     <td className="p-2 flex justify-center gap-2">
                                        <button onClick={saveEdit} className="p-1 text-green-500 hover:bg-green-500/10 rounded"><Save size={16} /></button>
                                        <button onClick={() => setEditingId(null)} className="p-1 text-gray-400 hover:bg-gray-500/10 rounded"><X size={16} /></button>
                                     </td>
                                  </>
                               ) : (
                                  <>
                                     <td className="p-4 font-medium text-gray-600 dark:text-gray-300">{item.date}</td>
                                     <td className="p-4 font-bold">{item.label}</td>
                                     <td className="p-4">{item.trackTitle}</td>
                                     <td className="p-4"><span className="bg-gray-100 dark:bg-white/10 px-2 py-1 rounded text-xs font-bold">{item.platform}</span></td>
                                     <td className="p-4 text-right font-mono">{formatCurrency(item.revenueAmount)}</td>
                                     <td className="p-4 flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => startEdit(item)} className="p-1.5 text-blue-400 hover:bg-blue-400/10 rounded-lg"><Edit2 size={14} /></button>
                                        <button onClick={() => deleteRow(item.id)} className="p-1.5 text-red-400 hover:bg-red-400/10 rounded-lg"><Trash2 size={14} /></button>
                                     </td>
                                  </>
                               )}
                            </tr>
                         ))}
                         {data.length === 0 && (
                            <tr>
                               <td colSpan={6} className="p-8 text-center text-gray-500">No data found. Upload a file or add a row.</td>
                            </tr>
                         )}
                      </tbody>
                   </table>
                </div>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AnalyticsAI;
