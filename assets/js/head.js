const applyTheme = () =>
  document.documentElement.classList.toggle(
    "pf-v6-theme-dark",
    matchMedia("(prefers-color-scheme: dark)").matches,
  );
applyTheme();
matchMedia("(prefers-color-scheme: dark)").addEventListener(
  "change",
  applyTheme,
);
