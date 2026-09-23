import React, { useState } from 'react';
import { RadioStation, VisualizerTheme, PlaybackStatus } from '../types/radio';
import { Visualizer } from './Visualizer';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Radio,
  Wifi,
  Sparkles,
  Heart,
  RefreshCw,
  Headphones,
  ShieldCheck,
  Disc3,
} from 'lucide-react';

interface PlayerViewProps {
  currentStation: RadioStation;
  playbackStatus: PlaybackStatus;
  isPlaying: boolean;
  volume: number;
  isMuted: boolean;
  isFavorite: boolean;
  onPlay: () => void;
  onPause: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onVolumeChange: (vol: number) => void;
  onToggleMute: () => void;
  onToggleFavorite: () => void;
  onReconnect: () => void;
  onOpenAudioGuide: () => void;
}

export const PlayerView: React.FC<PlayerViewProps> = ({
  currentStation,
  playbackStatus,
  isPlaying,
  volume,
  isMuted,
  isFavorite,
  onPlay,
  onPause,
  onPrevious,
  onNext,
  onVolumeChange,
  onToggleMute,
  onToggleFavorite,
  onReconnect,
  onOpenAudioGuide,
}) => {
  const [visualizerTheme, setVisualizerTheme] = useState<VisualizerTheme>('cyan');

  const themes: { id: VisualizerTheme; label: string; color: string }[] = [
    { id: 'cyan', label: 'Cyan Cyber', color: 'bg-cyan-500' },
    { id: 'violet', label: 'Violet Neon', color: 'bg-violet-500' },
    { id: 'emerald', label: 'Emerald Jade', color: 'bg-emerald-500' },
    { id: 'amber', label: 'Amber Gold', color: 'bg-amber-500' },
    { id: 'crimson', label: 'Crimson Rose', color: 'bg-rose-500' },
  ];

  return (
    <div className="flex flex-col h-full bg-slate-900/60 rounded-3xl border border-slate-800/80 p-5 md:p-8 backdrop-blur-xl relative overflow-hidden">
      {/* Ambient background glow according to station */}
      <div className="absolute -top-32 -left-32 w-80 h-80 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-80 h-80 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Station Status Banner */}
      <div className="flex items-center justify-between gap-3 mb-6 relative z-10">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wider uppercase bg-red-500/15 text-red-400 border border-red-500/30">
            <span className={`w-2 h-2 rounded-full bg-red-500 ${isPlaying ? 'animate-ping' : ''}`} />
            LIVE ON AIR
          </span>
          <span className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-800/90 text-slate-300 border border-slate-700">
            {currentStation.bitrate} kbps AAC/MP3
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Favorite toggle */}
          <button
            onClick={onToggleFavorite}
            className={`p-2 rounded-xl border transition ${
              isFavorite
                ? 'bg-rose-950/40 border-rose-500/40 text-rose-400'
                : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:text-slate-200'
            }`}
            title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            <Heart className={`w-4 h-4 ${isFavorite ? 'fill-rose-500 text-rose-500' : ''}`} />
          </button>

          {/* Reconnect stream */}
          <button
            onClick={onReconnect}
            className="p-2 rounded-xl bg-slate-800/60 border border-slate-700/60 text-slate-400 hover:text-cyan-400 transition"
            title="Reconnect live stream buffer"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Station Identity & Visualizer Box */}
      <div className="flex-1 flex flex-col justify-center items-center my-2 text-center relative z-10">
        {/* Animated Station Artwork Emblem */}
        <div className="relative mb-5 group">
          <div
            className={`w-36 h-36 md:w-44 md:h-44 rounded-3xl bg-gradient-to-br ${
              currentStation.logoBg || 'from-cyan-600 to-blue-800'
            } p-1 shadow-2xl flex items-center justify-center text-white transition-transform duration-500 ${
              isPlaying ? 'scale-102 ring-4 ring-cyan-500/20 shadow-cyan-500/20' : 'scale-95 opacity-90'
            }`}
          >
            <div className="w-full h-full rounded-[22px] bg-slate-950/40 backdrop-blur-xs flex flex-col items-center justify-center p-4">
              {currentStation.isBroadcastChannel ? (
                <Radio className="w-16 h-16 text-cyan-400 drop-shadow-md animate-pulse" />
              ) : currentStation.isProcedural ? (
                <Disc3 className={`w-16 h-16 text-purple-400 drop-shadow-md ${isPlaying ? 'animate-spin' : ''}`} style={{ animationDuration: '6s' }} />
              ) : (
                <Wifi className="w-16 h-16 text-cyan-300 drop-shadow-md" />
              )}
              <span className="mt-2 text-[11px] font-semibold text-white/80 uppercase tracking-widest">
                {currentStation.genre}
              </span>
            </div>
          </div>
        </div>

        {/* Current Station Details */}
        <h2 className="text-xl md:text-2xl font-black text-white tracking-tight px-2">
          {currentStation.name}
        </h2>
        <p className="text-xs md:text-sm text-cyan-300/90 font-medium mt-1 max-w-md line-clamp-2">
          {currentStation.tagline}
        </p>
        {currentStation.description && (
          <p className="text-[11px] text-slate-400 mt-1 max-w-sm hidden sm:block">
            {currentStation.description}
          </p>
        )}

        {/* Audio Visualizer Canvas */}
        <div className="w-full max-w-md h-28 my-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 p-2 overflow-hidden shadow-inner">
          <Visualizer
            isPlaying={isPlaying}
            theme={visualizerTheme}
            className="w-full h-full"
          />
        </div>

        {/* Visualizer Theme Swatches */}
        <div className="flex items-center gap-1.5 mb-2">
          <span className="text-[10px] text-slate-500 uppercase tracking-wider mr-1">Vibe:</span>
          {themes.map((t) => (
            <button
              key={t.id}
              onClick={() => setVisualizerTheme(t.id)}
              className={`w-3.5 h-3.5 rounded-full ${t.color} transition ${
                visualizerTheme === t.id ? 'ring-2 ring-white scale-125' : 'opacity-60 hover:opacity-100'
              }`}
              title={t.label}
            />
          ))}
        </div>
      </div>

      {/* Playback Controls Section */}
      <div className="space-y-4 pt-2 border-t border-slate-800/80 relative z-10">
        {/* Play/Pause & Skip buttons */}
        <div className="flex items-center justify-center gap-6">
          <button
            onClick={onPrevious}
            className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700/80 text-slate-300 hover:text-white hover:bg-slate-700 transition active:scale-95"
            title="Previous station"
          >
            <SkipBack className="w-5 h-5" />
          </button>

          {/* Big Play / Pause Action Button */}
          <button
            onClick={isPlaying ? onPause : onPlay}
            disabled={playbackStatus === 'loading'}
            className={`w-16 h-16 rounded-full flex items-center justify-center shadow-xl transition transform active:scale-90 ${
              isPlaying
                ? 'bg-gradient-to-tr from-amber-500 to-rose-500 text-white shadow-rose-500/25'
                : 'bg-gradient-to-tr from-cyan-400 to-blue-600 text-white shadow-cyan-500/30 hover:scale-105'
            }`}
            title={isPlaying ? 'Pause Radio' : 'Play Radio'}
          >
            {playbackStatus === 'loading' ? (
              <RefreshCw className="w-7 h-7 animate-spin" />
            ) : isPlaying ? (
              <Pause className="w-7 h-7 fill-white" />
            ) : (
              <Play className="w-7 h-7 fill-white ml-1" />
            )}
          </button>

          <button
            onClick={onNext}
            className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700/80 text-slate-300 hover:text-white hover:bg-slate-700 transition active:scale-95"
            title="Next station"
          >
            <SkipForward className="w-5 h-5" />
          </button>
        </div>

        {/* Volume Slider & Background Audio Pill */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 max-w-lg mx-auto">
          {/* Volume Control */}
          <div className="flex items-center gap-2.5 w-full sm:w-56 bg-slate-800/60 border border-slate-700/60 px-3.5 py-2 rounded-2xl">
            <button
              onClick={onToggleMute}
              className="text-slate-400 hover:text-slate-200 transition"
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="w-4 h-4 text-rose-400" />
              ) : (
                <Volume2 className="w-4 h-4 text-cyan-400" />
              )}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={isMuted ? 0 : volume}
              onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />
            <span className="text-[11px] font-mono text-slate-400 w-8 text-right">
              {Math.round((isMuted ? 0 : volume) * 100)}%
            </span>
          </div>

          {/* Background Audio Badge Button */}
          <button
            onClick={onOpenAudioGuide}
            className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-cyan-950/30 border border-cyan-500/30 hover:border-cyan-400 text-cyan-300 text-[11px] font-semibold transition"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span>Background Audio Active</span>
          </button>
        </div>
      </div>
    </div>
  );
};
