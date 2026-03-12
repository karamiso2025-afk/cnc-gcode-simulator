'use client';
import React, { useMemo } from 'react';
import type { PathSegment, Point3D } from '../shared-types';

function distance3D(a: Point3D, b: Point3D): number {
  return Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2 + (b.z - a.z) ** 2);
}

function segDistance(seg: PathSegment): number {
  if (seg.arcPoints && seg.arcPoints.length > 1) {
    let d = 0;
    for (let i = 1; i < seg.arcPoints.length; i++) {
      d += distance3D(seg.arcPoints[i - 1], seg.arcPoints[i]);
    }
    return d;
  }
  return distance3D(seg.start, seg.end);
}

function computeTimeMinutes(segments: PathSegment[], upTo: number): number {
  const defaultRapidRate = 5000;
  let totalMin = 0;
  const end = Math.min(upTo, segments.length);
  for (let i = 0; i < end; i++) {
    const seg = segments[i];
    const dist = segDistance(seg);
    const rate = seg.type === 'rapid'
      ? defaultRapidRate
      : (seg.feedRate > 0 ? seg.feedRate : 1000);
    totalMin += dist / rate;
  }
  return totalMin;
}

function formatTime(minutes: number): string {
  const totalSec = Math.round(minutes * 60);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n: number): string => n.toString().padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

interface ElapsedTimeDisplayProps {
  segments: PathSegment[];
  currentSegmentIndex: number;
}

export default function ElapsedTimeDisplay({
  segments,
  currentSegmentIndex,
}: ElapsedTimeDisplayProps): JSX.Element | null {
  const totalTime = useMemo(() => computeTimeMinutes(segments, segments.length), [segments]);
  const elapsedTime = useMemo(
    () => computeTimeMinutes(segments, currentSegmentIndex + 1),
    [segments, currentSegmentIndex]
  );

  if (segments.length === 0) return null;

  const progress = totalTime > 0 ? (elapsedTime / totalTime) * 100 : 0;
  const currentSeg = segments[Math.min(currentSegmentIndex, segments.length - 1)];
  const lineNumber = currentSeg?.lineNumber ?? 0;

  return (
    <div className="absolute top-4 left-4 z-20 pointer-events-none select-none">
      <div
        className="rounded-xl px-5 py-4 border border-emerald-400/40"
        style={{
          background: 'linear-gradient(135deg, rgba(0,0,0,0.95) 0%, rgba(10,30,20,0.95) 100%)',
          boxShadow: '0 0 20px rgba(52, 211, 153, 0.15), 0 8px 32px rgba(0,0,0,0.6), inset 0 1px 0 rgba(52, 211, 153, 0.1)',
        }}
      >
        {/* Label */}
        <div
          className="text-[9px] uppercase tracking-[0.3em] mb-2 font-mono font-semibold"
          style={{ color: 'rgba(52, 211, 153, 0.7)' }}
        >
          MACHINING TIME
        </div>

        {/* Main digital time — large, crisp, glowing */}
        <div className="flex items-baseline gap-1.5">
          <span
            className="font-mono font-black tracking-wider"
            style={{
              fontSize: '2rem',
              lineHeight: 1,
              color: '#6ee7b7',
              textShadow: '0 0 8px rgba(110, 231, 183, 0.8), 0 0 24px rgba(52, 211, 153, 0.4), 0 0 48px rgba(52, 211, 153, 0.15)',
              fontFamily: "'Consolas', 'Courier New', monospace",
              fontVariantNumeric: 'tabular-nums',
              letterSpacing: '0.12em',
            }}
          >
            {formatTime(elapsedTime)}
          </span>
          <span
            className="font-mono font-bold"
            style={{ fontSize: '0.75rem', color: 'rgba(110, 231, 183, 0.35)' }}
          >
            /
          </span>
          <span
            className="font-mono font-semibold"
            style={{
              fontSize: '0.9rem',
              color: 'rgba(110, 231, 183, 0.5)',
              fontVariantNumeric: 'tabular-nums',
              textShadow: '0 0 6px rgba(52, 211, 153, 0.3)',
            }}
          >
            {formatTime(totalTime)}
          </span>
        </div>

        {/* Progress bar */}
        <div
          className="mt-3 h-[3px] rounded-full overflow-hidden"
          style={{ background: 'rgba(52, 211, 153, 0.15)' }}
        >
          <div
            className="h-full rounded-full transition-all duration-150"
            style={{
              width: `${progress}%`,
              background: 'linear-gradient(90deg, #34d399, #6ee7b7)',
              boxShadow: '0 0 8px rgba(52, 211, 153, 0.8), 0 0 16px rgba(52, 211, 153, 0.3)',
            }}
          />
        </div>

        {/* Current line + percentage */}
        <div className="mt-2.5 flex items-center justify-between">
          <span
            className="font-mono font-bold"
            style={{
              fontSize: '1.1rem',
              color: '#6ee7b7',
              fontVariantNumeric: 'tabular-nums',
              textShadow: '0 0 6px rgba(110, 231, 183, 0.5)',
            }}
          >
            L{lineNumber}
          </span>
          <span
            className="font-mono font-bold"
            style={{
              fontSize: '1.1rem',
              color: '#6ee7b7',
              fontVariantNumeric: 'tabular-nums',
              textShadow: '0 0 6px rgba(110, 231, 183, 0.5)',
            }}
          >
            {progress.toFixed(1)}%
          </span>
        </div>
      </div>
    </div>
  );
}
