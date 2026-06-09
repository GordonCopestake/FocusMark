import DOMPurify from "dompurify";

const purify = DOMPurify(window);

purify.addHook("afterSanitizeAttributes", (node) => {
  if (node instanceof HTMLAnchorElement) {
    const href = node.getAttribute("href");
    if (href) {
      // Add target and rel for external links
      node.setAttribute("target", "_blank");
      node.setAttribute("rel", "noopener noreferrer");
      // Mark external links visually
      if (href.startsWith("http")) {
        node.setAttribute("data-external", "true");
      }
    }
  }
});

export function sanitizeHtml(html: string): string {
  return purify.sanitize(html, {
    ALLOWED_TAGS: [
      "h1", "h2", "h3", "h4", "h5", "h6",
      "p", "br", "hr",
      "strong", "em", "b", "i", "u", "s", "del",
      "code", "pre",
      "a", "img",
      "ul", "ol", "li",
      "blockquote",
      "table", "thead", "tbody", "tr", "th", "td",
      "input",
      "span", "div",
    ],
    ALLOWED_ATTR: [
      "href", "src", "alt", "title", "class", "id",
      "type", "checked", "disabled",
      "target", "rel", "data-external",
    ],
    ALLOW_DATA_ATTR: true,
    FORBID_ATTR: ["onerror", "onload", "onclick", "onmouseover", "onfocus",
      "onblur", "onchange", "onsubmit", "onkeydown", "onkeyup",
      "onkeypress", "onmousedown", "onmouseup", "ondblclick"],
    FORBID_TAGS: ["script", "style", "iframe", "object", "embed", "applet", "form"],
  });
}

export function isSafeHtml(html: string): boolean {
  const sanitized = sanitizeHtml(html);
  return sanitized === html;
}
