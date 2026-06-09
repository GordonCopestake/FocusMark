import MarkdownIt from "markdown-it";
import markdownItTaskLists from "markdown-it-task-lists";
import type { RenderBlock } from "../app/types";

let _md: MarkdownIt | null = null;

function getMd(): MarkdownIt {
  if (_md) return _md;
  _md = createMd(false);
  return _md;
}

function createMd(allowHtml: boolean): MarkdownIt {
  const md = new MarkdownIt({
    html: allowHtml,
    linkify: true,
    typographer: false,
    breaks: false,
    xhtmlOut: false,
  });

  md.enable(["table", "strikethrough"]);
  md.use(markdownItTaskLists);

  const defaultRender =
    md.renderer.rules.link_open ||
    function (tokens, idx, options, _env, self) {
      return self.renderToken(tokens, idx, options);
    };

  md.renderer.rules.link_open = function (tokens, idx, options, env, self) {
    const token = tokens[idx];
    const href = token.attrGet("href");
    if (href && (href.startsWith("http://") || href.startsWith("https://"))) {
      token.attrSet("target", "_blank");
      token.attrSet("rel", "noopener noreferrer");
    }
    return defaultRender(tokens, idx, options, env, self);
  };

  return md;
}

export function configureRenderer(htmlHandling: "sanitize" | "escape"): void {
  const allowHtml = htmlHandling === "sanitize";
  if (_md && _md.options.html !== allowHtml) {
    _md = createMd(allowHtml);
  } else if (!_md) {
    _md = createMd(allowHtml);
  }
}

export function renderMarkdown(source: string): string {
  return getMd().render(source);
}

export function renderBlockHtml(blockSource: string): string {
  if (blockSource.trim() === "") return "";
  return getMd().render(blockSource);
}

export function renderInlineMarkdown(source: string): string {
  return getMd().renderInline(source);
}

export function renderBlocks(
  blocks: Array<{ source: string; html?: string }>
): RenderBlock[] {
  return blocks.map((block) => ({
    ...block,
    html: renderBlockHtml(block.source),
  })) as RenderBlock[];
}
