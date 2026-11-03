import React, { useState } from 'react';
import { 
  X, User, LogIn, LogOut, ShieldCheck, MapPin, 
  Sparkles, Heart, Compass, Check, ChevronRight 
} from 'lucide-react';
import { useAuth } from '../firebase/authContext';
import { useLocation, PRESET_CITIES } from '../context/LocationContext';
import { sound } from '../utils/audioHaptics';

import { UserVisit } from '../types';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  savedCount: number;
  visits?: UserVisit[];
  onSelectPlaceById?: (placeId: string) => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  savedCount,
  visits = [],
  onSelectPlaceById,
}) => {
  const { user, profile, signInWithGoogle, signInGuest, logout } = useAuth();
  const { currentCity, setCurrentCity, requestGpsLocation, isGpsActive, gpsLoading } = useLocation();
  const [selectedVibe, setSelectedVibe] = useState('gastronomia');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-md p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-[#14102E] border border-white/15 rounded-t-[32px] sm:rounded-3xl p-6 shadow-2xl flex flex-col max-h-[92vh] overflow-y-auto no-scrollbar">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#6A4CFF]/30 text-[#D4FF3A] flex items-center justify-center">
              <User className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-unbounded text-[#D4FF3A] font-bold uppercase tracking-wider">
                Perfil vamo.AI
              </span>
              <h2 className="font-unbounded font-black text-lg text-white">
                {user ? 'Minha Conta' : 'Entrar no vamo.AI'}
              </h2>
            </div>
          </div>

          <button
            onClick={() => {
              sound.tap();
              onClose();
            }}
            className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/70 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="py-4 space-y-5">
          {user ? (
            /* Logged in state */
            <div className="space-y-4">
              <div className="flex items-center gap-3.5 p-4 rounded-2xl bg-white/5 border border-white/10">
                <img
                  src={profile?.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'}
                  alt={profile?.displayName || 'Usuário'}
                  className="w-14 h-14 rounded-full object-cover border-2 border-[#D4FF3A] shadow-md"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-unbounded font-bold text-base text-white truncate">
                      {profile?.displayName || 'Usuário vamo.AI'}
                    </h3>
                    <ShieldCheck className="w-4 h-4 text-[#D4FF3A]" />
                  </div>
                  <p className="text-xs text-white/60 truncate">
                    {profile?.email || 'Autenticado via Firebase'}
                  </p>
                  <span className="inline-block mt-1 text-[10px] font-bold text-[#D4FF3A] bg-[#D4FF3A]/10 px-2 py-0.5 rounded-full border border-[#D4FF3A]/20">
                    Sincronização Firebase Ativa
                  </span>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-2">
                <div className="p-3 rounded-2xl bg-white/5 border border-white/10 text-center">
                  <span className="font-unbounded font-black text-xl text-[#D4FF3A] block">
                    {savedCount}
                  </span>
                  <span className="text-[10px] text-white/60 font-sans">
                    Guardados
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-white/5 border border-white/10 text-center">
                  <span className="font-unbounded font-black text-xl text-[#6A4CFF] block">
                    {visits.length}
                  </span>
                  <span className="text-[10px] text-white/60 font-sans">
                    Check-ins
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-white/5 border border-white/10 text-center">
                  <span className="font-unbounded font-black text-xl text-[#FF3D7F] block">
                    100%
                  </span>
                  <span className="text-[10px] text-white/60 font-sans">
                    Decisões
                  </span>
                </div>
              </div>

              {/* Visited Places History Section */}
              <div className="pt-1">
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-[#D4FF3A]" />
                    <span className="text-xs font-unbounded font-bold text-white">
                      Histórico de Visitas
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-[#D4FF3A] px-2 py-0.5 rounded-full bg-[#D4FF3A]/10 border border-[#D4FF3A]/20">
                    {visits.length} {visits.length === 1 ? 'visita' : 'visitas'}
                  </span>
                </div>

                {visits.length === 0 ? (
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-center">
                    <p className="text-xs text-white/70 mb-1 font-sans">
                      Nenhum check-in registrado ainda.
                    </p>
                    <span className="text-[11px] text-white/40 block">
                      Ao visitar um estabelecimento, abra o detalhe e toque em "Fazer Check-in".
                    </span>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-56 overflow-y-auto no-scrollbar pr-1">
                    {visits.map((visit) => {
                      const dateFormatted = new Date(visit.visitedAt).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      });
                      return (
                        <div
                          key={visit.id}
                          onClick={() => {
                            sound.tap();
                            if (onSelectPlaceById) {
                              onSelectPlaceById(visit.placeId);
                              onClose();
                            }
                          }}
                          className="p-2.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-between gap-3 transition-all cursor-pointer group"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            {visit.placeImageUrl ? (
                              <img
                                src={visit.placeImageUrl}
                                alt={visit.placeTitle}
                                className="w-10 h-10 rounded-xl object-cover shrink-0 border border-white/10"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-xl bg-[#6A4CFF]/30 flex items-center justify-center shrink-0 text-[#D4FF3A]">
                                <MapPin className="w-4 h-4" />
                              </div>
                            )}

                            <div className="min-w-0">
                              <h4 className="font-unbounded font-bold text-xs text-white group-hover:text-[#D4FF3A] transition-colors truncate">
                                {visit.placeTitle}
                              </h4>
                              <p className="text-[10px] text-white/60 truncate">
                                {visit.placeCategory} · {dateFormatted}
                              </p>
                              {visit.notes && visit.notes !== 'Check-in realizado pelo vamo.AI' && (
                                <p className="text-[10px] text-[#D4FF3A]/90 italic truncate mt-0.5">
                                  "{visit.notes}"
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <span className="text-[9px] font-bold text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-400/20">
                              Visitado
                            </span>
                            <ChevronRight className="w-3.5 h-3.5 text-white/40 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Logged out state */
            <div className="p-5 rounded-2xl bg-gradient-to-br from-[#251d4d] to-[#1b153d] border border-white/15 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-[#D4FF3A] text-[#14102E] flex items-center justify-center mx-auto shadow-lg">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-unbounded font-bold text-base text-white mb-1">
                  Sincronize seus rolês favoritos
                </h3>
                <p className="text-xs text-white/70 max-w-xs mx-auto">
                  Faça login para salvar lugares, registrar check-ins na coleção Visitas e sincronizar suas preferências.
                </p>
              </div>

              <div className="space-y-2 pt-2">
                <button
                  onClick={async () => {
                    sound.tap();
                    await signInWithGoogle();
                  }}
                  className="w-full py-3.5 px-4 rounded-full bg-white hover:bg-slate-100 text-[#14102E] font-unbounded font-black text-xs flex items-center justify-center gap-2 shadow-md active:scale-95 transition-all cursor-pointer"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                  </svg>
                  <span>Continuar com Google</span>
                </button>

                <button
                  onClick={async () => {
                    sound.tap();
                    await signInGuest();
                  }}
                  className="w-full py-2.5 text-xs text-white/70 hover:text-white font-medium underline"
                >
                  Entrar como Explorador Convidado
                </button>
              </div>
            </div>
          )}

          {/* City / Location Preference Switcher */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-unbounded font-bold text-white flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#FF3D7F]" />
                <span>Cidade ativa</span>
              </span>
              <button
                onClick={() => {
                  sound.tap();
                  requestGpsLocation();
                }}
                className={`text-[11px] font-bold flex items-center gap-1 ${
                  isGpsActive ? 'text-[#D4FF3A]' : 'text-white/60 hover:text-white'
                }`}
              >
                <span>{gpsLoading ? 'Buscando...' : 'Usar GPS Real'}</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {PRESET_CITIES.map((city) => {
                const isSelected = !isGpsActive && currentCity.id === city.id;
                return (
                  <button
                    key={city.id}
                    onClick={() => {
                      sound.tap();
                      setCurrentCity(city);
                    }}
                    className={`p-2.5 rounded-xl text-left border transition-all ${
                      isSelected
                        ? 'bg-[#6A4CFF]/30 border-[#D4FF3A] text-white shadow-sm'
                        : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
                    }`}
                  >
                    <span className="font-bold text-xs block text-white">
                      {city.name}
                    </span>
                    <span className="text-[10px] text-white/50 block truncate">
                      {city.neighborhood.split('/')[0]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Vibe Preference */}
          <div>
            <span className="text-xs font-unbounded font-bold text-white block mb-2">
              Vibe padrão favorita
            </span>
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'gastronomia', label: 'Gastronomia' },
                { id: 'drinques', label: 'Drinques & Cocktails' },
                { id: 'agito', label: 'Samba & Shows' },
                { id: 'relax', label: 'Café & Brunch' },
                { id: 'estilo', label: 'Barbearia & Cuidados' },
              ].map((v) => (
                <button
                  key={v.id}
                  onClick={() => {
                    sound.tap();
                    setSelectedVibe(v.id);
                  }}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                    selectedVibe === v.id
                      ? 'bg-[#D4FF3A] text-[#14102E] font-bold border-[#D4FF3A]'
                      : 'bg-white/5 border-white/10 text-white/70 hover:text-white'
                  }`}
                >
                  {v.label}
                </button>
              ))}
            </div>
          </div>

          {/* Logout Action */}
          {user && (
            <div className="pt-2 border-t border-white/10">
              <button
                onClick={async () => {
                  sound.tap();
                  await logout();
                }}
                className="w-full py-3 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 font-unbounded font-bold text-xs flex items-center justify-center gap-2 border border-rose-500/30 transition-all cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Desconectar da conta</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
