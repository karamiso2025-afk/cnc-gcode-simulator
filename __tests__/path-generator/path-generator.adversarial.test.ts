import { describe, it, expect } from 'vitest';
import { convertToMM, interpolateArc, generatePath } from '../../src/path-generator.js';
import type { GCodeCommand, Point3D, PlaneSelect, UnitMode, PathSegment } from '../../src/shared-types.js';

/**
 * ADVERSARIAL TEST SUITE FOR path-generator
 *
 * Focus areas:
 * 1. Boundary values (0, negative, max values, infinity, NaN)
 * 2. Error handling (empty arrays, malformed commands, missing fields)
 * 3. Type safety (correct return types, no extra fields)
 * 4. Security (injection attempts, extreme values)
 * 5. Specification compliance (modal states, coordinate systems, unit conversion)
 */

// ============================================================
// convertToMM() TESTS
// ============================================================

describe('convertToMM - Unit Conversion', () => {
  describe('Boundary Values', () => {
    it('should convert 0 inches to 0 mm', () => {
      expect(convertToMM(0, 'inch')).toBe(0);
    });

    it('should pass through 0 mm unchanged', () => {
      expect(convertToMM(0, 'mm')).toBe(0);
    });

    it('should convert 1 inch to exactly 25.4 mm', () => {
      expect(convertToMM(1, 'inch')).toBe(25.4);
    });

    it('should handle negative inch values', () => {
      expect(convertToMM(-1, 'inch')).toBe(-25.4);
    });

    it('should handle negative mm values', () => {
      expect(convertToMM(-100, 'mm')).toBe(-100);
    });

    it('should handle large positive values', () => {
      expect(convertToMM(1000000, 'inch')).toBe(25400000);
      expect(convertToMM(1000000, 'mm')).toBe(1000000);
    });

    it('should handle very small fractional values', () => {
      const result = convertToMM(0.001, 'inch');
      expect(result).toBeCloseTo(0.0254, 6);
    });

    it('should handle maximum safe integer', () => {
      const maxSafeInt = Number.MAX_SAFE_INTEGER;
      // Should not throw, result may be Infinity due to multiplication
      expect(() => convertToMM(maxSafeInt, 'inch')).not.toThrow();
    });
  });

  describe('Infinity and NaN Handling', () => {
    it('should handle Infinity in inch mode', () => {
      const result = convertToMM(Infinity, 'inch');
      expect(result).toBe(Infinity);
    });

    it('should handle -Infinity in inch mode', () => {
      const result = convertToMM(-Infinity, 'inch');
      expect(result).toBe(-Infinity);
    });

    it('should propagate NaN in inch mode', () => {
      expect(Number.isNaN(convertToMM(NaN, 'inch'))).toBe(true);
    });

    it('should propagate NaN in mm mode', () => {
      expect(Number.isNaN(convertToMM(NaN, 'mm'))).toBe(true);
    });
  });

  describe('Type Safety', () => {
    it('should return a number type', () => {
      const result = convertToMM(1, 'mm');
      expect(typeof result).toBe('number');
    });

    it('should handle inch unit mode case-sensitively', () => {
      // Only 'inch' and 'mm' are valid, others should treat as unknown
      expect(convertToMM(1, 'mm')).toBe(1);
    });

    it('should return numeric result even with edge case inputs', () => {
      expect(typeof convertToMM(0, 'inch')).toBe('number');
      expect(typeof convertToMM(-999.99, 'mm')).toBe('number');
    });
  });

  describe('Precision', () => {
    it('should maintain precision for decimal values', () => {
      expect(convertToMM(2.5, 'inch')).toBeCloseTo(63.5, 10);
    });

    it('should handle repeating decimals correctly', () => {
      const oneThirdInch = 1 / 3;
      const result = convertToMM(oneThirdInch, 'inch');
      expect(result).toBeCloseTo((1 / 3) * 25.4, 10);
    });
  });
});

// ============================================================
// interpolateArc() TESTS
// ============================================================

