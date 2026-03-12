import type { GCodeCommand, GCodeStats, MachineState, BoundingBox, Point3D, PathSegment } from './shared-types';

export function getDefaultMachineState(): MachineState {
  return {
    position: { x: 0, y: 0, z: 0 },
    feedRate: 0,
    spindleState: 'off',
    spindleSpeed: 0,
    currentTool: { number: 0, diameter: 0, description: '' },
    distanceMode: 'absolute',
    unitMode: 'mm',
    plane: 'XY',
    isRunning: false,
  };
}

export function computeBoundingBox(segments: PathSegment[]): BoundingBox {
  if (segments.length === 0) {
    return { min: { x: 0, y: 0, z: 0 }, max: { x: 0, y: 0, z: 0 } };
  }

  const min: Point3D = { x: Infinity, y: Infinity, z: Infinity };
  const max: Point3D = { x: -Infinity, y: -Infinity, z: -Infinity };

  for (const seg of segments) {
    const points = [seg.start, seg.end];
    if (seg.arcPoints) points.push(...seg.arcPoints);

    for (const p of points) {
      if (p.x < min.x) min.x = p.x;
      if (p.y < min.y) min.y = p.y;
      if (p.z < min.z) min.z = p.z;
      if (p.x > max.x) max.x = p.x;
      if (p.y > max.y) max.y = p.y;
      if (p.z > max.z) max.z = p.z;
    }
  }

  return { min, max };
}

function distance3D(a: Point3D, b: Point3D): number {
  return Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2 + (b.z - a.z) ** 2);
}

function segmentDistance(seg: PathSegment): number {
  if (seg.arcPoints && seg.arcPoints.length > 1) {
    let dist = 0;
    for (let i = 1; i < seg.arcPoints.length; i++) {
      dist += distance3D(seg.arcPoints[i - 1], seg.arcPoints[i]);
    }
    return dist;
  }
  return distance3D(seg.start, seg.end);
}

export function estimateTime(segments: PathSegment[]): number {
  let totalMinutes = 0;
  const defaultRapidRate = 5000; // mm/min typical rapid

  for (const seg of segments) {
    const dist = segmentDistance(seg);
    const rate = seg.type === 'rapid'
      ? defaultRapidRate
      : (seg.feedRate > 0 ? seg.feedRate : 1000);
    totalMinutes += dist / rate;
  }

  return totalMinutes;
}

/**
 * Extract tool diameter from G-code comments.
 * Common formats:
 *   (TOOL/FLAT, 6.0)  (TOOL/BALL, 3.0)
 *   ; Tool Dia = 6.0   ; T1 D=6.0
 *   (T1 D6.0)  (D=10)
 */
export function extractToolDiameter(commands: GCodeCommand[]): number {
  // Strategy 1: Look for explicit tool diameter patterns in comments
  for (const cmd of commands) {
    if (cmd.type !== 'comment') continue;
    const raw = cmd.raw;
    // エンドミル + 数字 (e.g. "エンドミル6", "エンドミル 10.0", "エンドミル3.175")
    const emMatch = raw.match(/エンドミル\s*(\d+\.?\d*)/);
    if (emMatch) return parseFloat(emMatch[1]);
    // TOOL/type, diameter
    const toolMatch = raw.match(/TOOL\/\w+[,\s]+(\d+\.?\d*)/i);
    if (toolMatch) return parseFloat(toolMatch[1]);
    // D= or D format
    const dMatch = raw.match(/\bD\s*=?\s*(\d+\.?\d*)/i);
    if (dMatch) return parseFloat(dMatch[1]);
    // Tool Dia
    const diaMatch = raw.match(/(?:dia|diameter)\s*[=:]\s*(\d+\.?\d*)/i);
    if (diaMatch) return parseFloat(diaMatch[1]);
  }

  // Strategy 2: Last number on the line immediately before the first G00
  // Common in VCarve/Aspire post-processor output where tool info comment precedes G00
  for (let i = 0; i < commands.length; i++) {
    const cmd = commands[i];
    if (cmd.type === 'G' && cmd.code === 0) {
      // Found first G00 — look at the previous line
      if (i > 0) {
        const prevRaw = commands[i - 1].raw;
        const numbers = prevRaw.match(/(\d+\.?\d*)/g);
        if (numbers && numbers.length > 0) {
          const lastNum = parseFloat(numbers[numbers.length - 1]);
          if (lastNum > 0 && lastNum <= 50) return lastNum; // reasonable tool diameter range
        }
      }
      break;
    }
  }

  return 0;
}

/**
 * Extract material (stock) size from G-code header comments.
 * VCarve/Aspire format: ( X= 185.000, Y= 2000.000 ,Z= 18.500)
 * Returns { x, y, z } in mm, or null if not found.
 */
export function extractMaterialSize(commands: GCodeCommand[]): { x: number; y: number; z: number } | null {
  // Look in first 20 lines for "Material Size" followed by X/Y/Z values
  const searchRange = Math.min(commands.length, 20);
  for (let i = 0; i < searchRange; i++) {
    const raw = commands[i].raw;
    // Match pattern: X= 185.000, Y= 2000.000 ,Z= 18.500
    const match = raw.match(/X\s*=\s*([\d.]+).*Y\s*=\s*([\d.]+).*Z\s*=\s*([\d.]+)/i);
    if (match) {
      return {
        x: parseFloat(match[1]),
        y: parseFloat(match[2]),
        z: parseFloat(match[3]),
      };
    }
  }
  return null;
}

export function analyzeGCode(commands: GCodeCommand[], segments: PathSegment[]): GCodeStats {
  let totalLines = 0;
  let commandLines = 0;
  let commentLines = 0;
  let emptyLines = 0;
  let toolChanges = 0;
  let maxFeedRate = 0;

  for (const cmd of commands) {
    totalLines++;
    if (cmd.type === 'comment') {
      commentLines++;
    } else {
      commandLines++;
    }
    if (cmd.type === 'M' && cmd.code === 6) toolChanges++;
    if (cmd.type === 'T') toolChanges++;
  }

  let rapidMoves = 0;
  let linearMoves = 0;
  let arcMoves = 0;
  let totalDistance = 0;
  let cuttingDistance = 0;

  for (const seg of segments) {
    const dist = segmentDistance(seg);
    totalDistance += dist;

    if (seg.type === 'rapid') {
      rapidMoves++;
    } else if (seg.type === 'linear') {
      linearMoves++;
      cuttingDistance += dist;
    } else {
      arcMoves++;
      cuttingDistance += dist;
    }

    if (seg.feedRate > maxFeedRate) maxFeedRate = seg.feedRate;
  }

  const bbox = computeBoundingBox(segments);
  const estimatedTimeMinutes = estimateTime(segments);

  return {
    totalLines,
    commandLines,
    commentLines,
    emptyLines,
    rapidMoves,
    linearMoves,
    arcMoves,
    toolChanges,
    maxFeedRate,
    minZ: bbox.min.z,
    maxZ: bbox.max.z,
    estimatedTimeMinutes,
    boundingBox: bbox,
    totalDistance,
    cuttingDistance,
  };
}
