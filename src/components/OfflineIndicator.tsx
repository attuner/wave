import React from 'react';
import { WifiOff, Music } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { audioEngine } from '../services/audioEngine';
import { DEFAULT_STATIONS } from '../data/defaultStations';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  const playOfflineSynth = () => {
    const offlineStation = DEFAULT_STATIONS.find((s) => s.isProcedural);
    if (offlineStation) {
      audioEngine.playStation(offlineStation);
    }
  };

  return (
    <div className="fixed bottom-20 left-4 right-4 md:left-auto md:right-6 md:w-96 z-50 flex items-center justify-between gap-3 rounded-2xl bg-amber-950/90 border border-amber-600/40 p-3.5 shadow-2xl backdrop-blur-md text-amber-100">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0">
          <WifiOff className="w-4 h-4 text-amber-400" />
        </div>
        <div>
          <div className="text-xs font-bold text-amber-200">You are currently offline</div>
          <div className="text-[11px] text-amber-300/80">Online streams paused. Offline Lo-Fi radio available.</div>
        </div>
      </div>
      <button
        onClick={playOfflineSynth}
        className="flex items-center gap-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 px-2.5 py-1.5 text-xs font-bold transition shrink-0"
      >
        <Music className="w-3.5 h-3.5" />
        <span>Play Offline</span>
      </button>
    </div>
  );
};
