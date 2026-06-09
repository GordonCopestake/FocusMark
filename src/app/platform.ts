const isMac =
  typeof navigator !== "undefined" && /Mac|iPod|iPhone|iPad/.test(navigator.platform);

export const platform = {
  isMac,
  isWindows: !isMac && typeof navigator !== "undefined" && /Win/.test(navigator.platform),
  isLinux: !isMac && typeof navigator !== "undefined" && /Linux/.test(navigator.platform),
  modKey: isMac ? "Cmd" : "Ctrl",
};
