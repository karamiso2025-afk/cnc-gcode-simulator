import { describe, it, expect, beforeEach } from 'vitest';
import type { GCodeCommand, PathSegment, MachineState, BoundingBox, GCodeStats } from '../../src/shared-types.js';

describe('gcode-analyzer', () => {
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

});
