"use client";

import { useState, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import Sidebar, { ChatHistoryItem } from "@/components/Sidebar";
import ChatArea, { Message } from "@/components/ChatArea";
import ChatInput from "@/components/ChatInput";
import PersonaSelector from "@/components/PersonaSelector";
import { api } from "@/lib/api";
import { ChevronDown, Menu } from "lucide-react";
import { useSession } from "next-auth/react";

export default function Home() {
  const { data: session, status } = useSession();
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // State for responsive sidebar
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Chat History & Mode state
  const [history, setHistory] = useState<ChatHistoryItem[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [generatingChatId, setGeneratingChatId] = useState<string | null>(null);
  
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
    }
  }, [status]);

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
      const apiRes = await api.chat(messageWithHistory, useRag, backendId, selectedModelObj.id, personaPrompt);

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
      
    } catch (error) {
      console.error(error);
      const errorMsg: Message = {
        id: uuidv4(),
        role: "assistant",
        content: "Oops! Sepertinya terjadi kesalahan.",
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-full bg-[#0b0f19] overflow-hidden font-sans">
      <Sidebar 
        onNewChat={handleNewChat}
        isOpen={isSidebarOpen}
        toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        history={history}
        currentChatId={currentChatId}
        onSelectChat={handleSelectChat}
        onHistoryChange={handleHistoryChange}
        generatingChatId={generatingChatId}
      />

      <main className="flex-1 flex flex-col min-w-0 relative h-full">
        <header className="h-14 flex items-center justify-between px-4 sticky top-0 bg-[#0b0f19]/80 backdrop-blur-md z-10 border-b border-white/5">
          <div className="flex items-center gap-3 text-slate-300">
            <button onClick={() => setIsSidebarOpen(true)} className="md:hidden hover:text-white">
              <Menu size={20} />
            </button>
            <div className="hidden md:flex items-center gap-2 max-w-sm">
              <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
              <span className="text-sm font-semibold truncate text-white">{chatTitle}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <PersonaSelector currentPrompt={personaPrompt} onSelect={handleSelectPersona} />
            
            <div className="relative">
              <div 
                onClick={() => setIsModelMenuOpen(!isModelMenuOpen)}
                className="cursor-pointer flex items-center gap-2 bg-[#131722] border border-white/10 hover:bg-[#1e2336] transition-colors py-1.5 px-3 rounded-xl text-xs sm:text-sm font-medium text-slate-200"
              >
              <div className="w-4 h-4 rounded-sm bg-indigo-500 flex items-center justify-center text-[10px] text-white shadow-sm">
                <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
              </div>
              {selectedModelObj.name}
              <ChevronDown size={14} className="text-slate-500 ml-1" />
            </div>

            {isModelMenuOpen && (
              <>
                <div 
                  className="fixed inset-0 z-40"
                  onClick={() => setIsModelMenuOpen(false)}
                />
                <div className="absolute right-0 top-full mt-2 w-56 bg-[#1e2336] border border-white/10 rounded-xl shadow-xl z-50 py-1 overflow-hidden">
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

        <ChatArea messages={messages} isLoading={isLoading} selectedModel={selectedModelObj.name} />
        
        <ChatInput 
          onSendMessage={handleSendMessage} 
          isLoading={isLoading} 
          onDocumentUploaded={() => console.log('Doc uploaded')} 
        />
      </main>
    </div>
  );
}
