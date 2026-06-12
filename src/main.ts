// Diagnostic: confirm JS executes
document.documentElement.style.setProperty("--js-loaded", "1");

import { init } from "./app/App";
import "./styles/themes.css";
import "./styles/markdown.css";
import "./styles/editor.css";

document.addEventListener("DOMContentLoaded", () => {
  document.body.insertAdjacentHTML(
    "afterbegin",
    '<div id="js-banner" style="background:#0066cc;color:white;text-align:center;padding:4px;font:13px monospace;">FocusMark loaded</div>'
  );
  setTimeout(() => {
    const banner = document.getElementById("js-banner");
    if (banner) banner.remove();
  }, 2000);
  init();
});
