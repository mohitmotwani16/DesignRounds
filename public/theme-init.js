// Applies the saved colour theme before first paint (see src/theme.js). Loaded as a
// blocking script from index.html so the Content-Security-Policy needs no inline scripts.
// Marks that JavaScript runs, so scroll-reveal effects only hide content when they
// can also reveal it (without JS, crawlers and readers see everything).
document.documentElement.classList.add("js");
try {
  var choice = localStorage.getItem("designrounds:theme") || "light";
  var dark = window.matchMedia && matchMedia("(prefers-color-scheme: dark)").matches;
  document.documentElement.dataset.theme = choice === "system" ? (dark ? "dark" : "light") : choice;
} catch (error) {}

