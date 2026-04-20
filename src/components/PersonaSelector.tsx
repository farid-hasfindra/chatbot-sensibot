"use client";

import { useState, useRef, useEffect } from "react";
import { Sparkles, Save, Edit3, X, Trash2, Plus, MessageSquare } from "lucide-react";
import { useSession } from "next-auth/react";

export const PERSONA_PRESETS = [
  { id: 'ramah', name: 'Ramah', icon: '😄', prompt: 'Kamu adalah AI SensiBOT yang super ramah, sopan, dan selalu antusias membantu menjawab setiap pertanyaan user dengan baik dan sabar. Gunakan emoji yang relevan secara natural dan tidak berlebihan (cukup 1-2 emoji pada bagian yang paling sesuai).' },
  { id: 'pemarah', name: 'Pemarah', icon: '😡', prompt: 'Kamu adalah AI asisten jenius tapi super pemarah, gampang ketus, sarkastik, dan suka nge-judge atau meremehkan user. Tunjukkan kepribadian judesmu di setiap jawaban seolah-olah user selalu merepotkanmu. TAPI INGAT: Kamu SAMA SEKALI TIDAK BOLEH menggunakan kata-kata kotor, makian, atau sumpah serapah (NO SWEARING). Tetap berikan jawaban atas pertanyaan user, tapi balas dengan nada kesal. Gunakan 1-2 emoji kesal atau marah yang sesuai untuk memperkuat emosimu.' },
  { id: 'tegas', name: 'Tegas', icon: '👔', prompt: 'Kamu adalah AI asisten yang sangat tegas, to-the-point, berwibawa, profesional, dan disiplin. Jangan pernah bertele-tele saat menjawab. Jawab langsung ke intinya dengan efisien eksplisit dan instruktif. Gunakanlah emoji yang formal atau tegas secara sangat terbatas hanya jika benar-benar diperlukan.' }
];

interface CustomPersona {
  id: string;
  name: string;
  prompt: string;
}

interface PersonaSelectorProps {
  currentPrompt: string | null;
  onSelect: (prompt: string) => void;
}

