(function () {
  const pad = value => String(value).padStart(2, "0");
  const statusbar = document.createElement("div");
  statusbar.className = "tablet-statusbar";
  statusbar.innerHTML = '<div><span class="tablet-dot"></span><span class="tablet-secure">CPD Secure</span><span>Police Academy</span></div><div><span id="tablet-date"></span><span id="tablet-clock"></span></div>';
  document.body.prepend(statusbar);

  function updateClock() {
    const now = new Date();
    const clock = document.querySelector("#tablet-clock");
    const date = document.querySelector("#tablet-date");
    if (clock) clock.textContent = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
    if (date) date.textContent = new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "2-digit", month: "short" }).format(now);
  }
  updateClock();
  setInterval(updateClock, 15000);

  const dossier = document.querySelector("#dossier-content");
  if (!dossier) return;

  const hero = dossier.querySelector(".agent-hero");
  const path = dossier.querySelector(".path-panel");
  const workspace = dossier.querySelector(".workspace-grid");
  const filePanel = dossier.querySelector(".file-panel");
  const trainingPanel = dossier.querySelector(".training-panel");
  const history = dossier.querySelector(".history-panel");
  const archives = dossier.querySelector(".archive-panel");
  if (!hero || !workspace) return;

  const tabs = document.createElement("nav");
  tabs.className = "tablet-section-tabs";
  tabs.setAttribute("aria-label", "Sections du dossier");
  tabs.innerHTML = '<button type="button" class="active" data-tablet-view="overview">Vue générale</button><button type="button" data-tablet-view="training">Ajouter une formation</button><button type="button" data-tablet-view="history">Historique</button>';
  hero.after(tabs);

  function selectView(view) {
    tabs.querySelectorAll("button").forEach(button => button.classList.toggle("active", button.dataset.tabletView === view));
    path?.classList.toggle("tablet-view-hidden", view !== "overview");
    filePanel?.classList.toggle("tablet-view-hidden", view !== "overview");
    trainingPanel?.classList.toggle("tablet-view-hidden", view !== "training");
    history?.classList.toggle("tablet-view-hidden", view !== "history");
    archives?.classList.toggle("tablet-view-hidden", view !== "history");
    workspace.classList.toggle("tablet-view-hidden", view === "history");
    workspace.classList.add("tablet-single");
  }

  tabs.addEventListener("click", event => {
    const button = event.target.closest("[data-tablet-view]");
    if (button) selectView(button.dataset.tabletView);
  });
  document.addEventListener("click", event => {
    if (event.target.closest('[data-action="edit"], #agent-training-link')) selectView("training");
  }, true);
  selectView("overview");
})();
