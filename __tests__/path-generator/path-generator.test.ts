import { describe, it, expect, beforeEach } from 'vitest';
import { CW, CCW } from '../../src/path-generator.js';
import type { GCodeCommand, Point3D, PlaneSelect, UnitMode, PathSegment, MachineState } from '../../src/shared-types.js';

describe('path-generator', () => {
  describe('CW', () => {
    it('should return a valid result', () => {
      const result = CW({} as any);
      expect(result).toBeDefined();
    });
  });

  describe('CCW', () => {
    it('should return a valid result', () => {
      const result = CCW({} as any);
      expect(result).toBeDefined();
    });
  });

});
