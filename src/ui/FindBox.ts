import type { UiController } from "../app/types";
import { getDocument, updateDocument } from "../app/state";
import { parseBlocks, findBlockAtOffset } from "../markdown/index";

export class FindBoxUi implements UiController {
  private container: HTMLElement | null = null;
  private isVisible = false;

  showFindBox(): void {
    if (this.isVisible) {
      this.focusInput();
      return;
    }

    this.isVisible = true;
    this.container = document.createElement("div");
    this.container.className = "find-box";

    const input = document.createElement("input");
    input.type = "text";
    input.placeholder = "Find...";
    input.className = "find-input";
    input.id = "find-input";

    const count = document.createElement("span");
    count.className = "find-count";
    count.id = "find-count";

    const prevBtn = document.createElement("button");
    prevBtn.className = "find-btn";
    prevBtn.textContent = "\u2191";
    prevBtn.title = "Previous (Shift+Enter)";

    const nextBtn = document.createElement("button");
    nextBtn.className = "find-btn";
    nextBtn.textContent = "\u2193";
    nextBtn.title = "Next (Enter)";

    const closeBtn = document.createElement("button");
    closeBtn.className = "find-btn";
    closeBtn.textContent = "\u00D7";
    closeBtn.title = "Close (Escape)";

    this.container.appendChild(input);
    this.container.appendChild(count);
    this.container.appendChild(prevBtn);
    this.container.appendChild(nextBtn);
    this.container.appendChild(closeBtn);

    document.body.appendChild(this.container);
    input.focus();

    let matches: number[] = [];
    let currentMatch = 0;

    const updateMatches = () => {
      const query = input.value;
      if (!query) {
        matches = [];
        currentMatch = 0;
        count.textContent = "";
        this.clearHighlights();
        return;
      }

      const text = getDocument().currentText;
      matches = [];
      let idx = 0;
      const lowerText = text.toLowerCase();
      const lowerQuery = query.toLowerCase();
      while ((idx = lowerText.indexOf(lowerQuery, idx)) !== -1) {
        matches.push(idx);
        idx += lowerQuery.length;
      }

      if (matches.length > 0) {
        currentMatch = Math.min(currentMatch, matches.length - 1);
        count.textContent = `${currentMatch + 1}/${matches.length}`;
      } else {
        count.textContent = "0/0";
        this.clearHighlights();
      }
    };

    const goToMatch = () => {
      if (matches.length === 0) return;
      const offset = matches[currentMatch];
      const doc = getDocument();

      // Highlight the match in the rendered view
      this.highlightMatch(offset, input.value.length);

      // Activate the block containing the match
      const blocks = parseBlocks(doc.currentText);
      const block = findBlockAtOffset(blocks, offset);
      if (block) {
        updateDocument({ activeBlockId: block.id });
      }
    };

    input.addEventListener("input", () => {
      updateMatches();
      if (matches.length > 0) {
        currentMatch = 0;
        count.textContent = `1/${matches.length}`;
        goToMatch();
      }
    });

    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        if (e.shiftKey) {
          if (matches.length > 0) {
            currentMatch = (((currentMatch - 1) % matches.length) + matches.length) % matches.length;
            count.textContent = `${currentMatch + 1}/${matches.length}`;
            goToMatch();
          }
        } else {
          if (matches.length > 0) {
            currentMatch = (currentMatch + 1) % matches.length;
            count.textContent = `${currentMatch + 1}/${matches.length}`;
            goToMatch();
          }
        }
      } else if (e.key === "Escape") {
        this.hideFindBox();
      }
    });

    nextBtn.addEventListener("click", () => {
      if (matches.length > 0) {
        currentMatch = (currentMatch + 1) % matches.length;
        count.textContent = `${currentMatch + 1}/${matches.length}`;
        goToMatch();
      }
    });

    prevBtn.addEventListener("click", () => {
      if (matches.length > 0) {
        currentMatch = (((currentMatch - 1) % matches.length) + matches.length) % matches.length;
        count.textContent = `${currentMatch + 1}/${matches.length}`;
        goToMatch();
      }
    });

    closeBtn.addEventListener("click", () => {
      this.hideFindBox();
    });
  }

  hideFindBox(): void {
    if (this.container) {
      this.container.remove();
      this.container = null;
    }
    this.isVisible = false;
    this.clearHighlights();
  }

  private clearHighlights(): void {
    const marks = document.querySelectorAll(".find-highlight");
    marks.forEach((m) => {
      m.classList.remove("find-highlight");
      if (m.classList.contains("find-current")) {
        m.classList.remove("find-current");
      }
    });
  }

  private highlightMatch(offset: number, _length: number): void {
    this.clearHighlights();

    const doc = getDocument();
    if (doc.mode !== "rendered") return;

    // In rendered mode, walk DOM and find text nodes to highlight
    const container = document.querySelector(".rendered-document");
    if (!container) return;

    // Simple approach: find the block containing the match and scroll to it
    const blocks = parseBlocks(doc.currentText);
    const matchBlock = findBlockAtOffset(blocks, offset);
    if (matchBlock) {
      const el = document.querySelector(`[data-block-id="${matchBlock.id}"]`) as HTMLElement;
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.style.boxShadow = "0 0 0 2px var(--accent-bg)";
        el.style.transition = "box-shadow 0.2s ease";
        setTimeout(() => {
          el.style.boxShadow = "";
        }, 2000);
      }
    }
  }

  private focusInput(): void {
    const input = document.getElementById("find-input") as HTMLInputElement;
    if (input) {
      input.focus();
      input.select();
    }
  }

  showToolbar(): void {}
  showStatusBar(): void {}
  showSettings(): void {}
  hideSettings(): void {}
  showAbout(): void {}
  hideAbout(): void {}
  updateToolbar(): void {}
  updateStatusBar(): void {}
  updateTitle(): void {}
}
