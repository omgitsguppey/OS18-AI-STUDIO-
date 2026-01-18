
import React, { useState, useRef, useEffect } from 'react';
import { Send, User, Sparkles, Sidebar, Plus, MessageSquare, Trash2, Brain, Menu, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { streamGeminiChat } from '../services/geminiService';
import { storage, STORES } from '../services/storageService';

interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  updatedAt: number;
}

const GeminiApp: React.FC = () => {
  const [chats, setChats] = useState<ChatSession[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [longTermMemory, setLongTermMemory] = useState<string>('');
  const [showSidebar, setShowSidebar] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 1. Initial Load from IndexedDB
  useEffect(() => {
    const init = async () => {
      try {
        const savedMemory = await storage.get<string>(STORES.CHAT, 'long_term_memory');
        const savedChats = await storage.get<ChatSession[]>(STORES.CHAT, 'chat_history');
        if (savedMemory) setLongTermMemory(savedMemory);
        if (savedChats) {
          setChats(savedChats);
          if (savedChats.length > 0) setActiveChatId(savedChats[0].id);
        } else {
          createNewChat();
        }
      } catch (e) {
        console.error("Failed to load chats from IndexedDB", e);
      } finally {
        setIsReady(true);
      }
    };

    if (window.innerWidth < 768) {
      setIsMobile(true);
      setShowSidebar(false);
    }
    init();
  }, []);

  // 2. Persist to IndexedDB
  useEffect(() => {
    if (!isReady) return;
    storage.set(STORES.CHAT, 'chat_history', chats).catch(console.error);
    storage.set(STORES.CHAT, 'long_term_memory', longTermMemory).catch(console.error);
  }, [chats, longTermMemory, isReady]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chats, streamingText]);

  const createNewChat = () => {
    const newChat: ChatSession = {
      id: Date.now().toString(),
      title: 'New Conversation',
      messages: [],
      updatedAt: Date.now(),
    };
    setChats(prev => [newChat, ...prev]);
    setActiveChatId(newChat.id);
    if (isMobile) setShowSidebar(false);
  };

  const deleteChat = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setChats(prev => {
      const filtered = prev.filter(c => c.id !== id);
      if (activeChatId === id) setActiveChatId(filtered[0]?.id || null);
      return filtered;
    });
  };

  const activeChat = chats.find(c => c.id === activeChatId);

  const handleSend = async () => {
    if (!input.trim() || isLoading || !activeChatId) return;
    const currentChatId = activeChatId;
    const userText = input;
    const userMsg: Message = { id: Date.now().toString(), role: 'user', text: userText, timestamp: Date.now() };
    
    setChats(prev => prev.map(c => 
      c.id === currentChatId ? { ...c, messages: [...c.messages, userMsg], updatedAt: Date.now() } : c
    ));
    setInput('');
    setIsLoading(true);

    try {
      let fullResponse = "";
      const history = (activeChat?.messages || []).map(m => ({ role: m.role, content: m.text }));
      history.push({ role: 'user', content: userText });
      
      const stream = streamGeminiChat(userText, history, longTermMemory);
      for await (const chunk of stream) {
        fullResponse += chunk;
        setStreamingText(fullResponse);
      }
      
      const modelMsg: Message = { id: Date.now().toString(), role: 'model', text: fullResponse, timestamp: Date.now() };
      setChats(prev => prev.map(c => c.id === currentChatId ? { ...c, messages: [...c.messages, modelMsg] } : c));
    } finally {
      setIsLoading(false);
      setStreamingText('');
    }
  };

  if (!isReady) return (
    <div className="h-full bg-black flex items-center justify-center">
      <Loader2 className="animate-spin text-white/20" size={32} />
    </div>
  );

  return (
    <div className="flex h-full bg-[#1c1c1e] text-white overflow-hidden font-sans relative">
      <div className={`bg-[#252525]/95 border-r border-white/10 flex flex-col transition-all duration-300 ${showSidebar ? 'w-64' : 'w-0 opacity-0 overflow-hidden'}`}>
        <div className="p-4 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2 text-indigo-400"><Brain size={18} /> <span className="font-bold">Chat DB</span></div>
          <button onClick={createNewChat} className="p-1 hover:bg-white/10 rounded"><Plus size={18} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {chats.map(chat => (
            <div key={chat.id} onClick={() => setActiveChatId(chat.id)} className={`p-3 rounded-lg flex items-center justify-between cursor-pointer ${activeChatId === chat.id ? 'bg-[#3a3a3c]' : 'hover:bg-white/5'}`}>
              <div className="flex-1 overflow-hidden">
                <h3 className="text-sm font-medium truncate">{chat.title}</h3>
              </div>
              <button onClick={(e) => deleteChat(e, chat.id)} className="text-gray-600 hover:text-red-400"><Trash2 size={14} /></button>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col h-full bg-[#1c1c1e]">
        <div className="h-14 border-b border-white/5 flex items-center px-4 gap-4">
          <button onClick={() => setShowSidebar(!showSidebar)}><Menu size={18} /></button>
          <span className="font-semibold truncate">{activeChat?.title || 'Gemini'}</span>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {activeChat?.messages.map(msg => (
            <div key={msg.id} className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-2xl px-5 py-3 text-sm ${msg.role === 'user' ? 'bg-[#0A84FF]' : 'bg-[#3a3a3c] border border-white/5'}`}>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.text}</ReactMarkdown>
              </div>
            </div>
          ))}
          {streamingText && (
            <div className="flex gap-4 justify-start">
              <div className="max-w-[85%] bg-[#3a3a3c] rounded-2xl px-5 py-3 text-sm">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{streamingText}</ReactMarkdown>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        <div className="p-4 border-t border-white/5">
          <div className="max-w-4xl mx-auto relative">
            <input 
              type="text" value={input} onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Message Gemini..."
              className="w-full bg-[#2c2c2e] text-white rounded-full pl-5 pr-12 py-3.5 outline-none"
            />
            <button onClick={handleSend} disabled={!input.trim() || isLoading} className="absolute right-2 top-1.5 bottom-1.5 w-10 flex items-center justify-center text-blue-500"><Send size={18} /></button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GeminiApp;
