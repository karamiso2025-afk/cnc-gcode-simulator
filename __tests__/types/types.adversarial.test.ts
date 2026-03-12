import { describe, it, expect } from 'vitest';
import type {
  GCodeCommandType,
  GCodeParam,
  GCodeCommand,
  Point3D,
  MovementType,
  PlaneSelect,
  DistanceMode,
  UnitMode,
  SpindleState,
  PathSegment,
  ToolInfo,
  MachineState,
  BoundingBox,
  GCodeStats,
  PlaybackState,
  SimulatorState,
  FileLoadResult,
} from '../../src/types';

// ============================================================
// 1. BOUNDARY VALUE TESTS
// ============================================================

describe('GCodeParam - Boundary Values', () => {
  it('should accept zero value', () => {
    const param: GCodeParam = { letter: 'X', value: 0 };
    expect(param.value).toBe(0);
    expect(param.letter).toBe('X');
  });

  it('should accept negative value', () => {
    const param: GCodeParam = { letter: 'Y', value: -999.999 };
    expect(param.value).toBeLessThan(0);
  });

  it('should accept very large positive value', () => {
    const param: GCodeParam = { letter: 'Z', value: 1e10 };
    expect(param.value).toBeGreaterThan(0);
  });

  it('should accept very small positive value', () => {
    const param: GCodeParam = { letter: 'F', value: 0.0001 };
    expect(param.value).toBeGreaterThan(0);
    expect(param.value).toBeLessThan(1);
  });

  it('should accept single character letter', () => {
    const param: GCodeParam = { letter: 'A', value: 1 };
    expect(param.letter.length).toBe(1);
  });

  it('should accept empty string as letter (boundary)', () => {
    const param: GCodeParam = { letter: '', value: 1 };
    expect(param.letter).toBe('');
  });

  it('should accept very long letter string (boundary)', () => {
    const longLetter = 'X'.repeat(1000);
    const param: GCodeParam = { letter: longLetter, value: 1 };
    expect(param.letter.length).toBe(1000);
  });

  it('should handle NaN value', () => {
    const param: GCodeParam = { letter: 'X', value: NaN };
    expect(Number.isNaN(param.value)).toBe(true);
  });

  it('should handle Infinity value', () => {
    const param: GCodeParam = { letter: 'X', value: Infinity };
    expect(param.value).toBe(Infinity);
  });

  it('should handle negative Infinity', () => {
    const param: GCodeParam = { letter: 'X', value: -Infinity };
    expect(param.value).toBe(-Infinity);
  });
});

describe('Point3D - Boundary Values', () => {
  it('should accept all zeros', () => {
    const point: Point3D = { x: 0, y: 0, z: 0 };
    expect(point.x).toBe(0);
    expect(point.y).toBe(0);
    expect(point.z).toBe(0);
  });

  it('should accept all negative values', () => {
    const point: Point3D = { x: -100, y: -200, z: -300 };
    expect(point.x).toBeLessThan(0);
    expect(point.y).toBeLessThan(0);
    expect(point.z).toBeLessThan(0);
  });

  it('should accept maximum safe integer', () => {
    const max = Number.MAX_SAFE_INTEGER;
    const point: Point3D = { x: max, y: max, z: max };
    expect(point.x).toBe(max);
  });

  it('should accept minimum safe integer', () => {
    const min = Number.MIN_SAFE_INTEGER;
    const point: Point3D = { x: min, y: min, z: min };
    expect(point.x).toBe(min);
  });

  it('should accept fractional coordinates', () => {
    const point: Point3D = { x: 0.1, y: 0.2, z: 0.3 };
    expect(point.x).toBeCloseTo(0.1);
    expect(point.y).toBeCloseTo(0.2);
    expect(point.z).toBeCloseTo(0.3);
  });

  it('should handle NaN in any coordinate', () => {
    const point: Point3D = { x: NaN, y: 1, z: 1 };
    expect(Number.isNaN(point.x)).toBe(true);
  });
});

