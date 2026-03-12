import { describe, it, expect } from 'vitest';
import {
  analyzeGCode,
  computeBoundingBox,
  estimateTime,
  getDefaultMachineState,
} from '../../src/gcode-analyzer.js';
import type {
  GCodeCommand,
  PathSegment,
  GCodeStats,
  BoundingBox,
  MachineState,
} from '../../src/shared-types.js';

describe('gcode-analyzer - Adversarial Tests', () => {
  // ============================================================
  // analyzeGCode - 敵対的テスト
  // ============================================================
  describe('analyzeGCode', () => {
    describe('Boundary Values - Empty and Single Elements', () => {
      it('should handle empty commands and empty segments', () => {
        const result = analyzeGCode([], []);
        expect(result).toBeDefined();
        expect(result.totalLines).toBe(0);
        expect(result.commandLines).toBe(0);
        expect(result.commentLines).toBe(0);
        expect(result.emptyLines).toBe(0);
        expect(result.rapidMoves).toBe(0);
        expect(result.linearMoves).toBe(0);
        expect(result.arcMoves).toBe(0);
        expect(result.toolChanges).toBe(0);
      });

      it('should calculate totalLines from last command lineNumber', () => {
        const commands: GCodeCommand[] = [
          { type: 'G', code: 0, params: [], raw: 'G0', lineNumber: 1 },
          { type: 'G', code: 1, params: [], raw: 'G1', lineNumber: 5 },
          { type: 'G', code: 28, params: [], raw: 'G28', lineNumber: 10 },
        ];
        const result = analyzeGCode(commands, []);
        expect(result.totalLines).toBe(10);
      });

      it('should count only non-comment, non-unknown commands as commandLines', () => {
        const commands: GCodeCommand[] = [
          { type: 'G', code: 0, params: [], raw: 'G0', lineNumber: 1 },
          { type: 'comment', code: null, params: [], raw: '; comment', lineNumber: 2 },
          { type: 'M', code: 104, params: [], raw: 'M104', lineNumber: 3 },
          { type: 'unknown', code: null, params: [], raw: 'UNKNOWN', lineNumber: 4 },
          { type: 'F', code: null, params: [], raw: 'F1000', lineNumber: 5 },
        ];
        const result = analyzeGCode(commands, []);
        expect(result.commandLines).toBe(3); // G0, M104, F
        expect(result.commentLines).toBe(1); // comment
        expect(result.emptyLines).toBe(1); // 5 - 3 - 1
      });
    });

    describe('Movement Type Classification', () => {
      it('should count rapid moves correctly', () => {
        const segments: PathSegment[] = [
          {
            start: { x: 0, y: 0, z: 0 },
            end: { x: 10, y: 10, z: 0 },
            type: 'rapid',
            feedRate: 5000,
            lineNumber: 1,
            depth: 0,
          },
          {
            start: { x: 10, y: 10, z: 0 },
            end: { x: 20, y: 20, z: -5 },
            type: 'rapid',
            feedRate: 5000,
            lineNumber: 2,
            depth: 0,
          },
          {
            start: { x: 20, y: 20, z: -5 },
            end: { x: 30, y: 30, z: -5 },
            type: 'linear',
            feedRate: 100,
            lineNumber: 3,
            depth: -5,
          },
        ];
        const result = analyzeGCode([], segments);
        expect(result.rapidMoves).toBe(2);
      });

      it('should count linear moves correctly', () => {
        const segments: PathSegment[] = [
          {
            start: { x: 0, y: 0, z: 0 },
            end: { x: 10, y: 10, z: -5 },
            type: 'linear',
            feedRate: 100,
            lineNumber: 1,
            depth: -5,
          },
          {
            start: { x: 10, y: 10, z: -5 },
            end: { x: 20, y: 20, z: -5 },
            type: 'linear',
            feedRate: 150,
            lineNumber: 2,
            depth: -5,
          },
        ];
        const result = analyzeGCode([], segments);
        expect(result.linearMoves).toBe(2);
      });

      it('should count arc moves (cw and ccw)', () => {
        const segments: PathSegment[] = [
          {
            start: { x: 0, y: 0, z: 0 },
            end: { x: 10, y: 10, z: 0 },
            type: 'arc_cw',
            feedRate: 100,
            lineNumber: 1,
            center: { x: 5, y: 5, z: 0 },
            radius: 7.07,
            plane: 'XY',
            arcPoints: [
              { x: 3, y: 1, z: 0 },
              { x: 8, y: 3, z: 0 },
            ],
            depth: 0,
          },
          {
            start: { x: 10, y: 10, z: 0 },
            end: { x: 0, y: 0, z: 0 },
            type: 'arc_ccw',
            feedRate: 100,
            lineNumber: 2,
            center: { x: 5, y: 5, z: 0 },
            radius: 7.07,
            plane: 'XY',
            arcPoints: [
              { x: 8, y: 8, z: 0 },
              { x: 3, y: 3, z: 0 },
            ],
            depth: 0,
          },
          {
            start: { x: 0, y: 0, z: 0 },
            end: { x: 10, y: 0, z: 0 },
            type: 'linear',
            feedRate: 100,
            lineNumber: 3,
            depth: 0,
          },
        ];
        const result = analyzeGCode([], segments);
        expect(result.arcMoves).toBe(2); // 1 cw + 1 ccw
        expect(result.linearMoves).toBe(1);
      });
    });

    describe('Tool Changes (M6 Commands)', () => {
      it('should count M6 commands as tool changes', () => {
        const commands: GCodeCommand[] = [
          { type: 'G', code: 0, params: [], raw: 'G0', lineNumber: 1 },
          { type: 'M', code: 6, params: [], raw: 'M6', lineNumber: 2 },
          { type: 'G', code: 1, params: [], raw: 'G1', lineNumber: 3 },
          { type: 'M', code: 6, params: [], raw: 'M6', lineNumber: 4 },
          { type: 'M', code: 3, params: [], raw: 'M3', lineNumber: 5 },
        ];
        const result = analyzeGCode(commands, []);
        expect(result.toolChanges).toBe(2);
      });

      it('should not count M3/M5 as tool changes', () => {
        const commands: GCodeCommand[] = [
          { type: 'M', code: 3, params: [], raw: 'M3', lineNumber: 1 },
          { type: 'M', code: 4, params: [], raw: 'M4', lineNumber: 2 },
          { type: 'M', code: 5, params: [], raw: 'M5', lineNumber: 3 },
        ];
        const result = analyzeGCode(commands, []);
        expect(result.toolChanges).toBe(0);
      });

      it('should not count M6 from non-M type commands', () => {
        const commands: GCodeCommand[] = [
          { type: 'G', code: 6, params: [], raw: 'G6', lineNumber: 1 },
          { type: 'T', code: 6, params: [], raw: 'T6', lineNumber: 2 },
          { type: 'M', code: 6, params: [], raw: 'M6', lineNumber: 3 },
        ];
        const result = analyzeGCode(commands, []);
        expect(result.toolChanges).toBe(1); // only M6
      });
    });

    describe('Feed Rate and Z Height Analysis', () => {
      it('should calculate maxFeedRate from all segments', () => {
        const segments: PathSegment[] = [
          {
            start: { x: 0, y: 0, z: 0 },
            end: { x: 10, y: 10, z: 0 },
            type: 'linear',
            feedRate: 100,
            lineNumber: 1,
            depth: 0,
          },
          {
            start: { x: 10, y: 10, z: 0 },
            end: { x: 20, y: 20, z: 0 },
            type: 'linear',
            feedRate: 500,
            lineNumber: 2,
            depth: 0,
          },
          {
            start: { x: 20, y: 20, z: 0 },
            end: { x: 30, y: 30, z: 0 },
            type: 'linear',
            feedRate: 250,
            lineNumber: 3,
            depth: 0,
          },
        ];
        const result = analyzeGCode([], segments);
        expect(result.maxFeedRate).toBe(500);
      });

      it('should calculate minZ and maxZ from start.z, end.z, and arcPoints', () => {
        const segments: PathSegment[] = [
          {
            start: { x: 0, y: 0, z: 10 },
            end: { x: 10, y: 10, z: 5 },
            type: 'linear',
            feedRate: 100,
            lineNumber: 1,
            depth: 5,
          },
          {
            start: { x: 10, y: 10, z: 5 },
            end: { x: 20, y: 20, z: -10 },
            type: 'linear',
            feedRate: 100,
            lineNumber: 2,
            depth: -10,
          },
          {
            start: { x: 20, y: 20, z: -10 },
            end: { x: 30, y: 30, z: 0 },
            type: 'arc_cw',
            feedRate: 100,
            lineNumber: 3,
            center: { x: 25, y: 25, z: 0 },
            radius: 7.07,
            arcPoints: [
              { x: 23, y: 21, z: -15 },
              { x: 28, y: 26, z: 2 },
            ],
            depth: -10,
          },
        ];
        const result = analyzeGCode([], segments);
        expect(result.minZ).toBe(-15); // from arcPoints
        expect(result.maxZ).toBe(10); // from start.z of first segment
      });

      it('should handle negative Z values correctly', () => {
        const segments: PathSegment[] = [
          {
            start: { x: 0, y: 0, z: -5 },
            end: { x: 10, y: 10, z: -20 },
            type: 'linear',
            feedRate: 100,
            lineNumber: 1,
            depth: -20,
          },
        ];
        const result = analyzeGCode([], segments);
        expect(result.minZ).toBe(-20);
        expect(result.maxZ).toBe(-5);
      });

      it('should return -Infinity/Infinity when segments is empty', () => {
        const result = analyzeGCode([], []);
        // When no Z values are found, min should be -Infinity or a safe default
        // and max should be Infinity or a safe default
        expect(typeof result.minZ).toBe('number');
        expect(typeof result.maxZ).toBe('number');
      });
    });

    describe('Distance and Time Calculations', () => {
      it('should calculate totalDistance as sum of all segment distances', () => {
        const segments: PathSegment[] = [
          {
            start: { x: 0, y: 0, z: 0 },
            end: { x: 3, y: 4, z: 0 }, // distance = 5
            type: 'linear',
            feedRate: 100,
            lineNumber: 1,
            depth: 0,
          },
          {
            start: { x: 3, y: 4, z: 0 },
            end: { x: 6, y: 8, z: 0 }, // distance = 5
            type: 'linear',
            feedRate: 100,
            lineNumber: 2,
            depth: 0,
          },
        ];
        const result = analyzeGCode([], segments);
        expect(result.totalDistance).toBe(10); // 5 + 5
      });

      it('should calculate cuttingDistance as totalDistance minus rapid moves', () => {
        const segments: PathSegment[] = [
          {
            start: { x: 0, y: 0, z: 0 },
            end: { x: 3, y: 4, z: 0 }, // distance = 5, rapid
            type: 'rapid',
            feedRate: 5000,
            lineNumber: 1,
            depth: 0,
          },
          {
            start: { x: 3, y: 4, z: 0 },
            end: { x: 6, y: 8, z: 0 }, // distance = 5, linear
            type: 'linear',
            feedRate: 100,
            lineNumber: 2,
            depth: 0,
          },
        ];
        const result = analyzeGCode([], segments);
        expect(result.totalDistance).toBe(10);
        expect(result.cuttingDistance).toBe(5); // 10 - 5 (rapid)
      });

      it('should include estimatedTimeMinutes from estimateTime', () => {
        const segments: PathSegment[] = [
          {
            start: { x: 0, y: 0, z: 0 },
            end: { x: 100, y: 0, z: 0 }, // distance = 100
            type: 'linear',
            feedRate: 100, // 100mm/min
            lineNumber: 1,
            depth: 0,
          },
        ];
        const result = analyzeGCode([], segments);
        expect(result.estimatedTimeMinutes).toBe(1); // 100 / 100 = 1 min
      });
    });

    describe('Bounding Box Integration', () => {
      it('should include computeBoundingBox result', () => {
        const segments: PathSegment[] = [
          {
            start: { x: 0, y: 0, z: 0 },
            end: { x: 10, y: 10, z: 5 },
            type: 'linear',
            feedRate: 100,
            lineNumber: 1,
            depth: 5,
          },
        ];
        const result = analyzeGCode([], segments);
        expect(result.boundingBox).toBeDefined();
        expect(result.boundingBox.min).toEqual({ x: 0, y: 0, z: 0 });
        expect(result.boundingBox.max).toEqual({ x: 10, y: 10, z: 5 });
      });
    });

    describe('Return Type Validation', () => {
      it('should return all required GCodeStats fields', () => {
        const commands: GCodeCommand[] = [
          { type: 'G', code: 0, params: [], raw: 'G0', lineNumber: 1 },
        ];
        const segments: PathSegment[] = [
          {
            start: { x: 0, y: 0, z: 0 },
            end: { x: 10, y: 10, z: 0 },
            type: 'linear',
            feedRate: 100,
            lineNumber: 1,
            depth: 0,
          },
        ];
        const result = analyzeGCode(commands, segments);

        expect(result).toHaveProperty('totalLines');
        expect(result).toHaveProperty('commandLines');
        expect(result).toHaveProperty('commentLines');
        expect(result).toHaveProperty('emptyLines');
        expect(result).toHaveProperty('rapidMoves');
        expect(result).toHaveProperty('linearMoves');
        expect(result).toHaveProperty('arcMoves');
        expect(result).toHaveProperty('toolChanges');
        expect(result).toHaveProperty('maxFeedRate');
        expect(result).toHaveProperty('minZ');
        expect(result).toHaveProperty('maxZ');
        expect(result).toHaveProperty('estimatedTimeMinutes');
        expect(result).toHaveProperty('boundingBox');
        expect(result).toHaveProperty('totalDistance');
        expect(result).toHaveProperty('cuttingDistance');

        // Verify all are numbers
        expect(typeof result.totalLines).toBe('number');
        expect(typeof result.commandLines).toBe('number');
        expect(typeof result.commentLines).toBe('number');
        expect(typeof result.emptyLines).toBe('number');
        expect(typeof result.rapidMoves).toBe('number');
        expect(typeof result.linearMoves).toBe('number');
        expect(typeof result.arcMoves).toBe('number');
        expect(typeof result.toolChanges).toBe('number');
        expect(typeof result.maxFeedRate).toBe('number');
        expect(typeof result.minZ).toBe('number');
        expect(typeof result.maxZ).toBe('number');
        expect(typeof result.estimatedTimeMinutes).toBe('number');
        expect(typeof result.totalDistance).toBe('number');
        expect(typeof result.cuttingDistance).toBe('number');
      });
    });
  });

  // ============================================================
  // computeBoundingBox - 敵対的テスト
  // ============================================================
  describe('computeBoundingBox', () => {
    describe('Empty Segments', () => {
      it('should return zeros for empty segments array', () => {
        const result = computeBoundingBox([]);
        expect(result.min).toEqual({ x: 0, y: 0, z: 0 });
        expect(result.max).toEqual({ x: 0, y: 0, z: 0 });
      });
    });

    describe('Single Segment', () => {
      it('should correctly compute bounds for single segment without arcPoints', () => {
        const segments: PathSegment[] = [
          {
            start: { x: 5, y: 10, z: 2 },
            end: { x: 15, y: 20, z: 8 },
            type: 'linear',
            feedRate: 100,
            lineNumber: 1,
            depth: 8,
          },
        ];
        const result = computeBoundingBox(segments);
        expect(result.min).toEqual({ x: 5, y: 10, z: 2 });
        expect(result.max).toEqual({ x: 15, y: 20, z: 8 });
      });

      it('should include arcPoints in bounds calculation', () => {
        const segments: PathSegment[] = [
          {
            start: { x: 5, y: 10, z: 0 },
            end: { x: 15, y: 10, z: 0 },
            type: 'arc_cw',
            feedRate: 100,
            lineNumber: 1,
            center: { x: 10, y: 10, z: 0 },
            radius: 5,
            arcPoints: [
              { x: 12, y: 5, z: 0 },
              { x: 15, y: 8, z: 0 },
              { x: 10, y: 3, z: 0 }, // minimum y
            ],
            depth: 0,
          },
        ];
        const result = computeBoundingBox(segments);
        expect(result.min.y).toBe(3); // from arcPoints
        expect(result.max.y).toBe(10); // from start/end
      });
    });

    describe('Multiple Segments', () => {
      it('should compute bounds across multiple segments', () => {
        const segments: PathSegment[] = [
          {
            start: { x: 0, y: 0, z: 0 },
            end: { x: 10, y: 10, z: 5 },
            type: 'linear',
            feedRate: 100,
            lineNumber: 1,
            depth: 5,
          },
          {
            start: { x: 10, y: 10, z: 5 },
            end: { x: 5, y: 15, z: -5 },
            type: 'linear',
            feedRate: 100,
            lineNumber: 2,
            depth: -5,
          },
          {
            start: { x: 5, y: 15, z: -5 },
            end: { x: 20, y: 5, z: 2 },
            type: 'linear',
            feedRate: 100,
            lineNumber: 3,
            depth: 2,
          },
        ];
        const result = computeBoundingBox(segments);
        expect(result.min).toEqual({ x: 0, y: 0, z: -5 });
        expect(result.max).toEqual({ x: 20, y: 15, z: 5 });
      });
    });

    describe('Negative Coordinates', () => {
      it('should handle negative X, Y, Z values correctly', () => {
        const segments: PathSegment[] = [
          {
            start: { x: -10, y: -20, z: -5 },
            end: { x: 5, y: 10, z: 2 },
            type: 'linear',
            feedRate: 100,
            lineNumber: 1,
            depth: 2,
          },
        ];
        const result = computeBoundingBox(segments);
        expect(result.min).toEqual({ x: -10, y: -20, z: -5 });
        expect(result.max).toEqual({ x: 5, y: 10, z: 2 });
      });

      it('should handle all negative coordinates', () => {
        const segments: PathSegment[] = [
          {
            start: { x: -50, y: -50, z: -50 },
            end: { x: -10, y: -10, z: -10 },
            type: 'linear',
            feedRate: 100,
            lineNumber: 1,
            depth: -10,
          },
        ];
        const result = computeBoundingBox(segments);
        expect(result.min).toEqual({ x: -50, y: -50, z: -50 });
        expect(result.max).toEqual({ x: -10, y: -10, z: -10 });
      });
    });

    describe('Return Type Validation', () => {
      it('should return BoundingBox with min and max properties', () => {
        const segments: PathSegment[] = [
          {
            start: { x: 0, y: 0, z: 0 },
            end: { x: 10, y: 10, z: 10 },
            type: 'linear',
            feedRate: 100,
            lineNumber: 1,
            depth: 10,
          },
        ];
        const result = computeBoundingBox(segments);
        expect(result).toHaveProperty('min');
        expect(result).toHaveProperty('max');
        expect(result.min).toHaveProperty('x');
        expect(result.min).toHaveProperty('y');
        expect(result.min).toHaveProperty('z');
        expect(result.max).toHaveProperty('x');
        expect(result.max).toHaveProperty('y');
        expect(result.max).toHaveProperty('z');

        // Verify types
        expect(typeof result.min.x).toBe('number');
        expect(typeof result.min.y).toBe('number');
        expect(typeof result.min.z).toBe('number');
        expect(typeof result.max.x).toBe('number');
        expect(typeof result.max.y).toBe('number');
        expect(typeof result.max.z).toBe('number');
      });
    });
  });

  // ============================================================
  // estimateTime - 敵対的テスト
  // ============================================================
  describe('estimateTime', () => {
    describe('Empty Segments', () => {
      it('should return 0 for empty segments array', () => {
        const result = estimateTime([]);
        expect(result).toBe(0);
      });
    });

    describe('Linear Move Time Calculation', () => {
      it('should calculate time for a single linear segment', () => {
        const segments: PathSegment[] = [
          {
            start: { x: 0, y: 0, z: 0 },
            end: { x: 100, y: 0, z: 0 }, // distance = 100
            type: 'linear',
            feedRate: 100, // mm/min
            lineNumber: 1,
            depth: 0,
          },
        ];
        const result = estimateTime(segments);
        expect(result).toBe(1); // 100mm / 100mm/min = 1 min
      });

      it('should calculate time for multiple linear segments', () => {
        const segments: PathSegment[] = [
          {
            start: { x: 0, y: 0, z: 0 },
            end: { x: 100, y: 0, z: 0 }, // distance = 100, time = 100/100 = 1
            type: 'linear',
            feedRate: 100,
            lineNumber: 1,
            depth: 0,
          },
          {
            start: { x: 100, y: 0, z: 0 },
            end: { x: 100, y: 100, z: 0 }, // distance = 100, time = 100/50 = 2
            type: 'linear',
            feedRate: 50,
            lineNumber: 2,
            depth: 0,
          },
        ];
        const result = estimateTime(segments);
        expect(result).toBe(3); // 1 + 2
      });

      it('should handle 3D distance calculation (Euclidean)', () => {
        const segments: PathSegment[] = [
          {
            start: { x: 0, y: 0, z: 0 },
            end: { x: 3, y: 4, z: 0 }, // distance = 5 (3-4-5 triangle)
            type: 'linear',
            feedRate: 100,
            lineNumber: 1,
            depth: 0,
          },
        ];
        const result = estimateTime(segments);
        expect(result).toBe(0.05); // 5 / 100 = 0.05 min
      });
    });

    describe('Rapid Move Feed Rate Defaults', () => {
      it('should use 5000 mm/min for rapid moves without explicit feedRate', () => {
        const segments: PathSegment[] = [
          {
            start: { x: 0, y: 0, z: 0 },
            end: { x: 100, y: 0, z: 0 }, // distance = 100
            type: 'rapid',
            feedRate: 0, // or undefined in spec, defaults to 5000
            lineNumber: 1,
            depth: 0,
          },
        ];
        // Assuming feedRate: 0 or missing means 5000 for rapid
        const result = estimateTime(segments);
        expect(result).toBeCloseTo(100 / 5000, 5); // 0.02 min
      });

      it('should use explicit feedRate for rapid moves when provided', () => {
        const segments: PathSegment[] = [
          {
            start: { x: 0, y: 0, z: 0 },
            end: { x: 100, y: 0, z: 0 },
            type: 'rapid',
            feedRate: 5000,
            lineNumber: 1,
            depth: 0,
          },
        ];
        const result = estimateTime(segments);
        expect(result).toBeCloseTo(0.02, 5);
      });
    });

    describe('Arc Move Distance Calculation', () => {
      it('should calculate distance for arc moves using arcPoints', () => {
        const segments: PathSegment[] = [
          {
            start: { x: 0, y: 0, z: 0 },
            end: { x: 10, y: 10, z: 0 },
            type: 'arc_cw',
            feedRate: 100,
            lineNumber: 1,
            center: { x: 5, y: 5, z: 0 },
            radius: 7.07,
            plane: 'XY',
            arcPoints: [
              { x: 3, y: 1, z: 0 },
              { x: 8, y: 3, z: 0 },
            ],
            depth: 0,
          },
        ];
        const result = estimateTime(segments);
        expect(typeof result).toBe('number');
        expect(result).toBeGreaterThan(0);
      });
    });

    describe('Return Type Validation', () => {
      it('should return a number', () => {
        const segments: PathSegment[] = [
          {
            start: { x: 0, y: 0, z: 0 },
            end: { x: 100, y: 0, z: 0 },
            type: 'linear',
            feedRate: 100,
            lineNumber: 1,
            depth: 0,
          },
        ];
        const result = estimateTime(segments);
        expect(typeof result).toBe('number');
      });

      it('should return non-negative time', () => {
        const segments: PathSegment[] = [
          {
            start: { x: 0, y: 0, z: 0 },
            end: { x: 50, y: 50, z: 50 },
            type: 'linear',
            feedRate: 100,
            lineNumber: 1,
            depth: 50,
          },
        ];
        const result = estimateTime(segments);
        expect(result).toBeGreaterThanOrEqual(0);
      });
    });
  });

  // ============================================================
  // getDefaultMachineState - 敵対的テスト
  // ============================================================
  describe('getDefaultMachineState', () => {
    describe('Default Values Specification', () => {
      it('should return position with x:0, y:0, z:0', () => {
        const state = getDefaultMachineState();
        expect(state.position).toEqual({ x: 0, y: 0, z: 0 });
      });

      it('should return feedRate of 1000', () => {
        const state = getDefaultMachineState();
        expect(state.feedRate).toBe(1000);
      });

      it('should return spindleState of "off"', () => {
        const state = getDefaultMachineState();
        expect(state.spindleState).toBe('off');
      });

      it('should return spindleSpeed of 0', () => {
        const state = getDefaultMachineState();
        expect(state.spindleSpeed).toBe(0);
      });

      it('should return currentTool with correct properties', () => {
        const state = getDefaultMachineState();
        expect(state.currentTool).toEqual({
          number: 1,
          diameter: 6.35,
          description: 'Default 1/4 inch',
        });
      });

      it('should return distanceMode of "absolute"', () => {
        const state = getDefaultMachineState();
        expect(state.distanceMode).toBe('absolute');
      });

      it('should return unitMode of "mm"', () => {
        const state = getDefaultMachineState();
        expect(state.unitMode).toBe('mm');
      });

      it('should return plane of "XY"', () => {
        const state = getDefaultMachineState();
        expect(state.plane).toBe('XY');
      });

      it('should return isRunning as true', () => {
        const state = getDefaultMachineState();
        expect(state.isRunning).toBe(true);
      });
    });

    describe('Return Type Validation', () => {
      it('should return complete MachineState with all properties', () => {
        const state = getDefaultMachineState();
        expect(state).toHaveProperty('position');
        expect(state).toHaveProperty('feedRate');
        expect(state).toHaveProperty('spindleState');
        expect(state).toHaveProperty('spindleSpeed');
        expect(state).toHaveProperty('currentTool');
        expect(state).toHaveProperty('distanceMode');
        expect(state).toHaveProperty('unitMode');
        expect(state).toHaveProperty('plane');
        expect(state).toHaveProperty('isRunning');
      });

      it('should return MachineState with correct types', () => {
        const state = getDefaultMachineState();
        expect(typeof state.position).toBe('object');
        expect(typeof state.feedRate).toBe('number');
        expect(typeof state.spindleState).toBe('string');
        expect(typeof state.spindleSpeed).toBe('number');
        expect(typeof state.currentTool).toBe('object');
        expect(typeof state.distanceMode).toBe('string');
        expect(typeof state.unitMode).toBe('string');
        expect(typeof state.plane).toBe('string');
        expect(typeof state.isRunning).toBe('boolean');
      });

      it('should return position with x, y, z properties', () => {
        const state = getDefaultMachineState();
        expect(state.position).toHaveProperty('x');
        expect(state.position).toHaveProperty('y');
        expect(state.position).toHaveProperty('z');
        expect(typeof state.position.x).toBe('number');
        expect(typeof state.position.y).toBe('number');
        expect(typeof state.position.z).toBe('number');
      });

      it('should return currentTool with number, diameter, description', () => {
        const state = getDefaultMachineState();
        expect(state.currentTool).toHaveProperty('number');
        expect(state.currentTool).toHaveProperty('diameter');
        expect(state.currentTool).toHaveProperty('description');
        expect(typeof state.currentTool.number).toBe('number');
        expect(typeof state.currentTool.diameter).toBe('number');
        expect(typeof state.currentTool.description).toBe('string');
      });
    });

    describe('Immutability / Independence', () => {
      it('should return fresh objects (not shared references)', () => {
        const state1 = getDefaultMachineState();
        const state2 = getDefaultMachineState();
        // Modify state1
        state1.position.x = 100;
        state1.feedRate = 2000;
        // state2 should not be affected
        expect(state2.position.x).toBe(0);
        expect(state2.feedRate).toBe(1000);
      });

      it('should return independent currentTool objects', () => {
        const state1 = getDefaultMachineState();
        const state2 = getDefaultMachineState();
        // Modify state1's tool
        state1.currentTool.number = 5;
        state1.currentTool.diameter = 10;
        // state2 should not be affected
        expect(state2.currentTool.number).toBe(1);
        expect(state2.currentTool.diameter).toBe(6.35);
      });
    });
  });

  // ============================================================
  // Integration and Edge Case Tests
  // ============================================================
  describe('Integration - analyzeGCode with Complex Scenarios', () => {
    it('should handle mixed command types and segments', () => {
      const commands: GCodeCommand[] = [
        { type: 'comment', code: null, params: [], raw: '; Start', lineNumber: 1 },
        { type: 'G', code: 28, params: [], raw: 'G28', lineNumber: 2 },
        { type: 'G', code: 0, params: [], raw: 'G0 X10 Y10', lineNumber: 3 },
        { type: 'M', code: 6, params: [], raw: 'M6 T2', lineNumber: 4 },
        { type: 'G', code: 1, params: [], raw: 'G1 Z-5', lineNumber: 5 },
        { type: 'comment', code: null, params: [], raw: '; Cut path', lineNumber: 6 },
        { type: 'unknown', code: null, params: [], raw: 'X20 Y20', lineNumber: 7 },
        { type: 'M', code: 5, params: [], raw: 'M5', lineNumber: 8 },
        { type: 'G', code: 28, params: [], raw: 'G28', lineNumber: 9 },
      ];

      const segments: PathSegment[] = [
        {
          start: { x: 0, y: 0, z: 0 },
          end: { x: 10, y: 10, z: 0 },
          type: 'rapid',
          feedRate: 5000,
          lineNumber: 3,
          depth: 0,
        },
        {
          start: { x: 10, y: 10, z: 0 },
          end: { x: 10, y: 10, z: -5 },
          type: 'linear',
          feedRate: 50,
          lineNumber: 5,
          depth: -5,
        },
        {
          start: { x: 10, y: 10, z: -5 },
          end: { x: 20, y: 20, z: -5 },
          type: 'linear',
          feedRate: 100,
          lineNumber: 7,
          depth: -5,
        },
      ];

      const result = analyzeGCode(commands, segments);

      expect(result.totalLines).toBe(9);
      expect(result.commandLines).toBe(6); // G28, G0, M6, G1, M5, G28
      expect(result.commentLines).toBe(2);
      expect(result.emptyLines).toBe(1); // 9 - 6 - 2
      expect(result.rapidMoves).toBe(1);
      expect(result.linearMoves).toBe(2);
      expect(result.arcMoves).toBe(0);
      expect(result.toolChanges).toBe(1); // M6
      expect(result.minZ).toBe(-5);
      expect(result.maxZ).toBe(0);
      expect(result.totalDistance).toBeGreaterThan(0);
      expect(result.cuttingDistance).toBeGreaterThan(0);
      expect(result.cuttingDistance).toBeLessThan(result.totalDistance);
    });
  });
});
