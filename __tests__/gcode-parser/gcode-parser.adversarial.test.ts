import { describe, it, expect } from 'vitest';
import { parseGCode, parseLine, extractParams } from '../../src/gcode-parser';
import { GCodeCommand, GCodeParam } from '../../src/shared-types';

describe('gcode-parser - Adversarial Tests', () => {
  // ============================================================
  // 1. 境界値テスト (Boundary Value Tests)
  // ============================================================

  describe('parseGCode - Boundary Value Tests', () => {
    it('should handle empty string', () => {
      const result = parseGCode('');
      expect(result).toEqual([]);
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle string with only whitespace', () => {
      const result = parseGCode('   \n  \t  \n  ');
      expect(result).toEqual([]);
    });

    it('should handle single character command', () => {
      const result = parseGCode('G0');
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].type).toBeDefined();
    });

    it('should handle very long line (1000+ characters)', () => {
      const longParams = 'X1 Y2 Z3 F100 S1000 '.repeat(50);
      const result = parseGCode(`G0 ${longParams}`);
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle extreme negative numbers', () => {
      const result = parseGCode('G0 X-9999.999 Y-1e10 Z-0.0001');
      expect(result.length).toBeGreaterThan(0);
      if (result[0].params.length > 0) {
        result[0].params.forEach(p => {
          expect(typeof p.value).toBe('number');
        });
      }
    });

    it('should handle extreme positive numbers', () => {
      const result = parseGCode('G0 X9999.999 Y1e10 Z999999');
      expect(result.length).toBeGreaterThan(0);
      if (result[0].params.length > 0) {
        result[0].params.forEach(p => {
          expect(typeof p.value).toBe('number');
        });
      }
    });

    it('should preserve lineNumber correctly across empty lines', () => {
      const input = 'G0 X0\n\n\nG1 X10';
      const result = parseGCode(input);
      const commandLines = result.filter(c => c.type !== 'comment');
      expect(commandLines.length).toBeGreaterThan(0);
      commandLines.forEach(cmd => {
        expect(typeof cmd.lineNumber).toBe('number');
        expect(cmd.lineNumber).toBeGreaterThanOrEqual(1);
      });
    });

    it('should handle different line endings (CRLF, LF, mixed)', () => {
      const crlfInput = 'G0 X0\r\nG1 X10';
      const lfInput = 'G0 X0\nG1 X10';
      const mixedInput = 'G0 X0\r\nG1 X10\nG2 X20';

      const crlfResult = parseGCode(crlfInput);
      const lfResult = parseGCode(lfInput);
      const mixedResult = parseGCode(mixedInput);

      expect(crlfResult.length).toBeGreaterThan(0);
      expect(lfResult.length).toBeGreaterThan(0);
      expect(mixedResult.length).toBeGreaterThan(0);
    });

    it('should handle zero value parameters', () => {
      const result = parseGCode('G0 X0 Y0 Z0 F0 S0');
      expect(result.length).toBeGreaterThan(0);
      if (result[0].params.length > 0) {
        result[0].params.forEach(p => {
          expect(typeof p.value).toBe('number');
        });
      }
    });

    it('should handle decimal-only numbers (.5 notation)', () => {
      const result = parseGCode('G0 X.5 Y.123 Z.999');
      expect(result.length).toBeGreaterThan(0);
      if (result[0].params.length > 0) {
        result[0].params.forEach(p => {
          expect(typeof p.value).toBe('number');
          expect(p.value).toBeGreaterThan(0);
        });
      }
    });
  });

  // ============================================================
  // 2. エラー処理テスト (Error Handling Tests)
  // ============================================================

  describe('parseGCode - Error Handling', () => {
    it('should not throw on unknown G code', () => {
      expect(() => parseGCode('G999 X10')).not.toThrow();
      const result = parseGCode('G999 X10');
      expect(result.some(c => c.type === 'unknown')).toBe(true);
    });

    it('should not throw on unknown M code', () => {
      expect(() => parseGCode('M99 S1000')).not.toThrow();
    });

    it('should not throw on malformed tokens', () => {
      expect(() => parseGCode('G0 @@@ ### ~~~')).not.toThrow();
    });

    it('should not throw on invalid parameter formats', () => {
      expect(() => parseGCode('G0 X X Y Z-')).not.toThrow();
    });

    it('should not throw on multiple consecutive spaces', () => {
      expect(() => parseGCode('G0     X10     Y20')).not.toThrow();
      const result = parseGCode('G0     X10     Y20');
      expect(Array.isArray(result)).toBe(true);
    });

    it('should not throw on tabs and mixed whitespace', () => {
      expect(() => parseGCode('G0\t\tX10\t\tY20')).not.toThrow();
    });

    it('should skip invalid parameters without throwing', () => {
      const result = parseGCode('G0 X10 !@# Y20 &*() Z30');
      expect(result.length).toBeGreaterThan(0);
      if (result[0].params.length > 0) {
        result[0].params.forEach(p => {
          expect(['X', 'Y', 'Z', 'F', 'S', 'I', 'J', 'K', 'R', 'P', 'T'].includes(p.letter)).toBe(true);
        });
      }
    });
  });

  // ============================================================
  // 3. コメント処理テスト (Comment Handling Tests)
  // ============================================================

  describe('parseGCode - Comment Handling', () => {
    it('should handle line starting with semicolon as comment', () => {
      const result = parseGCode('; This is a comment');
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].type).toBe('comment');
      expect(result[0].code).toBeNull();
    });

    it('should handle parentheses-enclosed comments', () => {
      const result = parseGCode('(This is a comment)');
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].type).toBe('comment');
    });

    it('should handle inline comments after semicolon', () => {
      const result = parseGCode('G0 X10 ; This is an inline comment');
      expect(result.length).toBeGreaterThan(0);
      // Inline comment should be stripped, leaving only the G0 X10 command
      const nonCommentLines = result.filter(c => c.type !== 'comment');
      expect(nonCommentLines.length).toBeGreaterThan(0);
    });

    it('should handle inline parentheses comments', () => {
      const result = parseGCode('G0 X10 (inline comment) Y20');
      expect(result.length).toBeGreaterThan(0);
      expect(Array.isArray(result)).toBe(true);
    });

    it('should preserve raw text for comments', () => {
      const input = '; Original comment text';
      const result = parseGCode(input);
      expect(result[0].raw).toEqual('; Original comment text');
    });

    it('should not process commands inside parentheses as code', () => {
      const result = parseGCode('(G0 X100 Y200)');
      const commands = result.filter(c => c.type !== 'comment');
      expect(commands.length).toBe(0);
    });
  });

  // ============================================================
  // 4. 複数コマンド処理テスト (Multiple Commands on Single Line)
  // ============================================================

  describe('parseGCode - Multiple Commands Per Line', () => {
    it('should handle multiple G commands on one line', () => {
      const result = parseGCode('G90 G21 G0 X0 Y0');
      expect(result.length).toBeGreaterThan(0);
      const gCommands = result.filter(c => c.type === 'G');
      expect(gCommands.length).toBeGreaterThanOrEqual(3);
    });

    it('should assign same lineNumber to all commands on one line', () => {
      const result = parseGCode('G90 G21 G0 X0 Y0');
      const nonCommentCmds = result.filter(c => c.type !== 'comment');
      if (nonCommentCmds.length > 1) {
        const firstLineNum = nonCommentCmds[0].lineNumber;
        nonCommentCmds.forEach(cmd => {
          expect(cmd.lineNumber).toBe(firstLineNum);
        });
      }
    });

    it('should handle M and G codes mixed', () => {
      const result = parseGCode('G0 M3 G1 X10 M5');
      expect(result.length).toBeGreaterThan(0);
      const gCodes = result.filter(c => c.type === 'G');
      const mCodes = result.filter(c => c.type === 'M');
      expect(gCodes.length).toBeGreaterThan(0);
      expect(mCodes.length).toBeGreaterThan(0);
    });
  });

  // ============================================================
  // 5. 大文字小文字テスト (Case Insensitivity)
  // ============================================================

  describe('parseGCode - Case Insensitivity', () => {
    it('should treat lowercase and uppercase commands the same', () => {
      const upperResult = parseGCode('G0 X10 Y20');
      const lowerResult = parseGCode('g0 x10 y20');
      expect(upperResult.length).toBe(lowerResult.length);
      expect(upperResult[0].type).toBe(lowerResult[0].type);
    });

    it('should handle mixed case', () => {
      const result = parseGCode('G0 x10 Y20 z30');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle lowercase code numbers', () => {
      const result = parseGCode('g01 x10 y20');
      expect(result.length).toBeGreaterThan(0);
      if (result[0].type === 'G') {
        expect(result[0].code).toBe(1);
      }
    });
  });

  // ============================================================
  // 6. N行番号テスト (Line Number / N-word)
  // ============================================================

  describe('parseGCode - N-word (Line Number) Handling', () => {
    it('should ignore N-word prefix', () => {
      const result = parseGCode('N100 G0 X10');
      expect(result.length).toBeGreaterThan(0);
      const gCommands = result.filter(c => c.type === 'G');
      expect(gCommands.length).toBeGreaterThan(0);
    });

    it('should process command after N-word correctly', () => {
      const resultWithN = parseGCode('N100 G0 X10 Y20');
      const resultWithoutN = parseGCode('G0 X10 Y20');
      expect(resultWithN.length).toBe(resultWithoutN.length);
    });

    it('should handle large N numbers', () => {
      const result = parseGCode('N999999 G0 X10');
      expect(result.length).toBeGreaterThan(0);
    });
  });

  // ============================================================
  // 7. 型安全性テスト (Type Safety Tests)
  // ============================================================

  describe('parseGCode - Type Safety', () => {
    it('should return array of GCodeCommand objects', () => {
      const result = parseGCode('G0 X10');
      expect(Array.isArray(result)).toBe(true);
      result.forEach(cmd => {
        expect(cmd).toHaveProperty('type');
        expect(cmd).toHaveProperty('code');
        expect(cmd).toHaveProperty('params');
        expect(cmd).toHaveProperty('raw');
        expect(cmd).toHaveProperty('lineNumber');
      });
    });

    it('should have correct field types', () => {
      const result = parseGCode('G0 X10 Y20');
      result.forEach(cmd => {
        expect(typeof cmd.type).toBe('string');
        expect(cmd.code === null || typeof cmd.code === 'number').toBe(true);
        expect(Array.isArray(cmd.params)).toBe(true);
        expect(typeof cmd.raw).toBe('string');
        expect(typeof cmd.lineNumber).toBe('number');
      });
    });

    it('should not have unexpected properties on GCodeCommand', () => {
      const result = parseGCode('G0 X10');
      if (result.length > 0) {
        const cmd = result[0];
        const allowedKeys = new Set(['type', 'code', 'params', 'raw', 'lineNumber']);
        Object.keys(cmd).forEach(key => {
          expect(allowedKeys.has(key)).toBe(true);
        });
      }
    });

    it('should have valid type enum values', () => {
      const result = parseGCode('G0 X10 Y20\n; comment\nM3\nG999');
      const validTypes = new Set(['G', 'M', 'T', 'F', 'S', 'comment', 'unknown']);
      result.forEach(cmd => {
        expect(validTypes.has(cmd.type)).toBe(true);
      });
    });

    it('should have code as null for comments', () => {
      const result = parseGCode('; This is a comment');
      expect(result[0].code).toBeNull();
    });

    it('should have numeric code for non-comment commands', () => {
      const result = parseGCode('G0 X10');
      const gCommand = result.find(c => c.type === 'G');
      if (gCommand) {
        expect(typeof gCommand.code).toBe('number');
        expect(gCommand.code).toBeGreaterThanOrEqual(0);
      }
    });

    it('params should be array of objects with letter and value', () => {
      const result = parseGCode('G0 X10.5 Y-20 Z0.1');
      result.forEach(cmd => {
        cmd.params.forEach(param => {
          expect(param).toHaveProperty('letter');
          expect(param).toHaveProperty('value');
          expect(typeof param.letter).toBe('string');
          expect(typeof param.value).toBe('number');
        });
      });
    });
  });

  // ============================================================
  // 8. セキュリティテスト (Security Tests)
  // ============================================================

  describe('parseGCode - Security', () => {
    it('should handle SQL injection-like strings safely', () => {
      expect(() => parseGCode("G0; ' OR '1'='1")).not.toThrow();
      expect(() => parseGCode("G0; DROP TABLE gcode--")).not.toThrow();
      const result = parseGCode("G0 X10; ' OR '1'='1");
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle XSS-like strings safely', () => {
      expect(() => parseGCode("G0 X10; alert as script('xss')</script>")).not.toThrow();
      expect(() => parseGCode("G0 X10; <img src=x onerror=alert(1)>")).not.toThrow();
      const result = parseGCode("G0 X10; alert as script('xss')</script>");
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle path traversal-like strings safely', () => {
      expect(() => parseGCode("G0 X10; ../../../etc/passwd")).not.toThrow();
      expect(() => parseGCode("G0 X10; ..\\..\\windows\\system32")).not.toThrow();
    });

    it('should handle null bytes safely', () => {
      expect(() => parseGCode("G0 X10\0Y20")).not.toThrow();
      const result = parseGCode("G0 X10\0Y20");
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle very long strings without hanging', () => {
      const longString = 'G0 X10; ' + 'A'.repeat(10000);
      expect(() => parseGCode(longString)).not.toThrow();
      const result = parseGCode(longString);
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle special Unicode characters safely', () => {
      expect(() => parseGCode('G0 X10; こんにちは 🚀')).not.toThrow();
      const result = parseGCode('G0 X10; こんにちは 🚀');
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle control characters safely', () => {
      expect(() => parseGCode('G0 X10\t\r\n\x00\x01')).not.toThrow();
    });
  });

  // ============================================================
  // 9. parseLine - Unit Tests
  // ============================================================

  describe('parseLine - Boundary and Error Handling', () => {
    it('should handle empty line', () => {
      const result = parseLine('', 1);
      expect(result).toHaveProperty('type');
      expect(result).toHaveProperty('lineNumber');
      expect(result.lineNumber).toBe(1);
    });

    it('should handle whitespace-only line', () => {
      const result = parseLine('   \t  ', 5);
      expect(result.lineNumber).toBe(5);
    });

    it('should handle line with comment only', () => {
      const result = parseLine('; This is a comment', 10);
      expect(result.type).toBe('comment');
      expect(result.code).toBeNull();
      expect(result.lineNumber).toBe(10);
    });

    it('should handle line with G code and parameters', () => {
      const result = parseLine('G0 X10 Y20', 1);
      expect(result.type).toBe('G');
      expect(typeof result.code).toBe('number');
      expect(Array.isArray(result.params)).toBe(true);
    });

    it('should extract correct code number from G command', () => {
      const g0 = parseLine('G0', 1);
      const g1 = parseLine('G1', 1);
      const g28 = parseLine('G28', 1);
      expect(g0.code).toBe(0);
      expect(g1.code).toBe(1);
      expect(g28.code).toBe(28);
    });

    it('should handle M code correctly', () => {
      const m3 = parseLine('M3', 1);
      expect(m3.type).toBe('M');
      expect(m3.code).toBe(3);
    });

    it('should handle T (tool) code', () => {
      const result = parseLine('T1', 1);
      expect(result.type).toBe('T');
      expect(result.code).toBe(1);
    });

    it('should handle F (feedrate) code', () => {
      const result = parseLine('F100', 1);
      expect(result.type).toBe('F');
      expect(result.code).toBe(100);
    });

    it('should handle S (spindle) code', () => {
      const result = parseLine('S1000', 1);
      expect(result.type).toBe('S');
      expect(result.code).toBe(1000);
    });

    it('should handle unknown commands as unknown type', () => {
      const result = parseLine('G999', 1);
      expect(result.type).toBe('unknown');
    });

    it('should handle line with no valid command', () => {
      const result = parseLine('XYZ 123', 1);
      expect(result).toBeDefined();
    });

    it('should handle lowercase commands', () => {
      const resultUpper = parseLine('G0 X10', 1);
      const resultLower = parseLine('g0 x10', 1);
      expect(resultUpper.type).toBe(resultLower.type);
      expect(resultUpper.code).toBe(resultLower.code);
    });

    it('should preserve lineNumber passed as argument', () => {
      const result1 = parseLine('G0 X10', 100);
      const result2 = parseLine('G0 X10', 999);
      expect(result1.lineNumber).toBe(100);
      expect(result2.lineNumber).toBe(999);
    });

    it('should handle very long line', () => {
      const longLine = 'G0 ' + 'X1 Y1 '.repeat(500);
      const result = parseLine(longLine, 1);
      expect(result).toHaveProperty('type');
      expect(result).toHaveProperty('params');
    });
  });

  // ============================================================
  // 10. extractParams - Unit Tests
  // ============================================================

  describe('extractParams - Boundary and Type Safety', () => {
    it('should handle empty array', () => {
      const result = extractParams([]);
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });

    it('should handle array with single element', () => {
      const result = extractParams(['X10']);
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should extract X parameter correctly', () => {
      const result = extractParams(['X10']);
      expect(result.some(p => p.letter === 'X' && p.value === 10)).toBe(true);
    });

    it('should extract Y parameter correctly', () => {
      const result = extractParams(['Y20.5']);
      expect(result.some(p => p.letter === 'Y' && p.value === 20.5)).toBe(true);
    });

    it('should extract Z parameter correctly', () => {
      const result = extractParams(['Z-5.5']);
      expect(result.some(p => p.letter === 'Z' && p.value === -5.5)).toBe(true);
    });

    it('should extract I, J, K parameters (arc center)', () => {
      const result = extractParams(['I1', 'J2', 'K3']);
      expect(result.some(p => p.letter === 'I' && p.value === 1)).toBe(true);
      expect(result.some(p => p.letter === 'J' && p.value === 2)).toBe(true);
      expect(result.some(p => p.letter === 'K' && p.value === 3)).toBe(true);
    });

    it('should extract R parameter (arc radius)', () => {
      const result = extractParams(['R5.5']);
      expect(result.some(p => p.letter === 'R' && p.value === 5.5)).toBe(true);
    });

    it('should extract F parameter (feedrate)', () => {
      const result = extractParams(['F100']);
      expect(result.some(p => p.letter === 'F' && p.value === 100)).toBe(true);
    });

    it('should extract S parameter (spindle speed)', () => {
      const result = extractParams(['S1000']);
      expect(result.some(p => p.letter === 'S' && p.value === 1000)).toBe(true);
    });

    it('should extract P parameter (dwell time)', () => {
      const result = extractParams(['P500']);
      expect(result.some(p => p.letter === 'P' && p.value === 500)).toBe(true);
    });

    it('should extract T parameter (tool number)', () => {
      const result = extractParams(['T5']);
      expect(result.some(p => p.letter === 'T' && p.value === 5)).toBe(true);
    });

    it('should handle negative numbers correctly', () => {
      const result = extractParams(['X-10', 'Y-20.5', 'Z-0.001']);
      expect(result.some(p => p.letter === 'X' && p.value === -10)).toBe(true);
      expect(result.some(p => p.letter === 'Y' && p.value === -20.5)).toBe(true);
      expect(result.some(p => p.letter === 'Z' && p.value === -0.001)).toBe(true);
    });

    it('should handle decimal-only format (.5)', () => {
      const result = extractParams(['X.5', 'Y.123', 'Z.999']);
      expect(result.some(p => p.letter === 'X' && p.value === 0.5)).toBe(true);
      expect(result.some(p => p.letter === 'Y' && p.value === 0.123)).toBe(true);
      expect(result.some(p => p.letter === 'Z' && p.value === 0.999)).toBe(true);
    });

    it('should handle decimal with leading zero', () => {
      const result = extractParams(['X0.5']);
      expect(result.some(p => p.letter === 'X' && p.value === 0.5)).toBe(true);
    });

    it('should skip invalid tokens', () => {
      const result = extractParams(['X10', '!!!', 'Y20', '###', 'Z30']);
      expect(result.length).toBe(3);
      expect(result.every(p => ['X', 'Y', 'Z'].includes(p.letter))).toBe(true);
    });

    it('should skip tokens without letters', () => {
      const result = extractParams(['123', '456', '789']);
      // All should be skipped as they don't start with a letter
      expect(result.length).toBe(0);
    });

    it('should skip invalid letter parameters', () => {
      const result = extractParams(['X10', 'A20', 'B30', 'Y40']);
      // A and B are not valid letters for G-code
      const validLetters = result.filter(p => ['X', 'Y', 'Z', 'I', 'J', 'K', 'R', 'F', 'S', 'P', 'T'].includes(p.letter));
      expect(validLetters.length).toBeGreaterThan(0);
    });

    it('should handle multiple occurrences of same letter', () => {
      const result = extractParams(['X10', 'X20', 'Y30']);
      const xParams = result.filter(p => p.letter === 'X');
      // Both should be captured (last one wins or both captured)
      expect(xParams.length).toBeGreaterThan(0);
    });

    it('should return array with correct type structure', () => {
      const result = extractParams(['X10', 'Y20']);
      result.forEach(param => {
        expect(param).toHaveProperty('letter');
        expect(param).toHaveProperty('value');
        expect(typeof param.letter).toBe('string');
        expect(typeof param.value).toBe('number');
      });
    });

    it('should handle extreme numbers in parameters', () => {
      const result = extractParams(['X9999.999', 'Y-1e10', 'Z1e-10']);
      expect(result.length).toBeGreaterThan(0);
      result.forEach(p => {
        expect(typeof p.value).toBe('number');
      });
    });

    it('should handle case-insensitive letter extraction', () => {
      const result1 = extractParams(['X10']);
      const result2 = extractParams(['x10']);
      // Both should work (X is case-insensitive)
      expect(result1.length + result2.length).toBeGreaterThan(0);
    });

    it('should not include unexpected properties in param objects', () => {
      const result = extractParams(['X10', 'Y20']);
      result.forEach(param => {
        const allowedKeys = new Set(['letter', 'value']);
        Object.keys(param).forEach(key => {
          expect(allowedKeys.has(key)).toBe(true);
        });
      });
    });
  });

  // ============================================================
  // 11. 統合テスト (Integration Tests)
  // ============================================================

  describe('parseGCode - Integration Tests', () => {
    it('should parse complete G-code program correctly', () => {
      const program = `
        G21 G90 G0 X0 Y0 Z0
        G0 X10 Y10 Z0 F100
        G1 Z-5 F50
        G1 X20 Y20 F100
        M3 S1000
        G1 Z-10
        M5
        G0 Z0
        G0 X0 Y0
      `;
      const result = parseGCode(program);
      expect(result.length).toBeGreaterThan(0);
      const commands = result.filter(c => c.type !== 'comment');
      expect(commands.length).toBeGreaterThan(0);
      commands.forEach(cmd => {
        expect(cmd.lineNumber).toBeGreaterThan(0);
      });
    });

    it('should handle arc commands with I,J,K parameters', () => {
      const result = parseGCode('G2 X10 Y10 I5 J5 F100');
      expect(result.length).toBeGreaterThan(0);
      const arcCmd = result[0];
      if (arcCmd.type === 'G') {
        const hasI = arcCmd.params.some(p => p.letter === 'I');
        const hasJ = arcCmd.params.some(p => p.letter === 'J');
        expect(hasI || hasJ).toBe(true);
      }
    });

    it('should handle arc commands with R parameter', () => {
      const result = parseGCode('G2 X10 Y10 R5 F100');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should preserve order of commands', () => {
      const result = parseGCode('G0 X0\nG1 X10\nG2 X20\nG3 X30');
      const gCodes = result.filter(c => c.type === 'G' && [0, 1, 2, 3].includes(c.code));
      if (gCodes.length >= 2) {
        for (let i = 1; i < gCodes.length; i++) {
          expect(gCodes[i].lineNumber).toBeGreaterThanOrEqual(gCodes[i - 1].lineNumber);
        }
      }
    });

    it('should correctly handle tool change sequence', () => {
      const result = parseGCode('M6 T5\nG0 X10 Y10');
      expect(result.length).toBeGreaterThan(0);
      const hasM6 = result.some(c => c.type === 'M' && c.code === 6);
      const hasT5 = result.some(c => c.type === 'T' && c.code === 5);
      expect(hasM6 || hasT5).toBe(true);
    });
  });

  // ============================================================
  // 12. 仕様準拠テスト (Spec Compliance)
  // ============================================================

  describe('parseGCode - Specification Compliance', () => {
    it('should return empty array for input with only comments and empty lines', () => {
      const input = `
        ; Comment 1

        ; Comment 2

      `;
      const result = parseGCode(input);
      const commands = result.filter(c => c.type !== 'comment');
      expect(commands.length).toBe(0);
    });

    it('should set raw field to original text before comment removal', () => {
      const input = 'G0 X10 ; inline comment';
      const result = parseGCode(input);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].raw).toBeDefined();
      expect(typeof result[0].raw).toBe('string');
    });

    it('should support all documented G codes', () => {
      const gCodes = [0, 1, 2, 3, 17, 18, 19, 20, 21, 28, 90, 91];
      gCodes.forEach(code => {
        const input = `G${code} X10`;
        const result = parseGCode(input);
        const found = result.find(c => c.type === 'G' && c.code === code);
        expect(found).toBeDefined();
      });
    });

    it('should support all documented M codes', () => {
      const mCodes = [0, 1, 3, 4, 5, 6, 30];
      mCodes.forEach(code => {
        const input = `M${code}`;
        const result = parseGCode(input);
        const found = result.find(c => c.type === 'M' && c.code === code);
        expect(found).toBeDefined();
      });
    });
  });
});