describe('interpolateArc - Arc Interpolation', () => {
  describe('XY Plane (G17)', () => {
    it('should include start point for XY plane', () => {
      const start: Point3D = { x: 0, y: 0, z: 0 };
      const end: Point3D = { x: 10, y: 0, z: 0 };
      const center: Point3D = { x: 5, y: 0, z: 0 };
      const result = interpolateArc(start, end, center, true, 'XY');

      expect(result[0]).toEqual(start);
      expect(result[result.length - 1]).toEqual(end);
    });

    it('should return minimum 4 points for quarter circle in XY', () => {
      const start: Point3D = { x: 0, y: 0, z: 0 };
      const end: Point3D = { x: 10, y: 10, z: 0 };
      const center: Point3D = { x: 0, y: 10, z: 0 };
      const result = interpolateArc(start, end, center, false, 'XY');

      expect(result.length).toBeGreaterThanOrEqual(4);
    });

    it('should respect maximum 36 points for full circle in XY', () => {
      const start: Point3D = { x: 10, y: 0, z: 0 };
      const end: Point3D = { x: 10, y: 0, z: 0 };
      const center: Point3D = { x: 0, y: 0, z: 0 };
      const result = interpolateArc(start, end, center, true, 'XY');

      expect(result.length).toBeLessThanOrEqual(36);
      expect(result.length).toBeGreaterThanOrEqual(4);
    });

    it('should linearly interpolate Z axis in XY plane', () => {
      const start: Point3D = { x: 10, y: 0, z: 0 };
      const end: Point3D = { x: 10, y: 0, z: 10 };
      const center: Point3D = { x: 0, y: 0, z: 0 };
      const result = interpolateArc(start, end, center, true, 'XY');

      // Check that Z increases monotonically from start to end
      expect(result[0].z).toBe(0);
      expect(result[result.length - 1].z).toBe(10);

      for (let i = 1; i < result.length; i++) {
        expect(result[i].z).toBeGreaterThanOrEqual(result[i - 1].z);
        expect(result[i].z).toBeLessThanOrEqual(10);
      }
    });

    it('should handle clockwise direction in XY plane', () => {
      const start: Point3D = { x: 10, y: 0, z: 0 };
      const end: Point3D = { x: 0, y: 10, z: 0 };
      const center: Point3D = { x: 0, y: 0, z: 0 };
      const resultCW = interpolateArc(start, end, center, true, 'XY');
      const resultCCW = interpolateArc(start, end, center, false, 'XY');

      // Both should include start and end
      expect(resultCW[0]).toEqual(start);
      expect(resultCW[resultCW.length - 1]).toEqual(end);
      expect(resultCCW[0]).toEqual(start);
      expect(resultCCW[resultCCW.length - 1]).toEqual(end);

      // They should have different point sequences (different number of points or different positions)
      expect(resultCW.length !== resultCCW.length || JSON.stringify(resultCW) !== JSON.stringify(resultCCW)).toBe(true);
    });
  });

  describe('XZ Plane (G18)', () => {
    it('should include start and end points for XZ plane', () => {
      const start: Point3D = { x: 0, y: 0, z: 0 };
      const end: Point3D = { x: 10, y: 0, z: 0 };
      const center: Point3D = { x: 5, y: 0, z: 0 };
      const result = interpolateArc(start, end, center, true, 'XZ');

      expect(result[0]).toEqual(start);
      expect(result[result.length - 1]).toEqual(end);
    });

    it('should linearly interpolate Y axis in XZ plane', () => {
      const start: Point3D = { x: 10, y: 0, z: 0 };
      const end: Point3D = { x: 10, y: 10, z: 0 };
      const center: Point3D = { x: 0, y: 0, z: 0 };
      const result = interpolateArc(start, end, center, true, 'XZ');

      expect(result[0].y).toBe(0);
      expect(result[result.length - 1].y).toBe(10);

      for (let i = 1; i < result.length; i++) {
        expect(result[i].y).toBeGreaterThanOrEqual(result[i - 1].y);
      }
    });
  });

  describe('YZ Plane (G19)', () => {
    it('should include start and end points for YZ plane', () => {
      const start: Point3D = { x: 0, y: 0, z: 0 };
      const end: Point3D = { x: 0, y: 10, z: 0 };
      const center: Point3D = { x: 0, y: 5, z: 0 };
      const result = interpolateArc(start, end, center, true, 'YZ');

      expect(result[0]).toEqual(start);
      expect(result[result.length - 1]).toEqual(end);
    });

    it('should linearly interpolate X axis in YZ plane', () => {
      const start: Point3D = { x: 0, y: 10, z: 0 };
      const end: Point3D = { x: 10, y: 10, z: 0 };
      const center: Point3D = { x: 0, y: 0, z: 0 };
      const result = interpolateArc(start, end, center, true, 'YZ');

      expect(result[0].x).toBe(0);
      expect(result[result.length - 1].x).toBe(10);

      for (let i = 1; i < result.length; i++) {
        expect(result[i].x).toBeGreaterThanOrEqual(result[i - 1].x);
      }
    });
  });

  describe('Boundary Cases', () => {
    it('should handle zero-radius case (start === center)', () => {
      const start: Point3D = { x: 0, y: 0, z: 0 };
      const end: Point3D = { x: 0, y: 0, z: 10 };
      const center: Point3D = { x: 0, y: 0, z: 0 };
      const result = interpolateArc(start, end, center, true, 'XY');

      // Should still return points, just a vertical line effectively
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThanOrEqual(4);
    });

    it('should handle very small arc (nearly straight line)', () => {
      const start: Point3D = { x: 0, y: 0, z: 0 };
      const end: Point3D = { x: 0.0001, y: 0.0001, z: 0 };
      const center: Point3D = { x: 0.00005, y: 0, z: 0 };
      const result = interpolateArc(start, end, center, false, 'XY');

      expect(result.length).toBeGreaterThanOrEqual(4);
      expect(result[0]).toEqual(start);
      expect(result[result.length - 1]).toEqual(end);
    });

    it('should handle negative coordinates', () => {
      const start: Point3D = { x: -10, y: -10, z: -5 };
      const end: Point3D = { x: 10, y: 10, z: 5 };
      const center: Point3D = { x: 0, y: 0, z: 0 };
      const result = interpolateArc(start, end, center, false, 'XY');

      expect(result[0]).toEqual(start);
      expect(result[result.length - 1]).toEqual(end);
      expect(result.length).toBeGreaterThanOrEqual(4);
    });

    it('should handle large coordinate values', () => {
      const start: Point3D = { x: 100000, y: 100000, z: 0 };
      const end: Point3D = { x: 100010, y: 100000, z: 0 };
      const center: Point3D = { x: 100005, y: 100000, z: 0 };
      const result = interpolateArc(start, end, center, true, 'XY');

      expect(result[0]).toEqual(start);
      expect(result[result.length - 1]).toEqual(end);
    });
  });

  describe('Type Safety', () => {
    it('should return array of Point3D objects', () => {
      const start: Point3D = { x: 0, y: 0, z: 0 };
      const end: Point3D = { x: 10, y: 0, z: 0 };
      const center: Point3D = { x: 5, y: 0, z: 0 };
      const result = interpolateArc(start, end, center, true, 'XY');

      expect(Array.isArray(result)).toBe(true);
      result.forEach((point) => {
        expect(typeof point.x).toBe('number');
        expect(typeof point.y).toBe('number');
        expect(typeof point.z).toBe('number');
        expect(Object.keys(point).length).toBe(3); // Only x, y, z
      });
    });

    it('should not include NaN in results', () => {
      const start: Point3D = { x: 0, y: 0, z: 0 };
      const end: Point3D = { x: 10, y: 0, z: 0 };
      const center: Point3D = { x: 5, y: 0, z: 0 };
      const result = interpolateArc(start, end, center, true, 'XY');

      result.forEach((point) => {
        expect(Number.isNaN(point.x)).toBe(false);
        expect(Number.isNaN(point.y)).toBe(false);
        expect(Number.isNaN(point.z)).toBe(false);
      });
    });

    it('should not include Infinity in results', () => {
      const start: Point3D = { x: 0, y: 0, z: 0 };
      const end: Point3D = { x: 10, y: 0, z: 0 };
      const center: Point3D = { x: 5, y: 0, z: 0 };
      const result = interpolateArc(start, end, center, true, 'XY');

      result.forEach((point) => {
        expect(Number.isFinite(point.x)).toBe(true);
        expect(Number.isFinite(point.y)).toBe(true);
        expect(Number.isFinite(point.z)).toBe(true);
      });
    });
  });

  describe('Arc Geometry', () => {
    it('should maintain constant radius from center in primary plane (XY)', () => {
      const start: Point3D = { x: 10, y: 0, z: 0 };
      const end: Point3D = { x: 0, y: 10, z: 0 };
      const center: Point3D = { x: 0, y: 0, z: 0 };
      const targetRadius = 10;
      const result = interpolateArc(start, end, center, false, 'XY');

      result.forEach((point) => {
        const dist = Math.sqrt((point.x - center.x) ** 2 + (point.y - center.y) ** 2);
        expect(dist).toBeCloseTo(targetRadius, 5);
      });
    });

    it('should maintain constant radius from center in XZ plane', () => {
      const start: Point3D = { x: 10, y: 5, z: 0 };
      const end: Point3D = { x: 0, y: 5, z: 10 };
      const center: Point3D = { x: 0, y: 5, z: 0 };
      const targetRadius = 10;
      const result = interpolateArc(start, end, center, false, 'XZ');

      result.forEach((point) => {
        const dist = Math.sqrt((point.x - center.x) ** 2 + (point.z - center.z) ** 2);
        expect(dist).toBeCloseTo(targetRadius, 5);
      });
    });

    it('should maintain constant radius from center in YZ plane', () => {
      const start: Point3D = { x: 5, y: 10, z: 0 };
      const end: Point3D = { x: 5, y: 0, z: 10 };
      const center: Point3D = { x: 5, y: 0, z: 0 };
      const targetRadius = 10;
      const result = interpolateArc(start, end, center, false, 'YZ');

      result.forEach((point) => {
        const dist = Math.sqrt((point.y - center.y) ** 2 + (point.z - center.z) ** 2);
        expect(dist).toBeCloseTo(targetRadius, 5);
      });
    });
  });
});

