'use client';
import React, { useRef, useState, useEffect, useCallback } from 'react';
import type { ControlPanelProps, FileLoadResult } from '../shared-types';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Separator } from './ui/separator';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { Slider } from './ui/slider';
import { cn } from '@/lib/utils';

type Props = Partial<ControlPanelProps>;

export default function ControlPanel({
  onFileLoad,
  playbackState = 'stopped',
  onPlayPause,
  onStop,
  playbackSpeed = 1,
  onSpeedChange,
  currentSegmentIndex = 0,
  totalSegments = 0,
  onScrub,
  showRapids = true,
  onToggleRapids,
  showGrid = true,
  onToggleGrid,
  showAxes = true,
  onToggleAxes,
  xyPlaneView = false,
  onToggleXyPlaneView,
  onResetView,
  showTool = false,
  onToggleShowTool,
  toolDiameter = 0,
  onToolDiameterChange,
}: Props & {
  xyPlaneView?: boolean; onToggleXyPlaneView?: () => void; onResetView?: () => void;
  showTool?: boolean; onToggleShowTool?: () => void;
  toolDiameter?: number; onToolDiameterChange?: (d: number) => void;
}): JSX.Element {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const HISTORY_KEY = 'ncviewer-file-history';
  const MAX_HISTORY = 5;

  interface FileHistoryEntry {
    fileName: string;
    content: string;
    timestamp: number;
  }

  const [fileHistory, setFileHistory] = useState<FileHistoryEntry[]>([]);
  const [historyErrors, setHistoryErrors] = useState<Record<string, string>>({});

  // Load history from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(HISTORY_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as FileHistoryEntry[];
        setFileHistory(parsed);
      }
    } catch {
      // Corrupted data — clear it
      localStorage.removeItem(HISTORY_KEY);
    }
  }, []);

  const saveToHistory = useCallback((fileName: string, content: string) => {
    setFileHistory(prev => {
      // Remove duplicate if same file name exists
      const filtered = prev.filter(e => e.fileName !== fileName);
      const entry: FileHistoryEntry = { fileName, content, timestamp: Date.now() };
      const updated = [entry, ...filtered].slice(0, MAX_HISTORY);
      try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
      } catch {
        // localStorage full — try with fewer entries
        try {
          localStorage.setItem(HISTORY_KEY, JSON.stringify(updated.slice(0, 2)));
        } catch {
          // Give up silently
        }
      }
      return updated;
    });
  }, []);

  const loadFromHistory = useCallback((entry: FileHistoryEntry) => {
    if (!entry.content) {
      setHistoryErrors(prev => ({ ...prev, [entry.fileName]: 'ファイルがありません' }));
      return;
    }
    setHistoryErrors(prev => {
      const next = { ...prev };
      delete next[entry.fileName];
      return next;
    });
    onFileLoad?.({
      success: true,
      fileName: entry.fileName,
      content: entry.content,
      lineCount: entry.content.split('\n').length,
    } as FileLoadResult);
  }, [onFileLoad]);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = ['.gcode', '.nc', '.tap', '.ngc'];
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!allowed.includes(ext)) {
      onFileLoad?.({ success: false, fileName: file.name, content: '', error: '非対応のファイル形式です' });
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev: ProgressEvent<FileReader>): void => {
      const content = ev.target?.result as string;
      onFileLoad?.({ success: true, fileName: file.name, content });
      saveToHistory(file.name, content);
    };
    reader.readAsText(file);
  };

  const speedOptions = [
    { label: '0.5x', value: 0.5 },
    { label: '1x', value: 1 },
    { label: '2x', value: 2 },
    { label: '5x', value: 5 },
    { label: '10x', value: 10 },
  ];

  const isPlaying = playbackState === 'playing';
  const maxScrub = Math.max(0, totalSegments - 1);

  return (
    <div data-testid="control-panel">
      <Card className="rounded-none border-0">
        <CardHeader>
          <CardTitle>NC CODE VIEWER</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          <section aria-labelledby="file-section-heading">
            <Button onClick={() => fileInputRef.current?.click()} className="w-full">
              ファイルを開く
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".gcode,.nc,.tap,.ngc"
              onChange={handleFileInputChange}
              aria-hidden="true"
              tabIndex={-1}
              style={{ display: 'none' }}
            />
            {fileHistory.length > 0 && (
              <div className="mt-2 space-y-1">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60">最近のファイル</p>
                {fileHistory.map((entry) => (
                  <button
                    key={entry.fileName + entry.timestamp}
                    onClick={() => loadFromHistory(entry)}
                    className="w-full text-left px-2 py-1 rounded text-xs font-mono truncate hover:bg-muted/60 transition-colors text-muted-foreground hover:text-foreground"
                    title={entry.fileName}
                  >
                    {historyErrors[entry.fileName] ? (
                      <span className="text-destructive">{entry.fileName} — ファイルがありません</span>
                    ) : (
                      entry.fileName
                    )}
                  </button>
                ))}
              </div>
            )}
          </section>

          <Separator />

          <section aria-labelledby="playback-section-heading">
            <div className="flex gap-2 mb-3">
              <Button onClick={onPlayPause} aria-label={isPlaying ? '一時停止' : '再生'} className="flex-1">
                {isPlaying ? '一時停止' : '再生'}
              </Button>
              <Button onClick={onStop} aria-label="停止" className="flex-1">
                停止
              </Button>
            </div>

            <div className="mb-3">
              <Label htmlFor="playback-speed-select" className="text-xs mb-1 block">再生速度</Label>
              <select
                id="playback-speed-select"
                value={String(playbackSpeed)}
                onChange={(e) => onSpeedChange?.(Number(e.target.value))}
                className={cn('w-full h-9 rounded-md border border-input bg-background px-3 text-sm')}
                aria-label="再生速度"
              >
                {speedOptions.map((opt) => (
                  <option key={opt.value} value={String(opt.value)}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="scrub-slider" className="text-xs mb-1 block">
                シークバー ({currentSegmentIndex} / {totalSegments})
              </Label>
              <Slider
                id="scrub-slider"
                min={0}
                max={maxScrub}
                value={[Math.min(currentSegmentIndex, maxScrub)]}
                onValueChange={(v: number[]) => onScrub?.(v[0])}
                aria-label="シークバー"
              />
            </div>
          </section>

          <Separator />

          <section aria-labelledby="display-section-heading">
            <h4 id="display-section-heading" className="text-sm font-semibold mb-2">表示オプション</h4>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Switch id="show-rapids" checked={showRapids} onCheckedChange={onToggleRapids ? () => onToggleRapids() : undefined} aria-label="早送り(G0)表示" />
                <Label htmlFor="show-rapids">早送り(G0)表示</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch id="show-grid" checked={showGrid} onCheckedChange={onToggleGrid ? () => onToggleGrid() : undefined} aria-label="グリッド" />
                <Label htmlFor="show-grid">グリッド</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch id="show-axes" checked={showAxes} onCheckedChange={onToggleAxes ? () => onToggleAxes() : undefined} aria-label="軸" />
                <Label htmlFor="show-axes">軸</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch id="xy-plane-view" checked={xyPlaneView} onCheckedChange={onToggleXyPlaneView ? () => onToggleXyPlaneView() : undefined} aria-label="XY平面ビュー" />
                <Label htmlFor="xy-plane-view">XY平面ビュー</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch id="show-tool" checked={showTool} onCheckedChange={onToggleShowTool ? () => onToggleShowTool() : undefined} aria-label="工具表示" />
                <Label htmlFor="show-tool">工具表示</Label>
              </div>
              {showTool && (
                <div className="flex items-center gap-2 ml-6">
                  <Label htmlFor="tool-diameter" className="text-xs whitespace-nowrap">工具径(mm)</Label>
                  <input
                    id="tool-diameter"
                    type="number"
                    min={0}
                    step={0.1}
                    value={toolDiameter}
                    onChange={(e) => onToolDiameterChange?.(parseFloat(e.target.value) || 0)}
                    className={cn('w-20 h-7 rounded border border-input bg-background px-2 text-xs')}
                  />
                </div>
              )}
              <Button onClick={onResetView} variant="outline" className="w-full mt-2" aria-label="ビューリセット">
                ビューリセット
              </Button>
            </div>
          </section>
        </CardContent>
      </Card>
    </div>
  );
}