describe('GCodeCommand - Boundary Values', () => {
  it('should accept command with null code', () => {
    const cmd: GCodeCommand = {
      type: 'comment',
      code: null,
      params: [],
      raw: '; comment line',
      lineNumber: 1,
    };
    expect(cmd.code).toBeNull();
    expect(cmd.lineNumber).toBe(1);
  });

  it('should accept command with zero code', () => {
    const cmd: GCodeCommand = {
      type: 'G',
      code: 0,
      params: [],
      raw: 'G0',
      lineNumber: 1,
    };
    expect(cmd.code).toBe(0);
  });

  it('should accept command with very large code number', () => {
    const cmd: GCodeCommand = {
      type: 'M',
      code: 9999,
      params: [],
      raw: 'M9999',
      lineNumber: 1,
    };
    expect(cmd.code).toBe(9999);
  });

  it('should accept command with lineNumber = 1', () => {
    const cmd: GCodeCommand = {
      type: 'G',
      code: 1,
      params: [],
      raw: 'G1',
      lineNumber: 1,
    };
    expect(cmd.lineNumber).toBe(1);
  });

  it('should accept command with very large lineNumber', () => {
    const cmd: GCodeCommand = {
      type: 'G',
      code: 1,
      params: [],
      raw: 'G1',
      lineNumber: 999999,
    };
    expect(cmd.lineNumber).toBe(999999);
  });

  it('should accept command with empty raw string', () => {
    const cmd: GCodeCommand = {
      type: 'unknown',
      code: null,
      params: [],
      raw: '',
      lineNumber: 1,
    };
    expect(cmd.raw).toBe('');
  });

  it('should accept command with very long raw string', () => {
    const longRaw = 'G0'.repeat(10000);
    const cmd: GCodeCommand = {
      type: 'G',
      code: 0,
      params: [],
      raw: longRaw,
      lineNumber: 1,
    };
    expect(cmd.raw.length).toBe(20000);
  });

  it('should accept command with empty params array', () => {
    const cmd: GCodeCommand = {
      type: 'G',
      code: 1,
      params: [],
      raw: 'G1',
      lineNumber: 1,
    };
    expect(cmd.params).toHaveLength(0);
  });

  it('should accept command with large params array', () => {
    const params: GCodeParam[] = Array.from({ length: 1000 }, (_, i) => ({
      letter: String.fromCharCode(65 + (i % 26)),
      value: i,
    }));
    const cmd: GCodeCommand = {
      type: 'G',
      code: 1,
      params,
      raw: 'G1 ' + params.map(p => p.letter).join(' '),
      lineNumber: 1,
    };
    expect(cmd.params).toHaveLength(1000);
  });

  it('should accept all valid GCodeCommandType values', () => {
    const types: GCodeCommandType[] = ['G', 'M', 'T', 'F', 'S', 'comment', 'unknown'];
    types.forEach(type => {
      const cmd: GCodeCommand = {
        type,
        code: type === 'comment' ? null : 1,
        params: [],
        raw: 'test',
        lineNumber: 1,
      };
      expect(cmd.type).toBe(type);
    });
  });
});

describe('PathSegment - Boundary Values', () => {
  it('should accept all MovementType values', () => {
    const types: MovementType[] = ['rapid', 'linear', 'arc_cw', 'arc_ccw'];
    types.forEach(type => {
      const segment: PathSegment = {
        start: { x: 0, y: 0, z: 0 },
        end: { x: 1, y: 1, z: 1 },
        type,
        feedRate: 100,
        lineNumber: 1,
        depth: 0,
      };
      expect(segment.type).toBe(type);
    });
  });

  it('should accept zero feedRate', () => {
    const segment: PathSegment = {
      start: { x: 0, y: 0, z: 0 },
      end: { x: 1, y: 1, z: 1 },
      type: 'linear',
      feedRate: 0,
      lineNumber: 1,
      depth: 0,
    };
    expect(segment.feedRate).toBe(0);
  });

  it('should accept negative depth', () => {
    const segment: PathSegment = {
      start: { x: 0, y: 0, z: 0 },
      end: { x: 1, y: 1, z: -10 },
      type: 'linear',
      feedRate: 100,
      lineNumber: 1,
      depth: -100,
    };
    expect(segment.depth).toBeLessThan(0);
  });

  it('should handle optional center field (undefined)', () => {
    const segment: PathSegment = {
      start: { x: 0, y: 0, z: 0 },
      end: { x: 1, y: 1, z: 1 },
      type: 'linear',
      feedRate: 100,
      lineNumber: 1,
      depth: 0,
    };
    expect(segment.center).toBeUndefined();
  });

  it('should handle optional center field (defined for arc)', () => {
    const segment: PathSegment = {
      start: { x: 0, y: 0, z: 0 },
      end: { x: 2, y: 0, z: 0 },
      type: 'arc_cw',
      feedRate: 100,
      lineNumber: 1,
      center: { x: 1, y: 0, z: 0 },
      depth: 0,
    };
    expect(segment.center).toBeDefined();
    expect(segment.center?.x).toBe(1);
  });

  it('should handle optional radius field', () => {
    const segment: PathSegment = {
      start: { x: 0, y: 0, z: 0 },
      end: { x: 2, y: 0, z: 0 },
      type: 'arc_cw',
      feedRate: 100,
      lineNumber: 1,
      radius: 1,
      depth: 0,
    };
    expect(segment.radius).toBe(1);
  });

  it('should handle optional plane field', () => {
    const planes: PlaneSelect[] = ['XY', 'XZ', 'YZ'];
    planes.forEach(plane => {
      const segment: PathSegment = {
        start: { x: 0, y: 0, z: 0 },
        end: { x: 1, y: 1, z: 1 },
        type: 'arc_cw',
        feedRate: 100,
        lineNumber: 1,
        plane,
        depth: 0,
      };
      expect(segment.plane).toBe(plane);
    });
  });

  it('should handle empty arcPoints array', () => {
    const segment: PathSegment = {
      start: { x: 0, y: 0, z: 0 },
      end: { x: 1, y: 1, z: 1 },
      type: 'arc_cw',
      feedRate: 100,
      lineNumber: 1,
      arcPoints: [],
      depth: 0,
    };
    expect(segment.arcPoints).toHaveLength(0);
  });

  it('should handle large arcPoints array', () => {
    const arcPoints = Array.from({ length: 100 }, (_, i) => ({
      x: Math.cos(i),
      y: Math.sin(i),
      z: 0,
    }));
    const segment: PathSegment = {
      start: { x: 0, y: 0, z: 0 },
      end: { x: 1, y: 1, z: 1 },
      type: 'arc_cw',
      feedRate: 100,
      lineNumber: 1,
      arcPoints,
      depth: 0,
    };
    expect(segment.arcPoints).toHaveLength(100);
  });
});

