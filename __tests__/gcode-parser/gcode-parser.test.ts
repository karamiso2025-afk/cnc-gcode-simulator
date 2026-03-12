import { describe, it, expect, beforeEach } from 'vitest';
import type { GCodeParam, GCodeCommand } from '../../src/shared-types.js';

describe('gcode-parser', () => {
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

});
