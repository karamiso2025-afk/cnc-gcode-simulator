import type { GCodeCommand, Point3D, PlaneSelect, UnitMode, PathSegment, MachineState } from './shared-types';
import { getDefaultMachineState } from './gcode-analyzer';

export function convertToMM(value: number, unitMode: UnitMode): number {
  return unitMode === 'inch' ? value * 25.4 : value;
}

export function interpolateArc(
  start: Point3D,
  end: Point3D,
  center: Point3D,
  clockwise: boolean,
  plane: PlaneSelect
): Point3D[] {
  const radius = distanceBetween(start, center, plane);

  let startAngle: number;
  let endAngle: number;

  if (plane === 'XY') {
    startAngle = Math.atan2(start.y - center.y, start.x - center.x);
    endAngle = Math.atan2(end.y - center.y, end.x - center.x);
  } else if (plane === 'XZ') {
    startAngle = Math.atan2(start.z - center.z, start.x - center.x);
    endAngle = Math.atan2(end.z - center.z, end.x - center.x);
  } else {
    startAngle = Math.atan2(start.z - center.z, start.y - center.y);
    endAngle = Math.atan2(end.z - center.z, end.y - center.y);
  }

  let angleDiff: number;
  if (clockwise) {
    angleDiff = startAngle - endAngle;
    if (angleDiff <= 0) angleDiff += 2 * Math.PI;
  } else {
    angleDiff = endAngle - startAngle;
    if (angleDiff <= 0) angleDiff += 2 * Math.PI;
  }

  if (angleDiff === 0) angleDiff = 2 * Math.PI;

  // Use adaptive step: smaller arcs use fewer points, larger arcs more
  // ~3 degrees per step for smooth swept-path rendering
  const stepDeg = 3;
  const stepRad = (stepDeg * Math.PI) / 180;
  const steps = Math.max(8, Math.min(360, Math.ceil(angleDiff / stepRad)));

  const points: Point3D[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const angle = clockwise
      ? startAngle - angleDiff * t
      : startAngle + angleDiff * t;

    const point = arcPoint(center, radius, angle, plane, start, end, t);
    points.push(point);
  }

  return points;
}

function distanceBetween(p: Point3D, center: Point3D, plane: PlaneSelect): number {
  if (plane === 'XY') {
    return Math.sqrt((p.x - center.x) ** 2 + (p.y - center.y) ** 2);
  } else if (plane === 'XZ') {
    return Math.sqrt((p.x - center.x) ** 2 + (p.z - center.z) ** 2);
  } else {
    return Math.sqrt((p.y - center.y) ** 2 + (p.z - center.z) ** 2);
  }
}

function arcPoint(
  center: Point3D,
  radius: number,
  angle: number,
  plane: PlaneSelect,
  start: Point3D,
  end: Point3D,
  t: number
): Point3D {
  if (plane === 'XY') {
    return {
      x: center.x + radius * Math.cos(angle),
      y: center.y + radius * Math.sin(angle),
      z: start.z + (end.z - start.z) * t,
    };
  } else if (plane === 'XZ') {
    return {
      x: center.x + radius * Math.cos(angle),
      y: start.y + (end.y - start.y) * t,
      z: center.z + radius * Math.sin(angle),
    };
  } else {
    return {
      x: start.x + (end.x - start.x) * t,
      y: center.y + radius * Math.cos(angle),
      z: center.z + radius * Math.sin(angle),
    };
  }
}

function getParam(command: GCodeCommand, letter: string): number | undefined {
  const p = command.params.find((param: { letter: string; value: number }) => param.letter === letter);
  return p?.value;
}

function clonePoint(p: Point3D): Point3D {
  return { x: p.x, y: p.y, z: p.z };
}

function pointsEqual(a: Point3D, b: Point3D): boolean {
  return a.x === b.x && a.y === b.y && a.z === b.z;
}

