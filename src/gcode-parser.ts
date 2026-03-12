import type { GCodeCommand, GCodeCommandType, GCodeParam } from './shared-types';

export function extractParams(raw: string): GCodeParam[] {
  const params: GCodeParam[] = [];
  const regex = /([A-Za-z])(-?\d+\.?\d*)/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(raw)) !== null) {
    params.push({ letter: match[1].toUpperCase(), value: parseFloat(match[2]) });
  }
  return params;
}

export function parseLine(raw: string, lineNumber: number): GCodeCommand | null {
  const trimmed = raw.trim();
  if (trimmed === '') return null;

  // Full-line comment
  if (trimmed.startsWith(';') || trimmed.startsWith('(')) {
    return { type: 'comment', code: null, params: [], raw: trimmed, lineNumber };
  }

  // Strip inline comments
  let code = trimmed;
  const semiIdx = code.indexOf(';');
  if (semiIdx >= 0) code = code.substring(0, semiIdx).trim();
  const parenIdx = code.indexOf('(');
  if (parenIdx >= 0) code = code.substring(0, parenIdx).trim();

  if (code === '') {
    return { type: 'comment', code: null, params: [], raw: trimmed, lineNumber };
  }

  // Strip line number (N prefix)
  if (/^[Nn]\d+/.test(code)) {
    code = code.replace(/^[Nn]\d+\s*/, '');
  }

  if (code === '') return null;

  const firstChar = code[0].toUpperCase();
  const allParams = extractParams(code);

  if (firstChar === 'G' || firstChar === 'M' || firstChar === 'T' || firstChar === 'F' || firstChar === 'S') {
    const mainParam = allParams.find(p => p.letter === firstChar);
    const type: GCodeCommandType = firstChar as GCodeCommandType;
    const codeNum = mainParam ? mainParam.value : null;
    const rest = allParams.filter(p => p !== mainParam);
    return { type, code: codeNum, params: rest, raw: trimmed, lineNumber };
  }

  // Fallback: unknown command type
  return { type: 'unknown', code: null, params: allParams, raw: trimmed, lineNumber };
}

export function parseGCode(rawText: string): GCodeCommand[] {
  const lines = rawText.split(/\r?\n/);
  const commands: GCodeCommand[] = [];

  for (let i = 0; i < lines.length; i++) {
    const parsed = parseLine(lines[i], i + 1);
    if (parsed !== null) {
      commands.push(parsed);
    }
  }

  return commands;
}
