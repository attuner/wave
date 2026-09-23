import React, { useEffect, useRef, useState } from 'react';
import { audioEngine } from '../services/audioEngine';
import { VisualizerTheme } from '../types/radio';
import { Activity, BarChart2, Disc3 } from 'lucide-react';

interface VisualizerProps {
  isPlaying: boolean;
  theme?: VisualizerTheme;
  className?: string;
}

export type VisualizerMode = 'bars' | 'wave' | 'radial';

export const Visualizer: React.FC<VisualizerProps> = ({
  isPlaying,
  theme = 'cyan',
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [mode, setMode] = useState<VisualizerMode>('bars');
  const animationFrameRef = useRef<number | null>(null);

  // Theme palettes
  const colorMap = {
    cyan: { primary: '#06b6d4', secondary: '#3b82f6', glow: 'rgba(6, 182, 212, 0.4)' },
    violet: { primary: '#a855f7', secondary: '#ec4899', glow: 'rgba(168, 85, 247, 0.4)' },
    emerald: { primary: '#10b981', secondary: '#06b6d4', glow: 'rgba(16, 185, 129, 0.4)' },
    amber: { primary: '#f59e0b', secondary: '#ef4444', glow: 'rgba(245, 158, 11, 0.4)' },
    crimson: { primary: '#f43f5e', secondary: '#fb923c', glow: 'rgba(244, 63, 94, 0.4)' },
  };

  const currentTheme = colorMap[theme] || colorMap.cyan;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dataArray = new Uint8Array(64);
    const peaks = new Float32Array(64);

    const render = () => {
      audioEngine.getVisualizerData(dataArray);

      const dpr = window.devicePixelRatio || 1;
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;

      if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      if (mode === 'bars') {
        const barCount = 36;
        const barWidth = (width / barCount) - 3;
        const step = Math.floor(dataArray.length / barCount);

        for (let i = 0; i < barCount; i++) {
          const val = isPlaying ? dataArray[i * step] || 0 : 4;
          const targetHeight = Math.max(4, (val / 255) * (height - 14));

          // Peak falloff
          if (targetHeight > peaks[i]) {
            peaks[i] = targetHeight;
          } else {
            peaks[i] = Math.max(4, peaks[i] - 1.2);
          }

          const x = i * (barWidth + 3) + 2;
          const y = height - targetHeight;

          // Bar gradient
          const grad = ctx.createLinearGradient(0, height, 0, y);
          grad.addColorStop(0, currentTheme.secondary);
          grad.addColorStop(1, currentTheme.primary);

          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.roundRect(x, y, barWidth, targetHeight, [3, 3, 0, 0]);
          ctx.fill();

          // Peak cap
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.roundRect(x, height - peaks[i] - 2, barWidth, 2, 1);
          ctx.fill();
        }
      } else if (mode === 'wave') {
        // Smooth Oscilloscope wave
        ctx.beginPath();
        const sliceWidth = width / dataArray.length;
        let x = 0;

        ctx.lineWidth = 3;
        ctx.strokeStyle = currentTheme.primary;
        ctx.shadowColor = currentTheme.glow;
        ctx.shadowBlur = 10;

        for (let i = 0; i < dataArray.length; i++) {
          const v = isPlaying ? dataArray[i] / 128.0 : 1;
          const y = (v * height) / 2;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
          x += sliceWidth;
        }

        ctx.stroke();
      } else if (mode === 'radial') {
        // Radial halo
        const cx = width / 2;
        const cy = height / 2;
        const baseRadius = Math.min(width, height) * 0.22;
        const numPoints = 48;

        ctx.beginPath();
        for (let i = 0; i <= numPoints; i++) {
          const angle = (i / numPoints) * Math.PI * 2;
          const dataIndex = Math.floor((i % numPoints) * (dataArray.length / numPoints));
          const val = isPlaying ? dataArray[dataIndex] || 0 : 10;
          const r = baseRadius + (val / 255) * 35;

          const px = cx + Math.cos(angle) * r;
          const py = cy + Math.sin(angle) * r;

          if (i === 0) {
            ctx.moveTo(px, py);
          } else {
            ctx.lineTo(px, py);
          }
        }
        ctx.closePath();

        const radialGrad = ctx.createRadialGradient(cx, cy, baseRadius * 0.5, cx, cy, baseRadius + 40);
        radialGrad.addColorStop(0, currentTheme.secondary);
        radialGrad.addColorStop(1, currentTheme.primary);

        ctx.strokeStyle = radialGrad;
        ctx.lineWidth = 3;
        ctx.stroke();

        ctx.fillStyle = currentTheme.glow;
        ctx.fill();
      }

      ctx.restore();
      animationFrameRef.current = requestAnimationFrame(render);
    };

    animationFrameRef.current = requestAnimationFrame(render);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, mode, currentTheme]);

  return (
    <div className={`relative flex flex-col items-center justify-center ${className}`}>
      <canvas
        ref={canvasRef}
        className="w-full h-full block"
      />

      {/* Visualizer Mode Switcher */}
      <div className="absolute top-2 right-2 flex items-center gap-1 bg-slate-900/80 border border-slate-700/60 rounded-lg p-0.5 backdrop-blur-md">
        <button
          onClick={() => setMode('bars')}
          className={`p-1 rounded text-xs transition ${
            mode === 'bars' ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-400 hover:text-slate-200'
          }`}
          title="Frequency Spectrum Bars"
        >
          <BarChart2 className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => setMode('wave')}
          className={`p-1 rounded text-xs transition ${
            mode === 'wave' ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-400 hover:text-slate-200'
          }`}
          title="Oscilloscope Wave"
        >
          <Activity className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => setMode('radial')}
          className={`p-1 rounded text-xs transition ${
            mode === 'radial' ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-400 hover:text-slate-200'
          }`}
          title="Radial Halo"
        >
          <Disc3 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
