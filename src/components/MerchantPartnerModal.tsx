import React, { useState } from 'react';
import { X, Sparkles, Check, Building2, TrendingUp, Tag, ShieldCheck, Send } from 'lucide-react';
import { sound, haptic } from '../utils/audioHaptics';

interface MerchantPartnerModalProps {
  isOpen: boolean;
  onClose: () => void;
  placeTitle?: string;
}

export const MerchantPartnerModal: React.FC<MerchantPartnerModalProps> = ({
  isOpen,
  onClose,
  placeTitle,
}) => {
  const [businessName, setBusinessName] = useState(placeTitle || '');
  const [ownerName, setOwnerName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [selectedPlan, setSelectedPlan] = useState<'essencial' | 'pro' | 'vip'>('pro');
  const [isSubmitted, setIsSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sound.success();
    haptic.success();
    setIsSubmitted(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-[#14102E] border border-white/20 rounded-[32px] p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto no-scrollbar">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-[#6A4CFF] to-[#D4FF3A] p-0.5">
              <div className="w-full h-full bg-[#14102E] rounded-[14px] flex items-center justify-center">
                <Building2 className="w-5 h-5 text-[#D4FF3A]" />
              </div>
            </div>
            <div>
              <span className="text-[10px] font-unbounded text-[#D4FF3A] font-bold uppercase tracking-wider">
                Monetização & Lojistas
              </span>
              <h2 className="font-unbounded font-black text-lg text-white">
                Seja um Parceiro vamo.AI
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

        {isSubmitted ? (
          <div className="py-8 text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center mx-auto">
              <Check className="w-8 h-8" />
            </div>
            <h3 className="font-unbounded font-black text-xl text-white">
              Proposta Enviada com Sucesso!
            </h3>
            <p className="text-xs text-white/70 max-w-sm mx-auto leading-relaxed">
              Recebemos o cadastro do estabelecimento <strong>{businessName}</strong>. Nossa equipe entrará em contato via WhatsApp para ativar seus cupons e selo de parceiro!
            </p>
            <button
              onClick={() => {
                sound.tap();
                setIsSubmitted(false);
                onClose();
              }}
              className="mt-4 px-6 py-2.5 rounded-full bg-[#D4FF3A] text-[#14102E] font-unbounded font-black text-xs"
            >
              Concluir
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="py-4 space-y-4">
            <p className="text-xs text-white/70 leading-relaxed">
              Atraia clientes qualificados que estão decidindo onde sair <strong>agora</strong> na sua cidade. Ofereça cupons exclusivos e ganhe prioridade no radar vamo.AI.
            </p>

            {/* Plan Options */}
            <div className="space-y-2">
              <label className="text-[11px] font-unbounded font-bold text-white/80 block">
                Escolha o plano de monetização:
              </label>

              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'essencial', name: 'Essencial', price: 'R$ 89/mês', perk: '1 Cupom Ativo' },
                  { id: 'pro', name: 'Destaque Pro', price: 'R$ 169/mês', perk: '3 Cupons + Prioridade' },
                  { id: 'vip', name: 'VIP Radar', price: 'R$ 299/mês', perk: 'Topo do Mapa + Push' },
                ].map((plan) => {
                  const isSelected = selectedPlan === plan.id;
                  return (
                    <button
                      type="button"
                      key={plan.id}
                      onClick={() => {
                        sound.tap();
                        haptic.light();
                        setSelectedPlan(plan.id as any);
                      }}
                      className={`p-3 rounded-2xl border text-left transition-all ${
                        isSelected
                          ? 'bg-[#6A4CFF]/30 border-[#D4FF3A] text-white shadow-md'
                          : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
                      }`}
                    >
                      <span className="text-[11px] font-unbounded font-black block text-white truncate">
                        {plan.name}
                      </span>
                      <span className="text-xs font-bold text-[#D4FF3A] block my-0.5">
                        {plan.price}
                      </span>
                      <span className="text-[9px] text-white/60 block truncate">
                        {plan.perk}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Form Inputs */}
            <div className="space-y-3 pt-1">
              <div>
                <label className="text-[11px] font-bold text-white/80 block mb-1">
                  Nome do Estabelecimento:
                </label>
                <input
                  type="text"
                  required
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="Ex: Bar do Alemão, Bistrô Milano..."
                  className="w-full p-3 rounded-xl bg-black/40 border border-white/15 text-white text-xs placeholder:text-white/40 focus:border-[#D4FF3A] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-white/80 block mb-1">
                  Seu Nome / Cargo:
                </label>
                <input
                  type="text"
                  required
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  placeholder="Ex: Carlos Oliveira (Proprietário / Gerente)"
                  className="w-full p-3 rounded-xl bg-black/40 border border-white/15 text-white text-xs placeholder:text-white/40 focus:border-[#D4FF3A] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-white/80 block mb-1">
                  WhatsApp para Contato e Ativação:
                </label>
                <input
                  type="tel"
                  required
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  placeholder="(11) 98765-4321"
                  className="w-full p-3 rounded-xl bg-black/40 border border-white/15 text-white text-xs placeholder:text-white/40 focus:border-[#D4FF3A] focus:outline-none font-mono"
                />
              </div>
            </div>

            {/* Benefits List */}
            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-1.5 text-xs text-white/80">
              <div className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-[#D4FF3A]" />
                <span>Exibição em destaque para usuários navegando na sua cidade</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-[#D4FF3A]" />
                <span>Cupons de desconto exclusivos com código personalizado</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-[#D4FF3A]" />
                <span>Link direto para pedir delivery no seu iFood oficial</span>
              </div>
            </div>

            {/* Submit CTA */}
            <button
              type="submit"
              className="w-full py-4 px-5 rounded-2xl bg-gradient-to-r from-[#D4FF3A] to-[#a6f000] text-[#14102E] font-unbounded font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-[0_6px_20px_rgba(212,255,58,0.35)] active:scale-95 transition-all cursor-pointer"
            >
              <Send className="w-4 h-4 fill-[#14102E]" />
              <span>Solicitar Contato do Time Comercial</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
