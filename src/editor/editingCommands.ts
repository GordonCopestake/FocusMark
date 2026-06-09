import type { EditorController } from "../app/types";

export type SelectionRange = {
  from: number;
  to: number;
  text: string;
};

export function getSelectedText(
  text: string,
  from: number,
  to: number
): string {
  return text.slice(from, to);
}

export function getCurrentWordRange(
  text: string,
  pos: number
): { from: number; to: number } {
  if (pos < 0 || pos > text.length) return { from: pos, to: pos };

  let from = pos;
  let to = pos;

  // Move left to find word start
  while (from > 0 && isWordChar(text[from - 1])) {
    from--;
  }

  // Move right to find word end
  while (to < text.length && isWordChar(text[to])) {
    to++;
  }

  return { from, to };
}

export function getCurrentLineRange(
  text: string,
  pos: number
): { from: number; to: number } {
  let from = pos;
  let to = pos;

  while (from > 0 && text[from - 1] !== "\n") from--;
  while (to < text.length && text[to] !== "\n" && text[to] !== "\r") to++;

  return { from, to };
}

function isWordChar(ch: string): boolean {
  return /[\w\u00C0-\uFFFF]/.test(ch);
}

function getRange(
  controller: EditorController
): { from: number; to: number; text: string } {
  const text = controller.getText();
  let { from, to } = controller.getSelection();
  if (from === to) {
    const word = getCurrentWordRange(text, from);
    from = word.from;
    to = word.to;
  }
  const selected = text.slice(from, to);
  return { from, to, text: selected };
}

// Formatting commands:

export function toggleBold(controller: EditorController): void {
  const { from, to, text: selected } = getRange(controller);
  if (selected.startsWith("**") && selected.endsWith("**") && selected.length >= 4) {
    controller.replaceRange(from, to, selected.slice(2, -2));
  } else {
    controller.replaceRange(from, to, `**${selected}**`);
    controller.setSelection(from + 2, from + 2 + selected.length);
  }
}

export function toggleItalic(controller: EditorController): void {
  const { from, to, text: selected } = getRange(controller);
  const hasWrap = (selected.startsWith("*") || selected.startsWith("_")) &&
                  (selected.endsWith("*") || selected.endsWith("_")) &&
                  selected.length >= 2;
  if (hasWrap) {
    controller.replaceRange(from, to, selected.slice(1, -1));
  } else {
    controller.replaceRange(from, to, `*${selected}*`);
    controller.setSelection(from + 1, from + 1 + selected.length);
  }
}

export function toggleInlineCode(controller: EditorController): void {
  const { from, to, text: selected } = getRange(controller);
  if (selected.startsWith("`") && selected.endsWith("`") && selected.length >= 2) {
    controller.replaceRange(from, to, selected.slice(1, -1));
  } else {
    controller.replaceRange(from, to, `\`${selected}\``);
    controller.setSelection(from + 1, from + 1 + selected.length);
  }
}

export function toggleStrikethrough(controller: EditorController): void {
  const { from, to, text: selected } = getRange(controller);
  if (selected.startsWith("~~") && selected.endsWith("~~") && selected.length >= 4) {
    controller.replaceRange(from, to, selected.slice(2, -2));
  } else {
    controller.replaceRange(from, to, `~~${selected}~~`);
    controller.setSelection(from + 2, from + 2 + selected.length);
  }
}

export function insertLink(controller: EditorController): void {
  const text = controller.getText();
  const sel = controller.getSelection();
  if (sel.from !== sel.to) {
    const selected = text.slice(sel.from, sel.to);
    controller.replaceRange(sel.from, sel.to, `[${selected}](url)`);
    // Select "url"
    const start = sel.from + selected.length + 3;
    controller.setSelection(start, start + 3);
  } else {
    controller.replaceRange(sel.from, sel.from, "[text](url)");
    controller.setSelection(sel.from + 1, sel.from + 5);
  }
}

export function setHeadingLevel(
  controller: EditorController,
  level: number
): void {
  const text = controller.getText();
  const cursor = controller.getCursorOffset();
  const { from, to } = getCurrentLineRange(text, cursor);
  const lineText = text.slice(from, to);

  const hashes = "#".repeat(level);
  const existingMatch = lineText.match(/^(#{1,6})\s?/);

  if (existingMatch) {
    const currentLevel = existingMatch[1].length;
    if (currentLevel === level) {
      // Remove heading
      const rest = lineText.slice(existingMatch[0].length);
      controller.replaceRange(from, to, rest);
    } else {
      // Change level
      const rest = lineText.slice(existingMatch[0].length);
      controller.replaceRange(from, to, `${hashes} ${rest}`);
    }
  } else {
    controller.replaceRange(from, to, `${hashes} ${lineText}`);
  }
}

export function toggleBulletList(controller: EditorController): void {
  toggleListMarker(controller, "- ");
}

export function toggleNumberedList(controller: EditorController): void {
  const text = controller.getText();
  const cursor = controller.getCursorOffset();
  const { from, to } = getCurrentLineRange(text, cursor);
  const lineText = text.slice(from, to);

  if (/^\d+\.\s/.test(lineText)) {
    // Remove numbered list marker
    const stripped = lineText.replace(/^\d+\.\s/, "");
    controller.replaceRange(from, to, stripped);
  } else {
    controller.replaceRange(from, to, `1. ${lineText}`);
  }
}

export function toggleTaskList(controller: EditorController): void {
  toggleListMarker(controller, "- [ ] ");
}

export function toggleQuote(controller: EditorController): void {
  toggleLinePrefix(controller, "> ");
}

export function toggleCodeBlock(controller: EditorController): void {
  const text = controller.getText();
  const sel = controller.getSelection();

  if (sel.from !== sel.to) {
    const selected = text.slice(sel.from, sel.to);
    if (selected.startsWith("```") && selected.endsWith("```")) {
      controller.replaceRange(sel.from, sel.to, selected.slice(3, -3));
    } else {
      controller.replaceRange(
        sel.from,
        sel.to,
        "```\n" + selected + "\n```"
      );
    }
  } else {
    // Wrap current block
    const { from, to } = getCurrentLineRange(text, sel.from);
    const lineText = text.slice(from, to);
    controller.replaceRange(from, to, "```\n" + lineText + "\n```");
  }
}

function toggleListMarker(controller: EditorController, marker: string): void {
  const text = controller.getText();
  const cursor = controller.getCursorOffset();
  const { from, to } = getCurrentLineRange(text, cursor);
  const lineText = text.slice(from, to);

  if (lineText.startsWith(marker)) {
    const stripped = lineText.slice(marker.length);
    controller.replaceRange(from, to, stripped);
  } else if (/^[-*+]\s/.test(lineText)) {
    // Replace existing list marker
    const stripped = lineText.replace(/^[-*+]\s/, "");
    controller.replaceRange(from, to, marker + stripped);
  } else if (/^\d+\.\s/.test(lineText)) {
    const stripped = lineText.replace(/^\d+\.\s/, "");
    controller.replaceRange(from, to, marker + stripped);
  } else {
    controller.replaceRange(from, to, marker + lineText);
  }
}

function toggleLinePrefix(controller: EditorController, prefix: string): void {
  const text = controller.getText();
  const cursor = controller.getCursorOffset();
  const { from, to } = getCurrentLineRange(text, cursor);
  const lineText = text.slice(from, to);

  if (lineText.startsWith(prefix)) {
    const stripped = lineText.slice(prefix.length);
    controller.replaceRange(from, to, stripped);
  } else {
    controller.replaceRange(from, to, prefix + lineText);
  }
}
