import React from 'react';
import { Headphones, Smartphone, CheckCircle2, X, SlidersHorizontal, ShieldCheck } from 'lucide-react';

interface BackgroundAudioGuideProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BackgroundAudioGuide: React.FC<BackgroundAudioGuideProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-700/80 p-6 shadow-2xl text-slate-100">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center">
              <Headphones className="w-4 h-4 text-cyan-400" />
            </div>
            <h3 className="text-base font-semibold text-white">Background Audio Support</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-4 space-y-3.5 text-xs text-slate-300">
          <div className="p-3 rounded-xl bg-cyan-950/40 border border-cyan-500/30 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-white block text-sm">Media Session API Enabled</strong>
              WaveCast connects directly to your device operating system's audio subsystem.
            </div>
          </div>

          <div className="space-y-3 pt-1">
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-100">Screen Off Playback:</strong> Lock your screen or switch to other apps; the live broadcast and music continues without pausing.
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-100">Lock Screen & Headset Controls:</strong> Play, pause, or switch stations using your lockscreen widget, Apple Watch, Galaxy Buds, AirPods, or car Bluetooth steering controls.
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <Smartphone className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-100">PWA Installed Mode:</strong> For optimal zero-throttling background audio on iOS & Android, tap <span className="text-cyan-400 font-semibold">Install PWA</span> in the header to run standalone!
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <SlidersHorizontal className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-100">Battery Saver Safe:</strong> Silent keep-alive keeps the audio session high-priority so power-saving managers do not terminate your stream.
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="mt-6 w-full py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm transition"
        >
          Sounds Great!
        </button>
      </div>
    </div>
  );
};
