
import React, { useState, useRef, useCallback } from 'react';
import { 
  RefreshCcw, 
  Upload, 
  File, 
  X, 
  ArrowRight, 
  Download, 
  Image as ImageIcon,
  FileText,
  AlertCircle,
  Loader2,
  CheckCircle2
} from 'lucide-react';

interface QueuedFile {
  id: string;
  file: File;
  status: 'idle' | 'converting' | 'done' | 'error';
  targetFormat: string;
  resultUrl?: string;
  errorMsg?: string;
}

const SUPPORTED_IMAGES = ['image/png', 'image/jpeg', 'image/webp'];
const IMAGE_TARGETS = ['PNG', 'JPEG', 'WEBP'];
const TEXT_TARGETS = ['JSON', 'TXT', 'BASE64'];

const ConvertAI: React.FC = () => {
  const [queue, setQueue] = useState<QueuedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const generateId = () => Math.random().toString(36).substr(2, 9);

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const newFiles: QueuedFile[] = Array.from(files).map(f => ({
      id: generateId(),
      file: f,
      status: 'idle',
      targetFormat: f.type.startsWith('image/') ? 'PNG' : 'BASE64'
    }));
    setQueue(prev => [...prev, ...newFiles]);
  };

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  }, []);

  const removeFile = (id: string) => {
    setQueue(prev => {
      const file = prev.find(f => f.id === id);
      if (file?.resultUrl) URL.revokeObjectURL(file.resultUrl);
      return prev.filter(f => f.id !== id);
    });
  };

  const convertImage = async (file: File, format: string): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            reject(new Error("Canvas context failed"));
            return;
        }
        ctx.drawImage(img, 0, 0);
        
        const mimeType = `image/${format.toLowerCase()}`;
        canvas.toBlob(blob => {
          if (blob) resolve(blob);
          else reject(new Error("Conversion failed"));
        }, mimeType, 0.9);
      };
      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = URL.createObjectURL(file);
    });
  };

  const convertText = async (file: File, format: string): Promise<Blob> => {
    const text = await file.text();
    let result = text;

    if (format === 'BASE64') {
        // Handle binary files for base64 too
        const buffer = await file.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        result = btoa(binary);
    } else if (format === 'JSON') {
       // Attempt to wrap plain text in JSON object
       result = JSON.stringify({ content: text, originalName: file.name, timestamp: Date.now() }, null, 2);
    }
    
    return new Blob([result], { type: 'text/plain' });
  };

  const processConversion = async (item: QueuedFile) => {
    setQueue(prev => prev.map(f => f.id === item.id ? { ...f, status: 'converting' } : f));

    try {
      let blob: Blob;
      
      if (item.file.type.startsWith('image/')) {
        blob = await convertImage(item.file, item.targetFormat);
      } else {
        blob = await convertText(item.file, item.targetFormat);
      }

      const url = URL.createObjectURL(blob);
      setQueue(prev => prev.map(f => f.id === item.id ? { ...f, status: 'done', resultUrl: url } : f));
    } catch (err) {
      setQueue(prev => prev.map(f => f.id === item.id ? { ...f, status: 'error', errorMsg: 'Format unsupported in browser.' } : f));
    }
  };

  return (
    <div className="h-full bg-[#0a0a0a] text-white flex flex-col font-sans overflow-hidden">
      {/* Header */}
      <div className="h-16 border-b border-white/5 px-6 flex items-center gap-3 bg-black/40 backdrop-blur-md shrink-0 z-10">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-lg shadow-orange-500/20">
          <RefreshCcw size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-lg font-bold leading-none">ConvertAI</h1>
          <p className="text-[10px] text-gray-500 font-medium uppercase tracking-widest mt-1">Local Processing Only</p>
        </div>
      </div>

      <div className="flex-1 flex flex-col p-6 max-w-4xl mx-auto w-full overflow-hidden">
        {/* Drop Zone */}
        <div 
          className={`
            relative shrink-0 h-48 rounded-[2rem] border-2 border-dashed transition-all flex flex-col items-center justify-center gap-4 group cursor-pointer
            ${isDragging ? 'border-orange-500 bg-orange-500/10 scale-[1.02]' : 'border-white/10 hover:border-white/20 hover:bg-white/5'}
          `}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            multiple 
            onChange={(e) => handleFiles(e.target.files)} 
          />
          <div className="w-16 h-16 rounded-full bg-[#1c1c1e] flex items-center justify-center shadow-xl border border-white/5 group-hover:scale-110 transition-transform">
            <Upload size={24} className="text-orange-500" />
          </div>
          <div className="text-center">
            <p className="font-bold text-lg">Drop files here to convert</p>
            <p className="text-sm text-gray-500 mt-1">Images, Text, JSON, and more</p>
          </div>
        </div>

        {/* Queue List */}
        <div className="flex-1 overflow-y-auto mt-8 custom-scrollbar space-y-3">
          {queue.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-600 opacity-50 pb-20">
                <FileText size={48} className="mb-4" />
                <p>No files in queue</p>
            </div>
          ) : (
            queue.map(item => (
              <div key={item.id} className="bg-[#1c1c1e] border border-white/5 rounded-2xl p-4 flex items-center gap-4 animate-fade-in group hover:bg-[#252527] transition-colors">
                {/* File Icon */}
                <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
                  {item.file.type.startsWith('image/') ? <ImageIcon size={20} className="text-blue-400" /> : <File size={20} className="text-gray-400" />}
                </div>

                {/* File Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-bold truncate">{item.file.name}</p>
                  <p className="text-xs text-gray-500">{(item.file.size / 1024).toFixed(1)} KB • {item.file.type || 'Unknown Type'}</p>
                </div>

                {/* Controls Area */}
                <div className="flex items-center gap-3">
                  {item.status === 'idle' && (
                    <>
                      <div className="flex items-center gap-2 bg-black/30 rounded-lg p-1 border border-white/5">
                        <select 
                          value={item.targetFormat}
                          onChange={(e) => setQueue(prev => prev.map(f => f.id === item.id ? { ...f, targetFormat: e.target.value } : f))}
                          className="bg-transparent text-xs font-bold px-2 py-1 outline-none appearance-none cursor-pointer hover:text-orange-400"
                        >
                          {(item.file.type.startsWith('image/') ? IMAGE_TARGETS : TEXT_TARGETS).map(fmt => (
                            <option key={fmt} value={fmt} className="bg-[#1c1c1e]">{fmt}</option>
                          ))}
                        </select>
                      </div>
                      <button 
                        onClick={() => processConversion(item)}
                        className="px-4 py-2 bg-white text-black text-xs font-bold rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-1"
                      >
                        Convert
                      </button>
                    </>
                  )}

                  {item.status === 'converting' && (
                    <div className="px-4 flex items-center gap-2 text-xs font-bold text-orange-400">
                        <Loader2 size={14} className="animate-spin" /> Processing...
                    </div>
                  )}

                  {item.status === 'done' && item.resultUrl && (
                    <a 
                      href={item.resultUrl} 
                      download={`converted-${item.file.name.split('.')[0]}.${item.targetFormat.toLowerCase()}`}
                      className="px-4 py-2 bg-green-500/10 text-green-500 border border-green-500/20 text-xs font-bold rounded-lg hover:bg-green-500/20 transition-colors flex items-center gap-1.5"
                    >
                      <Download size={14} /> Save {item.targetFormat}
                    </a>
                  )}

                  {item.status === 'error' && (
                    <div className="px-2 text-xs text-red-500 font-medium flex items-center gap-1">
                        <AlertCircle size={14} /> {item.errorMsg || 'Failed'}
                    </div>
                  )}

                  <button 
                    onClick={() => removeFile(item.id)}
                    className="p-2 text-gray-600 hover:text-red-500 transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default ConvertAI;
