// 共有型定義（自動生成）

export type GCodeCommandType = 'G' | 'M' | 'T' | 'F' | 'S' | 'comment' | 'unknown';

export interface GCodeParam {
  letter: string;
  value: number;
}

export interface GCodeCommand {
  type: GCodeCommandType;
  code: number | null;
  params: GCodeParam[];
  raw: string;
  lineNumber: number;
}

export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export type MovementType = 'rapid' | 'linear' | 'arc_cw' | 'arc_ccw';

export type PlaneSelect = 'XY' | 'XZ' | 'YZ';

export type DistanceMode = 'absolute' | 'incremental';

export type UnitMode = 'mm' | 'inch';

export type SpindleState = 'off' | 'cw' | 'ccw';

export interface PathSegment {
  start: Point3D;
  end: Point3D;
  type: MovementType;
  feedRate: number;
  lineNumber: number;
  center?: Point3D;
  radius?: number;
  plane?: PlaneSelect;
  arcPoints?: Point3D[];
  depth: number;
}

export interface ToolInfo {
  number: number;
  diameter: number;
  description: string;
}

export interface MachineState {
  position: Point3D;
  feedRate: number;
  spindleState: SpindleState;
  spindleSpeed: number;
  currentTool: ToolInfo;
  distanceMode: DistanceMode;
  unitMode: UnitMode;
  plane: PlaneSelect;
  isRunning: boolean;
}

export interface BoundingBox {
  min: Point3D;
  max: Point3D;
}

export interface GCodeStats {
  totalLines: number;
  commandLines: number;
  commentLines: number;
  emptyLines: number;
  rapidMoves: number;
  linearMoves: number;
  arcMoves: number;
  toolChanges: number;
  maxFeedRate: number;
  minZ: number;
  maxZ: number;
  estimatedTimeMinutes: number;
  boundingBox: BoundingBox;
  totalDistance: number;
  cuttingDistance: number;
}

export type PlaybackState = 'stopped' | 'playing' | 'paused';

export interface SimulatorState {
  fileName: string | null;
  commands: GCodeCommand[];
  segments: PathSegment[];
  stats: GCodeStats | null;
  machineState: MachineState;
  playbackState: PlaybackState;
  playbackSpeed: number;
  currentSegmentIndex: number;
  currentProgress: number;
  showRapids: boolean;
  showGrid: boolean;
  showAxes: boolean;
}

export interface FileLoadResult {
  success: boolean;
  fileName: string;
  content: string;
  error?: string;
}

// ============================================================
// Component Props（ページ仕様から自動生成 — 必ずimportして使うこと）
// 独自のProps型を再定義せず、ここからimportすること
// ============================================================

export interface Viewer3DProps {
  segments: PathSegment[];
  currentSegmentIndex: number;
  currentProgress: number;
  showRapids: boolean;
  showGrid: boolean;
  showAxes: boolean;
  boundingBox: BoundingBox | null;
}

export interface ControlPanelProps {
  onFileLoad: (result: FileLoadResult) => void;
  playbackState: PlaybackState;
  onPlayPause: () => void;
  onStop: () => void;
  playbackSpeed: number;
  onSpeedChange: (speed: number) => void;
  currentSegmentIndex: number;
  totalSegments: number;
  onScrub: (index: number) => void;
  showRapids: boolean;
  onToggleRapids: () => void;
  showGrid: boolean;
  onToggleGrid: () => void;
  showAxes: boolean;
  onToggleAxes: () => void;
}

export interface InfoPanelProps {
  stats: GCodeStats | null;
  machineState: MachineState;
  currentSegmentIndex: number;
  segments: PathSegment[];
  fileName: string | null;
}

export interface FileDropZoneProps {
  onFileLoad: (result: FileLoadResult) => void;
  hasFile: boolean;
}
