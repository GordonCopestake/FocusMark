import type { UiController } from "../app/types";
import { APP_NAME } from "../app/types";

export class AboutUi implements UiController {
  private overlay: HTMLElement | null = null;

  showAbout(): void {
    if (this.overlay) return;

    this.overlay = document.createElement("div");
    this.overlay.className = "dialog-overlay";

    const dialog = document.createElement("div");
    dialog.className = "dialog about-dialog";
    dialog.innerHTML = `
      <h2>About ${APP_NAME}</h2>
      <p>A minimal cross-platform Markdown block editor.</p>
      <p class="version">Version 0.1.0</p>
      <p class="license">MIT License</p>
      <button class="dialog-btn primary" data-action="close">OK</button>
    `;

    this.overlay.appendChild(dialog);
    document.body.appendChild(this.overlay);

    dialog.querySelector('[data-action="close"]')?.addEventListener("click", () => {
      this.hideAbout();
    });

    this.overlay.addEventListener("click", (e) => {
      if (e.target === this.overlay) this.hideAbout();
    });
  }

  hideAbout(): void {
    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
    }
  }

  showToolbar(): void {}
  showStatusBar(): void {}
  showFindBox(): void {}
  hideFindBox(): void {}
  showSettings(): void {}
  hideSettings(): void {}
  updateToolbar(): void {}
  updateStatusBar(): void {}
  updateTitle(): void {}
}
