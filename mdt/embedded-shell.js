/* Marks pages that are rendered within the MDT tablet shell. */
(() => {
  try {
    if (parent !== window && parent.location.origin === location.origin && parent.CPDUnifiedShell === true) {
      document.documentElement.classList.add("unified-embedded");
      document.addEventListener("DOMContentLoaded", () => document.body.classList.add("unified-embedded"), { once: true });
    }
  } catch { /* A standalone page keeps its own layout. */ }
})();
