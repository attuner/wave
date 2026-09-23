import React from 'react';
import { Radio, Mic, Headphones, Moon, Signal } from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';

interface HeaderProps {
  currentTab: 'player' | 'broadcaster';
  onTabChange: (tab: 'player' | 'broadcaster') => void;
  onOpenSleepTimer: () => void;
  onOpenAudioGuide: () => void;
  isBroadcastingLive: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onTabChange,
  onOpenSleepTimer,
  onOpenAudioGuide,
  isBroadcastingLive,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
        {/* Brand Logo */}
        <div className="flex items-center gap-2.5">
          <div className="relative w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 p-0.5 shadow-lg shadow-cyan-500/20 flex items-center justify-center">
            <Radio className="w-5 h-5 text-white" />
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-cyan-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base tracking-tight bg-gradient-to-r from-white via-slate-100 to-cyan-200 bg-clip-text text-transparent">
                WaveCast
              </span>
              <span className="hidden sm:inline-block px-1.5 py-0.5 text-[9px] font-bold tracking-widest uppercase bg-cyan-950 text-cyan-400 border border-cyan-500/30 rounded">
                Live Radio PWA
              </span>
            </div>
            <p className="text-[10px] text-slate-400 hidden sm:block">
              Continuous live broadcasting & background audio
            </p>
          </div>
        </div>

        {/* View Switcher: Listener / Broadcaster */}
        <div className="flex items-center bg-slate-900 border border-slate-800 p-1 rounded-2xl">
          <button
            onClick={() => onTabChange('player')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
              currentTab === 'player'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Headphones className="w-3.5 h-3.5" />
            <span>Listener</span>
          </button>

          <button
            onClick={() => onTabChange('broadcaster')}
            className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
              currentTab === 'broadcaster'
                ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Mic className="w-3.5 h-3.5" />
            <span>Broadcaster</span>
            {isBroadcastingLive && (
              <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse ml-0.5" />
            )}
          </button>
        </div>

        {/* Action Controls & PWA Install */}
        <div className="flex items-center gap-2">
          {/* Background Audio Info Trigger */}
          <button
            onClick={onOpenAudioGuide}
            className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-cyan-500/40 text-slate-300 text-xs font-medium transition"
            title="Background Audio & Lockscreen Support"
          >
            <Signal className="w-3.5 h-3.5 text-cyan-400" />
            <span>Background Play</span>
          </button>

          {/* Sleep Timer */}
          <button
            onClick={onOpenSleepTimer}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-indigo-500/40 text-slate-300 transition"
            title="Set Sleep Timer"
          >
            <Moon className="w-4 h-4 text-indigo-400" />
          </button>

          {/* PWA Install Button */}
          <PWAInstallButton />
        </div>
      </div>
    </header>
  );
};
