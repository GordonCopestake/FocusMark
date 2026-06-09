import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import type { Root, Content } from "mdast";
import type { MarkdownBlockType } from "../app/types";

let _blockIdCounter = 0;

function nextBlockId(): string {
  return `block-${++_blockIdCounter}`;
}

export function resetBlockIds(): void {
  _blockIdCounter = 0;
}

type MdastNode = Content & { position?: { start: { offset: number }; end: { offset: number } } };

type RawBlock = {
  id: string;
  type: MarkdownBlockType;
  startOffset: number;
  endOffset: number;
  startLine: number;
  endLine: number;
  source: string;
};

const processor = unified().use(remarkParse).use(remarkGfm);

function blockTypeFromNode(nodeType: string): MarkdownBlockType {
  switch (nodeType) {
    case "heading": return "heading";
    case "paragraph": return "paragraph";
    case "list": return "list";
    case "blockquote": return "blockquote";
    case "code": return "code_fence";
    case "table": return "table";
    case "thematicBreak": return "thematic_break";
    case "html": return "html";
    case "image": return "image";
    default: return "unknown";
  }
}

export function parseBlocks(sourceText: string): RawBlock[] {
  resetBlockIds();

  if (sourceText.length === 0) {
    return [{
      id: nextBlockId(),
      type: "paragraph",
      startOffset: 0,
      endOffset: 0,
      startLine: 0,
      endLine: 0,
      source: "",
    }];
  }

  const tree = processor.parse(sourceText) as Root;
  const blocks: RawBlock[] = [];

  for (const child of tree.children) {
    const node = child as MdastNode;
    const pos = node.position;
    if (!pos) continue;

    const startOffset = pos.start.offset ?? 0;
    const endOffset = pos.end.offset ?? startOffset;
    const startLine = pos.start.line - 1;
    const endLine = pos.end.line - 1;
    const source = sourceText.slice(startOffset, endOffset);
    const blockType = blockTypeFromNode(node.type);

    blocks.push({
      id: nextBlockId(),
      type: blockType,
      startOffset,
      endOffset,
      startLine,
      endLine,
      source,
    });
  }

  return blocks;
}

// Legacy block type for renderers
export { type RawBlock as RenderBlockAlias };

export function findBlockAtOffset(
  blocks: RawBlock[],
  offset: number
): RawBlock | null {
  for (const block of blocks) {
    if (offset >= block.startOffset && offset < block.endOffset) {
      return block;
    }
  }
  // Check the last block's end boundary (empty blocks may have start === end)
  for (const block of blocks) {
    if (offset === block.startOffset && block.startOffset === block.endOffset) {
      return block;
    }
  }
  return null;
}

export function findBlockByLine(
  blocks: RawBlock[],
  line: number
): RawBlock | null {
  for (const block of blocks) {
    if (line >= block.startLine && line <= block.endLine) {
      return block;
    }
  }
  return null;
}

export function findNextBlock(
  blocks: RawBlock[],
  currentId: string | null
): RawBlock | null {
  if (!currentId && blocks.length > 0) return blocks[0];
  const idx = blocks.findIndex((b) => b.id === currentId);
  if (idx === -1) return blocks[0] || null;
  if (idx < blocks.length - 1) return blocks[idx + 1];
  return null;
}

export function findPreviousBlock(
  blocks: RawBlock[],
  currentId: string | null
): RawBlock | null {
  if (!currentId && blocks.length > 0) return blocks[0];
  const idx = blocks.findIndex((b) => b.id === currentId);
  if (idx === -1) return blocks[0] || null;
  if (idx > 0) return blocks[idx - 1];
  return null;
}
