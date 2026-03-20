import React, { useRef, useEffect, useState } from 'react';
import { Send, Plus, UploadCloud, Loader2, FileText, CheckCircle } from 'lucide-react';
import { api } from '@/lib/api';

interface ChatInputProps {
  onSendMessage: (msg: string) => void;
  isLoading: boolean;
  onDocumentUploaded?: () => void;
}

export default function ChatInput({ onSendMessage, isLoading, onDocumentUploaded }: ChatInputProps) {
  const [input, setInput] = useState('');
  const [showPlusMenu, setShowPlusMenu] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowPlusMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuRef]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;
    onSendMessage(input);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.txt')) {
      alert('Only .txt files are supported for RAG context in this demo.');
      return;
    }

    try {
      setIsUploading(true);
      setShowPlusMenu(false);
      await api.uploadDocument(file);
      onDocumentUploaded?.();
      alert('Dokumen berhasil diunggah dan ditambahkan ke Knowledge Base.');
    } catch (error) {
      console.error(error);
      alert('Gagal mengunggah dokumen.');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  return (
    <div className="w-full bg-[#0b0f19] px-4 pb-6 pt-2 shrink-0">
      <div className="max-w-3xl mx-auto relative">
        
        {/* Plus Menu Popover */}
        {showPlusMenu && (
          <div ref={menuRef} className="absolute bottom-full left-0 mb-4 bg-[#1e2336] border border-white/5 shadow-2xl shadow-black/50 rounded-2xl p-2 w-64 animate-in fade-in slide-in-from-bottom-2 duration-200 z-50">
            <label className="w-full flex items-center gap-3 hover:bg-white/5 text-slate-200 px-3 py-3 rounded-xl text-sm transition-colors text-left cursor-pointer">
              {isUploading ? (
                <Loader2 size={18} className="text-indigo-400 animate-spin" />
              ) : (
                <UploadCloud size={18} className="text-indigo-400" />
              )}
              <span className="font-medium">{isUploading ? 'Mengunggah...' : 'Unggah Dokumen Baru'}</span>
              <input 
                type="file" 
                className="hidden" 
                accept=".txt"
                onChange={handleFileUpload}
                disabled={isUploading}
              />
            </label>
          </div>
        )}

        {/* Input Bar */}
        <form onSubmit={handleSubmit} className="relative flex items-end gap-3 bg-[#131722] p-2 border border-white/10 rounded-[32px] focus-within:ring-2 focus-within:ring-indigo-500/50 focus-within:border-transparent transition-all shadow-lg mx-auto">
          
          <div className="pl-2 pb-[6px] shrink-0">
            <button
              type="button"
              onClick={() => setShowPlusMenu(!showPlusMenu)}
              className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${showPlusMenu ? 'bg-indigo-500/20 text-indigo-400' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
            >
              <Plus size={20} className={`transform transition-transform ${showPlusMenu ? 'rotate-45' : ''}`} />
            </button>
          </div>

          <div className="flex-1 min-h-[44px] flex items-center py-2">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Apa yang ingin Anda pertanyakan?"
              disabled={isLoading || isUploading}
              className="w-full bg-transparent border-0 resize-none px-2 text-[15px] text-white focus:ring-0 placeholder:text-slate-500 max-h-[200px] overflow-y-auto disabled:opacity-50"
              rows={1}
            />
          </div>

          <div className="pr-2 pb-[6px] shrink-0">
            <button
              type="submit"
              disabled={isLoading || isUploading || !input.trim()}
              className="w-10 h-10 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 shadow-md shadow-indigo-500/20 disabled:shadow-none"
            >
              <Send size={18} className="translate-x-[1px] translate-y-[1px]" />
            </button>
          </div>
        </form>
        
        <div className="text-center mt-3 text-[11px] text-slate-500">
          SensiBOT dapat menghasilkan informasi yang tidak akurat. Mohon verifikasi responsnya.
        </div>
      </div>
    </div>
  );
}
