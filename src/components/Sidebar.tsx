"use client";

import React, { useEffect, useState, useRef } from 'react';
import { Plus, MessageSquare, Menu, Zap, LogOut, LogIn, MoreHorizontal, Pencil, Trash2, X, Check, Loader2, Search, ChevronsLeft } from 'lucide-react';
import { signOut, useSession } from "next-auth/react";
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export interface ChatHistoryItem {
  id: string;
  title: string;
  updatedAt: string;
}

interface SidebarProps {
  onNewChat: () => void;
  isOpen: boolean;
  toggleSidebar: () => void;
  history: ChatHistoryItem[];
  currentChatId: string | null;
  onSelectChat: (id: string, title: string) => void;
  onHistoryChange: () => void;
  generatingChatId?: string | null;
  rateLimit?: { count: number; limit: number };
  isDesktopCollapsed?: boolean;
  toggleDesktopCollapse?: () => void;
}

export default function Sidebar({
  onNewChat, isOpen, toggleSidebar, history, currentChatId, onSelectChat, onHistoryChange, generatingChatId, rateLimit, isDesktopCollapsed, toggleDesktopCollapse
}: SidebarProps) {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Context menu state
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpenId(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.refresh();
  };

  const handleMenuToggle = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setMenuOpenId(prev => prev === id ? null : id);
  };

  const startRename = (e: React.MouseEvent, chat: ChatHistoryItem) => {
    e.stopPropagation();
    setRenamingId(chat.id);
    setRenameValue(chat.title);
    setMenuOpenId(null);
  };

  const submitRename = async (id: string) => {
    if (!renameValue.trim()) return;
    try {
      await fetch(`/api/chats/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: renameValue.trim() }),
      });
      onHistoryChange();
    } catch (e) { console.error(e); }
    setRenamingId(null);
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setMenuOpenId(null);
    try {
      await fetch(`/api/chats/${id}`, { method: 'DELETE' });
      onHistoryChange();
    } catch (e) { console.error(e); }
  };

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={toggleSidebar} />
      )}

      <aside className={`
        fixed inset-y-0 left-0 z-50 w-72 
        bg-[#111322] border-r border-white/5 text-slate-300
        transition-all duration-300 ease-in-out flex flex-col h-full
        md:relative
        ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        ${isDesktopCollapsed ? 'md:-translate-x-full md:-ml-72' : 'md:translate-x-0 md:ml-0'}
      `}>
        {/* Header */}
        <div className="p-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/20">
            <Zap size={18} className="text-white fill-white" />
          </div>
          <h1 className="text-xl font-bold text-white tracking-wide">SensiBOT</h1>
          <button onClick={toggleSidebar} className="ml-auto md:hidden text-slate-400 hover:text-white" title="Tutup Sidebar">
            <X size={20} />
          </button>
          <button onClick={toggleDesktopCollapse} className="ml-auto hidden md:flex text-slate-500 hover:text-indigo-300 transition-colors" title="Sembunyikan Sidebar">
            <ChevronsLeft size={20} />
          </button>
        </div>

        {/* New Chat Button */}
        <div className="px-4 py-3">
          <button
            onClick={onNewChat}
            className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white py-3 px-4 rounded-xl font-medium transition-all shadow-md shadow-indigo-500/10"
          >
            <Plus size={18} />
            Obrolan Baru
          </button>
        </div>

        {/* History List */}
        <div className="flex-1 overflow-y-auto px-4 py-2 mt-2" ref={menuRef}>
          <div className="flex items-center justify-between mb-3 px-2">
            <h2 className="text-[10px] font-bold text-slate-500 tracking-widest uppercase">Riwayat</h2>
          </div>

          {/* Search Bar */}
          {status === "authenticated" && history.length > 0 && (
            <div className="relative mb-4">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Cari obrolan..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#1e2336]/50 border border-white/5 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 focus:bg-[#1e2336] transition-all"
              />
            </div>
          )}

          {status === "unauthenticated" ? (
            <div className="px-2 py-4 text-center text-sm text-slate-500 border border-dashed border-white/10 rounded-xl">
              <p className="mb-3">Login untuk menyimpan dan melihat histori chat Anda.</p>
              <Link href="/login" className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-colors inline-block text-xs font-semibold">
                Masuk / Daftar
              </Link>
            </div>
          ) : history.length === 0 ? (
            <p className="px-2 text-xs text-slate-500">Belum ada obrolan.</p>
          ) : (
            <div className="space-y-1 mt-1">
              {history
                .filter(chat => chat.title.toLowerCase().includes(searchQuery.toLowerCase()))
                .map((chat) => (
                  <div
                    key={chat.id}
                  className={`group relative flex items-center rounded-xl transition-colors
                    ${currentChatId === chat.id ? 'bg-indigo-500/10' : 'hover:bg-white/5'}
                  `}
                >
                  {/* Rename input mode */}
                  {renamingId === chat.id ? (
                    <div className="flex items-center gap-1 w-full px-3 py-2">
                      <input
                        autoFocus
                        value={renameValue}
                        onChange={e => setRenameValue(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') submitRename(chat.id);
                          if (e.key === 'Escape') setRenamingId(null);
                        }}
                        className="flex-1 bg-white/10 text-white text-sm rounded-lg px-2 py-1 outline-none focus:ring-1 focus:ring-indigo-500 min-w-0"
                      />
                      <button onClick={() => submitRename(chat.id)} className="text-green-400 hover:text-green-300 shrink-0">
                        <Check size={16} />
                      </button>
                      <button onClick={() => setRenamingId(null)} className="text-slate-400 hover:text-white shrink-0">
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <>
                      {/* Chat button */}
                      <button
                        className="flex items-center gap-3 px-3 py-3 text-sm text-left truncate flex-1 min-w-0"
                        onClick={() => {
                          onSelectChat(chat.id, chat.title);
                          if (window.innerWidth < 768) toggleSidebar();
                        }}
                      >
                        {generatingChatId === chat.id ? (
                          <>
                            <div className="relative flex items-center justify-center w-4 h-4 shrink-0">
                              <div className="absolute inset-0 rounded-full border-2 border-indigo-500/20"></div>
                              <div className="absolute inset-0 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin"></div>
                            </div>
                            <div className="h-4 w-32 bg-gradient-to-r from-indigo-500/10 via-purple-500/20 to-indigo-500/10 rounded-md animate-pulse" />
                          </>
                        ) : (
                          <>
                            <MessageSquare
                              size={16}
                              className={`shrink-0 ${currentChatId === chat.id ? 'text-indigo-400' : 'text-slate-500'}`}
                            />
                            <span className={`truncate ${currentChatId === chat.id ? 'text-indigo-300' : 'text-slate-300'}`}>
                              {chat.title}
                            </span>
                          </>
                        )}
                      </button>

                      {/* Three-dot button — visible on hover or when menu is open */}
                      <div className="relative shrink-0 pr-1">
                        <button
                          onClick={(e) => handleMenuToggle(e, chat.id)}
                          className={`p-1.5 rounded-lg transition-all text-slate-400 hover:text-white hover:bg-white/10
                            ${menuOpenId === chat.id ? 'opacity-100 bg-white/10 text-white' : 'opacity-0 group-hover:opacity-100'}
                          `}
                        >
                          <MoreHorizontal size={15} />
                        </button>

                        {/* Dropdown Menu */}
                        {menuOpenId === chat.id && (
                          <div className="absolute right-0 top-full mt-1 w-40 bg-[#1e2336] border border-white/10 rounded-xl shadow-xl z-50 overflow-hidden py-1">
                            <button
                              onClick={(e) => startRename(e, chat)}
                              className="flex items-center gap-2.5 w-full px-3 py-2.5 text-sm text-slate-200 hover:bg-white/5 transition-colors"
                            >
                              <Pencil size={14} className="text-slate-400" />
                              Ganti Nama
                            </button>
                            <button
                              onClick={(e) => handleDelete(e, chat.id)}
                              className="flex items-center gap-2.5 w-full px-3 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                            >
                              <Trash2 size={14} />
                              Hapus
                            </button>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Rate Limit Indicator */}
        {rateLimit && (
          <div className="group relative px-4 py-3 bg-[#0d0f1b] border-t border-white/5 cursor-help">
            
            {/* Hover Tooltip */}
            <div className="absolute bottom-full left-4 right-4 mb-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-50 p-3 text-[11px] text-slate-300 bg-[#1e2336] border border-white/10 rounded-xl shadow-xl shadow-black/50 pointer-events-none">
              <p className="mb-1 text-white font-medium">Mengapa ada batas?</p>
              <p className="leading-relaxed opacity-80">
                Layanan ini beroperasi secara gratis menggunakan kecerdasan buatan eksternal yang dibebani biaya oleh pihak ketiga. Aturan limit ini mencegah SensiBOT mengeluarkan anggaran terlalu banyak.
              </p>
              <div className="mt-2 pt-2 border-t border-white/10 flex items-center gap-1.5 text-indigo-400">
                <Zap size={12} className="fill-indigo-400" />
                <span className="font-medium tracking-wide">Di-reset otomatis tengah malam</span>
              </div>
              
              {/* Triangle pointer bottom */}
              <div className="absolute -bottom-1.5 left-8 w-3 h-3 bg-[#1e2336] border-b border-r border-white/10 transform rotate-45"></div>
            </div>

            <div className="flex justify-between items-center mb-2">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Limit Harian</span>
              <span className={`text-xs font-bold ${rateLimit.count >= rateLimit.limit ? 'text-red-400' : 'text-slate-300'}`}>
                {rateLimit.count} / {rateLimit.limit}
              </span>
            </div>
            <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-500 ease-out 
                  ${rateLimit.count >= rateLimit.limit ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' 
                  : rateLimit.count >= rateLimit.limit * 0.8 ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]'
                  : 'bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]'}`}
                style={{ width: `${Math.min(100, (Math.max(0, rateLimit.count) / rateLimit.limit) * 100)}%` }}
              ></div>
            </div>
            {rateLimit.count >= rateLimit.limit && (
              <p className="text-[10px] text-red-400/80 mt-1.5 leading-tight">Limit habis. Sila coba kembali esok hari.</p>
            )}
          </div>
        )}

        {/* User Profile */}
        <div className="p-4 border-t border-white/5 bg-[#0d0f1b]">
          {status === "authenticated" ? (
            <div
              className="flex items-center gap-3 w-full p-2 hover:bg-white/5 rounded-xl cursor-pointer transition-colors group"
              onClick={handleLogout}
            >
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-500 flex items-center justify-center text-white font-bold shrink-0">
                {session?.user?.name?.[0]?.toUpperCase() || 'U'}
              </div>
              <div className="flex flex-col text-left overflow-hidden flex-1">
                <span className="text-sm font-semibold text-white truncate">{session?.user?.name}</span>
                <span className="text-[11px] text-slate-400 truncate">{session?.user?.email}</span>
              </div>
              <LogOut size={16} className="text-slate-500 group-hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all shrink-0" />
            </div>
          ) : (
            <Link href="/login" className="flex items-center gap-3 w-full p-2 hover:bg-white/5 rounded-xl transition-colors">
              <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 shrink-0">
                <LogIn size={18} />
              </div>
              <div className="flex flex-col text-left">
                <span className="text-sm font-semibold text-white">Guest Mode</span>
                <span className="text-[11px] text-indigo-400">Click to login</span>
              </div>
            </Link>
          )}
        </div>
      </aside>
    </>
  );
}
