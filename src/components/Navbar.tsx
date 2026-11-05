import React from 'react';
import { MapPin, User, Settings, Navigation2, LogIn, Smartphone } from 'lucide-react';
import { VamoLogo } from './VamoLogo';
import { useLocation } from '../context/LocationContext';
import { useAuth } from '../firebase/authContext';
import { sound } from '../utils/audioHaptics';

interface NavbarProps {
  onOpenLocationModal: () => void;
  onOpenProfileModal: () => void;
  onOpenSettingsModal: () => void;
  onOpenInstallModal?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenLocationModal,
  onOpenProfileModal,
  onOpenSettingsModal,
  onOpenInstallModal,
}) => {
  const { currentCity, isGpsActive } = useLocation();
  const { user, profile } = useAuth();

  return (
    <nav className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0 relative z-30">
      {/* Brand Logo */}
      <VamoLogo size="md" />

      {/* Center Location Trigger */}
      <button
        onClick={() => {
          sound.tap();
          onOpenLocationModal();
        }}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/15 border border-white/15 text-xs text-white/90 transition-all max-w-[160px] truncate group"
      >
        <MapPin className={`w-3.5 h-3.5 shrink-0 ${isGpsActive ? 'text-[#D4FF3A] animate-pulse' : 'text-[#FF3D7F]'}`} />
        <span className="truncate font-medium text-[11px]">
          {currentCity.name} · {currentCity.neighborhood.split('/')[0]}
        </span>
      </button>

      {/* Right User & Settings Actions */}
      <div className="flex items-center gap-1.5">
        {onOpenInstallModal && (
          <button
            onClick={() => {
              sound.tap();
              onOpenInstallModal();
            }}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#D4FF3A]/15 hover:bg-[#D4FF3A]/25 border border-[#D4FF3A]/30 text-[#D4FF3A] text-[10px] font-unbounded font-bold transition-all cursor-pointer active:scale-95"
            title="Instalar vamo.AI no celular (App)"
          >
            <Smartphone className="w-3 h-3 text-[#D4FF3A]" />
            <span className="hidden sm:inline">App</span>
          </button>
        )}

        <button
          onClick={() => {
            sound.tap();
            onOpenProfileModal();
          }}
          className="relative w-8 h-8 rounded-full border border-white/20 overflow-hidden flex items-center justify-center bg-[#251d4d] hover:border-[#D4FF3A] transition-all"
          title={user ? profile?.displayName || 'Meu Perfil' : 'Fazer Login'}
        >
          {profile?.photoURL ? (
            <img 
              src={profile.photoURL} 
              alt={profile.displayName} 
              className="w-full h-full object-cover" 
            />
          ) : (
            <User className="w-4 h-4 text-white/80" />
          )}
          {user && (
            <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-[#D4FF3A] ring-1 ring-[#14102E]" />
          )}
        </button>

        <button
          onClick={() => {
            sound.tap();
            onOpenSettingsModal();
          }}
          className="w-8 h-8 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-all"
          title="Configurações"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </nav>
  );
};
