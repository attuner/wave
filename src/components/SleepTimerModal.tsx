import React, { useState, useEffect } from 'react';
import { Clock, X, Check, Moon } from 'lucide-react';
import { audioEngine } from '../services/audioEngine';

interface SleepTimerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SleepTimerModal: React.FC<SleepTimerModalProps> = ({ isOpen, onClose }) => {
  const [activeMinutes, setActiveMinutes] = useState<number | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);

  useEffect(() => {
    let interval: number | null = null;
    if (remainingSeconds !== null && remainingSeconds > 0) {
      interval = window.setInterval(() => {
        setRemainingSeconds((prev) => {
          if (prev === null || prev <= 1) {
            audioEngine.stop();
            setActiveMinutes(null);
            return null;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [remainingSeconds]);

  if (!isOpen) return null;

  const startTimer = (minutes: number) => {
    setActiveMinutes(minutes);
    setRemainingSeconds(minutes * 60);
    onClose();
  };

  const cancelTimer = () => {
    setActiveMinutes(null);
    setRemainingSeconds(null);
    onClose();
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-700/80 p-6 shadow-2xl text-slate-100">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center">
              <Moon className="w-4 h-4 text-indigo-400" />
            </div>
            <h3 className="text-base font-semibold text-white">Radio Sleep Timer</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="mt-3 text-xs text-slate-400">
          Set a timer to automatically fade out and stop radio playback when you fall asleep.
        </p>

        {remainingSeconds !== null && (
          <div className="mt-4 p-3 rounded-xl bg-cyan-950/40 border border-cyan-500/30 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-cyan-400 animate-spin" style={{ animationDuration: '4s' }} />
              <span className="text-xs text-cyan-200">Timer Active:</span>
            </div>
            <span className="font-mono text-sm font-bold text-cyan-300">
              {formatTime(remainingSeconds)}
            </span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2.5 mt-5">
          {[15, 30, 45, 60].map((mins) => (
            <button
              key={mins}
              onClick={() => startTimer(mins)}
              className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold border transition ${
                activeMinutes === mins
                  ? 'bg-cyan-500 text-slate-950 border-cyan-400'
                  : 'bg-slate-800/80 hover:bg-slate-700/80 text-white border-slate-700'
              }`}
            >
              {activeMinutes === mins && <Check className="w-4 h-4" />}
              <span>{mins} Minutes</span>
            </button>
          ))}
        </div>

        {activeMinutes !== null && (
          <button
            onClick={cancelTimer}
            className="mt-4 w-full py-2.5 rounded-xl border border-red-500/30 text-red-400 hover:bg-red-950/30 text-xs font-semibold transition"
          >
            Cancel Sleep Timer
          </button>
        )}
      </div>
    </div>
  );
};
