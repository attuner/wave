import React, { useState, useEffect, useRef } from 'react';
import { audioEngine } from '../services/audioEngine';
import { proceduralSynth } from '../services/proceduralSynth';
import { broadcastSync } from '../services/broadcastChannel';
import { BroadcastMetadata } from '../types/radio';
import {
  Mic,
  MicOff,
  Radio,
  Sliders,
  Volume2,
  Bell,
  Sparkles,
  Zap,
  Flame,
  Award,
  Download,
  Users,
  Clock,
  CircleDot,
  Music,
  Share2,
  Check,
} from 'lucide-react';

interface BroadcasterViewProps {
  onLiveStateChange: (isLive: boolean) => void;
}

export const BroadcasterView: React.FC<BroadcasterViewProps> = ({ onLiveStateChange }) => {
  const [isOnAir, setIsOnAir] = useState(false);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [micGain, setMicGain] = useState(1.2);
  const [isDucking, setIsDucking] = useState(true);
  const [isBgMusicOn, setIsBgMusicOn] = useState(false);
  const [bgMusicVol, setBgMusicVol] = useState(0.3);

  // Broadcast Info
  const [stationName, setStationName] = useState('WaveCast Studio');
  const [showTitle, setShowTitle] = useState('The Late Night Broadcast');
  const [djName, setDjName] = useState('Host DJ Nova');
  const [tickerMessage, setTickerMessage] = useState('Broadcasting live to all connected listeners!');

  // Broadcast Stats
  const [peakDb, setPeakDb] = useState(-60);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [listenerCount, setListenerCount] = useState(142);
  const [sampleRate, setSampleRate] = useState(48000);

  // Recording
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlobUrl, setRecordedBlobUrl] = useState<string | null>(null);

  // VU Meter & Peak Animation loop
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    let timer: number | null = null;
    if (isOnAir) {
      timer = window.setInterval(() => {
        setElapsedSeconds((s) => s + 1);
        // Subtle natural listener fluctuation
        setListenerCount((c) => Math.max(10, c + (Math.floor(Math.random() * 5) - 2)));
      }, 1000);
    } else {
      setElapsedSeconds(0);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isOnAir]);

  // Sync state across BroadcastChannel
  useEffect(() => {
    const metadata: BroadcastMetadata = {
      stationName,
      showTitle,
      djName,
      tickerMessage,
      isLive: isOnAir,
      listenerCount,
      startedAt: isOnAir ? Date.now() - elapsedSeconds * 1000 : null,
      peakDb,
      sampleRate,
    };

    broadcastSync.send({
      type: 'BROADCAST_STATE',
      payload: metadata,
    });
  }, [isOnAir, stationName, showTitle, djName, tickerMessage, listenerCount, peakDb, sampleRate, elapsedSeconds]);

  // VU meter polling
  useEffect(() => {
    if (!isOnAir) {
      setPeakDb(-60);
      return;
    }

    const pollVU = () => {
      const { peakDb: currentPeak } = audioEngine.getBroadcasterPeakDb();
      setPeakDb(currentPeak);
      rafRef.current = requestAnimationFrame(pollVU);
    };

    rafRef.current = requestAnimationFrame(pollVU);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isOnAir]);

  const toggleOnAir = async () => {
    if (isOnAir) {
      // Turn Off
      audioEngine.stopMicrophoneBroadcast();
      proceduralSynth.stopAmbientRadio();
      setIsBgMusicOn(false);
      if (isRecording) {
        handleStopRecording();
      }
      setIsOnAir(false);
      onLiveStateChange(false);
    } else {
      // Turn On
      try {
        const { sampleRate: sr } = await audioEngine.startMicrophoneBroadcast({
          ducking: isDucking,
          gain: micGain,
        });
        setSampleRate(sr);
        setIsOnAir(true);
        onLiveStateChange(true);
      } catch (err) {
        alert('Microphone access is required to broadcast live radio. Please grant permission.');
        console.error(err);
      }
    }
  };

  const toggleMicMute = () => {
    const nextMuted = !isMicMuted;
    setIsMicMuted(nextMuted);
    audioEngine.setMicGain(nextMuted ? 0 : micGain);
  };

  const handleMicGainChange = (gain: number) => {
    setMicGain(gain);
    if (!isMicMuted) {
      audioEngine.setMicGain(gain);
    }
  };

  const toggleBgMusic = () => {
    const next = !isBgMusicOn;
    setIsBgMusicOn(next);
    if (next) {
      proceduralSynth.startAmbientRadio();
      proceduralSynth.setAmbientVolume(bgMusicVol);
    } else {
      proceduralSynth.stopAmbientRadio();
    }
  };

  const handleBgMusicVolChange = (vol: number) => {
    setBgMusicVol(vol);
    proceduralSynth.setAmbientVolume(vol);
  };

  const triggerSoundEffect = (effectId: string) => {
    audioEngine.playSoundEffectIntoBroadcast(effectId);
  };

  const handleStartRecording = () => {
    const started = audioEngine.startRecording();
    if (started) {
      setIsRecording(true);
      setRecordedBlobUrl(null);
    }
  };

  const handleStopRecording = () => {
    const blob = audioEngine.stopRecording();
    setIsRecording(false);
    if (blob) {
      const url = URL.createObjectURL(blob);
      setRecordedBlobUrl(url);
    }
  };

  const formatElapsed = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${h > 0 ? `${h}:` : ''}${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Convert dB to percentage for VU meter (-60dB to 0dB)
  const vuPercent = Math.min(100, Math.max(0, ((peakDb + 60) / 60) * 100));

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto">
      {/* On-Air Master Header Card */}
      <div className="bg-slate-900/80 rounded-3xl border border-slate-800 p-6 backdrop-blur-xl relative overflow-hidden shadow-2xl">
        {/* Glow */}
        <div
          className={`absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl pointer-events-none transition-opacity duration-700 ${
            isOnAir ? 'bg-red-600/15 opacity-100' : 'bg-cyan-600/5 opacity-50'
          }`}
        />

        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span
                className={`px-3 py-1 rounded-full text-xs font-black tracking-widest uppercase flex items-center gap-2 border transition ${
                  isOnAir
                    ? 'bg-red-500/20 text-red-400 border-red-500/40 shadow-lg shadow-red-500/20'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}
              >
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    isOnAir ? 'bg-red-500 animate-ping' : 'bg-slate-500'
                  }`}
                />
                {isOnAir ? 'ON AIR • BROADCASTING' : 'STANDBY • READY'}
              </span>

              {isOnAir && (
                <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-cyan-950/50 text-cyan-300 border border-cyan-500/30">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{formatElapsed(elapsedSeconds)}</span>
                </span>
              )}
            </div>

            <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
              Broadcast Studio Console
            </h1>
            <p className="text-xs md:text-sm text-slate-400">
              Transmit live voice, ambient beds, and soundboard audio over PWA radio waves with background audio.
            </p>
          </div>

          {/* Master Big Broadcast Button */}
          <div className="flex items-center gap-4 w-full lg:w-auto justify-end">
            <button
              onClick={toggleOnAir}
              className={`w-full sm:w-auto px-8 py-4 rounded-2xl font-black text-base uppercase tracking-wider flex items-center justify-center gap-3 shadow-2xl transition transform active:scale-95 ${
                isOnAir
                  ? 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white shadow-red-600/30'
                  : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-cyan-500/30'
              }`}
            >
              <Radio className={`w-6 h-6 ${isOnAir ? 'animate-pulse' : ''}`} />
              <span>{isOnAir ? 'Stop Broadcast' : 'Go Live Now'}</span>
            </button>
          </div>
        </div>

        {/* Live Metrics Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-800">
          <div className="p-3 rounded-2xl bg-slate-800/40 border border-slate-800">
            <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
              Live Listeners
            </div>
            <div className="text-lg font-bold text-cyan-300 flex items-center gap-1.5 mt-0.5">
              <Users className="w-4 h-4 text-cyan-400" />
              <span>{isOnAir ? listenerCount.toLocaleString() : '0'}</span>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-800/40 border border-slate-800">
            <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
              Stream Output
            </div>
            <div className="text-lg font-bold text-white mt-0.5">
              320 kbps HD
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-800/40 border border-slate-800">
            <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
              Sample Rate
            </div>
            <div className="text-lg font-bold text-white mt-0.5">
              {(sampleRate / 1000).toFixed(1)} kHz
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-800/40 border border-slate-800">
            <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
              Broadcast Peak
            </div>
            <div className={`text-lg font-bold mt-0.5 font-mono ${peakDb > -3 ? 'text-red-400' : 'text-emerald-400'}`}>
              {isOnAir ? `${peakDb.toFixed(1)} dB` : '-60 dB'}
            </div>
          </div>
        </div>
      </div>

      {/* Broadcast Audio Controls & VU Meter */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Mic & Master Controls */}
        <div className="lg:col-span-2 bg-slate-900/80 rounded-3xl border border-slate-800 p-6 backdrop-blur-xl space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Mic className="w-4 h-4 text-cyan-400" />
              <span>Host Microphone & Voice Chain</span>
            </h2>

            <button
              onClick={toggleMicMute}
              disabled={!isOnAir}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
                isMicMuted
                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                  : 'bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700'
              } ${!isOnAir ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isMicMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
              <span>{isMicMuted ? 'Mic Muted' : 'Mic Active'}</span>
            </button>
          </div>

          {/* Precision VU Meter */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
              <span>-60 dB</span>
              <span>-30 dB</span>
              <span>-18 dB</span>
              <span>-6 dB</span>
              <span className="text-red-400 font-bold">0 dB</span>
            </div>
            <div className="w-full h-5 rounded-lg bg-slate-950 border border-slate-800 overflow-hidden relative p-0.5">
              <div
                className="h-full rounded transition-all duration-75"
                style={{
                  width: `${vuPercent}%`,
                  background:
                    'linear-gradient(to right, #10b981 0%, #10b981 60%, #f59e0b 80%, #ef4444 100%)',
                }}
              />
              {/* Target broadcast level marker (-18dB) */}
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-white/40 z-10"
                style={{ left: '70%' }}
                title="Target Speech Level (-18dB)"
              />
            </div>
          </div>

          {/* Sliders: Mic Gain & Audio Ducking */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            {/* Mic Gain Slider */}
            <div className="p-4 rounded-2xl bg-slate-800/50 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 font-semibold">Microphone Gain</span>
                <span className="font-mono text-cyan-400">{micGain.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min="0"
                max="3"
                step="0.1"
                value={micGain}
                onChange={(e) => handleMicGainChange(parseFloat(e.target.value))}
                disabled={!isOnAir}
                className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
              <p className="text-[11px] text-slate-500">
                Preamplifier boost with hardware compressor.
              </p>
            </div>

            {/* Auto Ducking Toggle */}
            <div className="p-4 rounded-2xl bg-slate-800/50 border border-slate-800 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-300 font-semibold">Smart Audio Ducking</span>
                <input
                  type="checkbox"
                  checked={isDucking}
                  onChange={(e) => setIsDucking(e.target.checked)}
                  className="w-4 h-4 rounded text-cyan-500 focus:ring-0 cursor-pointer accent-cyan-500"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-2">
                Automatically drops background music volume by 75% when you speak.
              </p>
            </div>
          </div>

          {/* Background Ambient Music Bed Controls */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-800/60 to-indigo-950/30 border border-indigo-500/20 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Music className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-bold text-white">Ambient Radio Bed (Background Music)</span>
              </div>
              <button
                onClick={toggleBgMusic}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition ${
                  isBgMusicOn
                    ? 'bg-indigo-500 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {isBgMusicOn ? 'Bed Playing' : 'Start Bed'}
              </button>
            </div>

            {isBgMusicOn && (
              <div className="flex items-center gap-3">
                <span className="text-[11px] text-slate-400">Bed Volume</span>
                <input
                  type="range"
                  min="0.05"
                  max="0.8"
                  step="0.05"
                  value={bgMusicVol}
                  onChange={(e) => handleBgMusicVolChange(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-400"
                />
                <span className="text-xs font-mono text-indigo-300 w-10 text-right">
                  {Math.round(bgMusicVol * 100)}%
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Right: Studio Soundboard */}
        <div className="bg-slate-900/80 rounded-3xl border border-slate-800 p-6 backdrop-blur-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Live Soundboard</span>
              </h2>
              <span className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">
                Instant FX
              </span>
            </div>

            <p className="text-xs text-slate-400 mb-4">
              Trigger high-energy broadcast sound effects directly into your live master channel.
            </p>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                onClick={() => triggerSoundEffect('jingle')}
                className="p-3 rounded-2xl bg-cyan-950/40 border border-cyan-500/30 hover:bg-cyan-900/50 hover:border-cyan-400 text-cyan-200 text-xs font-bold flex flex-col items-center gap-1.5 transition active:scale-95"
              >
                <Radio className="w-5 h-5 text-cyan-400" />
                <span>Station ID</span>
              </button>

              <button
                onClick={() => triggerSoundEffect('airhorn')}
                className="p-3 rounded-2xl bg-amber-950/40 border border-amber-500/30 hover:bg-amber-900/50 hover:border-amber-400 text-amber-200 text-xs font-bold flex flex-col items-center gap-1.5 transition active:scale-95"
              >
                <Flame className="w-5 h-5 text-amber-400" />
                <span>DJ Airhorn</span>
              </button>

              <button
                onClick={() => triggerSoundEffect('alert')}
                className="p-3 rounded-2xl bg-rose-950/40 border border-rose-500/30 hover:bg-rose-900/50 hover:border-rose-400 text-rose-200 text-xs font-bold flex flex-col items-center gap-1.5 transition active:scale-95"
              >
                <Zap className="w-5 h-5 text-rose-400" />
                <span>News Alert</span>
              </button>

              <button
                onClick={() => triggerSoundEffect('chime')}
                className="p-3 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 hover:bg-emerald-900/50 hover:border-emerald-400 text-emerald-200 text-xs font-bold flex flex-col items-center gap-1.5 transition active:scale-95"
              >
                <Bell className="w-5 h-5 text-emerald-400" />
                <span>Bell Chime</span>
              </button>

              <button
                onClick={() => triggerSoundEffect('drop808')}
                className="p-3 rounded-2xl bg-purple-950/40 border border-purple-500/30 hover:bg-purple-900/50 hover:border-purple-400 text-purple-200 text-xs font-bold flex flex-col items-center gap-1.5 transition active:scale-95"
              >
                <CircleDot className="w-5 h-5 text-purple-400" />
                <span>808 Bass Drop</span>
              </button>

              <button
                onClick={() => triggerSoundEffect('cheer')}
                className="p-3 rounded-2xl bg-blue-950/40 border border-blue-500/30 hover:bg-blue-900/50 hover:border-blue-400 text-blue-200 text-xs font-bold flex flex-col items-center gap-1.5 transition active:scale-95"
              >
                <Award className="w-5 h-5 text-blue-400" />
                <span>Crowd Applause</span>
              </button>
            </div>
          </div>

          {/* Show Recording Section */}
          <div className="mt-6 pt-4 border-t border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-300 font-semibold">Broadcast Recorder</span>
              {isRecording && (
                <span className="flex items-center gap-1 text-[11px] font-bold text-red-400 animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                  REC
                </span>
              )}
            </div>

            {isRecording ? (
              <button
                onClick={handleStopRecording}
                className="w-full py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs transition"
              >
                Stop Recording Show
              </button>
            ) : (
              <button
                onClick={handleStartRecording}
                disabled={!isOnAir}
                className={`w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs transition flex items-center justify-center gap-1.5 ${
                  !isOnAir ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                <CircleDot className="w-3.5 h-3.5 text-red-400" />
                <span>Record Live Episode</span>
              </button>
            )}

            {recordedBlobUrl && (
              <a
                href={recordedBlobUrl}
                download={`wavecast-show-${new Date().toISOString().slice(0, 10)}.webm`}
                className="flex items-center justify-center gap-1.5 w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition shadow-md shadow-emerald-600/20"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Saved Broadcast</span>
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Show Metadata & Live Ticker Config */}
      <div className="bg-slate-900/80 rounded-3xl border border-slate-800 p-6 backdrop-blur-xl space-y-4">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <Share2 className="w-4 h-4 text-cyan-400" />
          <span>Show Metadata & Live Listener Ticker</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-[11px] text-slate-400 mb-1 font-semibold">Station Name</label>
            <input
              type="text"
              value={stationName}
              onChange={(e) => setStationName(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="block text-[11px] text-slate-400 mb-1 font-semibold">Show Title</label>
            <input
              type="text"
              value={showTitle}
              onChange={(e) => setShowTitle(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="block text-[11px] text-slate-400 mb-1 font-semibold">Host / DJ Name</label>
            <input
              type="text"
              value={djName}
              onChange={(e) => setDjName(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-[11px] text-slate-400 mb-1 font-semibold">
            Live Listener Announcement Ticker
          </label>
          <input
            type="text"
            value={tickerMessage}
            onChange={(e) => setTickerMessage(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
            placeholder="e.g. Taking calls at 555-WAVE! Next song requested by Sarah in Tokyo."
          />
        </div>
      </div>
    </div>
  );
};
