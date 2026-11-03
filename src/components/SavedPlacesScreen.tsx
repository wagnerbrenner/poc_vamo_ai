import React, { useState } from 'react';
import { 
  Bookmark, Heart, Star, Navigation, MapPin, 
  Trash2, Edit3, Check, Tag, Plus, Compass, 
  History, Sparkles, Clock, Calendar, Database 
} from 'lucide-react';
import { SavedPlace, PlaceItem } from '../types';
import { StoredDecision } from '../services/offlineCacheService';
import { updateSavedPlaceNotes } from '../firebase/firestoreService';
import { useAuth } from '../firebase/authContext';
import { useNetwork } from '../context/NetworkContext';
import { sound } from '../utils/audioHaptics';

interface SavedPlacesScreenProps {
  savedPlaces: SavedPlace[];
  decisionHistory: StoredDecision[];
  places: PlaceItem[];
  onSelectPlace: (place: PlaceItem) => void;
  onNavigateToPlace: (place: PlaceItem) => void;
  onRemoveSaved: (placeId: string) => void;
  onClearHistory?: () => void;
  onExplore: () => void;
}

export const SavedPlacesScreen: React.FC<SavedPlacesScreenProps> = ({
  savedPlaces,
  decisionHistory,
  places,
  onSelectPlace,
  onNavigateToPlace,
  onRemoveSaved,
  onClearHistory,
  onExplore,
}) => {
  const { user } = useAuth();
  const { effectiveOffline } = useNetwork();

  const [activeView, setActiveView] = useState<'guardados' | 'historico'>('guardados');
  const [selectedTag, setSelectedTag] = useState<string>('todos');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState<string>('');
  const [tagDraft, setTagDraft] = useState<string>('');

  // Extract unique custom tags
  const tags = Array.from(new Set(savedPlaces.map(p => p.customTag || 'Geral')));

  const filteredSaved = savedPlaces.filter(p => {
    if (selectedTag === 'todos') return true;
    return (p.customTag || 'Geral') === selectedTag;
  });

  const handleStartEdit = (saved: SavedPlace) => {
    sound.tap();
    setEditingId(saved.placeId);
    setNoteDraft(saved.notes || '');
    setTagDraft(saved.customTag || 'Quero ir');
  };

  const handleSaveEdit = async (placeId: string) => {
    sound.tap();
    if (user?.uid) {
      await updateSavedPlaceNotes(user.uid, placeId, noteDraft, tagDraft);
    }
    setEditingId(null);
    sound.success();
  };

  return (
    <div className="flex-1 flex flex-col bg-[#14102E] overflow-y-auto no-scrollbar p-4 sm:p-6 pb-20">
      {/* Top Segmented Tab Switcher */}
      <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-white/10 border border-white/10 mb-4 max-w-sm mx-auto w-full shrink-0">
        <button
          onClick={() => {
            sound.tap();
            setActiveView('guardados');
          }}
          className={`flex-1 py-2 rounded-xl text-xs font-unbounded font-bold flex items-center justify-center gap-1.5 transition-all ${
            activeView === 'guardados'
              ? 'bg-[#D4FF3A] text-[#14102E] shadow-md'
              : 'text-white/70 hover:text-white'
          }`}
        >
          <Bookmark className="w-3.5 h-3.5" />
          <span>Guardados ({savedPlaces.length})</span>
        </button>

        <button
          onClick={() => {
            sound.tap();
            setActiveView('historico');
          }}
          className={`flex-1 py-2 rounded-xl text-xs font-unbounded font-bold flex items-center justify-center gap-1.5 transition-all ${
            activeView === 'historico'
              ? 'bg-[#D4FF3A] text-[#14102E] shadow-md'
              : 'text-white/70 hover:text-white'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>Histórico ({decisionHistory.length})</span>
        </button>
      </div>

      {/* Offline Storage Status Badge */}
      <div className="flex items-center justify-between px-1 mb-4 text-xs text-white/60">
        <div className="flex items-center gap-1.5 text-[#D4FF3A]">
          <Database className="w-3.5 h-3.5" />
          <span className="font-semibold text-[11px]">AsyncStorage Cache Ativo</span>
        </div>
        <span className="text-[10px] text-white/50">
          {effectiveOffline ? 'Lendo dados offline' : 'Sincronizado na nuvem & local'}
        </span>
      </div>

      {/* VIEW 1: Guardados */}
      {activeView === 'guardados' && (
        <div className="space-y-4">
          {/* Filter by custom tags */}
          {tags.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
              <button
                onClick={() => {
                  sound.tap();
                  setSelectedTag('todos');
                }}
                className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                  selectedTag === 'todos'
                    ? 'bg-[#D4FF3A] text-[#14102E] font-bold'
                    : 'bg-white/5 text-white/70 hover:text-white border border-white/10'
                }`}
              >
                Todos ({savedPlaces.length})
              </button>
              {tags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => {
                    sound.tap();
                    setSelectedTag(tag);
                  }}
                  className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1 ${
                    selectedTag === tag
                      ? 'bg-[#FF3D7F] text-white font-bold'
                      : 'bg-white/5 text-white/70 hover:text-white border border-white/10'
                  }`}
                >
                  <Tag className="w-3 h-3" />
                  <span>{tag}</span>
                </button>
              ))}
            </div>
          )}

          {/* List of saved places */}
          {filteredSaved.length === 0 ? (
            <div className="text-center py-20 px-4 bg-white/5 rounded-3xl border border-white/10">
              <div className="w-12 h-12 rounded-full bg-[#FF3D7F]/20 text-[#FF3D7F] flex items-center justify-center mx-auto mb-3">
                <Heart className="w-6 h-6" />
              </div>
              <h3 className="font-unbounded font-bold text-base text-white mb-1">
                Nenhum lugar guardado ainda
              </h3>
              <p className="text-xs text-white/60 max-w-xs mx-auto mb-5 leading-relaxed">
                Toque no coração de qualquer restaurante, bar ou barbearia para salvar e acessar offline a qualquer hora.
              </p>
              <button
                onClick={() => {
                  sound.tap();
                  onExplore();
                }}
                className="px-5 py-3 rounded-full bg-[#D4FF3A] hover:bg-[#c6f32e] text-[#14102E] font-unbounded font-black text-xs inline-flex items-center gap-2 shadow-md cursor-pointer"
              >
                <Compass className="w-4 h-4" />
                <span>Explorar lugares agora</span>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredSaved.map((item) => {
                const fullPlace = places.find(p => p.id === item.placeId);
                const isEditing = editingId === item.placeId;

                return (
                  <div
                    key={item.id}
                    className="p-4 rounded-3xl bg-[#1b153d] border border-white/10 space-y-3 shadow-lg"
                  >
                    <div className="flex items-start gap-3">
                      <img
                        src={item.imageUrl}
                        alt={item.title}
                        className="w-20 h-20 rounded-2xl object-cover shrink-0 border border-white/10"
                      />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-1">
                          <div>
                            <span className="text-[10px] font-unbounded text-[#D4FF3A] font-bold">
                              {item.category}
                            </span>
                            <h3 className="font-unbounded font-bold text-sm text-white truncate">
                              {item.title}
                            </h3>
                          </div>

                          <button
                            onClick={() => {
                              sound.pop();
                              onRemoveSaved(item.placeId);
                            }}
                            className="text-white/40 hover:text-rose-400 p-1"
                            title="Remover dos guardados"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        <p className="text-xs text-white/60 mt-0.5 truncate">
                          {item.address} · {item.neighborhood}
                        </p>

                        <div className="flex items-center gap-2 mt-1">
                          <span className="flex items-center gap-1 text-xs text-[#D4FF3A] font-bold">
                            <Star className="w-3 h-3 fill-current" />
                            {item.rating}
                          </span>
                          <span className="text-xs text-white/50">{item.priceLevel}</span>
                          <span className="px-2 py-0.5 rounded-full bg-white/10 text-[10px] text-white/80 font-medium">
                            #{item.customTag || 'Geral'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Personal Notes / Custom Tags Area */}
                    <div className="p-3 rounded-2xl bg-black/30 border border-white/10 text-xs">
                      {isEditing ? (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-white/70">Tag:</span>
                            <input
                              type="text"
                              value={tagDraft}
                              onChange={(e) => setTagDraft(e.target.value)}
                              placeholder="Ex: Date, Sextou, Almoço..."
                              className="flex-1 px-2.5 py-1 rounded-lg bg-white/10 text-white text-xs border border-white/15 focus:border-[#D4FF3A] focus:outline-none"
                            />
                          </div>
                          <textarea
                            value={noteDraft}
                            onChange={(e) => setNoteDraft(e.target.value)}
                            placeholder="Anotações pessoais (ex: pedir mesa externa, garçom recomendou o polvo...)"
                            rows={2}
                            className="w-full p-2 rounded-lg bg-white/10 text-white text-xs border border-white/15 focus:border-[#D4FF3A] focus:outline-none placeholder:text-white/40"
                          />
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => setEditingId(null)}
                              className="px-2.5 py-1 text-[11px] text-white/60 hover:text-white"
                            >
                              Cancelar
                            </button>
                            <button
                              onClick={() => handleSaveEdit(item.placeId)}
                              className="px-3 py-1 rounded-lg bg-[#D4FF3A] text-[#14102E] font-bold text-[11px] flex items-center gap-1"
                            >
                              <Check className="w-3 h-3" />
                              <span>Salvar nota</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex-1">
                            <span className="text-[10px] text-white/50 block font-medium">
                              Nota particular (salva offline):
                            </span>
                            <p className="text-white/85 text-[11px] italic">
                              {item.notes ? `“${item.notes}”` : 'Nenhuma anotação adicionada ainda.'}
                            </p>
                          </div>
                          <button
                            onClick={() => handleStartEdit(item)}
                            className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/15 text-white/70 hover:text-white text-[11px] flex items-center gap-1 shrink-0"
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>Editar</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Card Actions */}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        onClick={() => {
                          if (fullPlace) onNavigateToPlace(fullPlace);
                        }}
                        className="py-2 px-3 rounded-xl bg-[#D4FF3A] hover:bg-[#c6f32e] text-[#14102E] font-unbounded font-black text-xs flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
                      >
                        <Navigation className="w-3 h-3 fill-[#14102E]" />
                        <span>Me leva lá</span>
                      </button>

                      <button
                        onClick={() => {
                          if (fullPlace) onSelectPlace(fullPlace);
                        }}
                        className="py-2 px-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-unbounded font-bold text-xs flex items-center justify-center gap-1 active:scale-95 transition-all cursor-pointer"
                      >
                        <span>Ver detalhes</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: Histórico de Decisões */}
      {activeView === 'historico' && (
        <div className="space-y-4">
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-[#6A4CFF]/20 to-[#FF3D7F]/20 border border-white/10 text-xs">
            <span className="font-unbounded font-bold text-[#D4FF3A] block mb-0.5">
              Histórico de Decisões Salvas
            </span>
            <p className="text-white/70">
              Todos os rolês decididos pelo "Decide por mim" ou 3 toques ficam salvos no AsyncStorage para consulta mesmo offline.
            </p>
          </div>

          {decisionHistory.length === 0 ? (
            <div className="text-center py-16 px-4 bg-white/5 rounded-3xl border border-white/10">
              <History className="w-10 h-10 text-white/30 mx-auto mb-2" />
              <h3 className="font-unbounded font-bold text-sm text-white mb-1">
                Nenhuma decisão recente registrada
              </h3>
              <p className="text-xs text-white/60 max-w-xs mx-auto mb-4">
                Use o botão "Decide por mim" na tela inicial para registrar seus rolês.
              </p>
              <button
                onClick={() => {
                  sound.tap();
                  onExplore();
                }}
                className="px-4 py-2 rounded-full bg-[#D4FF3A] text-[#14102E] font-bold text-xs"
              >
                Fazer uma escolha agora
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {decisionHistory.map((item) => {
                const fullPlace = places.find(p => p.id === item.chosenPlaceId);

                return (
                  <div
                    key={item.id}
                    className="p-4 rounded-3xl bg-[#1b153d] border border-white/10 space-y-2.5 shadow-md"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[#D4FF3A]" />
                        <span className="text-[11px] font-sans font-semibold text-white/60">
                          {new Date(item.timestamp).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} às {new Date(item.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded-full bg-white/10 text-[10px] text-white/80 font-bold">
                          {item.when}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-[#6A4CFF]/30 text-[10px] text-purple-200 font-bold">
                          {item.vibe}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {item.chosenPlaceImageUrl ? (
                        <img
                          src={item.chosenPlaceImageUrl}
                          alt={item.chosenPlaceName}
                          className="w-14 h-14 rounded-2xl object-cover shrink-0 border border-white/10"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-2xl bg-[#6A4CFF]/30 flex items-center justify-center text-[#D4FF3A] shrink-0 font-unbounded font-black">
                          3
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <span className="text-[10px] font-unbounded text-[#FFA36C] font-bold block">
                          Local escolhido:
                        </span>
                        <h4 className="font-unbounded font-bold text-sm text-white truncate">
                          {item.chosenPlaceName}
                        </h4>
                        <p className="text-xs text-white/60 truncate">
                          Companhia: {item.withWhom}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-white/10">
                      <button
                        onClick={() => {
                          if (fullPlace) onNavigateToPlace(fullPlace);
                        }}
                        className="py-1.5 px-3 rounded-xl bg-[#D4FF3A] hover:bg-[#c6f32e] text-[#14102E] font-unbounded font-bold text-[11px] flex items-center justify-center gap-1.5"
                      >
                        <Navigation className="w-3 h-3 fill-[#14102E]" />
                        <span>Me leva lá</span>
                      </button>

                      <button
                        onClick={() => {
                          if (fullPlace) onSelectPlace(fullPlace);
                        }}
                        className="py-1.5 px-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-unbounded font-bold text-[11px] flex items-center justify-center gap-1"
                      >
                        <span>Ver detalhes</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