function getDefaultState(): MachineState {
  try {
    return getDefaultMachineState();
  } catch {
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
}

export function generatePath(commands: GCodeCommand[]): PathSegment[] {
  const state = getDefaultState();
  const segments: PathSegment[] = [];

  for (const command of commands) {
    if (command.type === 'G') {
      const code = command.code;

      if (code === 17) { state.plane = 'XY'; continue; }
      if (code === 18) { state.plane = 'XZ'; continue; }
      if (code === 19) { state.plane = 'YZ'; continue; }
      if (code === 20) { state.unitMode = 'inch'; continue; }
      if (code === 21) { state.unitMode = 'mm'; continue; }
      if (code === 90) { state.distanceMode = 'absolute'; continue; }
      if (code === 91) { state.distanceMode = 'incremental'; continue; }

      if (code === 0 || code === 1 || code === 2 || code === 3) {
        const fParam = getParam(command, 'F');
        if (fParam !== undefined) {
          state.feedRate = state.unitMode === 'inch' ? fParam * 25.4 : fParam;
        }

        const rawX = getParam(command, 'X');
        const rawY = getParam(command, 'Y');
        const rawZ = getParam(command, 'Z');

        const toMM = (v: number) => convertToMM(v, state.unitMode);

        let targetX = state.position.x;
        let targetY = state.position.y;
        let targetZ = state.position.z;

        if (rawX !== undefined) {
          const mmX = toMM(rawX);
          targetX = state.distanceMode === 'absolute' ? mmX : state.position.x + mmX;
        }
        if (rawY !== undefined) {
          const mmY = toMM(rawY);
          targetY = state.distanceMode === 'absolute' ? mmY : state.position.y + mmY;
        }
        if (rawZ !== undefined) {
          const mmZ = toMM(rawZ);
          targetZ = state.distanceMode === 'absolute' ? mmZ : state.position.z + mmZ;
        }

        const start = clonePoint(state.position);
        const end: Point3D = { x: targetX, y: targetY, z: targetZ };

        if (pointsEqual(start, end) && (code === 0 || code === 1)) {
          state.position = end;
          continue;
        }

        if (code === 0) {
          segments.push({
            start,
            end,
            type: 'rapid',
            feedRate: state.feedRate,
            lineNumber: command.lineNumber,
            depth: end.z,
          });
        } else if (code === 1) {
          segments.push({
            start,
            end,
            type: 'linear',
            feedRate: state.feedRate,
            lineNumber: command.lineNumber,
            depth: end.z,
          });
        } else {
          const clockwise = code === 2;
          const movType = clockwise ? 'arc_cw' : 'arc_ccw';

          const rawI = getParam(command, 'I');
          const rawJ = getParam(command, 'J');
          const rawK = getParam(command, 'K');
          const rawR = getParam(command, 'R');

          let center: Point3D;

          if (rawI !== undefined || rawJ !== undefined || rawK !== undefined) {
            const i = rawI !== undefined ? toMM(rawI) : 0;
            const j = rawJ !== undefined ? toMM(rawJ) : 0;
            const k = rawK !== undefined ? toMM(rawK) : 0;
            center = { x: start.x + i, y: start.y + j, z: start.z + k };
          } else if (rawR !== undefined) {
            const r = toMM(rawR);
            center = calcCenterFromR(start, end, r, clockwise, state.plane);
          } else {
            center = { x: start.x, y: start.y, z: start.z };
          }

          const radius = distanceBetween(start, center, state.plane);
          const arcPoints = interpolateArc(start, end, center, clockwise, state.plane);

          segments.push({
            start,
            end,
            type: movType,
            feedRate: state.feedRate,
            lineNumber: command.lineNumber,
            center,
            radius,
            plane: state.plane,
            arcPoints,
            depth: end.z,
          });
        }

        state.position = clonePoint(end);
        continue;
      }

      if (code === 28) {
        const start = clonePoint(state.position);
        const end: Point3D = { x: 0, y: 0, z: 0 };
        if (!pointsEqual(start, end)) {
          segments.push({
            start,
            end,
            type: 'rapid',
            feedRate: state.feedRate,
            lineNumber: command.lineNumber,
            depth: end.z,
          });
        }
        state.position = clonePoint(end);
        continue;
      }
    }

    if (command.type === 'F') {
      const fVal = command.code ?? getParam(command, 'F') ?? 0;
      state.feedRate = state.unitMode === 'inch' ? fVal * 25.4 : fVal;
      continue;
    }

    if (command.type === 'S') {
      state.spindleSpeed = command.code ?? 0;
      continue;
    }

    if (command.type === 'M') {
      const code = command.code;
      if (code === 3) { state.spindleState = 'cw'; continue; }
      if (code === 4) { state.spindleState = 'ccw'; continue; }
      if (code === 5) { state.spindleState = 'off'; continue; }
      if (code === 6) {
        const tNum = getParam(command, 'T');
        if (tNum !== undefined) state.currentTool.number = tNum;
        continue;
      }
      if (code === 0 || code === 1 || code === 30) {
        state.isRunning = false;
        continue;
      }
    }

    if (command.type === 'T') {
      const tNum = command.code ?? getParam(command, 'T');
      if (tNum !== undefined) state.currentTool.number = tNum;
      continue;
    }
  }

  return segments;
}

function calcCenterFromR(
  start: Point3D,
  end: Point3D,
  r: number,
  clockwise: boolean,
  plane: PlaneSelect
): Point3D {
  let dx: number, dy: number;

  if (plane === 'XY') {
    dx = end.x - start.x;
    dy = end.y - start.y;
  } else if (plane === 'XZ') {
    dx = end.x - start.x;
    dy = end.z - start.z;
  } else {
    dx = end.y - start.y;
    dy = end.z - start.z;
  }

  const d = Math.sqrt(dx * dx + dy * dy);
  if (d === 0) return { ...start };

  const h = Math.sqrt(Math.max(0, r * r - (d / 2) ** 2));
  const mx = dx / 2;
  const my = dy / 2;
  const px = -dy / d * h * (clockwise ? 1 : -1);
  const py = dx / d * h * (clockwise ? 1 : -1);

  if (plane === 'XY') {
    return { x: start.x + mx + px, y: start.y + my + py, z: start.z };
  } else if (plane === 'XZ') {
    return { x: start.x + mx + px, y: start.y, z: start.z + my + py };
  } else {
    return { x: start.x, y: start.y + mx + px, z: start.z + my + py };
  }
}

export function CW(params: Record<string, unknown>): { clockwise: true; params: Record<string, unknown> } {
  return { clockwise: true, params };
}

export function CCW(params: Record<string, unknown>): { clockwise: false; params: Record<string, unknown> } {
  return { clockwise: false, params };
}
