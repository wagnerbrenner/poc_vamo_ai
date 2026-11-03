import React, { useEffect, useState } from 'react';
import { DollarSign, Tag } from 'lucide-react';
import { sound, haptic } from '../utils/audioHaptics';

export type PriceLevelOption = 'todos' | '$' | '$$' | '$$$' | '$$$$';

interface PriceFilterBarProps {
  currentPrice: PriceLevelOption;
  onChangePrice: (price: PriceLevelOption) => void;
}

const STORAGE_KEY = '@vamo_ai:price_preference';

export const PriceFilterBar: React.FC<PriceFilterBarProps> = ({
  currentPrice,
  onChangePrice,
}) => {
  const levels: { id: PriceLevelOption; label: string; tooltip: string }[] = [
    { id: 'todos', label: 'Todos os preços', tooltip: 'Qualquer valor' },
    { id: '$', label: '$', tooltip: 'Até R$ 50 · Econômico' },
    { id: '$$', label: '$$', tooltip: 'R$ 50 a R$ 100 · Médio' },
    { id: '$$$', label: '$$$', tooltip: 'R$ 100 a R$ 200 · Especial' },
    { id: '$$$$', label: '$$$$', tooltip: 'R$ 200+ · Alta Gastronomia' },
  ];

  const handleSelect = (price: PriceLevelOption) => {
    sound.tap();
    haptic.medium();
    try {
      localStorage.setItem(STORAGE_KEY, price);
    } catch {
      // Ignore
    }
    onChangePrice(price);
  };

  return (
    <div className="w-full flex items-center justify-between gap-1.5 p-1.5 rounded-2xl bg-black/40 border border-white/10 backdrop-blur-md">
      <div className="flex items-center gap-1 pl-2 pr-1 text-white/50 shrink-0">
        <DollarSign className="w-3.5 h-3.5 text-[#D4FF3A]" />
        <span className="text-[10px] font-unbounded font-bold uppercase tracking-wider text-white/70 hidden sm:inline">
          Bolso:
        </span>
      </div>

      <div className="flex items-center gap-1 overflow-x-auto no-scrollbar flex-1 justify-end">
        {levels.map((item) => {
          const isActive = currentPrice === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleSelect(item.id)}
              title={item.tooltip}
              className={`px-3 py-1.5 rounded-xl text-xs font-unbounded font-bold transition-all shrink-0 active:scale-95 cursor-pointer ${
                isActive
                  ? 'bg-[#D4FF3A] text-[#14102E] shadow-sm shadow-[#D4FF3A]/30 scale-100 font-black'
                  : 'bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/5'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};