export default function PersonaSelector({ currentPrompt, onSelect }: PersonaSelectorProps) {
  const { status } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [isCustomMode, setIsCustomMode] = useState(false);
  
  const [customPersonas, setCustomPersonas] = useState<CustomPersona[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [customName, setCustomName] = useState("");
  const [customText, setCustomText] = useState("");
  
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (status === "authenticated") fetchCustomPersonas();
    else setCustomPersonas([]);
  }, [status]);

  const fetchCustomPersonas = async () => {
    try {
      const res = await fetch("/api/user/custom-personas");
      if (res.ok) {
        const data = await res.json();
        setCustomPersonas(data.customPersonas);
      }
    } catch(e) {}
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = (prompt: string) => {
    onSelect(prompt);
    setIsOpen(false);
    setIsCustomMode(false);
  };

  const openEditor = (persona?: CustomPersona) => {
    if (persona) {
      setEditingId(persona.id);
      setCustomName(persona.name);
      setCustomText(persona.prompt);
    } else {
      setEditingId(null);
      setCustomName("");
      setCustomText(isCustom && status === "unauthenticated" && currentPrompt ? currentPrompt : "");
    }
    setIsCustomMode(true);
  };

  const handleSaveCustom = async () => {
    if (!customText.trim()) return;
    const nameToSave = customName.trim() || "Kustom Tanpa Nama";

    if (status !== "authenticated") {
      handleSelect(customText.trim());
      return;
    }

    try {
      if (editingId) {
        await fetch(`/api/user/custom-personas/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: nameToSave, prompt: customText })
        });
      } else {
        await fetch(`/api/user/custom-personas`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: nameToSave, prompt: customText })
        });
      }
      await fetchCustomPersonas();
      handleSelect(customText.trim());
    } catch(e) {}
  };

  const handleDelete = async (e: React.MouseEvent, persona: CustomPersona) => {
    e.stopPropagation();
    if (!confirm(`Hapus kepribadian "${persona.name}"?`)) return;
    try {
      await fetch(`/api/user/custom-personas/${persona.id}`, { method: "DELETE" });
      setCustomPersonas(prev => prev.filter(c => c.id !== persona.id));
      if (currentPrompt === persona.prompt) {
        onSelect(PERSONA_PRESETS[0].prompt); // Revert to Ramah if active deleted
      }
    } catch(e) {}
  };

  const currentPreset = PERSONA_PRESETS.find(p => p.prompt === currentPrompt);
  const currentCustom = customPersonas.find(c => c.prompt === currentPrompt);
  const isCustom = !currentPreset && !!currentPrompt;
  
  const activeIcon = currentPreset ? currentPreset.icon : '✨';
  const activeName = currentPreset 
    ? currentPreset.name 
    : (currentCustom ? currentCustom.name : (isCustom ? 'Kustom' : 'Ramah'));

  return (
    <div className="relative" ref={menuRef}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="cursor-pointer flex items-center gap-1.5 sm:gap-2 bg-[#131722] border border-white/10 hover:bg-[#1e2336] transition-colors py-1.5 px-2.5 sm:px-3 rounded-xl text-xs sm:text-sm font-medium text-slate-200"
      >
        <div className="w-5 h-5 rounded-md bg-purple-500/20 flex items-center justify-center text-[11px] text-white shrink-0">
          {activeIcon}
        </div>
        <span className="text-purple-300 font-bold max-w-[50px] sm:max-w-none truncate">{activeName}</span>
      </div>

      {isOpen && (
        <div className="fixed inset-x-4 sm:inset-x-auto top-20 sm:absolute sm:right-0 sm:top-full sm:mt-2 sm:w-72 bg-[#1e2336] border border-white/10 rounded-xl shadow-2xl z-[100] overflow-hidden flex flex-col">
          {!isCustomMode ? (
            <div className="max-h-[70vh] overflow-y-auto">
              {/* Presets */}
              <div className="sticky top-0 bg-[#1e2336] z-10 px-3 py-2 border-b border-white/10 text-[10px] font-bold text-slate-400 uppercase tracking-widest flex justify-between items-center">
                <span>Bawaan Sistem</span>
              </div>
              <div className="py-1">
                {PERSONA_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => handleSelect(preset.prompt)}
                    className={`w-full text-left px-3 py-2.5 transition-colors flex items-start gap-3 ${
                      currentPrompt === preset.prompt || (!currentPrompt && preset.id === 'ramah')
                        ? 'bg-purple-500/10 text-purple-400' 
                        : 'text-slate-300 hover:bg-white/5'
                    }`}
                  >
                    <span className="text-xl shrink-0 mt-0.5">{preset.icon}</span>
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold">{preset.name}</span>
                      <span className="text-[10px] text-slate-500 line-clamp-2 leading-tight mt-0.5">{preset.prompt}</span>
                    </div>
                  </button>
                ))}
              </div>

              {/* Custom Personas section (Only visible if authenticated) */}
              {status === "authenticated" && (
                <>
                  <div className="sticky top-0 bg-[#1e2336] z-10 px-3 py-2 border-y border-white/10 text-[10px] font-bold text-purple-400 uppercase tracking-widest flex justify-between items-center mt-1">
                    <span>Kustom Anda</span>
                  </div>
                  <div className="py-1">
                    {customPersonas.length === 0 ? (
                       <p className="px-3 py-2 text-xs text-slate-500 text-center">Belum ada karakter kustom.</p>
                    ) : (
                      customPersonas.map((persona) => (
                        <div
                          key={persona.id}
                          onClick={() => handleSelect(persona.prompt)}
                          className={`w-full text-left px-3 py-2.5 transition-colors flex items-center justify-between group cursor-pointer ${
                            currentPrompt === persona.prompt
                              ? 'bg-purple-500/10 text-purple-400' 
                              : 'text-slate-300 hover:bg-white/5'
                          }`}
                        >
                          <div className="flex items-center gap-2 overflow-hidden">
                            <Sparkles size={14} className="shrink-0 text-purple-400" />
                            <span className="text-sm font-medium truncate">{persona.name}</span>
                          </div>
                          
                          <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={(e) => { e.stopPropagation(); openEditor(persona); }}
                              className="p-1.5 hover:bg-white/10 rounded-md text-slate-400 hover:text-white transition-colors"
                            >
                              <Edit3 size={13} />
                            </button>
                            <button 
                              onClick={(e) => handleDelete(e, persona)}
                              className="p-1.5 hover:bg-red-500/20 rounded-md text-slate-400 hover:text-red-400 transition-colors"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </>
               )}

              {/* Create new button */}
              <div className="sticky bottom-0 bg-[#1e2336] mx-2 mb-2 mt-1 pt-2 border-t border-white/10 z-10">
                <button
                  onClick={() => openEditor()}
                  className="w-full text-center px-2 py-2 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm font-medium bg-white/5 hover:bg-white/10 text-white"
                >
                  <Plus size={16} />
                  {status === "authenticated" ? "Tambah Karakter Kustom" : "Ubah Karakter Kustom Singgahan"}
                </button>
              </div>
            </div>
          ) : (
            <div className="p-3 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-white flex items-center gap-2">
                   <Edit3 size={16} className="text-purple-400"/>
                   {editingId ? "Edit Karakter" : "Karakter Baru"}
                </span>
                <button onClick={() => setIsCustomMode(false)} className="text-slate-400 hover:text-white">
                  <X size={16}/>
                </button>
              </div>

              {status === "authenticated" && (
                <div>
                  <label className="text-[10px] text-slate-400 font-medium mb-1 block">Nama Karakter</label>
                  <input
                    type="text"
                    autoFocus
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder="Contoh: Bajak Laut"
                    className="w-full bg-[#131722] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500 placeholder:text-slate-600"
                  />
                </div>
              )}

              <div>
                <label className="text-[10px] text-slate-400 font-medium mb-1 block">Instruksi / Prompt Sistem</label>
                <textarea
                  value={customText}
                  onChange={(e) => setCustomText(e.target.value)}
                  placeholder="Instruksikan bagaimana AI harus bersikap..."
                  className="w-full h-28 bg-[#131722] border border-white/10 rounded-lg p-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500 resize-none placeholder:text-slate-600"
                />
              </div>

              <button 
                onClick={handleSaveCustom}
                disabled={!customText.trim() || (status === "authenticated" && !customName.trim())}
                className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium py-2 rounded-lg transition-all flex items-center justify-center gap-2"
              >
                <Save size={16} />
                {status === "authenticated" ? "Simpan & Gunakan" : "Gunakan Temporer"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
