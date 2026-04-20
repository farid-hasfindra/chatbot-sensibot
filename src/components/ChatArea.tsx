import React, { useRef, useEffect, useState } from 'react';
import { User, Cpu, FileSearch, Zap, HardDrive, Quote } from 'lucide-react';
import { ChatResponse } from '@/lib/api';

export type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  metadata?: ChatResponse;
  model?: string;
};

interface ChatAreaProps {
  messages: Message[];
  isLoading: boolean;
  selectedModel: string;
}

export default function ChatArea({ messages, isLoading, selectedModel }: ChatAreaProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [quotePosition, setQuotePosition] = useState<{ top: number, left: number } | null>(null);
  const [selectedText, setSelectedText] = useState("");

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSelection = () => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || selection.toString().trim() === "") {
      setQuotePosition(null);
      setSelectedText("");
      return;
    }

    // Ensure selection is inside the chat area to avoid triggering from sidebar
    if (containerRef.current && !containerRef.current.contains(selection.anchorNode)) {
      return;
    }

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    
    setQuotePosition({
      top: rect.top - 45, // 45px above the selection
      left: rect.left + (rect.width / 2),
    });
    setSelectedText(selection.toString());
  };

  useEffect(() => {
    document.addEventListener("mouseup", handleSelection);
    document.addEventListener("keyup", handleSelection);
    return () => {
      document.removeEventListener("mouseup", handleSelection);
      document.removeEventListener("keyup", handleSelection);
    };
  }, []);

  const handleQuoteClick = () => {
    window.dispatchEvent(new CustomEvent('insert-quote', { detail: selectedText.trim() }));
    window.getSelection()?.removeAllRanges();
    setQuotePosition(null);
  };

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto px-4 py-8 sm:px-10 h-full scroll-smooth">
      
      {/* Quote Hover Button */}
      {quotePosition && selectedText && (
        <div 
          className="fixed z-50 transform -translate-x-1/2 animate-in fade-in zoom-in-95 duration-150 flex items-center gap-1.5 p-1.5 bg-[#1e2336] rounded-full border border-white/10 shadow-xl shadow-black/50"
          style={{ top: Math.max(10, quotePosition.top - 10), left: quotePosition.left }}
        >
          <button 
            onClick={handleQuoteClick} 
            className="flex items-center gap-1.5 bg-slate-100 hover:bg-white text-slate-900 text-xs px-3.5 py-1.5 rounded-full font-bold transition-all"
            title="Kutip untuk membalas di obrolan ini"
          >
            <Quote size={12} className="fill-slate-900" />
            <span className="mb-[1px]">Kutip</span>
          </button>
          <div className="w-[1px] h-4 bg-white/10 mx-0.5"></div>
          <button 
            onClick={() => {
              window.dispatchEvent(new CustomEvent('create-subchat', { detail: selectedText.trim() }));
              window.getSelection()?.removeAllRanges();
              setQuotePosition(null);
            }} 
            className="flex items-center gap-1.5 bg-[#2a3045] hover:bg-[#343b56] text-white text-xs px-3.5 py-1.5 rounded-full font-bold transition-all border border-indigo-500/20 hover:border-indigo-500/50"
            title="Pecah menjadi obrolan kedalaman cabang (Sub-Chat)"
          >
            <FileSearch size={12} className="text-indigo-400" />
            <span className="mb-[1px]">Dalamkan (Sub-Chat)</span>
          </button>
        </div>
      )}
      {messages.length === 0 ? (
        <div className="h-full flex flex-col items-center justify-center text-center max-w-lg mx-auto opacity-70">
          <div className="w-16 h-16 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center mb-6">
             <Zap size={32} />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2 tracking-wide">Hai! Bagaimana saya bisa membantu Anda hari ini?</h2>
          <p className="text-sm text-slate-400">Silakan tanyakan sesuatu atau unggah dokumen untuk dianalisa.</p>
        </div>
      ) : (
        <div className="max-w-3xl mx-auto space-y-8 pb-10">
          {messages.map((m) => (
            <div key={m.id} className={`flex gap-4 sm:gap-6 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              
              {/* Avatar AI */}
              {m.role === 'assistant' && (
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center shrink-0 mt-1 shadow-md shadow-black/20">
                  <Zap size={18} className="text-blue-400" />
                </div>
              )}
              
              <div className={`flex flex-col gap-2 max-w-[85%] ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div 
                  className={`px-5 py-4 text-[15px] leading-relaxed relative
                    ${m.role === 'user' 
                      ? 'bg-indigo-600 text-white rounded-3xl rounded-tr-md shadow-lg shadow-indigo-500/10' 
                      : 'bg-[#1e2336] text-slate-200 rounded-3xl rounded-tl-md border border-white/5 shadow-lg shadow-black/10'
                    }
                  `}
                >
                  <p className="whitespace-pre-wrap font-sans">{m.content}</p>
                </div>

                {/* Model tag & Metadata info below AI bubble */}
                {m.role === 'assistant' && (
                  <div className="flex flex-wrap items-center gap-2 mt-1 px-4">
                    {m.model && (
                      <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white/5 border border-white/10 rounded-md text-[11px] text-slate-400 font-mono tracking-tight">
                        <HardDrive size={11} className="text-slate-500" /> 
                        {m.model}
                      </div>
                    )}
                    
                    {m.metadata?.rag_enabled && (
                      <div className="flex items-center gap-1.5 px-2.5 py-1 bg-green-500/10 border border-green-500/20 rounded-md text-[11px] text-green-400 font-mono tracking-tight">
                        <FileSearch size={11} /> 
                        RAG Enabled
                      </div>
                    )}

                    {m.metadata?.usage && (
                      <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white/5 border border-white/10 rounded-md text-[11px] text-slate-400 font-mono tracking-tight" title={`${m.metadata.usage.total_tokens} tokens used`}>
                        <Cpu size={11} className="text-slate-500" /> 
                        {m.metadata.usage.total_tokens} tkns
                      </div>
                    )}
                  </div>
                )}
              </div>

            </div>
          ))}
          
          {/* Loading Indicator */}
          {isLoading && (
            <div className="flex gap-4 sm:gap-6 justify-start">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center shrink-0 mt-1 shadow-md">
                 <Zap size={18} className="text-blue-400" />
              </div>
              <div className="bg-[#1e2336] text-slate-200 border border-white/5 px-6 py-5 rounded-3xl rounded-tl-md flex items-center gap-2 w-24">
                <span className="w-2 h-2 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: '0ms' }}></span>
                <span className="w-2 h-2 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: '150ms' }}></span>
                <span className="w-2 h-2 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: '300ms' }}></span>
              </div>
            </div>
          )}
        </div>
      )}
      
      <div ref={bottomRef} className="h-4" />
    </div>
  );
}
