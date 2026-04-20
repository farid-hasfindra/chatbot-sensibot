import React, { useRef, useEffect, useState, memo } from 'react';
import { User, Cpu, FileSearch, HardDrive, Quote, Check, Copy } from 'lucide-react';
import Image from 'next/image';
import { ChatResponse } from '@/lib/api';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';

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
  isCompact?: boolean;
}

// Memoized MessageList to prevent re-renders (and losing text selection) when the floating bubble appears/moves
const MessageList = React.memo(({ messages, isLoading, isCompact }: { messages: Message[], isLoading: boolean, isCompact: boolean }) => {
  return (
    <div className={`${isCompact ? 'w-full' : 'max-w-3xl mx-auto'} space-y-8 pb-10`}>
      {messages.map((m) => (
        <div key={m.id} className={`flex gap-4 sm:gap-6 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
          
          {/* Avatar AI */}
          {m.role === 'assistant' && (
            <div className="w-9 h-9 sm:w-16 sm:h-16 flex items-center justify-center shrink-0 mt-1 overflow-hidden">
              <Image src="/profile-sensibot.png" alt="AI" width={64} height={64} className="w-9 h-9 sm:w-16 sm:h-16" style={{ objectFit: 'contain' }} />
            </div>
          )}
          
          <div className={`flex flex-col gap-2 max-w-[85%] ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
            <div 
              data-can-quote={m.role === 'assistant' ? "true" : "false"}
              className={`px-5 py-4 text-[15px] leading-relaxed relative
                ${m.role === 'user' 
                  ? 'bg-indigo-600 text-white rounded-3xl rounded-tr-md shadow-lg shadow-indigo-500/10' 
                  : 'bg-[#1e2336] text-slate-200 rounded-3xl rounded-tl-md border border-white/5 shadow-lg shadow-black/10'
                }
              `}
            >
              <div className="markdown-content prose prose-invert max-w-none prose-p:leading-relaxed prose-pre:p-0 prose-pre:bg-transparent">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    p: ({children}) => <p className="mb-4 last:mb-0 whitespace-pre-wrap">{children}</p>,
                    strong: ({children}) => <strong className="font-bold text-white">{children}</strong>,
                    ul: ({children}) => <ul className="list-disc ml-4 mb-4 space-y-1">{children}</ul>,
                    ol: ({children}) => <ol className="list-decimal ml-4 mb-4 space-y-1">{children}</ol>,
                    li: ({children}) => <li className="marker:text-indigo-400">{children}</li>,
                    code({node, inline, className, children, ...props}: any) {
                      const match = /language-(\w+)/.exec(className || '');
                      return !inline && match ? (
                        <div className="relative group my-4 rounded-xl overflow-hidden border border-white/10 bg-black/30">
                          <div className="flex items-center justify-between px-4 py-2 bg-white/5 border-b border-white/5">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{match[1]}</span>
                            <button 
                              onClick={() => navigator.clipboard.writeText(String(children).replace(/\n$/, ''))}
                              className="text-slate-500 hover:text-white transition-colors"
                              title="Salin Kode"
                            >
                              <Copy size={14} />
                            </button>
                          </div>
                          <SyntaxHighlighter
                            {...props}
                            style={vscDarkPlus}
                            language={match[1]}
                            PreTag="div"
                            customStyle={{
                              margin: 0,
                              padding: '1rem',
                              background: 'transparent',
                              fontSize: '13px',
                              lineHeight: '1.6'
                            }}
                          >
                            {String(children).replace(/\n$/, '')}
                          </SyntaxHighlighter>
                        </div>
                      ) : (
                        <code className="bg-white/10 rounded px-1.5 py-0.5 text-indigo-300 font-mono text-sm" {...props}>
                          {children}
                        </code>
                      );
                    }
                  }}
                >
                  {m.content}
                </ReactMarkdown>
              </div>
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
          <div className="w-9 h-9 sm:w-16 sm:h-16 flex items-center justify-center shrink-0 mt-1 overflow-hidden">
             <Image src="/profile-sensibot.png" alt="AI" width={64} height={64} className="w-9 h-9 sm:w-16 sm:h-16" style={{ objectFit: 'contain' }} />
          </div>
          <div className="bg-[#1e2336] text-slate-200 border border-white/5 px-6 py-5 rounded-3xl rounded-tl-md flex items-center gap-2 w-24">
            <span className="w-2 h-2 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: '0ms' }}></span>
            <span className="w-2 h-2 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: '150ms' }}></span>
            <span className="w-2 h-2 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: '300ms' }}></span>
          </div>
        </div>
      )}
    </div>
  );
});

export default function ChatArea({ messages, isLoading, selectedModel, isCompact = false }: ChatAreaProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);

  const [quotePosition, setQuotePosition] = useState<{ top: number, left: number } | null>(null);
  const [selectedText, setSelectedText] = useState("");

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSelection = (e?: any) => {
    // If the click is inside the bubble itself, don't hide it!
    if (e && bubbleRef.current && bubbleRef.current.contains(e.target as Node)) {
      return;
    }

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

    // NEW: Ensure selection is inside an assistant message bubble (data-can-quote="true")
    let targetNode = selection.anchorNode as Node | null;
    let allowed = false;
    while (targetNode && targetNode !== containerRef.current) {
      if (targetNode instanceof HTMLElement && targetNode.getAttribute('data-can-quote') === 'true') {
        allowed = true;
        break;
      }
      targetNode = targetNode.parentNode;
    }

    if (!allowed) {
      setQuotePosition(null);
      setSelectedText("");
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
    if (typeof window !== 'undefined') {
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('insert-quote', { 
          detail: { 
            text: selectedText.trim(), 
            target: isCompact ? 'subchat' : 'main' 
          } 
        }));
      }, 0);
    }
    window.getSelection()?.removeAllRanges();
    setQuotePosition(null);
  };

  return (
    <div ref={containerRef} className={`flex-1 overflow-y-auto h-full scroll-smooth ${isCompact ? 'px-3 py-6' : 'px-3 py-6 sm:px-10'}`}>
      
      {/* Quote Hover Button */}
      {quotePosition && selectedText && (
        <div 
          ref={bubbleRef}
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
              if (typeof window !== 'undefined') {
                setTimeout(() => {
                  window.dispatchEvent(new CustomEvent('create-subchat', { detail: selectedText.trim() }));
                }, 0);
              }
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
        <div className="h-full flex flex-col items-center justify-center text-center max-w-lg mx-auto px-4">
          <div className="w-full flex items-center justify-center mb-0 sm:mb-0 overflow-hidden animate-in fade-in zoom-in-95 duration-1000">
             <Image src="/logo.png" alt="SensiBOT" width={200} height={60} className="sm:w-[380px] sm:h-[120px]" style={{ objectFit: 'contain' }} priority />
          </div>
          <h2 className="text-xl sm:text-3xl font-extrabold text-white mb-2 tracking-tight -mt-4 sm:-mt-10 mx-auto max-w-[280px] sm:max-w-none">Hai! Bagaimana saya bisa membantu Anda hari ini?</h2>
          <p className="text-sm text-slate-400">Silakan tanyakan sesuatu atau unggah dokumen untuk dianalisa.</p>
        </div>
      ) : (
        <MessageList messages={messages} isLoading={isLoading} isCompact={isCompact} />
      )}
      
      <div ref={bottomRef} className="h-4" />
    </div>
  );
}
