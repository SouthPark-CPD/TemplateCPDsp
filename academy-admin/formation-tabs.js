(() => {
  const tabs = [...document.querySelectorAll("[data-formation-tab]")];
  const views = [...document.querySelectorAll("[data-formation-view]")];
  const modes = [...document.querySelectorAll("[data-formation-mode]")];
  const panels = [...document.querySelectorAll("[data-mode-panel]")];

  function updateUrl(tab, mode) {
    const url = new URL(location.href);
    if (tab === "create") url.searchParams.delete("tab"); else url.searchParams.set("tab", tab);
    if (tab === "create" && mode === "group") url.searchParams.set("mode", "group"); else url.searchParams.delete("mode");
    history.replaceState(null, "", `${url.pathname}${url.search}`);
  }

  function openMode(mode = "individual", update = true) {
    const safeMode = mode === "group" ? "group" : "individual";
    modes.forEach(button => button.classList.toggle("active", button.dataset.formationMode === safeMode));
    panels.forEach(panel => { panel.hidden = panel.dataset.modePanel !== safeMode; });
    if (update) updateUrl("create", safeMode);
  }

  function openTab(tab = "create", mode = "individual", update = true) {
    const safeTab = ["create", "templates", "history"].includes(tab) ? tab : "create";
    tabs.forEach(button => button.classList.toggle("active", button.dataset.formationTab === safeTab));
    views.forEach(view => { view.hidden = view.dataset.formationView !== safeTab; });
    if (safeTab === "create") openMode(mode, false);
    if (update) updateUrl(safeTab, mode);
    scrollTo({ top: 0, behavior: "smooth" });
  }

  tabs.forEach(button => button.addEventListener("click", () => openTab(button.dataset.formationTab)));
  modes.forEach(button => button.addEventListener("click", () => openMode(button.dataset.formationMode)));
  window.openFormationTab = openTab;

  const params = new URLSearchParams(location.search);
  openTab(params.get("tab") || "create", params.get("mode") || "individual", false);
})();
