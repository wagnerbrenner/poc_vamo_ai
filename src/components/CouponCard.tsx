import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { Tag, Copy, Check, QrCode, Sparkles, X, ShieldCheck, Clock, AlertCircle } from 'lucide-react';
import confetti from 'canvas-confetti';
import { PartnerCoupon, PlaceItem } from '../types';
import { claimCouponInFirestore } from '../firebase/firestoreService';
import { useAuth } from '../firebase/authContext';
import { sound, haptic } from '../utils/audioHaptics';

interface CouponCardProps {
  coupon: PartnerCoupon;
  place: PlaceItem;
  onOpenPartnerModal?: () => void;
}

export const CouponCard: React.FC<CouponCardProps> = ({
  coupon,
  place,
  onOpenPartnerModal,
}) => {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [isClaimed, setIsClaimed] = useState(false);
  const [redemptionCode, setRedemptionCode] = useState<string | null>(null);
  const [isClaiming, setIsClaiming] = useState(false);

  // Generate QR Code data URL whenever modal opens or coupon changes
  useEffect(() => {
    const payload = coupon.qrPayload || `https://vamo.ai/cupons/${coupon.id}?code=${coupon.code}&place=${encodeURIComponent(place.title)}`;
    QRCode.toDataURL(payload, {
      width: 240,
      margin: 1.5,
      color: {
        dark: '#14102E',
        light: '#FFFFFF',
      },
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.warn('QR code generation error:', err));
  }, [coupon.id, coupon.code, coupon.qrPayload, place.title]);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(coupon.code);
    sound.success();
    haptic.success();
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleOpenQrModal = () => {
    sound.tap();
    haptic.medium();
    setIsQrModalOpen(true);
  };

  const handleConfirmRedemption = async () => {
    setIsClaiming(true);
    sound.success();
    haptic.success();
    const uid = user?.uid || 'guest-user';
    const code = await claimCouponInFirestore(coupon.id, uid);
    setRedemptionCode(code);
    setIsClaimed(true);
    setIsClaiming(false);

    confetti({
      particleCount: 60,
      spread: 60,
      origin: { y: 0.6 },
      colors: ['#D4FF3A', '#FF3D7F', '#6A4CFF'],
    });
  };

  return (
    <>
      <div className="p-4 rounded-2xl bg-gradient-to-r from-[#FF3D7F]/20 via-[#6A4CFF]/20 to-black/40 border border-[#FF3D7F]/40 shadow-lg space-y-3 relative overflow-hidden">
        {/* Top Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-unbounded font-black text-[#FF3D7F]">
            <Tag className="w-3.5 h-3.5" />
            <span>CUPOM DE PARCEIRO OFICIAL</span>
          </div>
          <span className="text-[9px] font-unbounded font-bold px-2 py-0.5 rounded-full bg-[#FF3D7F] text-white uppercase tracking-wider shadow-sm">
            {coupon.discount}
          </span>
        </div>

        {/* Title and Description */}
        <div>
          <h4 className="font-unbounded font-bold text-sm text-white">
            {coupon.title}
          </h4>
          <p className="text-xs text-white/80 font-sans mt-0.5 leading-relaxed">
            {coupon.description}
          </p>
        </div>

        {/* Voucher Code and Quick Copy */}
        <div className="flex items-center justify-between gap-2 bg-black/40 p-2.5 rounded-xl border border-white/10">
          <div>
            <span className="text-[9px] text-white/50 block font-mono">CÓDIGO PROMOCIONAL</span>
            <span className="font-mono font-black text-sm text-[#D4FF3A] tracking-wider">
              {coupon.code}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleCopyCode}
              className={`px-3 py-1.5 rounded-xl text-xs font-unbounded font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                copied
                  ? 'bg-emerald-500 text-white shadow-md'
                  : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
              title="Copiar código promocional"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                  <span>Copiado</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copiar</span>
                </>
              )}
            </button>

            {/* QR Code Action Button */}
            <button
              onClick={handleOpenQrModal}
              className="px-3 py-1.5 rounded-xl text-xs font-unbounded font-black bg-[#D4FF3A] hover:bg-[#c6f32e] text-[#14102E] flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>Ver QR Code</span>
            </button>
          </div>
        </div>

        {/* Conditions */}
        <div className="flex items-center justify-between text-[10px] text-white/50 pt-0.5">
          <span>{coupon.validUntil}</span>
          <span>{coupon.minSpend ? `Mínimo: ${coupon.minSpend}` : 'Sem valor mínimo'}</span>
        </div>
      </div>

      {/* QR Code Redemption Modal */}
      {isQrModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-[#14102E] border border-white/20 rounded-[32px] p-6 shadow-2xl relative text-center flex flex-col items-center">
            {/* Close Button */}
            <button
              onClick={() => {
                sound.tap();
                setIsQrModalOpen(false);
              }}
              className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/70 hover:text-white absolute top-4 right-4"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Modal Header */}
            <div className="w-10 h-10 rounded-2xl bg-[#FF3D7F]/20 text-[#FF3D7F] flex items-center justify-center mb-3">
              <QrCode className="w-5 h-5" />
            </div>

            <span className="text-[10px] font-unbounded font-bold text-[#D4FF3A] uppercase tracking-wider mb-1">
              Resgate no Balcão
            </span>
            <h3 className="font-unbounded font-black text-lg text-white mb-1">
              {coupon.discount} · {place.title}
            </h3>
            <p className="text-xs text-white/70 max-w-xs mb-4">
              Apresente este código ou QR Code ao atendente ou garçom no fechamento da sua conta.
            </p>

            {/* QR Code Canvas Frame */}
            <div className="p-3 bg-white rounded-2xl shadow-xl mb-4 border border-white/20">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt={`QR Code para cupom ${coupon.code}`}
                  className="w-48 h-48 rounded-lg"
                />
              ) : (
                <div className="w-48 h-48 flex items-center justify-center text-gray-400 text-xs">
                  Gerando QR Code...
                </div>
              )}
            </div>

            {/* Monospace Promo Code Badge */}
            <div className="w-full py-2.5 px-4 rounded-xl bg-black/50 border border-white/15 flex items-center justify-between mb-4">
              <div className="text-left">
                <span className="text-[9px] text-white/50 block font-mono">CÓDIGO DIGITAL</span>
                <span className="font-mono font-black text-sm text-[#D4FF3A] tracking-wider">
                  {coupon.code}
                </span>
              </div>
              <button
                onClick={handleCopyCode}
                className="px-2.5 py-1 rounded-lg bg-white/10 text-[11px] text-white/80 hover:text-white flex items-center gap-1"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Copiado' : 'Copiar'}</span>
              </button>
            </div>

            {/* Redemption State */}
            {isClaimed ? (
              <div className="w-full p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs space-y-1">
                <div className="flex items-center justify-center gap-1.5 font-bold">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Cupom Validado com Sucesso!</span>
                </div>
                {redemptionCode && (
                  <span className="font-mono text-[10px] text-emerald-200 block">
                    Protocolo: {redemptionCode}
                  </span>
                )}
              </div>
            ) : (
              <button
                onClick={handleConfirmRedemption}
                disabled={isClaiming}
                className="w-full py-3 px-4 rounded-2xl bg-[#D4FF3A] hover:bg-[#c6f32e] text-[#14102E] font-unbounded font-black text-xs flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all cursor-pointer"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>{isClaiming ? 'Validando...' : 'Confirmar Resgate no Local'}</span>
              </button>
            )}

            {/* Terms note */}
            <p className="text-[10px] text-white/40 mt-3 font-sans leading-relaxed">
              {coupon.terms || 'Válido para consumo no local. Apresente antes da emissão da nota fiscal.'}
            </p>
          </div>
        </div>
      )}
    </>
  );
};
