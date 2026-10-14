// Applies the saved colour theme before first paint (see src/theme.js). Loaded as a
// blocking script from index.html so the Content-Security-Policy needs no inline scripts.
try {
  var choice = localStorage.getItem("designrounds:theme") || "system";
  var dark = window.matchMedia && matchMedia("(prefers-color-scheme: dark)").matches;
  document.documentElement.dataset.theme = choice === "system" ? (dark ? "dark" : "light") : choice;
} catch (error) {}

