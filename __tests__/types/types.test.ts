import { describe, it, expect, beforeEach } from 'vitest';
import type { GCodeCommandType, GCodeParam, GCodeCommand, Point3D, MovementType, PlaneSelect, DistanceMode, UnitMode, SpindleState, PathSegment, ToolInfo, MachineState, BoundingBox, GCodeStats, PlaybackState, SimulatorState, FileLoadResult } from '../../src/shared-types.js';

describe('types', () => {
  describe('GCodeParam', () => {
    it('should accept a valid GCodeParam object', () => {
      const obj: GCodeParam = { letter: 'test', value: 1 };
      expect(obj).toBeDefined();
      expect(obj.letter).toBeDefined();
      expect(obj.value).toBeDefined();
    });
    it('letter should be a string', () => {
      const obj: GCodeParam = { letter: 'test', value: 1 };
      expect(typeof obj.letter).toBe('string');
    });
    it('value should be a number', () => {
      const obj: GCodeParam = { letter: 'test', value: 1 };
      expect(typeof obj.value).toBe('number');
    });
  });

  describe('GCodeCommand', () => {
    it('should accept a valid GCodeCommand object', () => {
      const obj: GCodeCommand = { type: {} as any, code: {} as any, params: [], raw: 'test', lineNumber: 1 };
      expect(obj).toBeDefined();
      expect(obj.type).toBeDefined();
      expect(obj.code).toBeDefined();
      expect(obj.params).toBeDefined();
      expect(obj.raw).toBeDefined();
      expect(obj.lineNumber).toBeDefined();
    });
    it('params should be an array', () => {
      const obj: GCodeCommand = { type: {} as any, code: {} as any, params: [], raw: 'test', lineNumber: 1 };
      expect(Array.isArray(obj.params)).toBe(true);
    });
    it('raw should be a string', () => {
      const obj: GCodeCommand = { type: {} as any, code: {} as any, params: [], raw: 'test', lineNumber: 1 };
      expect(typeof obj.raw).toBe('string');
    });
    it('lineNumber should be a number', () => {
      const obj: GCodeCommand = { type: {} as any, code: {} as any, params: [], raw: 'test', lineNumber: 1 };
      expect(typeof obj.lineNumber).toBe('number');
    });
  });

  describe('Point3D', () => {
    it('should accept a valid Point3D object', () => {
      const obj: Point3D = { x: 1, y: 1, z: 1 };
      expect(obj).toBeDefined();
      expect(obj.x).toBeDefined();
      expect(obj.y).toBeDefined();
      expect(obj.z).toBeDefined();
    });
    it('x should be a number', () => {
      const obj: Point3D = { x: 1, y: 1, z: 1 };
      expect(typeof obj.x).toBe('number');
    });
    it('y should be a number', () => {
      const obj: Point3D = { x: 1, y: 1, z: 1 };
      expect(typeof obj.y).toBe('number');
    });
    it('z should be a number', () => {
      const obj: Point3D = { x: 1, y: 1, z: 1 };
      expect(typeof obj.z).toBe('number');
    });
  });

  describe('PathSegment', () => {
    it('should accept a valid PathSegment object', () => {
      const obj: PathSegment = { start: {} as any, end: {} as any, type: {} as any, feedRate: 1, lineNumber: 1, center: {} as any, radius: 1, plane: {} as any, arcPoints: [], depth: 1 };
      expect(obj).toBeDefined();
      expect(obj.start).toBeDefined();
      expect(obj.end).toBeDefined();
      expect(obj.type).toBeDefined();
      expect(obj.feedRate).toBeDefined();
      expect(obj.lineNumber).toBeDefined();
      expect(obj.center).toBeDefined();
      expect(obj.radius).toBeDefined();
      expect(obj.plane).toBeDefined();
      expect(obj.arcPoints).toBeDefined();
      expect(obj.depth).toBeDefined();
    });
    it('feedRate should be a number', () => {
      const obj: PathSegment = { start: {} as any, end: {} as any, type: {} as any, feedRate: 1, lineNumber: 1, center: {} as any, radius: 1, plane: {} as any, arcPoints: [], depth: 1 };
      expect(typeof obj.feedRate).toBe('number');
    });
    it('lineNumber should be a number', () => {
      const obj: PathSegment = { start: {} as any, end: {} as any, type: {} as any, feedRate: 1, lineNumber: 1, center: {} as any, radius: 1, plane: {} as any, arcPoints: [], depth: 1 };
      expect(typeof obj.lineNumber).toBe('number');
    });
    it('radius should be a number', () => {
      const obj: PathSegment = { start: {} as any, end: {} as any, type: {} as any, feedRate: 1, lineNumber: 1, center: {} as any, radius: 1, plane: {} as any, arcPoints: [], depth: 1 };
      expect(typeof obj.radius).toBe('number');
    });
    it('arcPoints should be an array', () => {
      const obj: PathSegment = { start: {} as any, end: {} as any, type: {} as any, feedRate: 1, lineNumber: 1, center: {} as any, radius: 1, plane: {} as any, arcPoints: [], depth: 1 };
      expect(Array.isArray(obj.arcPoints)).toBe(true);
    });
    it('depth should be a number', () => {
      const obj: PathSegment = { start: {} as any, end: {} as any, type: {} as any, feedRate: 1, lineNumber: 1, center: {} as any, radius: 1, plane: {} as any, arcPoints: [], depth: 1 };
      expect(typeof obj.depth).toBe('number');
    });
  });

  describe('ToolInfo', () => {
    it('should accept a valid ToolInfo object', () => {
      const obj: ToolInfo = { number: 1, diameter: 1, description: 'test' };
      expect(obj).toBeDefined();
      expect(obj.number).toBeDefined();
      expect(obj.diameter).toBeDefined();
      expect(obj.description).toBeDefined();
    });
    it('number should be a number', () => {
      const obj: ToolInfo = { number: 1, diameter: 1, description: 'test' };
      expect(typeof obj.number).toBe('number');
    });
    it('diameter should be a number', () => {
      const obj: ToolInfo = { number: 1, diameter: 1, description: 'test' };
      expect(typeof obj.diameter).toBe('number');
    });
    it('description should be a string', () => {
      const obj: ToolInfo = { number: 1, diameter: 1, description: 'test' };
      expect(typeof obj.description).toBe('string');
    });
  });

  describe('MachineState', () => {
    it('should accept a valid MachineState object', () => {
      const obj: MachineState = { position: {} as any, feedRate: 1, spindleState: {} as any, spindleSpeed: 1, currentTool: {} as any, distanceMode: {} as any, unitMode: {} as any, plane: {} as any, isRunning: true };
      expect(obj).toBeDefined();
      expect(obj.position).toBeDefined();
      expect(obj.feedRate).toBeDefined();
      expect(obj.spindleState).toBeDefined();
      expect(obj.spindleSpeed).toBeDefined();
      expect(obj.currentTool).toBeDefined();
      expect(obj.distanceMode).toBeDefined();
      expect(obj.unitMode).toBeDefined();
      expect(obj.plane).toBeDefined();
      expect(obj.isRunning).toBeDefined();
    });
    it('feedRate should be a number', () => {
      const obj: MachineState = { position: {} as any, feedRate: 1, spindleState: {} as any, spindleSpeed: 1, currentTool: {} as any, distanceMode: {} as any, unitMode: {} as any, plane: {} as any, isRunning: true };
      expect(typeof obj.feedRate).toBe('number');
    });
    it('spindleSpeed should be a number', () => {
      const obj: MachineState = { position: {} as any, feedRate: 1, spindleState: {} as any, spindleSpeed: 1, currentTool: {} as any, distanceMode: {} as any, unitMode: {} as any, plane: {} as any, isRunning: true };
      expect(typeof obj.spindleSpeed).toBe('number');
    });
    it('isRunning should be a boolean', () => {
      const obj: MachineState = { position: {} as any, feedRate: 1, spindleState: {} as any, spindleSpeed: 1, currentTool: {} as any, distanceMode: {} as any, unitMode: {} as any, plane: {} as any, isRunning: true };
      expect(typeof obj.isRunning).toBe('boolean');
    });
  });

  describe('BoundingBox', () => {
    it('should accept a valid BoundingBox object', () => {
      const obj: BoundingBox = { min: {} as any, max: {} as any };
      expect(obj).toBeDefined();
      expect(obj.min).toBeDefined();
      expect(obj.max).toBeDefined();
    });
  });

  describe('GCodeStats', () => {
    it('should accept a valid GCodeStats object', () => {
      const obj: GCodeStats = { totalLines: 1, commandLines: 1, commentLines: 1, emptyLines: 1, rapidMoves: 1, linearMoves: 1, arcMoves: 1, toolChanges: 1, maxFeedRate: 1, minZ: 1, maxZ: 1, estimatedTimeMinutes: 1, boundingBox: {} as any, totalDistance: 1, cuttingDistance: 1 };
      expect(obj).toBeDefined();
      expect(obj.totalLines).toBeDefined();
      expect(obj.commandLines).toBeDefined();
      expect(obj.commentLines).toBeDefined();
      expect(obj.emptyLines).toBeDefined();
      expect(obj.rapidMoves).toBeDefined();
      expect(obj.linearMoves).toBeDefined();
      expect(obj.arcMoves).toBeDefined();
      expect(obj.toolChanges).toBeDefined();
      expect(obj.maxFeedRate).toBeDefined();
      expect(obj.minZ).toBeDefined();
      expect(obj.maxZ).toBeDefined();
      expect(obj.estimatedTimeMinutes).toBeDefined();
      expect(obj.boundingBox).toBeDefined();
      expect(obj.totalDistance).toBeDefined();
      expect(obj.cuttingDistance).toBeDefined();
    });
    it('totalLines should be a number', () => {
      const obj: GCodeStats = { totalLines: 1, commandLines: 1, commentLines: 1, emptyLines: 1, rapidMoves: 1, linearMoves: 1, arcMoves: 1, toolChanges: 1, maxFeedRate: 1, minZ: 1, maxZ: 1, estimatedTimeMinutes: 1, boundingBox: {} as any, totalDistance: 1, cuttingDistance: 1 };
      expect(typeof obj.totalLines).toBe('number');
    });
    it('commandLines should be a number', () => {
      const obj: GCodeStats = { totalLines: 1, commandLines: 1, commentLines: 1, emptyLines: 1, rapidMoves: 1, linearMoves: 1, arcMoves: 1, toolChanges: 1, maxFeedRate: 1, minZ: 1, maxZ: 1, estimatedTimeMinutes: 1, boundingBox: {} as any, totalDistance: 1, cuttingDistance: 1 };
      expect(typeof obj.commandLines).toBe('number');
    });
    it('commentLines should be a number', () => {
      const obj: GCodeStats = { totalLines: 1, commandLines: 1, commentLines: 1, emptyLines: 1, rapidMoves: 1, linearMoves: 1, arcMoves: 1, toolChanges: 1, maxFeedRate: 1, minZ: 1, maxZ: 1, estimatedTimeMinutes: 1, boundingBox: {} as any, totalDistance: 1, cuttingDistance: 1 };
      expect(typeof obj.commentLines).toBe('number');
    });
    it('emptyLines should be a number', () => {
      const obj: GCodeStats = { totalLines: 1, commandLines: 1, commentLines: 1, emptyLines: 1, rapidMoves: 1, linearMoves: 1, arcMoves: 1, toolChanges: 1, maxFeedRate: 1, minZ: 1, maxZ: 1, estimatedTimeMinutes: 1, boundingBox: {} as any, totalDistance: 1, cuttingDistance: 1 };
      expect(typeof obj.emptyLines).toBe('number');
    });
    it('rapidMoves should be a number', () => {
      const obj: GCodeStats = { totalLines: 1, commandLines: 1, commentLines: 1, emptyLines: 1, rapidMoves: 1, linearMoves: 1, arcMoves: 1, toolChanges: 1, maxFeedRate: 1, minZ: 1, maxZ: 1, estimatedTimeMinutes: 1, boundingBox: {} as any, totalDistance: 1, cuttingDistance: 1 };
      expect(typeof obj.rapidMoves).toBe('number');
    });
    it('linearMoves should be a number', () => {
      const obj: GCodeStats = { totalLines: 1, commandLines: 1, commentLines: 1, emptyLines: 1, rapidMoves: 1, linearMoves: 1, arcMoves: 1, toolChanges: 1, maxFeedRate: 1, minZ: 1, maxZ: 1, estimatedTimeMinutes: 1, boundingBox: {} as any, totalDistance: 1, cuttingDistance: 1 };
      expect(typeof obj.linearMoves).toBe('number');
    });
    it('arcMoves should be a number', () => {
      const obj: GCodeStats = { totalLines: 1, commandLines: 1, commentLines: 1, emptyLines: 1, rapidMoves: 1, linearMoves: 1, arcMoves: 1, toolChanges: 1, maxFeedRate: 1, minZ: 1, maxZ: 1, estimatedTimeMinutes: 1, boundingBox: {} as any, totalDistance: 1, cuttingDistance: 1 };
      expect(typeof obj.arcMoves).toBe('number');
    });
    it('toolChanges should be a number', () => {
      const obj: GCodeStats = { totalLines: 1, commandLines: 1, commentLines: 1, emptyLines: 1, rapidMoves: 1, linearMoves: 1, arcMoves: 1, toolChanges: 1, maxFeedRate: 1, minZ: 1, maxZ: 1, estimatedTimeMinutes: 1, boundingBox: {} as any, totalDistance: 1, cuttingDistance: 1 };
      expect(typeof obj.toolChanges).toBe('number');
    });
    it('maxFeedRate should be a number', () => {
      const obj: GCodeStats = { totalLines: 1, commandLines: 1, commentLines: 1, emptyLines: 1, rapidMoves: 1, linearMoves: 1, arcMoves: 1, toolChanges: 1, maxFeedRate: 1, minZ: 1, maxZ: 1, estimatedTimeMinutes: 1, boundingBox: {} as any, totalDistance: 1, cuttingDistance: 1 };
      expect(typeof obj.maxFeedRate).toBe('number');
    });
    it('minZ should be a number', () => {
      const obj: GCodeStats = { totalLines: 1, commandLines: 1, commentLines: 1, emptyLines: 1, rapidMoves: 1, linearMoves: 1, arcMoves: 1, toolChanges: 1, maxFeedRate: 1, minZ: 1, maxZ: 1, estimatedTimeMinutes: 1, boundingBox: {} as any, totalDistance: 1, cuttingDistance: 1 };
      expect(typeof obj.minZ).toBe('number');
    });
    it('maxZ should be a number', () => {
      const obj: GCodeStats = { totalLines: 1, commandLines: 1, commentLines: 1, emptyLines: 1, rapidMoves: 1, linearMoves: 1, arcMoves: 1, toolChanges: 1, maxFeedRate: 1, minZ: 1, maxZ: 1, estimatedTimeMinutes: 1, boundingBox: {} as any, totalDistance: 1, cuttingDistance: 1 };
      expect(typeof obj.maxZ).toBe('number');
    });
    it('estimatedTimeMinutes should be a number', () => {
      const obj: GCodeStats = { totalLines: 1, commandLines: 1, commentLines: 1, emptyLines: 1, rapidMoves: 1, linearMoves: 1, arcMoves: 1, toolChanges: 1, maxFeedRate: 1, minZ: 1, maxZ: 1, estimatedTimeMinutes: 1, boundingBox: {} as any, totalDistance: 1, cuttingDistance: 1 };
      expect(typeof obj.estimatedTimeMinutes).toBe('number');
    });
    it('totalDistance should be a number', () => {
      const obj: GCodeStats = { totalLines: 1, commandLines: 1, commentLines: 1, emptyLines: 1, rapidMoves: 1, linearMoves: 1, arcMoves: 1, toolChanges: 1, maxFeedRate: 1, minZ: 1, maxZ: 1, estimatedTimeMinutes: 1, boundingBox: {} as any, totalDistance: 1, cuttingDistance: 1 };
      expect(typeof obj.totalDistance).toBe('number');
    });
    it('cuttingDistance should be a number', () => {
      const obj: GCodeStats = { totalLines: 1, commandLines: 1, commentLines: 1, emptyLines: 1, rapidMoves: 1, linearMoves: 1, arcMoves: 1, toolChanges: 1, maxFeedRate: 1, minZ: 1, maxZ: 1, estimatedTimeMinutes: 1, boundingBox: {} as any, totalDistance: 1, cuttingDistance: 1 };
      expect(typeof obj.cuttingDistance).toBe('number');
    });
  });

  describe('SimulatorState', () => {
    it('should accept a valid SimulatorState object', () => {
      const obj: SimulatorState = { fileName: {} as any, commands: [], segments: [], stats: {} as any, machineState: {} as any, playbackState: {} as any, playbackSpeed: 1, currentSegmentIndex: 1, currentProgress: 1, showRapids: true, showGrid: true, showAxes: true, colorByDepth: true };
      expect(obj).toBeDefined();
      expect(obj.fileName).toBeDefined();
      expect(obj.commands).toBeDefined();
      expect(obj.segments).toBeDefined();
      expect(obj.stats).toBeDefined();
      expect(obj.machineState).toBeDefined();
      expect(obj.playbackState).toBeDefined();
      expect(obj.playbackSpeed).toBeDefined();
      expect(obj.currentSegmentIndex).toBeDefined();
      expect(obj.currentProgress).toBeDefined();
      expect(obj.showRapids).toBeDefined();
      expect(obj.showGrid).toBeDefined();
      expect(obj.showAxes).toBeDefined();
      expect(obj.colorByDepth).toBeDefined();
    });
    it('commands should be an array', () => {
      const obj: SimulatorState = { fileName: {} as any, commands: [], segments: [], stats: {} as any, machineState: {} as any, playbackState: {} as any, playbackSpeed: 1, currentSegmentIndex: 1, currentProgress: 1, showRapids: true, showGrid: true, showAxes: true, colorByDepth: true };
      expect(Array.isArray(obj.commands)).toBe(true);
    });
    it('segments should be an array', () => {
      const obj: SimulatorState = { fileName: {} as any, commands: [], segments: [], stats: {} as any, machineState: {} as any, playbackState: {} as any, playbackSpeed: 1, currentSegmentIndex: 1, currentProgress: 1, showRapids: true, showGrid: true, showAxes: true, colorByDepth: true };
      expect(Array.isArray(obj.segments)).toBe(true);
    });
    it('playbackSpeed should be a number', () => {
      const obj: SimulatorState = { fileName: {} as any, commands: [], segments: [], stats: {} as any, machineState: {} as any, playbackState: {} as any, playbackSpeed: 1, currentSegmentIndex: 1, currentProgress: 1, showRapids: true, showGrid: true, showAxes: true, colorByDepth: true };
      expect(typeof obj.playbackSpeed).toBe('number');
    });
    it('currentSegmentIndex should be a number', () => {
      const obj: SimulatorState = { fileName: {} as any, commands: [], segments: [], stats: {} as any, machineState: {} as any, playbackState: {} as any, playbackSpeed: 1, currentSegmentIndex: 1, currentProgress: 1, showRapids: true, showGrid: true, showAxes: true, colorByDepth: true };
      expect(typeof obj.currentSegmentIndex).toBe('number');
    });
    it('currentProgress should be a number', () => {
      const obj: SimulatorState = { fileName: {} as any, commands: [], segments: [], stats: {} as any, machineState: {} as any, playbackState: {} as any, playbackSpeed: 1, currentSegmentIndex: 1, currentProgress: 1, showRapids: true, showGrid: true, showAxes: true, colorByDepth: true };
      expect(typeof obj.currentProgress).toBe('number');
    });
    it('showRapids should be a boolean', () => {
      const obj: SimulatorState = { fileName: {} as any, commands: [], segments: [], stats: {} as any, machineState: {} as any, playbackState: {} as any, playbackSpeed: 1, currentSegmentIndex: 1, currentProgress: 1, showRapids: true, showGrid: true, showAxes: true, colorByDepth: true };
      expect(typeof obj.showRapids).toBe('boolean');
    });
    it('showGrid should be a boolean', () => {
      const obj: SimulatorState = { fileName: {} as any, commands: [], segments: [], stats: {} as any, machineState: {} as any, playbackState: {} as any, playbackSpeed: 1, currentSegmentIndex: 1, currentProgress: 1, showRapids: true, showGrid: true, showAxes: true, colorByDepth: true };
      expect(typeof obj.showGrid).toBe('boolean');
    });
    it('showAxes should be a boolean', () => {
      const obj: SimulatorState = { fileName: {} as any, commands: [], segments: [], stats: {} as any, machineState: {} as any, playbackState: {} as any, playbackSpeed: 1, currentSegmentIndex: 1, currentProgress: 1, showRapids: true, showGrid: true, showAxes: true, colorByDepth: true };
      expect(typeof obj.showAxes).toBe('boolean');
    });
    it('colorByDepth should be a boolean', () => {
      const obj: SimulatorState = { fileName: {} as any, commands: [], segments: [], stats: {} as any, machineState: {} as any, playbackState: {} as any, playbackSpeed: 1, currentSegmentIndex: 1, currentProgress: 1, showRapids: true, showGrid: true, showAxes: true, colorByDepth: true };
      expect(typeof obj.colorByDepth).toBe('boolean');
    });
  });

  describe('FileLoadResult', () => {
    it('should accept a valid FileLoadResult object', () => {
      const obj: FileLoadResult = { success: true, fileName: 'test', content: 'test', error: 'test' };
      expect(obj).toBeDefined();
      expect(obj.success).toBeDefined();
      expect(obj.fileName).toBeDefined();
      expect(obj.content).toBeDefined();
      expect(obj.error).toBeDefined();
    });
    it('success should be a boolean', () => {
      const obj: FileLoadResult = { success: true, fileName: 'test', content: 'test', error: 'test' };
      expect(typeof obj.success).toBe('boolean');
    });
    it('fileName should be a string', () => {
      const obj: FileLoadResult = { success: true, fileName: 'test', content: 'test', error: 'test' };
      expect(typeof obj.fileName).toBe('string');
    });
    it('content should be a string', () => {
      const obj: FileLoadResult = { success: true, fileName: 'test', content: 'test', error: 'test' };
      expect(typeof obj.content).toBe('string');
    });
    it('error should be a string', () => {
      const obj: FileLoadResult = { success: true, fileName: 'test', content: 'test', error: 'test' };
      expect(typeof obj.error).toBe('string');
    });
  });

  describe('GCodeCommandType', () => {
    it('should accept partial fields', () => {
      const obj: GCodeCommandType = {};
      expect(obj).toBeDefined();
    });
  });

  describe('MovementType', () => {
    it('should accept partial fields', () => {
      const obj: MovementType = {};
      expect(obj).toBeDefined();
    });
  });

  describe('PlaneSelect', () => {
    it('should accept partial fields', () => {
      const obj: PlaneSelect = {};
      expect(obj).toBeDefined();
    });
  });

  describe('DistanceMode', () => {
    it('should accept partial fields', () => {
      const obj: DistanceMode = {};
      expect(obj).toBeDefined();
    });
  });

  describe('UnitMode', () => {
    it('should accept partial fields', () => {
      const obj: UnitMode = {};
      expect(obj).toBeDefined();
    });
  });

  describe('SpindleState', () => {
    it('should accept partial fields', () => {
      const obj: SpindleState = {};
      expect(obj).toBeDefined();
    });
  });

  describe('PlaybackState', () => {
    it('should accept partial fields', () => {
      const obj: PlaybackState = {};
      expect(obj).toBeDefined();
    });
  });

});
