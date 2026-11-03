import React, { useState } from 'react';
import { X, ArrowRight, ArrowLeft, Check, Sparkles, Heart, Users, User, Briefcase, Smile, Utensils, Wine, Music, Coffee, Scissors, Sun } from 'lucide-react';
import { OutingPlanSession } from '../types';
import { sound } from '../utils/audioHaptics';

interface ThreeTouchDecideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (session: OutingPlanSession) => void;
  initialVibe?: string;
}

export const ThreeTouchDecideModal: React.FC<ThreeTouchDecideModalProps> = ({
  isOpen,
  onClose,
  onComplete,
  initialVibe,
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [when, setWhen] = useState<OutingPlanSession['when']>('agora');
  const [withWhom, setWithWhom] = useState<OutingPlanSession['withWhom']>('casal');
  const [vibe, setVibe] = useState<OutingPlanSession['vibe']>(
    (initialVibe as OutingPlanSession['vibe']) || 'gastronomia'
  );

  if (!isOpen) return null;

  const handleNext = () => {
    sound.tap();
    if (step === 1) setStep(2);
    else if (step === 2) setStep(3);
    else {
      sound.success();
      onComplete({ when, withWhom, vibe });
    }
  };

  const handlePrev = () => {
    sound.tap();
    if (step > 1) setStep((step - 1) as 1 | 2);
    else onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-md p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-[#14102E] border border-white/15 rounded-t-[32px] sm:rounded-3xl p-6 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2">
            {step > 1 && (
              <button
                onClick={handlePrev}
                className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/80 hover:text-white"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <div>
              <span className="text-[10px] font-unbounded uppercase tracking-wider text-[#D4FF3A] font-bold">
                Toque {step} de 3
              </span>
              <h2 className="font-unbounded font-black text-lg text-white">
                {step === 1 && '1. Quando vamos?'}
                {step === 2 && '2. Com quem você vai?'}
                {step === 3 && '3. Qual é a vibe?'}
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

        {/* Step Progress Indicators */}
        <div className="grid grid-cols-3 gap-2 py-3 shrink-0">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                s <= step ? 'bg-[#D4FF3A]' : 'bg-white/10'
              }`}
            />
          ))}
        </div>

        {/* Step Content */}
        <div className="flex-1 overflow-y-auto py-3 space-y-2.5 no-scrollbar">
          {/* STEP 1: Quando */}
          {step === 1 && (
            <div className="space-y-2">
              {[
                { id: 'agora', title: 'Agora mesmo', subtitle: 'Aberto neste instante, pertinho de você', badge: 'Mais pedido' },
                { id: 'hoje_noite', title: 'Hoje à noite', subtitle: 'Pra jantar, tomar um drinque ou curtir um som' },
                { id: 'amanha_tarde', title: 'Amanhã de tarde', subtitle: 'Almoço caprichado, café ou parque' },
                { id: 'amanha_noite', title: 'Amanhã à noite', subtitle: 'Planejar o rolê do dia seguinte sem erro' },
                { id: 'fim_de_semana', title: 'Fim de semana', subtitle: 'Experiência para relaxar ou celebrar' },
              ].map((opt) => {
                const isSelected = when === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => {
                      sound.tap();
                      setWhen(opt.id as OutingPlanSession['when']);
                    }}
                    className={`w-full p-4 rounded-2xl text-left border transition-all flex items-center justify-between ${
                      isSelected
                        ? 'bg-[#6A4CFF]/30 border-[#D4FF3A] shadow-md'
                        : 'bg-white/5 border-white/10 hover:bg-white/10'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-unbounded font-bold text-sm text-white">
                          {opt.title}
                        </span>
                        {opt.badge && (
                          <span className="px-2 py-0.5 rounded-full bg-[#D4FF3A] text-[#14102E] font-black text-[9px] uppercase">
                            {opt.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-white/70 mt-0.5 font-sans">
                        {opt.subtitle}
                      </p>
                    </div>
                    {isSelected && (
                      <div className="w-6 h-6 rounded-full bg-[#D4FF3A] flex items-center justify-center text-[#14102E] shrink-0">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* STEP 2: Com quem */}
          {step === 2 && (
            <div className="space-y-2">
              {[
                { id: 'casal', title: 'Casal · romântico', subtitle: 'Clima intimista, pouca luz, boa conversa', icon: <Heart className="w-4 h-4 text-[#FF3D7F]" /> },
                { id: 'amigos', title: 'Amigos / galera', subtitle: 'Mesas juntas, chope, petisco e risada solta', icon: <Users className="w-4 h-4 text-[#D4FF3A]" /> },
                { id: 'sozinho', title: 'Sozinho (rolê solo)', subtitle: 'Balcão acolhedor, leitura, corte ou relaxar', icon: <User className="w-4 h-4 text-[#6A4CFF]" /> },
                { id: 'familia', title: 'Família & crianças', subtitle: 'Espaço confortável, menu amplo e seguro', icon: <Smile className="w-4 h-4 text-[#FFA36C]" /> },
                { id: 'trabalho', title: 'Reunião ou trabalho', subtitle: 'Café bom, tomadas, wi-fi e sem música alta', icon: <Briefcase className="w-4 h-4 text-emerald-400" /> },
              ].map((opt) => {
                const isSelected = withWhom === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => {
                      sound.tap();
                      setWithWhom(opt.id as OutingPlanSession['withWhom']);
                    }}
                    className={`w-full p-4 rounded-2xl text-left border transition-all flex items-center justify-between ${
                      isSelected
                        ? 'bg-[#6A4CFF]/30 border-[#D4FF3A] shadow-md'
                        : 'bg-white/5 border-white/10 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                        {opt.icon}
                      </div>
                      <div>
                        <span className="font-unbounded font-bold text-sm text-white block">
                          {opt.title}
                        </span>
                        <p className="text-xs text-white/70 font-sans mt-0.5">
                          {opt.subtitle}
                        </p>
                      </div>
                    </div>
                    {isSelected && (
                      <div className="w-6 h-6 rounded-full bg-[#D4FF3A] flex items-center justify-center text-[#14102E] shrink-0">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* STEP 3: Vibe */}
          {step === 3 && (
            <div className="space-y-2">
              {[
                { id: 'gastronomia', title: 'Comer muito bem', subtitle: 'Pratos autorais, bistrô ou clássicos da cidade', icon: <Utensils className="w-4 h-4 text-[#FFA36C]" /> },
                { id: 'drinques', title: 'Drinque bom & coquetelaria', subtitle: 'Rooftops, cartas premiadas e balcão charmoso', icon: <Wine className="w-4 h-4 text-[#FF3D7F]" /> },
                { id: 'agito', title: 'Música ao vivo & agito', subtitle: 'Samba de raiz, DJ, jazz ou pista fervendo', icon: <Music className="w-4 h-4 text-[#D4FF3A]" /> },
                { id: 'relax', title: 'Relaxar & café especial', subtitle: 'Brunch demorado, doces e ambiente zen', icon: <Coffee className="w-4 h-4 text-emerald-300" /> },
                { id: 'estilo', title: 'Barba & cabelo no talento', subtitle: 'Barbearia premium com chopp ou whisky cortesia', icon: <Scissors className="w-4 h-4 text-[#6A4CFF]" /> },
                { id: 'arlivre', title: 'Ar livre & pôr do sol', subtitle: 'Mesas na calçada, varanda ou vista panorâmica', icon: <Sun className="w-4 h-4 text-amber-300" /> },
              ].map((opt) => {
                const isSelected = vibe === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => {
                      sound.tap();
                      setVibe(opt.id as OutingPlanSession['vibe']);
                    }}
                    className={`w-full p-4 rounded-2xl text-left border transition-all flex items-center justify-between ${
                      isSelected
                        ? 'bg-[#6A4CFF]/30 border-[#D4FF3A] shadow-md'
                        : 'bg-white/5 border-white/10 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                        {opt.icon}
                      </div>
                      <div>
                        <span className="font-unbounded font-bold text-sm text-white block">
                          {opt.title}
                        </span>
                        <p className="text-xs text-white/70 font-sans mt-0.5">
                          {opt.subtitle}
                        </p>
                      </div>
                    </div>
                    {isSelected && (
                      <div className="w-6 h-6 rounded-full bg-[#D4FF3A] flex items-center justify-center text-[#14102E] shrink-0">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Action */}
        <div className="pt-4 border-t border-white/10 shrink-0">
          <button
            onClick={handleNext}
            className="w-full py-4 rounded-full bg-[#D4FF3A] hover:bg-[#c6f32e] text-[#14102E] font-unbounded font-black text-sm flex items-center justify-center gap-2 shadow-[0_8px_20px_rgba(212,255,58,0.35)] active:scale-95 transition-all cursor-pointer"
          >
            <span>{step === 3 ? 'Ver as 3 opções certas' : 'Continuar'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
