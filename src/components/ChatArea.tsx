import React, { useRef, useEffect } from 'react';
import { User, Cpu, FileSearch, Zap, HardDrive } from 'lucide-react';
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

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  return (
    <div className="flex-1 overflow-y-auto px-4 py-8 sm:px-10 h-full scroll-smooth">
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
