"use client";

import { useState, useEffect, useRef } from "react";
import { v4 as uuidv4 } from "uuid";
import Sidebar, { ChatHistoryItem } from "@/components/Sidebar";
import ChatArea, { Message } from "@/components/ChatArea";
import ChatInput from "@/components/ChatInput";
import PersonaSelector from "@/components/PersonaSelector";
import SubChatPanel from "@/components/SubChatPanel";
import { api } from "@/lib/api";
import { ChevronDown, Menu, Network, Edit2, Check, Loader2 } from "lucide-react";
import { useSession } from "next-auth/react";

export default function Home() {
  const { data: session, status } = useSession();
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // State for responsive sidebar
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDesktopSidebarCollapsed, setIsDesktopSidebarCollapsed] = useState(false);
  
  // Chat History & Mode state
  const [history, setHistory] = useState<ChatHistoryItem[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [generatingChatId, setGeneratingChatId] = useState<string | null>(null);
  
  // SubChat / Child Conversation Split Pane State
  const [isSubChatOpen, setIsSubChatOpen] = useState(false);
  const [isSubChatMinimized, setIsSubChatMinimized] = useState(false);
  const [activeSubChatId, setActiveSubChatId] = useState<string | null>(null);
  const [subChatSeedContext, setSubChatSeedContext] = useState<string | null>(null);
  const [childChats, setChildChats] = useState<{id: string, title: string, createdAt: Date}[]>([]);
  const [isSubChatDrawerOpen, setIsSubChatDrawerOpen] = useState(false);
  const [editingSubChatId, setEditingSubChatId] = useState<string | null>(null);
  const [editingSubChatTitle, setEditingSubChatTitle] = useState("");
  const [isUpdatingSubChat, setIsUpdatingSubChat] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  // If guest, use a transient ID. If logged in, use DB ID.
  const [transientId] = useState(() => uuidv4()); 
  
  // Model selection state — IDs must match Groq model names accepted by the llm-wrapper backend
  const AVAILABLE_MODELS = [
    // Llama family (Meta)
    { id: "llama-3.3-70b-versatile",    name: "Llama 3.3 70B",       provider: "Meta" },
    { id: "llama-3.1-8b-instant",       name: "Llama 3.1 8B Instant", provider: "Meta" },
    // Gemma family (Google)
    { id: "gemma2-9b-it",               name: "Gemma 2 9B",           provider: "Google" },
    // Mixtral (Mistral AI)
    { id: "mixtral-8x7b-32768",         name: "Mixtral 8x7B",         provider: "Mistral" },
    // Qwen (Alibaba)
    { id: "qwen-qwq-32b",               name: "Qwen QwQ 32B",         provider: "Alibaba" },
  ];
  const [selectedModelObj, setSelectedModelObj] = useState(AVAILABLE_MODELS[0]);
  const [isModelMenuOpen, setIsModelMenuOpen] = useState(false);

  const [chatTitle, setChatTitle] = useState("Obrolan Baru");
  const [personaPrompt, setPersonaPrompt] = useState<string | null>(null);
  const [rateLimit, setRateLimit] = useState({ count: 0, limit: 35 });
  
  useEffect(() => {
    setMounted(true);
  }, []);

  // Load history when session is valid
  useEffect(() => {
    if (status === "authenticated") {
      fetchHistory();
      fetchPersona();
    } else {
      setHistory([]);
      setPersonaPrompt(null);
      setMessages([]);
      setCurrentChatId(null);
      setChatTitle("Obrolan Baru");
      // Reset sub-chat states when logging out
      setIsSubChatOpen(false);
      setActiveSubChatId(null);
      setChildChats([]);
      setIsSubChatMinimized(false);
      setIsSubChatDrawerOpen(false);
    }
    
    // Always fetch rate limits regardless of auth state (it handles Guest via IP too)
    fetchRateLimit();
  }, [status]);

  const isSubChatOpenRef = useRef(isSubChatOpen);
  useEffect(() => {
    isSubChatOpenRef.current = isSubChatOpen;
  }, [isSubChatOpen]);

  // Ribbon pull-tab click outside handler
  const ribbonRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ribbonRef.current && !ribbonRef.current.contains(event.target as Node)) {
        setIsSubChatDrawerOpen(false);
      }
    }
    if (isSubChatDrawerOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isSubChatDrawerOpen]);

  // Listen to deep exploration Sub-Chat creations from text highlighting
  useEffect(() => {
    const handleCreateSubchat = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      const seedText = customEvent.detail;
      
      setIsSubChatOpen(true);
      setIsSubChatMinimized(false);
      
      if (isSubChatOpenRef.current) {
        // If the Sub-Chat panel is already open, don't destroy the current session!
        // Just insert the quote into the existing child ChatInput.
        setTimeout(() => {
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('insert-quote', { 
              detail: { text: seedText, target: 'subchat' } 
            }));
          }
        }, 0);
      } else {
        // Force it to create a new child chat thread
        setActiveSubChatId(null); 
        setSubChatSeedContext(seedText);
      }
    };

    window.addEventListener('create-subchat', handleCreateSubchat);
    return () => window.removeEventListener('create-subchat', handleCreateSubchat);
  }, []);

  const fetchRateLimit = async () => {
    try {
      const res = await fetch("/api/user/rate-limit");
      if (res.ok) {
        const data = await res.json();
        setRateLimit(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchPersona = async () => {
    try {
      const res = await fetch("/api/user/persona");
      if (res.ok) {
        const data = await res.json();
        setPersonaPrompt(data.systemPrompt);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSelectPersona = async (prompt: string) => {
    setPersonaPrompt(prompt);
    if (status === "authenticated") {
      try {
        await fetch("/api/user/persona", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ systemPrompt: prompt })
        });
      } catch (e) {
        console.error("Failed to save persona", e);
      }
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await fetch("/api/chats");
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSelectChat = async (id: string, title: string) => {
    setCurrentChatId(id);
    setChatTitle(title);
    setMessages([]);
    setChildChats([]);
    setIsSubChatOpen(false);
    setIsSubChatMinimized(false);
    setActiveSubChatId(null);
    setIsLoading(true);

    try {
      const res = await fetch(`/api/chats/${id}/messages`);
      if (res.ok) {
        const dbMessages = await res.json();
        // Convert DB format to UI format
        const formatted: Message[] = dbMessages.map((m: any) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          model: m.model,
          metadata: {
            rag_enabled: m.isRag,
            usage: m.tokens ? { total_tokens: m.tokens } : undefined,
          }
        }));
        setMessages(formatted);
      }

      // Fetch child chats associated with this parent
      if (status === "authenticated") {
        const childrenRes = await fetch(`/api/chats/${id}/children`);
        if (childrenRes.ok) {
          const childrenData = await childrenRes.json();
          setChildChats(childrenData);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewChat = () => {
    setCurrentChatId(null);
    setMessages([]);
    setChatTitle("Obrolan Baru");
    setIsSubChatOpen(false);
    setIsSubChatMinimized(false);
    setActiveSubChatId(null);
    if (window.innerWidth < 768) setIsSidebarOpen(false);
  };

  // Called by Sidebar after rename or delete
  const handleHistoryChange = async () => {
    await fetchHistory();
    // If the currently open chat was deleted, reset to blank state
    const updatedHistory = await fetch('/api/chats').then(r => r.ok ? r.json() : []);
    const stillExists = updatedHistory.some((c: ChatHistoryItem) => c.id === currentChatId);
    if (!stillExists) {
      setCurrentChatId(null);
      setMessages([]);
      setChatTitle("Obrolan Baru");
    }
  };

  const generateChatTitle = async (chatId: string, userMsg: string, aiMsg: string, modelId: string) => {
    try {
      const prompt = `Buatkan judul super singkat (maksimal 6 kata) tanpa tanda kutip untuk percakapan ini:\n\nUser: ${userMsg}\nAI: ${aiMsg}\n\nJudul Singkat:`;
      const res = await api.chat(prompt, false, `title-gen-${chatId}`, modelId);
      if (res.response) {
        let newTitle = res.response.replace(/["*]/g, '').trim();
        // Fallback length check
        if (newTitle.length > 40) newTitle = newTitle.substring(0, 40) + "...";

        // Update DB
        await fetch(`/api/chats/${chatId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: newTitle }),
        });
        
        // Update local state if the user is still on this chat
        setCurrentChatId((prev) => {
          if (prev === chatId) setChatTitle(newTitle);
          return prev;
        });
        fetchHistory(); // refresh the sidebar
      }
    } catch (e) {
      console.error("Failed to generate title", e);
    }
  };

  const handleSendMessage = async (content: string) => {
    // RAG is OFF by default. Turn on only when user has uploaded documents.
    const useRag = false;

    // Build conversation history from the last 6 messages so the AI remembers prior turns
    const currentMessages = messages;
    const historyContext = currentMessages
      .slice(-6)
      .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
      .join('\n');

    // Prepend history to the current message if it exists
    const messageWithHistory = historyContext.length > 0
      ? `Previous conversation:\n${historyContext}\n\nUser: ${content}`
      : content;

    // Local UI update (display the clean user message, not the one with injected history)
    const userMsg: Message = { id: uuidv4(), role: "user", content };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    let activeChatId = currentChatId;
    let isNewDB = false;

    try {
      // 1. If logged in and no chat selected, create one in DB
      if (status === "authenticated" && !activeChatId) {
        const newTitle = "Obrolan Baru";
        const res = await fetch("/api/chats", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: newTitle }),
        });
        if (res.ok) {
          const chatData = await res.json();
          activeChatId = chatData.id;
          setCurrentChatId(activeChatId);
          setChatTitle(newTitle);
          isNewDB = true;
        }
      }

      // 2. Save user message to DB
      if (status === "authenticated" && activeChatId) {
        const r = await fetch(`/api/chats/${activeChatId}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role: "user", content }),
        });
        if (!r.ok) console.error("[save user msg] failed:", r.status, await r.text());
      }

      // 3. Call external Python AI backend with history-aware message
      const backendId = activeChatId || transientId;
      
      // Enforce global formatting guardrails (like emoji limits) even for custom personas
      const emojiGuardrail = "\n\n[PENTING: Gunakan emoji secara natural dan tidak berlebihan. Fokus pada kebersihan teks.]";
      const finalSystemPrompt = personaPrompt ? personaPrompt + emojiGuardrail : personaPrompt;
      
      const apiRes = await api.chat(messageWithHistory, useRag, backendId, selectedModelObj.id, finalSystemPrompt);

      // 4. Save AI Response to DB
      if (status === "authenticated" && activeChatId) {
        const r = await fetch(`/api/chats/${activeChatId}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            role: "assistant",
            content: apiRes.response,
            tokens: apiRes.usage?.total_tokens ?? null,
            model: selectedModelObj.id,
            isRag: apiRes.rag_enabled,
          }),
        });
        if (!r.ok) console.error("[save ai msg] failed:", r.status, await r.text());
      }

      // 5. Update UI for AI
      const aiMsg: Message = {
        id: uuidv4(),
        role: "assistant",
        content: apiRes.response,
        metadata: apiRes,
        model: selectedModelObj.name,
      };
      setMessages((prev) => [...prev, aiMsg]);

      if (isNewDB && activeChatId) {
        // Fire and forget title generation in background
        setGeneratingChatId(activeChatId);
        generateChatTitle(activeChatId, content, apiRes.response, selectedModelObj.id).finally(() => {
          setGeneratingChatId(null);
        });
        fetchHistory();
      }
      
    } catch (error: any) {
      console.error(error);
      const isLimit = error?.isLimitExceeded === true || error?.message?.includes('Batas limit harian');
      const errorMsg: Message = {
        id: uuidv4(),
        role: "assistant",
        content: isLimit 
            ? `⚠️ **${error.message}**\n\nSilakan coba lagi besok hari atau pertimbangkan untuk login jika Anda pengguna tamu.` 
            : "Oops! Sepertinya terjadi kesalahan. Coba lagi nanti.",
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
      fetchRateLimit(); // Refresh usage limit after every attempt
    }
  };

  const handleEditSubChatSubmit = async (e: React.FormEvent, id: string) => {
    e.preventDefault();
    if (!editingSubChatTitle.trim()) return;
    setIsUpdatingSubChat(true);

    try {
      const res = await fetch(`/api/chats/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: editingSubChatTitle }),
      });

      if (res.ok) {
        setChildChats(prev => prev.map(c => c.id === id ? { ...c, title: editingSubChatTitle } : c));
        setEditingSubChatId(null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsUpdatingSubChat(false);
    }
  };

  return (
    <div className="flex h-screen w-full bg-[#0b0f19] overflow-hidden font-sans">
      <Sidebar 
        onNewChat={handleNewChat}
        isOpen={isSidebarOpen}
        toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        isDesktopCollapsed={isDesktopSidebarCollapsed}
        toggleDesktopCollapse={() => setIsDesktopSidebarCollapsed(!isDesktopSidebarCollapsed)}
        history={history}
        currentChatId={currentChatId}
        onSelectChat={handleSelectChat}
        onHistoryChange={fetchHistory}
        generatingChatId={generatingChatId}
        rateLimit={rateLimit}
      />

      <main className="flex-1 flex min-w-0 relative h-full overflow-hidden">
        <div
          className={`flex flex-col h-full bg-[#0b0f19] transition-all duration-300 ${isSubChatOpen && !isSubChatMinimized ? 'w-full md:w-[60%] border-r border-white/10' : 'w-full'}`}
        >
          <header className="h-14 flex items-center justify-between px-4 sticky top-0 bg-[#0b0f19]/80 backdrop-blur-md z-10 border-b border-white/5 shrink-0">
            <div className="flex items-center gap-3 text-slate-300">
              <button 
                onClick={() => {
                  if (window.innerWidth >= 768) {
                    setIsDesktopSidebarCollapsed(false);
                  } else {
                    setIsSidebarOpen(true);
                  }
                }} 
                className={`hover:text-white ${!isDesktopSidebarCollapsed ? 'md:hidden' : ''}`}
                title="Buka Sidebar"
              >
                <Menu size={20} />
              </button>
              <div className="hidden md:flex items-center gap-2 max-w-sm">
                <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                <span className="text-sm font-semibold truncate text-white">{chatTitle}</span>
              </div>
            </div>
            
            <div className="flex items-center gap-1.5 sm:gap-2">
              <PersonaSelector currentPrompt={personaPrompt} onSelect={handleSelectPersona} />
              
              <div className="relative">
                <div 
                  onClick={() => setIsModelMenuOpen(!isModelMenuOpen)}
                  className="cursor-pointer flex items-center gap-2 bg-[#131722] border border-white/10 hover:bg-[#1e2336] transition-colors py-1.5 px-3 rounded-xl text-xs sm:text-sm font-medium text-slate-200"
                >
                  <div className="w-4 h-4 rounded-sm bg-indigo-500 flex items-center justify-center text-[10px] text-white shadow-sm shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                  </div>
                  <span className="max-w-[45px] sm:max-w-none truncate">{selectedModelObj.name}</span>
                  <ChevronDown size={14} className="text-slate-500 ml-1 shrink-0" />
                </div>

              {isModelMenuOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-40"
                    onClick={() => setIsModelMenuOpen(false)}
                  />
                  {/* Mobile-friendly fixed positioning for menus */}
                  <div className="fixed inset-x-4 sm:inset-x-auto sm:absolute sm:right-0 top-20 sm:top-full mt-2 sm:mt-2 sm:w-56 bg-[#1e2336] border border-white/10 rounded-xl shadow-2xl z-[100] py-1 overflow-hidden">
                    {AVAILABLE_MODELS.map(model => (
                      <button
                        key={model.id}
                        onClick={() => {
                          setSelectedModelObj(model);
                          setIsModelMenuOpen(false);
                        }}
                        className={`w-full text-left px-4 py-2.5 transition-colors flex items-center justify-between gap-2 ${
                          selectedModelObj.id === model.id 
                            ? 'bg-indigo-500/10 text-indigo-400' 
                            : 'text-slate-300 hover:bg-white/5'
                        }`}
                      >
                        <span className="text-sm font-medium">{model.name}</span>
                        <span className="text-[10px] text-slate-500 shrink-0">{model.provider}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
              </div>
            </div>
          </header>

          <div className="flex-1 min-h-0 flex flex-col relative"
               style={{
                 paddingRight: (isSubChatOpen && !isSubChatMinimized) 
                  ? '70px' 
                  : (isSubChatDrawerOpen && (!isSubChatOpen || isSubChatMinimized)) ? '288px' : '0px',
                 paddingLeft: (mounted && !isDesktopSidebarCollapsed && window.innerWidth >= 768) ? '20px' : '0px',
                 transition: 'all 0.35s cubic-bezier(0.4,0,0.2,1)',
               }}
          >
            <div className="flex-1 overflow-hidden flex flex-col min-h-0 relative">
              <ChatArea messages={messages} isLoading={isLoading} selectedModel={selectedModelObj.name} />
            </div>
            
            <div className="shrink-0 bg-[#0b0f19]">
              <ChatInput 
                onSendMessage={handleSendMessage} 
                isLoading={isLoading} 
                onDocumentUploaded={() => console.log('Doc uploaded')} 
              />
            </div>
          </div>
        </div>

        {/* SubChat Panel Pane */}
        {isSubChatOpen && (
          <aside className={`absolute md:relative inset-y-0 right-0 w-full md:w-[40%] bg-[#0d0f1b] shadow-2xl md:shadow-none z-30 shrink-0 border-l border-indigo-500/10 ${isSubChatMinimized ? 'hidden' : ''}`}>
            
            {/* ── Quick Switcher Ribbon (Floating on the Border) ── */}
            {childChats.length > 0 && (
              <div className="absolute left-0 -translate-x-full top-1/2 -translate-y-1/2 z-50 hidden md:flex flex-col gap-1.5 bg-[#181d2e]/95 backdrop-blur-md border border-r-0 border-white/10 rounded-l-xl shadow-[-8px_0_20px_rgba(0,0,0,0.4)] p-1.5 py-2">
                {childChats.map((chat, i) => (
                  <button
                    key={chat.id}
                    onClick={() => setActiveSubChatId(chat.id)}
                    className={`
                      group relative flex items-center justify-center w-8 h-8 rounded-lg text-[11px] font-bold transition-all duration-200 shrink-0
                      ${activeSubChatId === chat.id 
                        ? 'bg-indigo-500 text-white shadow-[0_0_12px_rgba(99,102,241,0.5)]' 
                        : 'bg-white/5 text-slate-500 hover:bg-white/10 hover:text-slate-200'}
                    `}
                    title={chat.title} // Fallback title
                  >
                    {i + 1}
                    
                    {/* Hover Tooltip (Now appearing on the RIGHT to avoid clipping) */}
                    <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-[#1e2336] text-white text-xs font-medium rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap shadow-xl border border-white/10 pointer-events-none z-50">
                      {chat.title}
                      {/* Tooltip arrow/triangle (pointing left now) */}
                      <div className="absolute top-1/2 -translate-y-1/2 -left-[5px] w-0 h-0 border-t-[5px] border-t-transparent border-b-[5px] border-b-transparent border-r-[5px] border-r-[#1e2336]" />
                    </div>
                  </button>
                ))}
              </div>
            )}

            <SubChatPanel
              parentId={currentChatId}
              parentHistoryContext={messages.map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n')}
              subChatId={activeSubChatId}
              initialTopicContext={subChatSeedContext}
              title={childChats.find(c => c.id === activeSubChatId)?.title ?? null}
              selectedModelObj={selectedModelObj}
              personaPrompt={personaPrompt}
              onSubChatCreated={(newId, title) => {
                setActiveSubChatId(newId);
                // Refresh list if authenticated
                if (status === "authenticated" && currentChatId) {
                  fetch(`/api/chats/${currentChatId}/children`)
                    .then(r => r.json())
                    .then(data => setChildChats(data));
                } else {
                  // Mode guest: Simpan riwayat sub-chat di memori lokal UI
                  setChildChats(prev => [...prev, { 
                    id: newId, 
                    title: title || 'Eksplorasi Baru', 
                    createdAt: new Date() 
                  }]);
                }
              }}
              onDelete={() => {
                setIsSubChatOpen(false);
                setIsSubChatMinimized(false);
                setActiveSubChatId(null);
                setSubChatSeedContext(null);
                setChildChats(prev => prev.filter(c => c.id !== activeSubChatId));
              }}
              onMinimize={() => setIsSubChatMinimized(true)}
            />
          </aside>
        )}

        {/* Permanent Right-Side Ribbon Tab */}
        {((currentChatId || (status === "unauthenticated" && messages.length > 0)) && (!isSubChatOpen || isSubChatMinimized)) && (
          <div ref={ribbonRef} className="absolute z-40 right-0 top-32 sm:top-24 flex flex-col items-end gap-2">

            {/* ── The Pill Tab Handle ── always visible ── */}
            <button
              onClick={() => setIsSubChatDrawerOpen(prev => !prev)}
              title={isSubChatDrawerOpen ? 'Tutup riwayat' : 'Buka riwayat Sub-Chat'}
              style={{ boxShadow: isSubChatDrawerOpen ? '0 0 0 1px rgba(99,102,241,0.4), -4px 0 20px rgba(99,102,241,0.15)' : '-4px 0 16px rgba(0,0,0,0.4)' }}
              className={`
                group flex items-center gap-2.5 pl-4 pr-3 py-2.5
                border border-r-0 rounded-l-2xl
                backdrop-blur-md transition-all duration-200 focus:outline-none
                ${isSubChatDrawerOpen
                  ? 'bg-indigo-600/25 border-indigo-500/40 text-indigo-300'
                  : 'bg-[#181d2e]/90 border-white/8 text-slate-400 hover:text-indigo-300 hover:border-indigo-500/20 hover:bg-[#1e2540]/90'
                }
              `}
            >
              <Network size={15} className="shrink-0" />
              <span className="text-xs font-semibold tracking-wide hidden sm:block whitespace-nowrap">Sub-Chat</span>
              {childChats.length > 0 && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                  isSubChatDrawerOpen ? 'bg-indigo-500/40 text-indigo-200' : 'bg-white/10 text-slate-400'
                }`}>
                  {childChats.length}
                </span>
              )}
              <ChevronDown
                size={13}
                className={`shrink-0 transition-transform duration-300 ${isSubChatDrawerOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {/* ── The Sliding History Panel (with gap from tab) ── */}
            <div
              style={{
                transition: 'max-height 0.35s cubic-bezier(0.4,0,0.2,1), opacity 0.25s ease, transform 0.35s cubic-bezier(0.4,0,0.2,1)',
                maxHeight: isSubChatDrawerOpen ? '65vh' : '0px',
                opacity: isSubChatDrawerOpen ? 1 : 0,
                transform: isSubChatDrawerOpen ? 'translateY(0) scale(1)' : 'translateY(-8px) scale(0.97)',
                transformOrigin: 'top right',
                overflow: 'hidden',
              }}
            >
              {/* Glass card */}
              <div
                className="w-[280px] sm:w-72 flex flex-col rounded-l-2xl border border-r-0 border-white/10 overflow-hidden"
                style={{
                  background: 'linear-gradient(160deg, rgba(30,35,60,0.97) 0%, rgba(18,21,40,0.97) 100%)',
                  boxShadow: '-8px 8px 32px rgba(0,0,0,0.55), 0 0 0 1px rgba(99,102,241,0.08)',
                  backdropFilter: 'blur(12px)',
                }}
              >
                {/* Header strip */}
                <div className="px-4 py-3 flex items-center justify-between shrink-0 border-b border-white/5"
                  style={{ background: 'linear-gradient(90deg, rgba(99,102,241,0.08) 0%, transparent 100%)' }}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                    <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">Riwayat Sub-Chat</span>
                  </div>
                  <button
                    onClick={() => {
                      setIsSubChatOpen(true);
                      setIsSubChatMinimized(false);
                      setActiveSubChatId(null);
                      setSubChatSeedContext(null);
                      setIsSubChatDrawerOpen(false);
                    }}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 hover:border-indigo-500/40 transition-all"
                  >
                    <Network size={11} />
                    Baru
                  </button>
                </div>

                {/* List */}
                <div className="overflow-y-auto scrollbar-custom" style={{ maxHeight: 'calc(65vh - 52px)' }}>
                  {childChats.length === 0 ? (
                    <div className="px-6 py-8 text-center">
                      <Network size={28} className="text-slate-700 mx-auto mb-2" />
                      <p className="text-sm text-slate-500 font-medium">Belum ada eksplorasi</p>
                      <p className="text-xs text-slate-600 mt-1">Blok teks lalu klik "Dalamkan"</p>
                    </div>
                  ) : (
                    childChats.map((chat, i) => (
                      <div
                        key={chat.id}
                        className={`group flex items-center gap-3 px-3 py-2.5 border-b border-white/5 last:border-0 transition-all duration-150 ${
                          activeSubChatId === chat.id && isSubChatOpen
                            ? 'bg-indigo-500/10 border-l-2 border-l-indigo-500'
                            : 'hover:bg-white/4 border-l-2 border-l-transparent'
                        }`}
                        style={{ animationDelay: `${i * 30}ms` }}
                      >
                        {/* Index Badge */}
                        <span className={`shrink-0 w-5 h-5 rounded-md text-[10px] font-bold flex items-center justify-center ${
                          activeSubChatId === chat.id && isSubChatOpen
                            ? 'bg-indigo-500/30 text-indigo-300'
                            : 'bg-white/5 text-slate-600 group-hover:text-slate-400'
                        }`}>
                          {i + 1}
                        </span>

                        {editingSubChatId === chat.id ? (
                          <form
                            className="flex-1 flex items-center gap-1.5"
                            onSubmit={(e) => handleEditSubChatSubmit(e, chat.id)}
                          >
                            <input
                              type="text"
                              autoFocus
                              value={editingSubChatTitle}
                              onChange={(e) => setEditingSubChatTitle(e.target.value)}
                              className="w-full bg-black/40 border border-indigo-500/50 rounded-lg px-2 py-1 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                              onClick={(e) => e.stopPropagation()}
                            />
                            <button
                              type="submit"
                              disabled={isUpdatingSubChat}
                              className="text-green-400 hover:text-green-300 p-1 shrink-0 bg-green-500/10 border border-green-500/20 rounded"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {isUpdatingSubChat ? <Loader2 size={11} className="animate-spin" /> : <Check size={13} />}
                            </button>
                          </form>
                        ) : (
                          <>
                            <button
                              onClick={() => {
                                setActiveSubChatId(chat.id);
                                setIsSubChatOpen(true);
                                setIsSubChatMinimized(false);
                                setIsSubChatDrawerOpen(false);
                              }}
                              className="flex-1 text-left min-w-0"
                            >
                              <span className={`text-sm font-medium truncate block leading-snug ${
                                activeSubChatId === chat.id && isSubChatOpen ? 'text-indigo-300' : 'text-slate-300 group-hover:text-white'
                              }`}>
                                {chat.title}
                              </span>
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingSubChatId(chat.id);
                                setEditingSubChatTitle(chat.title);
                              }}
                              className="opacity-0 group-hover:opacity-100 p-1 text-slate-600 hover:text-indigo-300 transition-all shrink-0 bg-white/5 hover:bg-indigo-500/10 rounded"
                              title="Ubah Nama"
                            >
                              <Edit2 size={11} />
                            </button>
                          </>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