describe('ToolInfo - Boundary Values', () => {
  it('should accept zero tool number', () => {
    const tool: ToolInfo = { number: 0, diameter: 10, description: 'Tool 0' };
    expect(tool.number).toBe(0);
  });

  it('should accept very large tool number', () => {
    const tool: ToolInfo = { number: 999999, diameter: 10, description: 'Tool' };
    expect(tool.number).toBe(999999);
  });

  it('should accept zero diameter', () => {
    const tool: ToolInfo = { number: 1, diameter: 0, description: 'Zero' };
    expect(tool.diameter).toBe(0);
  });

  it('should accept negative diameter', () => {
    const tool: ToolInfo = { number: 1, diameter: -5, description: 'Negative' };
    expect(tool.diameter).toBe(-5);
  });

  it('should accept very long description', () => {
    const description = 'A'.repeat(10000);
    const tool: ToolInfo = { number: 1, diameter: 10, description };
    expect(tool.description.length).toBe(10000);
  });

  it('should accept empty description', () => {
    const tool: ToolInfo = { number: 1, diameter: 10, description: '' };
    expect(tool.description).toBe('');
  });
});

describe('MachineState - Boundary Values', () => {
  it('should accept all SpindleState values', () => {
    const states: SpindleState[] = ['off', 'cw', 'ccw'];
    states.forEach(state => {
      const ms: MachineState = {
        position: { x: 0, y: 0, z: 0 },
        feedRate: 100,
        spindleState: state,
        spindleSpeed: 1000,
        currentTool: { number: 1, diameter: 10, description: 'Tool' },
        distanceMode: 'absolute',
        unitMode: 'mm',
        plane: 'XY',
        isRunning: false,
      };
      expect(ms.spindleState).toBe(state);
    });
  });

  it('should accept all DistanceMode values', () => {
    const modes: DistanceMode[] = ['absolute', 'incremental'];
    modes.forEach(mode => {
      const ms: MachineState = {
        position: { x: 0, y: 0, z: 0 },
        feedRate: 100,
        spindleState: 'off',
        spindleSpeed: 0,
        currentTool: { number: 1, diameter: 10, description: 'Tool' },
        distanceMode: mode,
        unitMode: 'mm',
        plane: 'XY',
        isRunning: false,
      };
      expect(ms.distanceMode).toBe(mode);
    });
  });

  it('should accept all UnitMode values', () => {
    const modes: UnitMode[] = ['mm', 'inch'];
    modes.forEach(mode => {
      const ms: MachineState = {
        position: { x: 0, y: 0, z: 0 },
        feedRate: 100,
        spindleState: 'off',
        spindleSpeed: 0,
        currentTool: { number: 1, diameter: 10, description: 'Tool' },
        distanceMode: 'absolute',
        unitMode: mode,
        plane: 'XY',
        isRunning: false,
      };
      expect(ms.unitMode).toBe(mode);
    });
  });

  it('should accept all PlaneSelect values', () => {
    const planes: PlaneSelect[] = ['XY', 'XZ', 'YZ'];
    planes.forEach(plane => {
      const ms: MachineState = {
        position: { x: 0, y: 0, z: 0 },
        feedRate: 100,
        spindleState: 'off',
        spindleSpeed: 0,
        currentTool: { number: 1, diameter: 10, description: 'Tool' },
        distanceMode: 'absolute',
        unitMode: 'mm',
        plane,
        isRunning: false,
      };
      expect(ms.plane).toBe(plane);
    });
  });

  it('should accept zero spindleSpeed', () => {
    const ms: MachineState = {
      position: { x: 0, y: 0, z: 0 },
      feedRate: 100,
      spindleState: 'off',
      spindleSpeed: 0,
      currentTool: { number: 1, diameter: 10, description: 'Tool' },
      distanceMode: 'absolute',
      unitMode: 'mm',
      plane: 'XY',
      isRunning: false,
    };
    expect(ms.spindleSpeed).toBe(0);
  });

  it('should accept negative spindleSpeed', () => {
    const ms: MachineState = {
      position: { x: 0, y: 0, z: 0 },
      feedRate: 100,
      spindleState: 'cw',
      spindleSpeed: -5000,
      currentTool: { number: 1, diameter: 10, description: 'Tool' },
      distanceMode: 'absolute',
      unitMode: 'mm',
      plane: 'XY',
      isRunning: false,
    };
    expect(ms.spindleSpeed).toBeLessThan(0);
  });

  it('should accept isRunning as true and false', () => {
    const ms1: MachineState = {
      position: { x: 0, y: 0, z: 0 },
      feedRate: 100,
      spindleState: 'off',
      spindleSpeed: 0,
      currentTool: { number: 1, diameter: 10, description: 'Tool' },
      distanceMode: 'absolute',
      unitMode: 'mm',
      plane: 'XY',
      isRunning: true,
    };
    expect(ms1.isRunning).toBe(true);

    const ms2: MachineState = { ...ms1, isRunning: false };
    expect(ms2.isRunning).toBe(false);
  });
});

