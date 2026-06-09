import type { LineEnding } from "../app/types";

export function detectLineEnding(text: string): LineEnding {
  return text.includes("\r\n") ? "\r\n" : "\n";
}

export function splitLines(text: string): string[] {
  return text.split(/\r?\n/);
}

export function joinLines(lines: string[], lineEnding: LineEnding): string {
  return lines.join(lineEnding);
}

export function getLineCount(text: string): number {
  return text === "" ? 0 : splitLines(text).length;
}

export function offsetToLineCol(
  text: string,
  offset: number
): { line: number; col: number } {
  let line = 0;
  let col = 0;
  for (let i = 0; i < offset && i < text.length; i++) {
    if (text[i] === "\r") {
      if (text[i + 1] === "\n") i++;
      line++;
      col = 0;
    } else if (text[i] === "\n") {
      line++;
      col = 0;
    } else {
      col++;
    }
  }
  return { line, col };
}

export function lineColToOffset(
  text: string,
  line: number,
  col: number
): number {
  let currentLine = 0;
  let offset = 0;
  while (currentLine < line && offset < text.length) {
    if (text[offset] === "\r") {
      if (text[offset + 1] === "\n") offset++;
      offset++;
      currentLine++;
    } else if (text[offset] === "\n") {
      offset++;
      currentLine++;
    } else {
      offset++;
    }
  }
  return offset + col;
}

export function getLineStartOffset(text: string, line: number): number {
  return lineColToOffset(text, line, 0);
}

export function getLineEndOffset(text: string, line: number): number {
  let offset = getLineStartOffset(text, line);
  while (offset < text.length) {
    if (text[offset] === "\r") {
      if (text[offset + 1] === "\n") return offset + 2;
      return offset + 1;
    }
    if (text[offset] === "\n") return offset + 1;
    offset++;
  }
  return offset;
}

export function getLineText(text: string, line: number): string {
  const start = getLineStartOffset(text, line);
  const end = getLineEndOffset(text, line);
  return text.slice(start, end);
}
