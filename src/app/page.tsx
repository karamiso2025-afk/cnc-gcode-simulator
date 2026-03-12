'use client';
import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import type {
  FileLoadResult,
  GCodeCommand,
  PathSegment,
  GCodeStats,
  MachineState,
  PlaybackState,
  BoundingBox,
} from '../shared-types';
import { parseGCode } from '../gcode-parser';
import { generatePath } from '../path-generator';
import { analyzeGCode, getDefaultMachineState, computeBoundingBox, extractToolDiameter, extractMaterialSize, estimateTime } from '../gcode-analyzer';
import ControlPanel from '../components/control-panel';
import InfoPanel from '../components/info-panel';
import GCodePanel from '../components/gcode-panel';
import FileDropZone from '../components/file-drop-zone';
import ElapsedTimeDisplay from '../components/elapsed-time-display';

// Dynamic import for Three.js viewer (SSR disabled)
const Viewer3D = dynamic(() => import('../components/viewer3-d'), { ssr: false });

export default function SimulatorPage(): JSX.Element {
  // File state
  const [fileName, setFileName] = useState<string | null>(null);
  const [commands, setCommands] = useState<GCodeCommand[]>([]);
  const [segments, setSegments] = useState<PathSegment[]>([]);
  const [stats, setStats] = useState<GCodeStats | null>(null);
  const [boundingBox, setBoundingBox] = useState<BoundingBox | null>(null);
  const [materialSize, setMaterialSize] = useState<{ x: number; y: number; z: number } | null>(null);
  const [machineState, setMachineState] = useState<MachineState>(getDefaultMachineState());

  // Playback state
  const [playbackState, setPlaybackState] = useState<PlaybackState>('stopped');
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0);
  const [currentProgress, setCurrentProgress] = useState(0);

  // Display options
  const [showRapids, setShowRapids] = useState(true);
  const [showGrid, setShowGrid] = useState(false);
  const [showAxes, setShowAxes] = useState(true);
  const [xyPlaneView, setXyPlaneView] = useState(false);
  const [resetViewKey, setResetViewKey] = useState(0);
  const [showTool, setShowTool] = useState(false);
  const [toolDiameter, setToolDiameter] = useState(0);

  // Animation refs — keep mutable state in refs to avoid re-renders every frame
  const animFrameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const segIdxRef = useRef(0);
  const progressRef = useRef(0);

  // Sync refs directly (no useEffect needed — safe during render because refs are mutable)
  const playbackStateRef = useRef<PlaybackState>(playbackState);
  playbackStateRef.current = playbackState;
  const segmentsRef = useRef<PathSegment[]>(segments);
  segmentsRef.current = segments;
  const speedRef = useRef(playbackSpeed);
  speedRef.current = playbackSpeed;

  const handleFileLoad = useCallback((result: FileLoadResult) => {
    if (!result.success) return;

    const cmds = parseGCode(result.content);
    const segs = generatePath(cmds);
    const st = analyzeGCode(cmds, segs);
    const bbox = computeBoundingBox(segs);

    const dia = extractToolDiameter(cmds);
    const matSize = extractMaterialSize(cmds);
    setToolDiameter(dia);
    setMaterialSize(matSize);
    setFileName(result.fileName);
    setCommands(cmds);
    setSegments(segs);
    setStats(st);
    setBoundingBox(bbox);
    setMachineState(getDefaultMachineState());
    setPlaybackState('stopped');
    setCurrentSegmentIndex(0);
    setCurrentProgress(0);
    segIdxRef.current = 0;
    progressRef.current = 0;
  }, []);

  // Auto-load sample file on mount
  useEffect(() => {
    fetch('/waita.nc')
      .then(res => { if (!res.ok) return fetch('/sample.gcode'); return res; })
      .then(res => res.text())
      .then(text => {
        if (text) handleFileLoad({ success: true, fileName: 'waita.nc', content: text, lineCount: text.split('\n').length } as FileLoadResult);
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Animation loop — updates refs every frame, syncs to React state periodically
  useEffect(() => {
    if (playbackState !== 'playing' || segments.length === 0) {
      lastTimeRef.current = 0;
      return;
    }

    let frameCount = 0;

    const animate = (timestamp: number): void => {
      if (playbackStateRef.current !== 'playing') return;

      if (lastTimeRef.current === 0) {
        lastTimeRef.current = timestamp;
      }

      const deltaMs = timestamp - lastTimeRef.current;
      lastTimeRef.current = timestamp;

      const segs = segmentsRef.current;
      const segPerSecond = 5 * speedRef.current;
      const progressIncrement = (deltaMs / 1000) * segPerSecond;

      progressRef.current += progressIncrement;

      if (progressRef.current >= 1) {
        const advance = Math.floor(progressRef.current);
        progressRef.current -= advance;
        segIdxRef.current = Math.min(segIdxRef.current + advance, segs.length - 1);

        if (segIdxRef.current >= segs.length - 1) {
          segIdxRef.current = segs.length - 1;
          progressRef.current = 1;
          setPlaybackState('stopped');
          setCurrentSegmentIndex(segIdxRef.current);
          setCurrentProgress(1);
          const seg = segs[segIdxRef.current];
          if (seg) {
            setMachineState(prev => ({ ...prev, position: { ...seg.end }, feedRate: seg.feedRate }));
          }
          return;
        }
      }

      frameCount++;
      // Sync to React state every 3 frames to reduce re-renders
      if (frameCount % 3 === 0) {
        setCurrentSegmentIndex(segIdxRef.current);
        setCurrentProgress(progressRef.current);
        const seg = segs[segIdxRef.current];
        if (seg) {
          setMachineState(prev => ({ ...prev, position: { ...seg.end }, feedRate: seg.feedRate }));
        }
      }

      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [playbackState, segments.length]);

  const handlePlayPause = useCallback(() => {
    if (segments.length === 0) return;
    setPlaybackState(prev => {
      if (prev === 'playing') return 'paused';
      if (prev === 'stopped') {
        segIdxRef.current = 0;
        progressRef.current = 0;
        setCurrentSegmentIndex(0);
        setCurrentProgress(0);
        lastTimeRef.current = 0;
      }
      return 'playing';
    });
  }, [segments.length]);

  const handleStop = useCallback(() => {
    setPlaybackState('stopped');
    segIdxRef.current = 0;
    progressRef.current = 0;
    setCurrentSegmentIndex(0);
    setCurrentProgress(0);
    lastTimeRef.current = 0;
    setMachineState(getDefaultMachineState());
  }, []);

  const handleScrub = useCallback((index: number) => {
    segIdxRef.current = index;
    progressRef.current = 0;
    setCurrentSegmentIndex(index);
    setCurrentProgress(0);
    lastTimeRef.current = 0;
    if (index >= 0 && index < segments.length) {
      const seg = segments[index];
      setMachineState(prev => ({ ...prev, position: { ...seg.end }, feedRate: seg.feedRate }));
    }
  }, [segments]);

  const hasFile = fileName !== null;

  return (
    <div className="h-screen w-screen flex overflow-hidden">
      {/* Left: Control + Info panel */}
      <aside className="w-72 border-r border-border flex-shrink-0 overflow-y-auto">
        <ControlPanel
          onFileLoad={handleFileLoad}
          playbackState={playbackState}
          onPlayPause={handlePlayPause}
          onStop={handleStop}
          playbackSpeed={playbackSpeed}
          onSpeedChange={setPlaybackSpeed}
          currentSegmentIndex={currentSegmentIndex}
          totalSegments={segments.length}
          onScrub={handleScrub}
          showRapids={showRapids}
          onToggleRapids={() => setShowRapids(p => !p)}
          showGrid={showGrid}
          onToggleGrid={() => setShowGrid(p => !p)}
          showAxes={showAxes}
          onToggleAxes={() => setShowAxes(p => !p)}
          xyPlaneView={xyPlaneView}
          onToggleXyPlaneView={() => setXyPlaneView(p => !p)}
          onResetView={() => setResetViewKey(k => k + 1)}
          showTool={showTool}
          onToggleShowTool={() => setShowTool(p => !p)}
          toolDiameter={toolDiameter}
          onToolDiameterChange={setToolDiameter}
        />
        <div className="border-t border-border">
          <InfoPanel
            stats={stats}
            machineState={machineState}
            currentSegmentIndex={currentSegmentIndex}
            segments={segments}
            fileName={fileName}
          />
        </div>
      </aside>

      {/* Left: G-code listing (full height) */}
      {hasFile && (
        <aside className="w-[480px] flex-shrink-0 border-r border-border">
          <GCodePanel
            commands={commands}
            segments={segments}
            currentSegmentIndex={currentSegmentIndex}
            onJumpToLine={handleScrub}
          />
        </aside>
      )}

      {/* Main 3D viewer */}
      <main className="flex-1 relative">
        {hasFile && (
          <ElapsedTimeDisplay
            segments={segments}
            currentSegmentIndex={currentSegmentIndex}
          />
        )}
        {hasFile ? (
          <Viewer3D
            segments={segments}
            currentSegmentIndex={currentSegmentIndex}
            currentProgress={currentProgress}
            showRapids={showRapids}
            showGrid={showGrid}
            showAxes={showAxes}
            boundingBox={boundingBox}
            xyPlaneView={xyPlaneView}
            resetViewKey={resetViewKey}
            showTool={showTool}
            toolDiameter={toolDiameter}
            materialSize={materialSize}
          />
        ) : (
          <FileDropZone onFileLoad={handleFileLoad} />
        )}
      </main>
    </div>
  );
}