describe('GCodeStats - Boundary Values', () => {
  it('should accept all zero counts', () => {
    const stats: GCodeStats = {
      totalLines: 0,
      commandLines: 0,
      commentLines: 0,
      emptyLines: 0,
      rapidMoves: 0,
      linearMoves: 0,
      arcMoves: 0,
      toolChanges: 0,
      maxFeedRate: 0,
      minZ: 0,
      maxZ: 0,
      estimatedTimeMinutes: 0,
      boundingBox: {
        min: { x: 0, y: 0, z: 0 },
        max: { x: 0, y: 0, z: 0 },
      },
      totalDistance: 0,
      cuttingDistance: 0,
    };
    expect(stats.totalLines).toBe(0);
  });

  it('should accept very large counts', () => {
    const stats: GCodeStats = {
      totalLines: 1000000,
      commandLines: 999999,
      commentLines: 1,
      emptyLines: 0,
      rapidMoves: 500000,
      linearMoves: 400000,
      arcMoves: 99999,
      toolChanges: 1000,
      maxFeedRate: 10000,
      minZ: -1000,
      maxZ: 1000,
      estimatedTimeMinutes: 1000000,
      boundingBox: {
        min: { x: -1000, y: -1000, z: -1000 },
        max: { x: 1000, y: 1000, z: 1000 },
      },
      totalDistance: 1000000,
      cuttingDistance: 900000,
    };
    expect(stats.totalLines).toBe(1000000);
    expect(stats.rapidMoves).toBeLessThanOrEqual(stats.totalLines);
  });

  it('should accept negative coordinates in boundingBox', () => {
    const stats: GCodeStats = {
      totalLines: 10,
      commandLines: 8,
      commentLines: 1,
      emptyLines: 1,
      rapidMoves: 2,
      linearMoves: 6,
      arcMoves: 0,
      toolChanges: 0,
      maxFeedRate: 200,
      minZ: -50,
      maxZ: 10,
      estimatedTimeMinutes: 5,
      boundingBox: {
        min: { x: -100, y: -200, z: -50 },
        max: { x: 100, y: 200, z: 10 },
      },
      totalDistance: 500,
      cuttingDistance: 400,
    };
    expect(stats.boundingBox.min.z).toBeLessThan(stats.boundingBox.max.z);
  });

  it('should handle inconsistent minZ/maxZ', () => {
    const stats: GCodeStats = {
      totalLines: 10,
      commandLines: 8,
      commentLines: 1,
      emptyLines: 1,
      rapidMoves: 2,
      linearMoves: 6,
      arcMoves: 0,
      toolChanges: 0,
      maxFeedRate: 200,
      minZ: 10,
      maxZ: -50,
      estimatedTimeMinutes: 5,
      boundingBox: {
        min: { x: 0, y: 0, z: 0 },
        max: { x: 0, y: 0, z: 0 },
      },
      totalDistance: 500,
      cuttingDistance: 400,
    };
    // Type allows this even if it's illogical
    expect(stats.minZ).toBeGreaterThan(stats.maxZ);
  });
});

