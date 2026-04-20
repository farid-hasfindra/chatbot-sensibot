import React, { useState, useEffect } from 'react';
import ChatArea, { Message } from './ChatArea';
import ChatInput from './ChatInput';
import { v4 as uuidv4 } from "uuid";
import { api } from '@/lib/api';
import { Network, FileSearch, Minimize2, Trash2, AlertTriangle } from 'lucide-react';
import { useSession } from 'next-auth/react';

interface SubChatPanelProps {
  parentId: string | null;
  parentHistoryContext: string;
  subChatId: string | null;
  initialTopicContext: string | null;
  title: string | null;
  onMinimize: () => void;
  onDelete: () => void;
  onSubChatCreated: (id: string) => void;
  selectedModelObj: any;
  personaPrompt: string | null;
}

export default function SubChatPanel({
  parentId, 
  parentHistoryContext,
  subChatId: initialSubChatId, 
  initialTopicContext,
  title,
  onMinimize,
  onDelete,
  onSubChatCreated,
  selectedModelObj,
  personaPrompt
}: SubChatPanelProps) {
  const { status } = useSession();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeSubChatId, setActiveSubChatId] = useState<string | null>(initialSubChatId || null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (initialSubChatId) {
      setActiveSubChatId(initialSubChatId);
      fetchMessages(initialSubChatId);
    } else {
      setActiveSubChatId(null);
      setMessages([]);
      // Jika baru pertama kali dipecah (subChatId null tapi initialTopicContext ada), AI harus siap menerima query
    }
  }, [initialSubChatId, initialTopicContext]);

  const fetchMessages = async (id: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/chats/${id}/messages`);
      if (res.ok) {
        const dbMessages = await res.json();
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

  const handleSendMessage = async (content: string) => {
    let currentId = activeSubChatId;
    setIsLoading(true);
    
    const userMsg: Message = { id: uuidv4(), role: "user", content };
    setMessages((prev) => [...prev, userMsg]);

    try {
      // 1. Buat Sub-Chat ID baru jika ini adalah lemparan pertama
      if (!currentId && status === "authenticated" && parentId) {
        const title = `${initialTopicContext || content}`.substring(0, 40);
        const res = await fetch("/api/chats", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, parentId }),
        });
        if (res.ok) {
          const chatData = await res.json();
          currentId = chatData.id;
          setActiveSubChatId(currentId);
          onSubChatCreated(currentId!);
        }
      }

      // 2. Simpan pesan user
      if (status === "authenticated" && currentId) {
        const r = await fetch(`/api/chats/${currentId}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role: "user", content }),
        });
        console.log("save user:", r.status);
      }

      // 3. Bangun konteks gabungan (Induk + Anak)
      const childHistory = messages.map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n');
      
      const combinedContext = `[KONTEKS OBROLAN UTAMA]\n${parentHistoryContext}\n\n[KONTEKS OBROLAN SPESIFIK SAAT INI]\n${childHistory}`;
      const messageWithHistory = `Berikut adalah gabungan sejarah konteks kita:\n${combinedContext}\n\nSekarang jawab pertanyaan spesifik ini: ${content}`;

      // 4. Hit AI backend
      const backendId = currentId || uuidv4();
      
      // Enforce global formatting guardrails (like emoji limits) even for custom personas
      const emojiGuardrail = "\n\n[PENTING: Gunakan emoji secara natural dan tidak berlebihan. Fokus pada kebersihan teks.]";
      const finalSystemPrompt = personaPrompt ? personaPrompt + emojiGuardrail : personaPrompt;
      
      const apiRes = await api.chat(messageWithHistory, false, backendId, selectedModelObj.id, finalSystemPrompt);

      // 5. Simpan respons AI
      if (status === "authenticated" && currentId) {
        await fetch(`/api/chats/${currentId}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            role: "assistant",
            content: apiRes.response,
            tokens: apiRes.usage?.total_tokens ?? null,
            model: selectedModelObj.id,
            isRag: false,
          }),
        });
      }

      // 6. Update UI
      const aiMsg: Message = {
        id: uuidv4(),
        role: "assistant",
        content: apiRes.response,
        metadata: apiRes,
        model: selectedModelObj.name,
      };
      setMessages((prev) => [...prev, aiMsg]);
      
    } catch (error: any) {
      console.error(error);
      const isLimit = error?.isLimitExceeded === true || error?.message?.includes('Batas limit harian');
      setMessages((prev) => [...prev, {
        id: uuidv4(),
        role: "assistant",
        content: isLimit ? `⚠️ **${error.message}**` : "Oops! Sepertinya terjadi kesalahan. Coba lagi nanti."
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!activeSubChatId) {
      onDelete();
      return;
    }
    setShowDeleteConfirm(true);
  };

  const confirmDeleteAction = async () => {
    try {
      if (status === "authenticated") {
        await fetch(`/api/chats/${activeSubChatId}`, { method: 'DELETE' });
      }
      setShowDeleteConfirm(false);
      onDelete();
    } catch (error) {
      console.error("Error deleting child chat:", error);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0d0f1b] relative z-10 animate-in slide-in-from-right-16 duration-300 shadow-[-10px_0_30px_rgba(0,0,0,0.5)]">
      <header className="h-14 shrink-0 flex items-center justify-between px-4 border-b border-white/5 bg-[#1e2336]/30">
        <div className="flex items-center gap-2 text-indigo-300">
          <Network size={16} />
          <span className="text-sm font-semibold truncate leading-none mt-1 max-w-[180px]">
            {title || 'Eksplorasi Baru'}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={onMinimize} className="w-7 h-7 rounded bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors" title="Sembunyikan / Perkecil Tampilan">
            <Minimize2 size={15} />
          </button>
          <button onClick={handleDelete} className="w-7 h-7 rounded bg-white/5 hover:bg-[#ff4e4e]/20 flex items-center justify-center text-slate-400 hover:text-[#ff4e4e] transition-colors" title="Hapus Sub-Chat Permanen">
            <Trash2 size={15} />
          </button>
        </div>
      </header>

      {/* Tampilkan indikator topik jika percakapan belum dimulai (baru mau nanya dari Highlight) */}
      {/* (Old placeholder div removed here) */}

      <div className="flex-1 min-h-0 relative">
        <ChatArea messages={messages} isLoading={isLoading} selectedModel={selectedModelObj.name} isCompact={true} />
      </div>

      <div className="shrink-0">
        {/* We simplify the child chat input to focus on messages */}
        <ChatInput 
          onSendMessage={handleSendMessage} 
          isLoading={isLoading} 
          identifier="subchat"
          initialQuote={(!activeSubChatId && messages.length === 0) ? initialTopicContext : null}
        />
      </div>

      {/* Modern Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="absolute inset-0 z-[100] flex items-center justify-center p-6 bg-[#0b0f19]/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#1e2336] border border-white/10 rounded-2xl p-6 w-full max-w-xs shadow-2xl shadow-black/50 animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-4 mx-auto">
              <AlertTriangle className="text-red-500" size={24} />
            </div>
            <h3 className="text-lg font-bold text-white text-center mb-2">Hapus Sub-Chat?</h3>
            <p className="text-sm text-slate-400 text-center mb-6 leading-relaxed">
              Tindakan ini permanen dan riwayat percakapan cabang ini akan hilang.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => setShowDeleteConfirm(false)}
                className="py-2.5 px-4 bg-white/5 hover:bg-white/10 rounded-xl text-sm font-semibold text-slate-300 transition-colors"
              >
                Batal
              </button>
              <button 
                onClick={confirmDeleteAction}
                className="py-2.5 px-4 bg-red-600 hover:bg-red-500 rounded-xl text-sm font-semibold text-white shadow-lg shadow-red-600/20 transition-all active:scale-95"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