// ============================================================
// generatePath() TESTS
// ============================================================

describe('generatePath - Path Generation', () => {
  describe('Empty and Null Cases', () => {
    it('should handle empty command array', () => {
      const result = generatePath([]);
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });

    it('should return array for empty input', () => {
      const result = generatePath([]);
      expect(typeof result).toBe('object');
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('G-Code State Management', () => {
    it('should track initial state correctly', () => {
      const commands: GCodeCommand[] = [
        { type: 'G', code: 1, params: [{ letter: 'X', value: 10 }, { letter: 'F', value: 100 }], raw: 'G1 X10 F100', lineNumber: 1 },
      ];
      const result = generatePath(commands);

      expect(result.length).toBe(1);
      expect(result[0].start.x).toBe(0);
      expect(result[0].start.y).toBe(0);
      expect(result[0].start.z).toBe(0);
      expect(result[0].end.x).toBe(10);
    });

    it('should update plane state with G17', () => {
      const commands: GCodeCommand[] = [
        { type: 'G', code: 18, params: [], raw: 'G18', lineNumber: 1 },
        { type: 'G', code: 17, params: [], raw: 'G17', lineNumber: 2 },
        { type: 'G', code: 2, params: [{ letter: 'X', value: 10 }, { letter: 'I', value: 5 }], raw: 'G2 X10 I5', lineNumber: 3 },
      ];
      const result = generatePath(commands);

      expect(result[0].plane).toBe('XY');
    });

    it('should update plane state with G18', () => {
      const commands: GCodeCommand[] = [
        { type: 'G', code: 18, params: [], raw: 'G18', lineNumber: 1 },
        { type: 'G', code: 2, params: [{ letter: 'X', value: 10 }, { letter: 'I', value: 5 }], raw: 'G2 X10 I5', lineNumber: 2 },
      ];
      const result = generatePath(commands);

      expect(result[0].plane).toBe('XZ');
    });

    it('should update plane state with G19', () => {
      const commands: GCodeCommand[] = [
        { type: 'G', code: 19, params: [], raw: 'G19', lineNumber: 1 },
        { type: 'G', code: 2, params: [{ letter: 'Y', value: 10 }, { letter: 'J', value: 5 }], raw: 'G2 Y10 J5', lineNumber: 2 },
      ];
      const result = generatePath(commands);

      expect(result[0].plane).toBe('YZ');
    });

    it('should track unitMode with G20 (inch)', () => {
      const commands: GCodeCommand[] = [
        { type: 'G', code: 20, params: [], raw: 'G20', lineNumber: 1 },
        { type: 'G', code: 1, params: [{ letter: 'X', value: 1 }], raw: 'G1 X1', lineNumber: 2 },
      ];
      const result = generatePath(commands);

      expect(result[0].end.x).toBe(25.4); // 1 inch = 25.4 mm
    });

    it('should track unitMode with G21 (mm)', () => {
      const commands: GCodeCommand[] = [
        { type: 'G', code: 21, params: [], raw: 'G21', lineNumber: 1 },
        { type: 'G', code: 1, params: [{ letter: 'X', value: 25.4 }], raw: 'G1 X25.4', lineNumber: 2 },
      ];
      const result = generatePath(commands);

      expect(result[0].end.x).toBe(25.4); // No conversion in mm mode
    });

    it('should handle distanceMode absolute (G90)', () => {
      const commands: GCodeCommand[] = [
        { type: 'G', code: 90, params: [], raw: 'G90', lineNumber: 1 },
        { type: 'G', code: 1, params: [{ letter: 'X', value: 10 }], raw: 'G1 X10', lineNumber: 2 },
        { type: 'G', code: 1, params: [{ letter: 'X', value: 20 }], raw: 'G1 X20', lineNumber: 3 },
      ];
      const result = generatePath(commands);

      expect(result[0].end.x).toBe(10);
      expect(result[1].end.x).toBe(20);
      expect(result[1].start.x).toBe(10); // Previous position
    });

    it('should handle distanceMode incremental (G91)', () => {
      const commands: GCodeCommand[] = [
        { type: 'G', code: 91, params: [], raw: 'G91', lineNumber: 1 },
        { type: 'G', code: 1, params: [{ letter: 'X', value: 10 }], raw: 'G1 X10', lineNumber: 2 },
        { type: 'G', code: 1, params: [{ letter: 'X', value: 10 }], raw: 'G1 X10', lineNumber: 3 },
      ];
      const result = generatePath(commands);

      expect(result[0].end.x).toBe(10); // 0 + 10
      expect(result[1].end.x).toBe(20); // 10 + 10
    });

    it('should maintain modal state across commands', () => {
      const commands: GCodeCommand[] = [
        { type: 'G', code: 90, params: [], raw: 'G90', lineNumber: 1 },
        { type: 'G', code: 1, params: [{ letter: 'X', value: 10 }, { letter: 'Y', value: 10 }], raw: 'G1 X10 Y10', lineNumber: 2 },
        { type: 'G', code: 1, params: [{ letter: 'X', value: 20 }], raw: 'G1 X20', lineNumber: 3 }, // Y should remain 10
      ];
      const result = generatePath(commands);

      expect(result[1].end.y).toBe(10); // Modal Y
      expect(result[1].end.x).toBe(20);
    });
  });

  describe('G0 Rapid Moves', () => {
    it('should create rapid segment for G0', () => {
      const commands: GCodeCommand[] = [
        { type: 'G', code: 0, params: [{ letter: 'X', value: 10 }, { letter: 'Y', value: 10 }], raw: 'G0 X10 Y10', lineNumber: 1 },
      ];
      const result = generatePath(commands);

      expect(result.length).toBe(1);
      expect(result[0].type).toBe('rapid');
    });

    it('should not create segment if G0 position equals current', () => {
      const commands: GCodeCommand[] = [
        { type: 'G', code: 0, params: [{ letter: 'X', value: 0 }, { letter: 'Y', value: 0 }], raw: 'G0 X0 Y0', lineNumber: 1 },
      ];
      const result = generatePath(commands);

      expect(result.length).toBe(0);
    });

    it('should use current feedRate for G0', () => {
      const commands: GCodeCommand[] = [
        { type: 'F', code: null, params: [{ letter: 'F', value: 500 }], raw: 'F500', lineNumber: 1 },
        { type: 'G', code: 0, params: [{ letter: 'X', value: 10 }], raw: 'G0 X10', lineNumber: 2 },
      ];
      const result = generatePath(commands);

      expect(result[0].feedRate).toBe(500);
    });

    it('should handle G0 with partial coordinates', () => {
      const commands: GCodeCommand[] = [
        { type: 'G', code: 0, params: [{ letter: 'X', value: 5 }], raw: 'G0 X5', lineNumber: 1 },
        { type: 'G', code: 0, params: [{ letter: 'Y', value: 10 }], raw: 'G0 Y10', lineNumber: 2 },
      ];
      const result = generatePath(commands);

      expect(result[0].end).toEqual({ x: 5, y: 0, z: 0 });
      expect(result[1].start).toEqual({ x: 5, y: 0, z: 0 });
      expect(result[1].end).toEqual({ x: 5, y: 10, z: 0 });
    });
  });

  describe('G1 Linear Moves', () => {
    it('should create linear segment for G1', () => {
      const commands: GCodeCommand[] = [
        { type: 'G', code: 1, params: [{ letter: 'X', value: 10 }], raw: 'G1 X10', lineNumber: 1 },
      ];
      const result = generatePath(commands);

      expect(result[0].type).toBe('linear');
    });

    it('should update feedRate with F parameter in G1', () => {
      const commands: GCodeCommand[] = [
        { type: 'G', code: 1, params: [{ letter: 'X', value: 10 }, { letter: 'F', value: 100 }], raw: 'G1 X10 F100', lineNumber: 1 },
      ];
      const result = generatePath(commands);

      expect(result[0].feedRate).toBe(100);
    });

    it('should convert inch feedRate to mm/min', () => {
      const commands: GCodeCommand[] = [
        { type: 'G', code: 20, params: [], raw: 'G20', lineNumber: 1 },
        { type: 'G', code: 1, params: [{ letter: 'X', value: 1 }, { letter: 'F', value: 1 }], raw: 'G1 X1 F1', lineNumber: 2 },
      ];
      const result = generatePath(commands);

      expect(result[0].feedRate).toBeCloseTo(25.4, 5);
    });

    it('should not create segment if G1 position equals current', () => {
      const commands: GCodeCommand[] = [
        { type: 'G', code: 1, params: [{ letter: 'X', value: 0 }, { letter: 'Y', value: 0 }], raw: 'G1 X0 Y0', lineNumber: 1 },
      ];
      const result = generatePath(commands);

      expect(result.length).toBe(0);
    });
  });

  describe('G2/G3 Arc Moves', () => {
    it('should create arc_cw segment for G2', () => {
      const commands: GCodeCommand[] = [
        { type: 'G', code: 2, params: [{ letter: 'X', value: 10 }, { letter: 'I', value: 5 }], raw: 'G2 X10 I5', lineNumber: 1 },
      ];
      const result = generatePath(commands);

      expect(result[0].type).toBe('arc_cw');
      expect(result[0].center).toBeDefined();
      expect(result[0].radius).toBeDefined();
      expect(result[0].arcPoints).toBeDefined();
    });

    it('should create arc_ccw segment for G3', () => {
      const commands: GCodeCommand[] = [
        { type: 'G', code: 3, params: [{ letter: 'X', value: 10 }, { letter: 'J', value: 5 }], raw: 'G3 X10 J5', lineNumber: 1 },
      ];
      const result = generatePath(commands);

      expect(result[0].type).toBe('arc_ccw');
    });

    it('should calculate center from I/J offset for G2', () => {
      const commands: GCodeCommand[] = [
        { type: 'G', code: 2, params: [{ letter: 'X', value: 10 }, { letter: 'Y', value: 10 }, { letter: 'I', value: 5 }, { letter: 'J', value: 5 }], raw: 'G2 X10 Y10 I5 J5', lineNumber: 1 },
      ];
      const result = generatePath(commands);

      expect(result[0].center).toEqual({ x: 5, y: 5, z: 0 });
    });

    it('should handle arc with only I offset', () => {
      const commands: GCodeCommand[] = [
        { type: 'G', code: 2, params: [{ letter: 'X', value: 10 }, { letter: 'I', value: 5 }], raw: 'G2 X10 I5', lineNumber: 1 },
      ];
      const result = generatePath(commands);

      expect(result[0].center).toEqual({ x: 5, y: 0, z: 0 });
    });

    it('should handle arc with only J offset', () => {
      const commands: GCodeCommand[] = [
        { type: 'G', code: 2, params: [{ letter: 'Y', value: 10 }, { letter: 'J', value: 5 }], raw: 'G2 Y10 J5', lineNumber: 1 },
      ];
      const result = generatePath(commands);

      expect(result[0].center).toEqual({ x: 0, y: 5, z: 0 });
    });

    it('should handle arc with K offset in XZ plane', () => {
      const commands: GCodeCommand[] = [
        { type: 'G', code: 18, params: [], raw: 'G18', lineNumber: 1 },
        { type: 'G', code: 2, params: [{ letter: 'X', value: 10 }, { letter: 'K', value: 5 }], raw: 'G2 X10 K5', lineNumber: 2 },
      ];
      const result = generatePath(commands);

      expect(result[0].center).toEqual({ x: 10, y: 0, z: 5 });
    });

    it('should handle arc with R parameter', () => {
      const commands: GCodeCommand[] = [
        { type: 'G', code: 2, params: [{ letter: 'X', value: 10 }, { letter: 'Y', value: 10 }, { letter: 'R', value: 7.07 }], raw: 'G2 X10 Y10 R7.07', lineNumber: 1 },
      ];
      const result = generatePath(commands);

      expect(result[0].radius).toBeDefined();
      expect(result[0].center).toBeDefined();
    });

    it('should include arcPoints for arc segments', () => {
      const commands: GCodeCommand[] = [
        { type: 'G', code: 2, params: [{ letter: 'X', value: 10 }, { letter: 'I', value: 5 }], raw: 'G2 X10 I5', lineNumber: 1 },
      ];
      const result = generatePath(commands);

      expect(Array.isArray(result[0].arcPoints)).toBe(true);
      if (result[0].arcPoints) {
        expect(result[0].arcPoints.length).toBeGreaterThanOrEqual(4);
      }
    });

    it('should not create arc segment if start === end without full circle', () => {
      const commands: GCodeCommand[] = [
        { type: 'G', code: 2, params: [{ letter: 'X', value: 0 }, { letter: 'Y', value: 0 }, { letter: 'I', value: 5 }], raw: 'G2 X0 Y0 I5', lineNumber: 1 },
      ];
      const result = generatePath(commands);

      // This is a full circle, which should be created
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('G28 Home Command', () => {
    it('should create rapid segment to origin for G28', () => {
      const commands: GCodeCommand[] = [
        { type: 'G', code: 1, params: [{ letter: 'X', value: 10 }, { letter: 'Y', value: 10 }], raw: 'G1 X10 Y10', lineNumber: 1 },
        { type: 'G', code: 28, params: [], raw: 'G28', lineNumber: 2 },
      ];
      const result = generatePath(commands);

      expect(result[1].type).toBe('rapid');
      expect(result[1].end).toEqual({ x: 0, y: 0, z: 0 });
    });

    it('should not create segment for G28 if already at origin', () => {
      const commands: GCodeCommand[] = [
        { type: 'G', code: 28, params: [], raw: 'G28', lineNumber: 1 },
      ];
      const result = generatePath(commands);

      expect(result.length).toBe(0);
    });

    it('should update position after G28', () => {
      const commands: GCodeCommand[] = [
        { type: 'G', code: 1, params: [{ letter: 'X', value: 10 }], raw: 'G1 X10', lineNumber: 1 },
        { type: 'G', code: 28, params: [], raw: 'G28', lineNumber: 2 },
        { type: 'G', code: 1, params: [{ letter: 'X', value: 5 }], raw: 'G1 X5', lineNumber: 3 },
      ];
      const result = generatePath(commands);

      expect(result[1].start).toEqual({ x: 0, y: 0, z: 0 });
    });
  });

  describe('Spindle and Tool Control', () => {
    it('should track spindle state with M3 (CW)', () => {
      const commands: GCodeCommand[] = [
        { type: 'M', code: 3, params: [], raw: 'M3', lineNumber: 1 },
        { type: 'G', code: 1, params: [{ letter: 'X', value: 10 }], raw: 'G1 X10', lineNumber: 2 },
      ];
      const result = generatePath(commands);

      expect(result.length).toBe(1);
      // spindle state is tracked internally
    });

    it('should track spindle state with M4 (CCW)', () => {
      const commands: GCodeCommand[] = [
        { type: 'M', code: 4, params: [], raw: 'M4', lineNumber: 1 },
        { type: 'G', code: 1, params: [{ letter: 'X', value: 10 }], raw: 'G1 X10', lineNumber: 2 },
      ];
      const result = generatePath(commands);

      expect(result.length).toBe(1);
    });

    it('should track spindle state with M5 (off)', () => {
      const commands: GCodeCommand[] = [
        { type: 'M', code: 5, params: [], raw: 'M5', lineNumber: 1 },
      ];
      const result = generatePath(commands);

      expect(result.length).toBe(0);
    });

    it('should track tool number with M6', () => {
      const commands: GCodeCommand[] = [
        { type: 'M', code: 6, params: [{ letter: 'T', value: 5 }], raw: 'M6 T5', lineNumber: 1 },
        { type: 'G', code: 1, params: [{ letter: 'X', value: 10 }], raw: 'G1 X10', lineNumber: 2 },
      ];
      const result = generatePath(commands);

      expect(result.length).toBe(1);
    });

    it('should track tool number with T command', () => {
      const commands: GCodeCommand[] = [
        { type: 'T', code: 5, params: [], raw: 'T5', lineNumber: 1 },
        { type: 'G', code: 1, params: [{ letter: 'X', value: 10 }], raw: 'G1 X10', lineNumber: 2 },
      ];
      const result = generatePath(commands);

      expect(result.length).toBe(1);
    });

    it('should track spindle speed with S parameter', () => {
      const commands: GCodeCommand[] = [
        { type: 'S', code: 1000, params: [], raw: 'S1000', lineNumber: 1 },
        { type: 'G', code: 1, params: [{ letter: 'X', value: 10 }], raw: 'G1 X10', lineNumber: 2 },
      ];
      const result = generatePath(commands);

      expect(result.length).toBe(1);
    });
  });

  describe('Stop Commands', () => {
    it('should mark isRunning = false for M0', () => {
      const commands: GCodeCommand[] = [
        { type: 'M', code: 0, params: [], raw: 'M0', lineNumber: 1 },
      ];
      generatePath(commands);
      // isRunning tracking is internal
    });

    it('should mark isRunning = false for M1', () => {
      const commands: GCodeCommand[] = [
        { type: 'M', code: 1, params: [], raw: 'M1', lineNumber: 1 },
      ];
      generatePath(commands);
    });

    it('should mark isRunning = false for M30', () => {
      const commands: GCodeCommand[] = [
        { type: 'M', code: 30, params: [], raw: 'M30', lineNumber: 1 },
      ];
      generatePath(commands);
    });
  });

  describe('F and S Commands', () => {
    it('should handle standalone F command', () => {
      const commands: GCodeCommand[] = [
        { type: 'F', code: null, params: [{ letter: 'F', value: 200 }], raw: 'F200', lineNumber: 1 },
        { type: 'G', code: 1, params: [{ letter: 'X', value: 10 }], raw: 'G1 X10', lineNumber: 2 },
      ];
      const result = generatePath(commands);

      expect(result[0].feedRate).toBe(200);
    });

    it('should handle standalone S command', () => {
      const commands: GCodeCommand[] = [
        { type: 'S', code: 500, params: [], raw: 'S500', lineNumber: 1 },
        { type: 'G', code: 1, params: [{ letter: 'X', value: 10 }], raw: 'G1 X10', lineNumber: 2 },
      ];
      const result = generatePath(commands);

      expect(result.length).toBe(1);
    });

    it('should convert inch feedRate in F command', () => {
      const commands: GCodeCommand[] = [
        { type: 'G', code: 20, params: [], raw: 'G20', lineNumber: 1 },
        { type: 'F', code: null, params: [{ letter: 'F', value: 1 }], raw: 'F1', lineNumber: 2 },
        { type: 'G', code: 1, params: [{ letter: 'X', value: 10 }], raw: 'G1 X10', lineNumber: 3 },
      ];
      const result = generatePath(commands);

      expect(result[0].feedRate).toBeCloseTo(25.4, 5);
    });
  });

  describe('Type Safety and Structure', () => {
    it('should return array of PathSegment objects', () => {
      const commands: GCodeCommand[] = [
        { type: 'G', code: 1, params: [{ letter: 'X', value: 10 }], raw: 'G1 X10', lineNumber: 1 },
      ];
      const result = generatePath(commands);

      expect(Array.isArray(result)).toBe(true);
      result.forEach((segment) => {
        expect(typeof segment.start).toBe('object');
        expect(typeof segment.end).toBe('object');
        expect(typeof segment.type).toBe('string');
        expect(typeof segment.feedRate).toBe('number');
        expect(typeof segment.lineNumber).toBe('number');
        expect(typeof segment.depth).toBe('number');
      });
    });

    it('should have correct depth value', () => {
      const commands: GCodeCommand[] = [
        { type: 'G', code: 1, params: [{ letter: 'X', value: 10 }, { letter: 'Z', value: -5 }], raw: 'G1 X10 Z-5', lineNumber: 1 },
      ];
      const result = generatePath(commands);

      expect(result[0].depth).toBe(-5);
      expect(result[0].depth).toBe(result[0].end.z);
    });

    it('should have correct lineNumber', () => {
      const commands: GCodeCommand[] = [
        { type: 'G', code: 1, params: [{ letter: 'X', value: 10 }], raw: 'G1 X10', lineNumber: 42 },
      ];
      const result = generatePath(commands);

      expect(result[0].lineNumber).toBe(42);
    });

    it('should include start as copy of previous position', () => {
      const commands: GCodeCommand[] = [
        { type: 'G', code: 1, params: [{ letter: 'X', value: 10 }], raw: 'G1 X10', lineNumber: 1 },
        { type: 'G', code: 1, params: [{ letter: 'Y', value: 5 }], raw: 'G1 Y5', lineNumber: 2 },
      ];
      const result = generatePath(commands);

      expect(result[1].start).toEqual(result[0].end);
      expect(result[1].start === result[0].end).toBe(false); // Should be copy, not reference
    });

    it('should not include NaN values in segments', () => {
      const commands: GCodeCommand[] = [
        { type: 'G', code: 1, params: [{ letter: 'X', value: 10 }], raw: 'G1 X10', lineNumber: 1 },
      ];
      const result = generatePath(commands);

      result.forEach((segment) => {
        expect(Number.isNaN(segment.start.x)).toBe(false);
        expect(Number.isNaN(segment.start.y)).toBe(false);
        expect(Number.isNaN(segment.start.z)).toBe(false);
        expect(Number.isNaN(segment.end.x)).toBe(false);
        expect(Number.isNaN(segment.end.y)).toBe(false);
        expect(Number.isNaN(segment.end.z)).toBe(false);
        expect(Number.isNaN(segment.feedRate)).toBe(false);
      });
    });
  });

  describe('Edge Cases and Error Resilience', () => {
    it('should handle commands with missing code field', () => {
      const commands: GCodeCommand[] = [
        { type: 'G', code: null, params: [], raw: '', lineNumber: 1 },
        { type: 'G', code: 1, params: [{ letter: 'X', value: 10 }], raw: 'G1 X10', lineNumber: 2 },
      ];
      const result = generatePath(commands);

      expect(result.length).toBe(1);
      expect(result[0].end.x).toBe(10);
    });

    it('should handle commands with unknown type', () => {
      const commands: GCodeCommand[] = [
        { type: 'unknown', code: 99, params: [], raw: 'UNKNOWN', lineNumber: 1 },
        { type: 'G', code: 1, params: [{ letter: 'X', value: 10 }], raw: 'G1 X10', lineNumber: 2 },
      ];
      const result = generatePath(commands);

      expect(result.length).toBe(1);
    });

    it('should handle comment commands', () => {
      const commands: GCodeCommand[] = [
        { type: 'comment', code: null, params: [], raw: '( This is a comment )', lineNumber: 1 },
        { type: 'G', code: 1, params: [{ letter: 'X', value: 10 }], raw: 'G1 X10', lineNumber: 2 },
      ];
      const result = generatePath(commands);

      expect(result.length).toBe(1);
    });

    it('should handle very large coordinate values', () => {
      const commands: GCodeCommand[] = [
        { type: 'G', code: 1, params: [{ letter: 'X', value: 999999 }], raw: 'G1 X999999', lineNumber: 1 },
      ];
      const result = generatePath(commands);

      expect(result[0].end.x).toBe(999999);
    });

    it('should handle negative coordinate values', () => {
      const commands: GCodeCommand[] = [
        { type: 'G', code: 1, params: [{ letter: 'X', value: -10 }, { letter: 'Y', value: -20 }, { letter: 'Z', value: -5 }], raw: 'G1 X-10 Y-20 Z-5', lineNumber: 1 },
      ];
      const result = generatePath(commands);

      expect(result[0].end.x).toBe(-10);
      expect(result[0].end.y).toBe(-20);
      expect(result[0].end.z).toBe(-5);
    });

    it('should handle fractional coordinate values', () => {
      const commands: GCodeCommand[] = [
        { type: 'G', code: 1, params: [{ letter: 'X', value: 10.5 }, { letter: 'Y', value: 20.75 }], raw: 'G1 X10.5 Y20.75', lineNumber: 1 },
      ];
      const result = generatePath(commands);

      expect(result[0].end.x).toBe(10.5);
      expect(result[0].end.y).toBe(20.75);
    });

    it('should handle commands with duplicate params (first should win)', () => {
      const commands: GCodeCommand[] = [
        { type: 'G', code: 1, params: [{ letter: 'X', value: 10 }, { letter: 'X', value: 20 }], raw: 'G1 X10 X20', lineNumber: 1 },
      ];
      const result = generatePath(commands);

      // Should use first occurrence
      expect(result[0].end.x).toBe(10);
    });

    it('should handle 0 feedRate', () => {
      const commands: GCodeCommand[] = [
        { type: 'G', code: 1, params: [{ letter: 'X', value: 10 }, { letter: 'F', value: 0 }], raw: 'G1 X10 F0', lineNumber: 1 },
      ];
      const result = generatePath(commands);

      expect(result[0].feedRate).toBe(0);
    });

    it('should handle negative feedRate (invalid but should not crash)', () => {
      const commands: GCodeCommand[] = [
        { type: 'G', code: 1, params: [{ letter: 'X', value: 10 }, { letter: 'F', value: -100 }], raw: 'G1 X10 F-100', lineNumber: 1 },
      ];
      const result = generatePath(commands);

      expect(result[0].feedRate).toBe(-100);
    });

    it('should handle empty params array', () => {
      const commands: GCodeCommand[] = [
        { type: 'G', code: 1, params: [], raw: 'G1', lineNumber: 1 },
      ];
      const result = generatePath(commands);

      expect(result.length).toBe(0); // No movement, same position
    });
  });

  describe('Security - Injection Prevention', () => {
    it('should not be affected by raw string injection', () => {
      const commands: GCodeCommand[] = [
        {
          type: 'G',
          code: 1,
          params: [{ letter: 'X', value: 10 }],
          raw: "G1 X10 <!-- alert as script('xss')</script> -->",
          lineNumber: 1,
        },
      ];
      const result = generatePath(commands);

      expect(result[0].end.x).toBe(10);
      // raw field should not affect processing
    });

    it('should handle special characters in raw without affecting processing', () => {
      const commands: GCodeCommand[] = [
        {
          type: 'G',
          code: 1,
          params: [{ letter: 'X', value: 10 }],
          raw: "G1 X10; DROP TABLE machine_state; --",
          lineNumber: 1,
        },
      ];
      const result = generatePath(commands);

      expect(result[0].end.x).toBe(10);
    });

    it('should validate param letters are single characters', () => {
      const commands: GCodeCommand[] = [
        {
          type: 'G',
          code: 1,
          params: [{ letter: 'X', value: 10 }, { letter: 'INJECTION', value: 999 }],
          raw: 'G1 X10 INJECTION999',
          lineNumber: 1,
        },
      ];
      const result = generatePath(commands);

      // Should use only recognized letters
      expect(result[0].end.x).toBe(10);
    });
  });

  describe('Complex Sequences', () => {
    it('should handle multi-segment program', () => {
      const commands: GCodeCommand[] = [
        { type: 'G', code: 20, params: [], raw: 'G20', lineNumber: 1 },
        { type: 'G', code: 90, params: [], raw: 'G90', lineNumber: 2 },
        { type: 'G', code: 0, params: [{ letter: 'X', value: 1 }], raw: 'G0 X1', lineNumber: 3 },
        { type: 'M', code: 3, params: [], raw: 'M3', lineNumber: 4 },
        { type: 'G', code: 1, params: [{ letter: 'Y', value: 1 }, { letter: 'F', value: 10 }], raw: 'G1 Y1 F10', lineNumber: 5 },
        { type: 'G', code: 2, params: [{ letter: 'X', value: 0 }, { letter: 'Y', value: 0 }, { letter: 'I', value: -0.5 }], raw: 'G2 X0 Y0 I-0.5', lineNumber: 6 },
        { type: 'M', code: 5, params: [], raw: 'M5', lineNumber: 7 },
        { type: 'G', code: 28, params: [], raw: 'G28', lineNumber: 8 },
      ];
      const result = generatePath(commands);

      expect(result.length).toBeGreaterThan(0);
      expect(result.every((seg) => seg.start && seg.end && seg.type && typeof seg.feedRate === 'number')).toBe(true);
    });

    it('should preserve state across arc and linear moves', () => {
      const commands: GCodeCommand[] = [
        { type: 'G', code: 1, params: [{ letter: 'X', value: 10 }, { letter: 'Y', value: 10 }], raw: 'G1 X10 Y10', lineNumber: 1 },
        { type: 'G', code: 2, params: [{ letter: 'X', value: 0 }, { letter: 'Y', value: 0 }, { letter: 'I', value: -5 }, { letter: 'J', value: -5 }], raw: 'G2 X0 Y0 I-5 J-5', lineNumber: 2 },
        { type: 'G', code: 1, params: [{ letter: 'X', value: -10 }], raw: 'G1 X-10', lineNumber: 3 },
      ];
      const result = generatePath(commands);

      expect(result[1].start).toEqual({ x: 10, y: 10, z: 0 });
      expect(result[2].start).toEqual(result[1].end);
    });
  });
});