describe('SimulatorState - Boundary Values', () => {
  it('should accept all PlaybackState values', () => {
    const states: PlaybackState[] = ['stopped', 'playing', 'paused'];
    states.forEach(state => {
      const sim: SimulatorState = {
        fileName: null,
        commands: [],
        segments: [],
        stats: null,
        machineState: {
          position: { x: 0, y: 0, z: 0 },
          feedRate: 100,
          spindleState: 'off',
          spindleSpeed: 0,
          currentTool: { number: 1, diameter: 10, description: 'Tool' },
          distanceMode: 'absolute',
          unitMode: 'mm',
          plane: 'XY',
          isRunning: false,
        },
        playbackState: state,
        playbackSpeed: 1,
        currentSegmentIndex: 0,
        currentProgress: 0,
        showRapids: false,
        showGrid: false,
        showAxes: false,
        colorByDepth: false,
      };
      expect(sim.playbackState).toBe(state);
    });
  });

  it('should accept null fileName', () => {
    const sim: SimulatorState = {
      fileName: null,
      commands: [],
      segments: [],
      stats: null,
      machineState: {
        position: { x: 0, y: 0, z: 0 },
        feedRate: 100,
        spindleState: 'off',
        spindleSpeed: 0,
        currentTool: { number: 1, diameter: 10, description: 'Tool' },
        distanceMode: 'absolute',
        unitMode: 'mm',
        plane: 'XY',
        isRunning: false,
      },
      playbackState: 'stopped',
      playbackSpeed: 1,
      currentSegmentIndex: 0,
      currentProgress: 0,
      showRapids: false,
      showGrid: false,
      showAxes: false,
      colorByDepth: false,
    };
    expect(sim.fileName).toBeNull();
  });

  it('should accept very long fileName', () => {
    const sim: SimulatorState = {
      fileName: 'A'.repeat(10000),
      commands: [],
      segments: [],
      stats: null,
      machineState: {
        position: { x: 0, y: 0, z: 0 },
        feedRate: 100,
        spindleState: 'off',
        spindleSpeed: 0,
        currentTool: { number: 1, diameter: 10, description: 'Tool' },
        distanceMode: 'absolute',
        unitMode: 'mm',
        plane: 'XY',
        isRunning: false,
      },
      playbackState: 'stopped',
      playbackSpeed: 1,
      currentSegmentIndex: 0,
      currentProgress: 0,
      showRapids: false,
      showGrid: false,
      showAxes: false,
      colorByDepth: false,
    };
    expect(sim.fileName?.length).toBe(10000);
  });

  it('should accept zero playbackSpeed', () => {
    const sim: SimulatorState = {
      fileName: 'test.gcode',
      commands: [],
      segments: [],
      stats: null,
      machineState: {
        position: { x: 0, y: 0, z: 0 },
        feedRate: 100,
        spindleState: 'off',
        spindleSpeed: 0,
        currentTool: { number: 1, diameter: 10, description: 'Tool' },
        distanceMode: 'absolute',
        unitMode: 'mm',
        plane: 'XY',
        isRunning: false,
      },
      playbackState: 'stopped',
      playbackSpeed: 0,
      currentSegmentIndex: 0,
      currentProgress: 0,
      showRapids: false,
      showGrid: false,
      showAxes: false,
      colorByDepth: false,
    };
    expect(sim.playbackSpeed).toBe(0);
  });

  it('should accept very high playbackSpeed', () => {
    const sim: SimulatorState = {
      fileName: 'test.gcode',
      commands: [],
      segments: [],
      stats: null,
      machineState: {
        position: { x: 0, y: 0, z: 0 },
        feedRate: 100,
        spindleState: 'off',
        spindleSpeed: 0,
        currentTool: { number: 1, diameter: 10, description: 'Tool' },
        distanceMode: 'absolute',
        unitMode: 'mm',
        plane: 'XY',
        isRunning: false,
      },
      playbackState: 'playing',
      playbackSpeed: 1000,
      currentSegmentIndex: 0,
      currentProgress: 0,
      showRapids: false,
      showGrid: false,
      showAxes: false,
      colorByDepth: false,
    };
    expect(sim.playbackSpeed).toBeGreaterThan(1);
  });

  it('should accept currentProgress boundaries (0.0 to 1.0)', () => {
    const sim0: SimulatorState = {
      fileName: 'test.gcode',
      commands: [],
      segments: [],
      stats: null,
      machineState: {
        position: { x: 0, y: 0, z: 0 },
        feedRate: 100,
        spindleState: 'off',
        spindleSpeed: 0,
        currentTool: { number: 1, diameter: 10, description: 'Tool' },
        distanceMode: 'absolute',
        unitMode: 'mm',
        plane: 'XY',
        isRunning: false,
      },
      playbackState: 'stopped',
      playbackSpeed: 1,
      currentSegmentIndex: 0,
      currentProgress: 0,
      showRapids: false,
      showGrid: false,
      showAxes: false,
      colorByDepth: false,
    };
    expect(sim0.currentProgress).toBe(0);

    const sim1: SimulatorState = { ...sim0, currentProgress: 1 };
    expect(sim1.currentProgress).toBe(1);

    const sim05: SimulatorState = { ...sim0, currentProgress: 0.5 };
    expect(sim05.currentProgress).toBe(0.5);
  });

  it('should allow currentProgress outside 0-1 range (no validation)', () => {
    const sim: SimulatorState = {
      fileName: 'test.gcode',
      commands: [],
      segments: [],
      stats: null,
      machineState: {
        position: { x: 0, y: 0, z: 0 },
        feedRate: 100,
        spindleState: 'off',
        spindleSpeed: 0,
        currentTool: { number: 1, diameter: 10, description: 'Tool' },
        distanceMode: 'absolute',
        unitMode: 'mm',
        plane: 'XY',
        isRunning: false,
      },
      playbackState: 'stopped',
      playbackSpeed: 1,
      currentSegmentIndex: 0,
      currentProgress: 2.5,
      showRapids: false,
      showGrid: false,
      showAxes: false,
      colorByDepth: false,
    };
    expect(sim.currentProgress).toBeGreaterThan(1);
  });

  it('should accept null stats', () => {
    const sim: SimulatorState = {
      fileName: 'test.gcode',
      commands: [],
      segments: [],
      stats: null,
      machineState: {
        position: { x: 0, y: 0, z: 0 },
        feedRate: 100,
        spindleState: 'off',
        spindleSpeed: 0,
        currentTool: { number: 1, diameter: 10, description: 'Tool' },
        distanceMode: 'absolute',
        unitMode: 'mm',
        plane: 'XY',
        isRunning: false,
      },
      playbackState: 'stopped',
      playbackSpeed: 1,
      currentSegmentIndex: 0,
      currentProgress: 0,
      showRapids: false,
      showGrid: false,
      showAxes: false,
      colorByDepth: false,
    };
    expect(sim.stats).toBeNull();
  });

  it('should handle all boolean toggle combinations', () => {
    const toggleCombos = [
      { showRapids: true, showGrid: true, showAxes: true, colorByDepth: true },
      { showRapids: false, showGrid: false, showAxes: false, colorByDepth: false },
      { showRapids: true, showGrid: false, showAxes: true, colorByDepth: false },
    ];

    toggleCombos.forEach(combo => {
      const sim: SimulatorState = {
        fileName: 'test.gcode',
        commands: [],
        segments: [],
        stats: null,
        machineState: {
          position: { x: 0, y: 0, z: 0 },
          feedRate: 100,
          spindleState: 'off',
          spindleSpeed: 0,
          currentTool: { number: 1, diameter: 10, description: 'Tool' },
          distanceMode: 'absolute',
          unitMode: 'mm',
          plane: 'XY',
          isRunning: false,
        },
        playbackState: 'stopped',
        playbackSpeed: 1,
        currentSegmentIndex: 0,
        currentProgress: 0,
        ...combo,
      };
      expect(typeof sim.showRapids).toBe('boolean');
      expect(typeof sim.showGrid).toBe('boolean');
      expect(typeof sim.showAxes).toBe('boolean');
      expect(typeof sim.colorByDepth).toBe('boolean');
    });
  });
});

