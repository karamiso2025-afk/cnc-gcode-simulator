'use client';
import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import type { GCodeCommand, PathSegment } from '../shared-types';

interface GCodePanelProps {
  commands: GCodeCommand[];
  segments: Partial<PathSegment>[];
  currentSegmentIndex: number;
  onJumpToLine?: (lineNumber: number) => void;
}

export default function GCodePanel({
  commands,
  segments,
  currentSegmentIndex,
  onJumpToLine,
}: GCodePanelProps): JSX.Element {
  const listRef = useRef<HTMLDivElement>(null);
  const currentLineNumber = segments[currentSegmentIndex]?.lineNumber ?? -1;
  // Selected line for keyboard navigation (null = follow seekbar)
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  // Map line numbers to segment movement types for color indicators
  const lineToSegType = useMemo(() => {
    const map = new Map<number, string>();
    for (const seg of segments) {
      if (seg.lineNumber != null && seg.type) {
        map.set(seg.lineNumber, seg.type as string);
      }
    }
    return map;
  }, [segments]);

  // Map line numbers to segment indices for jump-to-line
  const lineToSegIndex = useMemo(() => {
    const map = new Map<number, number>();
    for (let i = 0; i < segments.length; i++) {
      const ln = segments[i].lineNumber;
      if (ln != null && !map.has(ln)) {
        map.set(ln, i);
      }
    }
    return map;
  }, [segments]);

  // Jump seekbar to a given line number
  const jumpToLine = useCallback((lineNumber: number): void => {
    let targetIdx = lineToSegIndex.get(lineNumber);
    if (targetIdx == null) {
      let best = -1;
      for (let i = 0; i < segments.length; i++) {
        const ln = segments[i].lineNumber;
        if (ln != null && ln <= lineNumber) best = i;
      }
      if (best >= 0) targetIdx = best;
    }
    if (targetIdx != null && onJumpToLine) {
      onJumpToLine(targetIdx);
    }
  }, [segments, lineToSegIndex, onJumpToLine]);

  const handleDoubleClick = (lineNumber: number): void => {
    jumpToLine(lineNumber);
  };

  // Single click selects a line
  const handleClick = (cmdIdx: number): void => {
    setSelectedIdx(cmdIdx);
    jumpToLine(commands[cmdIdx].lineNumber);
  };

  // Keyboard navigation: up/down arrows move selection
  const handleKeyDown = useCallback((e: React.KeyboardEvent): void => {
    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
    e.preventDefault();

    setSelectedIdx(prev => {
      // If no selection yet, start from current active line
      let idx = prev;
      if (idx == null) {
        idx = commands.findIndex(c => c.lineNumber === currentLineNumber);
        if (idx < 0) idx = 0;
      }

      const next = e.key === 'ArrowDown'
        ? Math.min(idx + 1, commands.length - 1)
        : Math.max(idx - 1, 0);

      // Jump seekbar & 3D view to this line
      jumpToLine(commands[next].lineNumber);
      return next;
    });
  }, [commands, currentLineNumber, jumpToLine]);

  // Clear selection when seekbar moves externally (e.g. playback)
  useEffect(() => {
    if (selectedIdx != null) {
      const selLine = commands[selectedIdx]?.lineNumber;
      if (selLine !== currentLineNumber) {
        setSelectedIdx(null);
      }
    }
  }, [currentLineNumber, selectedIdx, commands]);

  // Auto-scroll to current/selected line
  useEffect(() => {
    const targetLine = selectedIdx != null
      ? commands[selectedIdx]?.lineNumber
      : currentLineNumber;
    if (typeof targetLine !== 'number' || targetLine < 0) return;
    const container = listRef.current;
    if (!container) return;
    const el = container.querySelector(`[data-line="${targetLine}"]`) as HTMLElement | null;
    if (el) {
      el.scrollIntoView({ block: 'center', behavior: 'auto' });
    }
  }, [currentLineNumber, selectedIdx, commands]);

  if (commands.length === 0) return <></>;

  return (
    <div className="h-full flex flex-col border-l border-border">
      <div className="px-3 py-2 border-b border-border flex-shrink-0">
        <h3 className="text-sm font-semibold">G-code</h3>
      </div>
      <div
        ref={listRef}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        className="flex-1 overflow-y-auto font-mono text-sm leading-6 bg-muted/20 outline-none"
      >
        {commands.map((cmd, cmdIdx) => {
          const isActive = cmd.lineNumber === currentLineNumber;
          const isComment = cmd.raw.trimStart().startsWith('(');
          const segType = lineToSegType.get(cmd.lineNumber);
          let typeColor = '';
          if (segType === 'rapid') typeColor = 'border-l-red-500';
          else if (segType === 'linear') typeColor = 'border-l-blue-500';
          else if (segType === 'arc_cw' || segType === 'arc_ccw') typeColor = 'border-l-green-500';

          let bgClass: string;
          if (isActive) {
            bgClass = 'bg-primary/20 text-foreground font-medium';
          } else if (isComment) {
            bgClass = 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300';
          } else {
            bgClass = 'text-muted-foreground hover:bg-muted/50';
          }

          return (
            <div
              key={cmd.lineNumber}
              data-line={cmd.lineNumber}
              onClick={() => handleClick(cmdIdx)}
              onDoubleClick={() => handleDoubleClick(cmd.lineNumber)}
              className={`flex px-1 border-l-2 cursor-pointer select-none ${typeColor || 'border-l-transparent'} ${bgClass}`}
            >
              <span className="w-8 text-right mr-2 select-none opacity-50 shrink-0">
                {cmd.lineNumber}
              </span>
              <span className="whitespace-nowrap">{cmd.raw}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
