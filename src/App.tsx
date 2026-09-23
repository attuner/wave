/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { RadioStation, PlaybackStatus, BroadcastMetadata } from './types/radio';
import { DEFAULT_STATIONS } from './data/defaultStations';
import { audioEngine } from './services/audioEngine';
import { mediaSessionService } from './services/mediaSession';
import { broadcastSync, BroadcastChannelMessage } from './services/broadcastChannel';
import { Header } from './components/Header';
import { PlayerView } from './components/PlayerView';
import { StationList } from './components/StationList';
import { BroadcasterView } from './components/BroadcasterView';
import { SleepTimerModal } from './components/SleepTimerModal';
import { BackgroundAudioGuide } from './components/BackgroundAudioGuide';
import { OfflineIndicator } from './components/OfflineIndicator';
import { Radio, AlertCircle, Headphones, X } from 'lucide-react';

export default function App() {
  const [currentTab, setCurrentTab] = useState<'player' | 'broadcaster'>('player');
  const [stations, setStations] = useState<RadioStation[]>(() => {
    try {
      const saved = localStorage.getItem('wavecast_custom_stations');
      if (saved) {
        const parsed = JSON.parse(saved);
        return [...DEFAULT_STATIONS, ...parsed];
      }
    } catch {
      // fallback
    }
    return DEFAULT_STATIONS;
  });

  const [currentStation, setCurrentStation] = useState<RadioStation>(DEFAULT_STATIONS[0]);
  const [playbackStatus, setPlaybackStatus] = useState<PlaybackStatus>('idle');
  const [volume, setVolume] = useState<number>(0.85);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('wavecast_favorites');
      return saved ? JSON.parse(saved) : ['somafm-groove-salad', 'nightwave-plaza'];
    } catch {
      return ['somafm-groove-salad'];
    }
  });

  // Live Broadcaster State
  const [isBroadcastingLive, setIsBroadcastingLive] = useState(false);
  const [remoteBroadcastState, setRemoteBroadcastState] = useState<BroadcastMetadata | null>(null);
  const [dismissBroadcastAlert, setDismissBroadcastAlert] = useState(false);

  // Modals
  const [isSleepTimerOpen, setIsSleepTimerOpen] = useState(false);
  const [isAudioGuideOpen, setIsAudioGuideOpen] = useState(false);

  // Mobile active sub-view in player: 'player' or 'stations'
  const [mobilePlayerView, setMobilePlayerView] = useState<'now_playing' | 'stations'>('now_playing');

  const isPlaying = playbackStatus === 'playing';

  // Audio Engine status subscription
  useEffect(() => {
    const unsub = audioEngine.onStatusChange((status) => {
      setPlaybackStatus(status);
    });
    return unsub;
  }, []);

  // Save favorites to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('wavecast_favorites', JSON.stringify(favorites));
    } catch {
      // Ignored
    }
  }, [favorites]);

  // Subscribe to BroadcastChannel messages (sync from other tabs or active broadcaster)
  useEffect(() => {
    const unsub = broadcastSync.subscribe((msg: BroadcastChannelMessage) => {
      if (msg.type === 'BROADCAST_STATE') {
        setRemoteBroadcastState(msg.payload);
        if (msg.payload.isLive) {
          setDismissBroadcastAlert(false);
        }
      } else if (msg.type === 'BROADCAST_STOPPED') {
        setRemoteBroadcastState(null);
      }
    });
    return unsub;
  }, []);

  // Playback action handlers
  const handlePlayStation = useCallback((station: RadioStation) => {
    setCurrentStation(station);
    audioEngine.playStation(station);
    setMobilePlayerView('now_playing');
  }, []);

  const handlePlay = useCallback(() => {
    if (currentStation) {
      if (playbackStatus === 'paused') {
        audioEngine.resume();
      } else {
        audioEngine.playStation(currentStation);
      }
    }
  }, [currentStation, playbackStatus]);

  const handlePause = useCallback(() => {
    audioEngine.pause();
  }, []);

  const handlePrevious = useCallback(() => {
    const currentIndex = stations.findIndex((s) => s.id === currentStation.id);
    const prevIndex = (currentIndex - 1 + stations.length) % stations.length;
    handlePlayStation(stations[prevIndex]);
  }, [stations, currentStation, handlePlayStation]);

  const handleNext = useCallback(() => {
    const currentIndex = stations.findIndex((s) => s.id === currentStation.id);
    const nextIndex = (currentIndex + 1) % stations.length;
    handlePlayStation(stations[nextIndex]);
  }, [stations, currentStation, handlePlayStation]);

  // Register MediaSession API hardware and lockscreen handlers
  useEffect(() => {
    mediaSessionService.registerHandlers({
      onPlay: handlePlay,
      onPause: handlePause,
      onStop: () => audioEngine.stop(),
      onPreviousTrack: handlePrevious,
      onNextTrack: handleNext,
    });
  }, [handlePlay, handlePause, handlePrevious, handleNext]);

  const handleVolumeChange = (vol: number) => {
    setVolume(vol);
    setIsMuted(false);
    audioEngine.setVolume(vol);
  };

  const handleToggleMute = () => {
    const muted = audioEngine.toggleMute();
    setIsMuted(muted);
  };

  const handleToggleFavorite = (stationId: string) => {
    setFavorites((prev) =>
      prev.includes(stationId) ? prev.filter((id) => id !== stationId) : [...prev, stationId]
    );
  };

  const handleAddCustomStation = (newStation: RadioStation) => {
    const customList = stations.filter((s) => s.genre === 'custom');
    const updatedCustom = [...customList, newStation];
    try {
      localStorage.setItem('wavecast_custom_stations', JSON.stringify(updatedCustom));
    } catch {
      // Ignored
    }
    setStations((prev) => [...prev, newStation]);
    handlePlayStation(newStation);
  };

  const handleTuneToLiveBroadcast = () => {
    const liveStation = stations.find((s) => s.id === 'wavecast-live');
    if (liveStation) {
      handlePlayStation(liveStation);
      setCurrentTab('player');
    }
  };

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-white pb-8">
      {/* Top Navigation & Controls */}
      <Header
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        onOpenSleepTimer={() => setIsSleepTimerOpen(true)}
        onOpenAudioGuide={() => setIsAudioGuideOpen(true)}
        isBroadcastingLive={isBroadcastingLive || (remoteBroadcastState?.isLive ?? false)}
      />

      {/* Live Broadcast Ticker Alert Banner */}
      {remoteBroadcastState?.isLive && !dismissBroadcastAlert && currentTab === 'player' && (
        <div className="bg-gradient-to-r from-red-950/80 via-slate-900 to-red-950/80 border-b border-red-500/30 px-4 py-2.5">
          <div className="max-w-6xl mx-auto flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping shrink-0" />
              <div className="truncate">
                <span className="font-extrabold text-red-400 uppercase tracking-wider mr-1.5">
                  LIVE ON AIR:
                </span>
                <span className="font-bold text-white mr-1">{remoteBroadcastState.showTitle}</span>
                <span className="text-slate-400 hidden sm:inline">
                  with {remoteBroadcastState.djName} • &ldquo;{remoteBroadcastState.tickerMessage}&rdquo;
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleTuneToLiveBroadcast}
                className="px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold text-xs flex items-center gap-1 transition"
              >
                <Radio className="w-3.5 h-3.5" />
                <span>Tune In</span>
              </button>
              <button
                onClick={() => setDismissBroadcastAlert(true)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Workspace Body */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 pt-4 md:pt-6">
        {currentTab === 'player' ? (
          <div>
            {/* Mobile Tab Toggle between Player and Station Directory */}
            <div className="flex md:hidden items-center bg-slate-900 border border-slate-800 p-1 rounded-2xl mb-4">
              <button
                onClick={() => setMobilePlayerView('now_playing')}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition ${
                  mobilePlayerView === 'now_playing'
                    ? 'bg-cyan-500 text-slate-950 shadow-md'
                    : 'text-slate-400'
                }`}
              >
                Now Playing
              </button>
              <button
                onClick={() => setMobilePlayerView('stations')}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition ${
                  mobilePlayerView === 'stations'
                    ? 'bg-cyan-500 text-slate-950 shadow-md'
                    : 'text-slate-400'
                }`}
              >
                Stations Directory
              </button>
            </div>

            {/* Split Screen Layout (Desktop: Side by Side, Mobile: Tabbed) */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 min-h-[620px]">
              {/* Player View */}
              <div
                className={`md:col-span-7 lg:col-span-7 flex flex-col ${
                  mobilePlayerView === 'now_playing' ? 'block' : 'hidden md:block'
                }`}
              >
                <PlayerView
                  currentStation={currentStation}
                  playbackStatus={playbackStatus}
                  isPlaying={isPlaying}
                  volume={volume}
                  isMuted={isMuted}
                  isFavorite={favorites.includes(currentStation.id)}
                  onPlay={handlePlay}
                  onPause={handlePause}
                  onPrevious={handlePrevious}
                  onNext={handleNext}
                  onVolumeChange={handleVolumeChange}
                  onToggleMute={handleToggleMute}
                  onToggleFavorite={() => handleToggleFavorite(currentStation.id)}
                  onReconnect={() => handlePlayStation(currentStation)}
                  onOpenAudioGuide={() => setIsAudioGuideOpen(true)}
                />
              </div>

              {/* Station Directory & Drawer */}
              <div
                className={`md:col-span-5 lg:col-span-5 flex flex-col ${
                  mobilePlayerView === 'stations' ? 'block' : 'hidden md:block'
                }`}
              >
                <StationList
                  stations={stations}
                  currentStation={currentStation}
                  isPlaying={isPlaying}
                  onSelectStation={handlePlayStation}
                  favorites={favorites}
                  onToggleFavorite={handleToggleFavorite}
                  onAddCustomStation={handleAddCustomStation}
                />
              </div>
            </div>
          </div>
        ) : (
          /* Broadcaster Studio Mode */
          <BroadcasterView
            onLiveStateChange={(isLive) => setIsBroadcastingLive(isLive)}
          />
        )}
      </main>

      {/* Footer Info & PWA Capabilities */}
      <footer className="max-w-6xl mx-auto px-4 mt-8 pt-4 border-t border-slate-800/60 text-slate-500 text-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span>PWA Service Worker & Background Audio Active</span>
        </div>
        <div className="flex items-center gap-4 text-slate-400">
          <span>WaveCast Radio Engine v2.4</span>
          <span>•</span>
          <button
            onClick={() => setIsAudioGuideOpen(true)}
            className="hover:text-cyan-400 underline underline-offset-4 transition"
          >
            Lockscreen Audio Guide
          </button>
        </div>
      </footer>

      {/* Sleep Timer Modal */}
      <SleepTimerModal
        isOpen={isSleepTimerOpen}
        onClose={() => setIsSleepTimerOpen(false)}
      />

      {/* Background Audio Support Guide Modal */}
      <BackgroundAudioGuide
        isOpen={isAudioGuideOpen}
        onClose={() => setIsAudioGuideOpen(false)}
      />

      {/* Offline Status & Synth Radio Fallback Indicator */}
      <OfflineIndicator />
    </div>
  );
}