describe('FileLoadResult - Boundary Values', () => {
  it('should accept success = true', () => {
    const result: FileLoadResult = {
      success: true,
      fileName: 'test.gcode',
      content: 'G0 X10 Y20\n',
    };
    expect(result.success).toBe(true);
  });

  it('should accept success = false with error', () => {
    const result: FileLoadResult = {
      success: false,
      fileName: 'invalid.gcode',
      content: '',
      error: 'File not found',
    };
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('should accept very long content', () => {
    const result: FileLoadResult = {
      success: true,
      fileName: 'large.gcode',
      content: 'G0 X0 Y0\n'.repeat(100000),
    };
    expect(result.content.length).toBeGreaterThan(0);
  });

  it('should accept empty content', () => {
    const result: FileLoadResult = {
      success: true,
      fileName: 'empty.gcode',
      content: '',
    };
    expect(result.content).toBe('');
  });

  it('should accept very long error message', () => {
    const result: FileLoadResult = {
      success: false,
      fileName: 'test.gcode',
      content: '',
      error: 'Error: '.repeat(1000),
    };
    expect(result.error?.length).toBeGreaterThan(0);
  });

  it('should allow undefined error field on success', () => {
    const result: FileLoadResult = {
      success: true,
      fileName: 'test.gcode',
      content: 'G0',
    };
    expect(result.error).toBeUndefined();
  });
});

// ============================================================
// 2. SECURITY TESTS
// ============================================================

describe('Security - XSS Prevention', () => {
  it('should accept <script> tag in GCode raw string', () => {
    const cmd: GCodeCommand = {
      type: 'comment',
      code: null,
      params: [],
      raw: 'alert as script("xss")</script>',
      lineNumber: 1,
    };
    expect(cmd.raw).toContain('<script>');
  });

  it('should accept event handler syntax in tool description', () => {
    const tool: ToolInfo = {
      number: 1,
      diameter: 10,
      description: 'onclick="alert(1)" Tool',
    };
    expect(tool.description).toContain('onclick=');
  });

  it('should accept javascript: URL in fileName', () => {
    const sim: SimulatorState = {
      fileName: 'javascript:alert(1).gcode',
      commands: [],
      segments: [],
      stats: null,
      machineState: {
        position: { x: 0, y: 0, z: 0 },
        feedRate: 100,
        spindleState: 'off',
        spindleSpeed: 0,
        currentTool: { number: 1, diameter: 10, description: 'Tool' },
        distanceMode: 'absolute',
        unitMode: 'mm',
        plane: 'XY',
        isRunning: false,
      },
      playbackState: 'stopped',
      playbackSpeed: 1,
      currentSegmentIndex: 0,
      currentProgress: 0,
      showRapids: false,
      showGrid: false,
      showAxes: false,
      colorByDepth: false,
    };
    expect(sim.fileName).toContain('javascript:');
  });
});

describe('Security - Injection Attempts', () => {
  it('should accept SQL-like injection in GCode raw', () => {
    const cmd: GCodeCommand = {
      type: 'comment',
      code: null,
      params: [],
      raw: "'; DROP TABLE commands; --",
      lineNumber: 1,
    };
    expect(cmd.raw).toContain('DROP');
  });

  it('should accept template literal injection in fileName', () => {
    const sim: SimulatorState = {
      fileName: '${process.env.SECRET}.gcode',
      commands: [],
      segments: [],
      stats: null,
      machineState: {
        position: { x: 0, y: 0, z: 0 },
        feedRate: 100,
        spindleState: 'off',
        spindleSpeed: 0,
        currentTool: { number: 1, diameter: 10, description: 'Tool' },
        distanceMode: 'absolute',
        unitMode: 'mm',
        plane: 'XY',
        isRunning: false,
      },
      playbackState: 'stopped',
      playbackSpeed: 1,
      currentSegmentIndex: 0,
      currentProgress: 0,
      showRapids: false,
      showGrid: false,
      showAxes: false,
      colorByDepth: false,
    };
    expect(sim.fileName).toContain('${');
  });
});

describe('Security - Path Traversal', () => {
  it('should accept path traversal in fileName', () => {
    const result: FileLoadResult = {
      success: true,
      fileName: '../../etc/passwd.gcode',
      content: 'root:x:0:0',
    };
    expect(result.fileName).toContain('..');
  });

  it('should accept absolute path in fileName', () => {
    const result: FileLoadResult = {
      success: true,
      fileName: '/etc/passwd.gcode',
      content: 'test',
    };
    expect(result.fileName).toMatch(/^\//);
  });

  it('should accept Windows path traversal', () => {
    const result: FileLoadResult = {
      success: true,
      fileName: '..\\..\\windows\\system32.gcode',
      content: 'test',
    };
    expect(result.fileName).toContain('..\\');
  });
});

// ============================================================
// 3. TYPE SAFETY & STRUCTURE TESTS
// ============================================================

describe('Type Structure Validation', () => {
  it('GCodeCommand should have exactly expected fields', () => {
    const cmd: GCodeCommand = {
      type: 'G',
      code: 1,
      params: [],
      raw: 'G1',
      lineNumber: 1,
    };
    const keys = Object.keys(cmd);
    expect(keys).toContain('type');
    expect(keys).toContain('code');
    expect(keys).toContain('params');
    expect(keys).toContain('raw');
    expect(keys).toContain('lineNumber');
    expect(keys.length).toBe(5);
  });

  it('Point3D should have exactly x, y, z fields', () => {
    const point: Point3D = { x: 1, y: 2, z: 3 };
    const keys = Object.keys(point);
    expect(keys).toEqual(['x', 'y', 'z']);
  });

  it('PathSegment optional fields should be truly optional', () => {
    const segment: PathSegment = {
      start: { x: 0, y: 0, z: 0 },
      end: { x: 1, y: 1, z: 1 },
      type: 'linear',
      feedRate: 100,
      lineNumber: 1,
      depth: 0,
    };
    // center, radius, plane, arcPoints are all optional
    expect(segment.center).toBeUndefined();
    expect(segment.radius).toBeUndefined();
    expect(segment.plane).toBeUndefined();
    expect(segment.arcPoints).toBeUndefined();
  });

  it('FileLoadResult error field should be optional', () => {
    const result: FileLoadResult = {
      success: true,
      fileName: 'test.gcode',
      content: 'G0',
    };
    // error is optional, not required
    expect(!('error' in result) || result.error === undefined).toBe(true);
  });

  it('SimulatorState stats can be null', () => {
    const sim: SimulatorState = {
      fileName: 'test.gcode',
      commands: [],
      segments: [],
      stats: null,
      machineState: {
        position: { x: 0, y: 0, z: 0 },
        feedRate: 100,
        spindleState: 'off',
        spindleSpeed: 0,
        currentTool: { number: 1, diameter: 10, description: 'Tool' },
        distanceMode: 'absolute',
        unitMode: 'mm',
        plane: 'XY',
        isRunning: false,
      },
      playbackState: 'stopped',
      playbackSpeed: 1,
      currentSegmentIndex: 0,
      currentProgress: 0,
      showRapids: false,
      showGrid: false,
      showAxes: false,
      colorByDepth: false,
    };
    expect(sim.stats).toBeNull();
  });
});

describe('Type Enum Values', () => {
  it('GCodeCommandType should only accept valid values', () => {
    const validTypes: GCodeCommandType[] = ['G', 'M', 'T', 'F', 'S', 'comment', 'unknown'];
    validTypes.forEach(type => {
      expect(type).toBeDefined();
    });
  });

  it('MovementType should only accept valid values', () => {
    const validTypes: MovementType[] = ['rapid', 'linear', 'arc_cw', 'arc_ccw'];
    validTypes.forEach(type => {
      expect(type).toBeDefined();
    });
  });

  it('PlaneSelect should accept XY, XZ, YZ', () => {
    const validPlanes: PlaneSelect[] = ['XY', 'XZ', 'YZ'];
    validPlanes.forEach(plane => {
      expect(plane).toBeDefined();
    });
  });

  it('DistanceMode should accept absolute and incremental', () => {
    const validModes: DistanceMode[] = ['absolute', 'incremental'];
    validModes.forEach(mode => {
      expect(mode).toBeDefined();
    });
  });

  it('UnitMode should accept mm and inch', () => {
    const validModes: UnitMode[] = ['mm', 'inch'];
    validModes.forEach(mode => {
      expect(mode).toBeDefined();
    });
  });

  it('SpindleState should accept off, cw, ccw', () => {
    const validStates: SpindleState[] = ['off', 'cw', 'ccw'];
    validStates.forEach(state => {
      expect(state).toBeDefined();
    });
  });

  it('PlaybackState should accept stopped, playing, paused', () => {
    const validStates: PlaybackState[] = ['stopped', 'playing', 'paused'];
    validStates.forEach(state => {
      expect(state).toBeDefined();
    });
  });
});

// ============================================================
// 4. NUMERIC EDGE CASES
// ============================================================

describe('Numeric Edge Cases', () => {
  it('should handle Number.MIN_VALUE', () => {
    const param: GCodeParam = {
      letter: 'X',
      value: Number.MIN_VALUE,
    };
    expect(param.value).toBeGreaterThan(0);
    expect(param.value).toBeLessThan(0.1);
  });

  it('should handle very small negative numbers', () => {
    const point: Point3D = {
      x: -Number.MIN_VALUE,
      y: -0.0000001,
      z: -1e-10,
    };
    expect(point.x).toBeLessThan(0);
    expect(point.y).toBeLessThan(0);
  });

  it('should handle floating point precision issues', () => {
    const point: Point3D = {
      x: 0.1 + 0.2,
      y: 1 / 3,
      z: 10 / 3,
    };
    // JS floating point: 0.1 + 0.2 !== 0.3
    expect(point.x).not.toBe(0.3);
    expect(Math.abs(point.x - 0.3)).toBeLessThan(0.0001);
  });

  it('should handle very large array indices', () => {
    const stats: GCodeStats = {
      totalLines: 9999999,
      commandLines: 9999998,
      commentLines: 1,
      emptyLines: 0,
      rapidMoves: 4999999,
      linearMoves: 4999999,
      arcMoves: 0,
      toolChanges: 100,
      maxFeedRate: 30000,
      minZ: -100,
      maxZ: 0,
      estimatedTimeMinutes: 999999,
      boundingBox: {
        min: { x: -500, y: -500, z: -100 },
        max: { x: 500, y: 500, z: 0 },
      },
      totalDistance: 9999999,
      cuttingDistance: 8999999,
    };
    expect(stats.totalLines).toBeGreaterThan(1000000);
  });
});

// ============================================================
// 5. SPECIAL CHARACTER & ENCODING TESTS
// ============================================================

describe('Special Characters in Strings', () => {
  it('should accept Unicode characters in description', () => {
    const tool: ToolInfo = {
      number: 1,
      diameter: 10,
      description: '工具 🔧 ツール',
    };
    expect(tool.description).toContain('🔧');
  });

  it('should accept null bytes in raw GCode', () => {
    const cmd: GCodeCommand = {
      type: 'comment',
      code: null,
      params: [],
      raw: 'G0\x00X10',
      lineNumber: 1,
    };
    expect(cmd.raw).toContain('\x00');
  });

  it('should accept newlines and tabs in content', () => {
    const result: FileLoadResult = {
      success: true,
      fileName: 'test.gcode',
      content: 'G0\t\nX10\r\nY20\n',
    };
    expect(result.content).toContain('\t');
    expect(result.content).toContain('\n');
    expect(result.content).toContain('\r');
  });

  it('should accept control characters in error message', () => {
    const result: FileLoadResult = {
      success: false,
      fileName: 'test.gcode',
      content: '',
      error: 'Error\x01\x02\x03\x04',
    };
    expect(result.error).toContain('\x01');
  });
});

// ============================================================
// 6. COLLECTION EDGE CASES
// ============================================================

describe('Collection Edge Cases', () => {
  it('should accept extremely large params array', () => {
    const params = Array.from({ length: 10000 }, (_, i) => ({
      letter: String.fromCharCode(65 + (i % 26)),
      value: i * 0.1,
    }));
    const cmd: GCodeCommand = {
      type: 'G',
      code: 1,
      params,
      raw: 'G1',
      lineNumber: 1,
    };
    expect(cmd.params.length).toBe(10000);
  });

  it('should accept duplicate params', () => {
    const cmd: GCodeCommand = {
      type: 'G',
      code: 1,
      params: [
        { letter: 'X', value: 10 },
        { letter: 'X', value: 20 },
        { letter: 'X', value: 30 },
      ],
      raw: 'G1 X10 X20 X30',
      lineNumber: 1,
    };
    expect(cmd.params.filter(p => p.letter === 'X')).toHaveLength(3);
  });

  it('should accept empty commands array in SimulatorState', () => {
    const sim: SimulatorState = {
      fileName: 'test.gcode',
      commands: [],
      segments: [],
      stats: null,
      machineState: {
        position: { x: 0, y: 0, z: 0 },
        feedRate: 100,
        spindleState: 'off',
        spindleSpeed: 0,
        currentTool: { number: 1, diameter: 10, description: 'Tool' },
        distanceMode: 'absolute',
        unitMode: 'mm',
        plane: 'XY',
        isRunning: false,
      },
      playbackState: 'stopped',
      playbackSpeed: 1,
      currentSegmentIndex: 0,
      currentProgress: 0,
      showRapids: false,
      showGrid: false,
      showAxes: false,
      colorByDepth: false,
    };
    expect(sim.commands).toHaveLength(0);
  });

  it('should accept currentSegmentIndex greater than array length', () => {
    const sim: SimulatorState = {
      fileName: 'test.gcode',
      commands: [],
      segments: [],
      stats: null,
      machineState: {
        position: { x: 0, y: 0, z: 0 },
        feedRate: 100,
        spindleState: 'off',
        spindleSpeed: 0,
        currentTool: { number: 1, diameter: 10, description: 'Tool' },
        distanceMode: 'absolute',
        unitMode: 'mm',
        plane: 'XY',
        isRunning: false,
      },
      playbackState: 'stopped',
      playbackSpeed: 1,
      currentSegmentIndex: 1000,
      currentProgress: 0,
      showRapids: false,
      showGrid: false,
      showAxes: false,
      colorByDepth: false,
    };
    expect(sim.currentSegmentIndex).toBeGreaterThan(sim.segments.length);
  });
});
