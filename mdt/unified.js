/* Tablet launcher shell. Access controls remain enforced by each server route. */
(() => {
  const R = CPDRoutes;
  const origin = location.origin;
  const timedFetch = (url, options = {}) => { const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), 20000); return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timer)); };
  const frame = document.getElementById("module-frame");
  const launcher = document.getElementById("launcher");
  const workspace = document.getElementById("workspace");
  const launcherMessage = document.getElementById("shell-message");
  const workspaceMessage = document.getElementById("workspace-message");
  const retry = document.getElementById("retry-session");
  const grid = document.getElementById("app-grid");
  const defaultSections = {
    mdt: { label: "MDT", enabled: true },
    academy: { label: "Police Academy", enabled: true },
    liaison: { label: "Communication gouvernement", enabled: true },
    gang: { label: "Gang Unit", enabled: true }
  };
  const icons = {
    shield: "M12 3 20 6v5c0 5-3.4 8.6-8 10-4.6-1.4-8-5-8-10V6l8-3Zm-3.1 9 2 2 4.2-4.3",
    academy: "m4 10 8-4 8 4-8 4-8-4Zm3 3v4.5c2.8 1.4 7.2 1.4 10 0V13 M20 10v5",
    message: "M4 5h16v11H8l-4 3V5Zm4 4h8M8 12h5",
    map: "M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Zm0 0v14m6-12v14"
  };
  let sections = { ...defaultSections };
  let navigation = {};
  let academyAccess = false;
  let gangAccess = false;
  let ready = false;
  let activeFolder = null;
  let current = null;
  let loadingTimer;
  let homeTimer;
  let badges = { academy: 0, liaison: 0, gang: 0 };
  let moduleBadges = {};
  window.CPDUnifiedShell = true;

  const icon = name => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${icons[name] || icons.message}"></path></svg>`;
  const displayDate = () => new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "numeric", month: "short" }).format(new Date()).replace(/^./, letter => letter.toUpperCase());
  function updateClock() {
    document.getElementById("tablet-time").textContent = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" }).format(new Date());
    document.getElementById("tablet-date").textContent = displayDate();
  }
  function sectionLabel(key) { return sections[key]?.label || defaultSections[key].label; }
  function appDefinitions() {
    return [
      { key: "mdt", label: sectionLabel("mdt"), subtitle: "Référentiel opérationnel", view: "rapide", icon: "shield", tone: "mdt", visible: sections.mdt?.enabled !== false },
      { key: "academy", label: sectionLabel("academy"), subtitle: "Formation & suivi", view: "pa", icon: "academy", tone: "academy", visible: academyAccess && sections.academy?.enabled !== false },
      { key: "liaison", label: sectionLabel("liaison"), subtitle: "Échanges institutionnels", view: "liaison", icon: "message", tone: "liaison", visible: sections.liaison?.enabled !== false },
      { key: "gang", label: sectionLabel("gang"), subtitle: "Renseignement opérationnel", view: "gang-dashboard", icon: "map", tone: "gang", visible: gangAccess && sections.gang?.enabled !== false }
    ];
  }
  const folders = {
    mdt: [["rapide", "Accès rapide", "shield"], ["procedures", "Procédures", "message"], ["radio", "Radio", "message"], ["reglement", "Règlement", "academy"], ["tenues", "Tenues & véhicules", "academy"], ["organigramme", "Organigramme", "academy"]],
    academy: [["pa", "Tableau de bord", "academy"], ["suivi", "Suivi pédagogique", "academy"], ["formations", "Formations", "message"], ["recrutements", "Recrutements", "message"], ["activite", "Historique", "map"]],
    liaison: [["liaison", "Dépôts de plainte", "message"], ["prosecutor", "Demande procureur", "academy"], ["doj", "Communication DOJ", "message"], ["liaison-gouv", "Communication gouvernement", "message"], ["avocat", "Communication avocat", "message"]],
    gang: [["gang-dashboard", "Vue d’ensemble", "map"], ["gang-map", "Carte tactique", "map"], ["gang-gangs", "Dossiers & suivi", "academy"], ["gang-operations", "Opérations", "shield"]]
  };
  function folderItems(key) {
    const settingKey = { mdt: "mdtItems", academy: "academyItems", gang: "gangItems" }[key];
    const configured = settingKey ? navigation[settingKey] : null;
    if (!Array.isArray(configured) || !configured.length) return folders[key] || [];
    return configured.filter(item => item?.enabled !== false && R.routes[item.key] && !(key === "gang" && item.key === "gang-intel")).sort((a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0)).map(item => [item.key, item.label || item.key, item.icon || "message"]);
  }
  function renderLauncher() {
    const title = document.getElementById("launcher-title");
    const kicker = document.getElementById("launcher-kicker");
    const description = document.getElementById("launcher-description");
    const back = document.getElementById("folder-back");
    if (!activeFolder) {
      kicker.textContent = "TABLETTE CPD";
      title.textContent = "Accueil";
      description.textContent = "Ouvrez une application pour accéder à son portail.";
      back.hidden = true;
      grid.innerHTML = appDefinitions().filter(app => app.visible).map(app => `<button class="app-card" type="button" data-section="${app.key}">${badges[app.key] ? `<em class="app-badge">${badges[app.key] > 99 ? "99+" : badges[app.key]}</em>` : ""}<span class="app-icon app-${app.tone}">${icon(app.icon)}</span><strong>${app.label}</strong><small>${app.subtitle}</small></button>`).join("");
      return;
    }
    const app = appDefinitions().find(entry => entry.key === activeFolder);
    if (!app) { activeFolder = null; return renderLauncher(); }
    kicker.textContent = "APPLICATION";
    title.textContent = app.label;
    description.textContent = "Choisissez un module.";
    back.hidden = false;
    grid.innerHTML = folderItems(activeFolder).map(([view, label, iconName]) => `<button class="app-card" type="button" data-view="${view}">${moduleBadges[view] ? `<em class="app-badge" aria-label="${moduleBadges[view]} éléments à traiter">${moduleBadges[view] > 99 ? "99+" : moduleBadges[view]}</em>` : ""}<span class="app-icon app-${app.tone}">${icon(iconName)}</span><strong>${label}</strong></button>`).join("");
  }
  function setView(route) {
    current = route;
    const group = route.academy ? "academy" : route.gang ? "gang" : (["liaison", "prosecutor", "doj", "liaison-gouv", "avocat"].includes(route.view) || route.view.startsWith("channel:")) ? "liaison" : "mdt";
    const labels = { rapide: "Accès rapide", procedures: "Procédures", radio: "Radio", reglement: "Règlement", tenues: "Tenues & véhicules", organigramme: "Organigramme", liaison: "Dépôts de plainte", prosecutor: "Demande procureur", doj: "Communication DOJ", "liaison-gouv": "Communication gouvernement", avocat: "Communication avocat", pa: "Tableau de bord", suivi: "Suivi pédagogique", formations: "Formations", recrutements: "Recrutements", activite: "Historique", "gang-dashboard": "Vue d’ensemble", "gang-map": "Carte tactique", "gang-gangs": "Dossiers & suivi", "gang-intel": "Dossiers & suivi", "gang-operations": "Opérations" };
    document.getElementById("section-name").textContent = sectionLabel(group);
    document.getElementById("view-title").textContent = labels[route.view] || "Communication";
    frame.title = labels[route.view] || "MDT";
  }
  function showHome(push = true) {
    clearTimeout(loadingTimer);
    current = null;
    activeFolder = null;
    frame.hidden = true;
    launcher.hidden = false;
    workspace.hidden = true;
    launcherMessage.hidden = ready;
    if (ready) launcherMessage.textContent = "";
    renderLauncher();
    retry.hidden = true;
    if (push) history.pushState(null, "", "/mdt/index.html");
  }
  function navigate(route, push = true) {
    if (!ready || !route) return;
    if ((route.academy && !academyAccess) || (route.gang && !gangAccess)) return showHome(push);
    if (push) history.pushState(null, "", R.shellUrl(route, origin));
    setView(route);
    launcher.hidden = true;
    workspace.hidden = false;
    frame.hidden = false;
    workspaceMessage.hidden = false;
    workspaceMessage.textContent = "Chargement…";
    clearTimeout(loadingTimer);
    loadingTimer = setTimeout(() => { workspaceMessage.textContent = "Le chargement prend plus de temps que prévu."; }, 15000);
    frame.src = route.url;
  }
  function routeFor(view) { return R.resolve(R.routes[view], origin); }
  async function loadConfiguration() {
    try {
      const response = await timedFetch("/api/liaison/complaints?configuration=1", { credentials: "same-origin", cache: "no-store" });
      const data = await response.json();
      if (response.ok && data?.liaison?.navigation) {
        navigation = data.liaison.navigation;
        if (navigation.sections) sections = { ...defaultSections, ...navigation.sections };
      }
    } catch { /* Default launcher remains usable. */ }
  }
  async function refreshBadges(data) {
    badges = { academy: Number(data?.academySummary?.pendingCount ?? data?.academySummary?.newCount ?? 0), liaison: 0, gang: 0 };
    moduleBadges = { recrutements: badges.academy };
    const tasks = [
      timedFetch("/api/liaison/complaints", { credentials: "same-origin", cache: "no-store" }).then(response => response.ok ? response.json() : null).then(result => {
        const threads = result?.threads || [];
        const seen = JSON.parse(localStorage.getItem("liaisonSeen") || "{}");
        if (localStorage.getItem("liaisonBaseline") !== "1") {
          threads.forEach(thread => { if (thread.lastMessageId) seen[thread.id] = thread.lastMessageId; });
          localStorage.setItem("liaisonSeen", JSON.stringify(seen));
          localStorage.setItem("liaisonBaseline", "1");
          return;
        }
        const unread = threads.filter(thread => thread.lastMessageId && seen[thread.id] !== thread.lastMessageId);
        badges.liaison = unread.length;
        moduleBadges.liaison = unread.length;
      }).catch(() => {})
    ];
    if (gangAccess) tasks.push(timedFetch("/api/gang-unit/data", { credentials: "same-origin", cache: "no-store" }).then(response => response.ok ? response.json() : null).then(result => {
      const urgent = (result?.watchlist || []).filter(item => item.priority === "urgente" && item.status === "active").length;
      const active = (result?.operations || []).filter(item => item.status === "active").length;
      badges.gang = urgent + active;
      moduleBadges["gang-gangs"] = urgent;
      moduleBadges["gang-operations"] = active;
    }).catch(() => {}));
    await Promise.all(tasks);
    renderLauncher();
  }
  async function refreshBadgesWithSession() {
    try {
      const response = await timedFetch("/api/auth/session", { credentials: "same-origin", cache: "no-store" });
      if (response.ok) return refreshBadges(await response.json());
    } catch { /* Keep the previous notification state visible. */ }
  }
  async function session() {
    retry.disabled = true;
    try {
      const response = await timedFetch("/api/auth/session", { credentials: "same-origin", cache: "no-store" });
      if (response.status === 401) return location.replace("/auth/login.html?error=login_required");
      const data = await response.json();
      if (!response.ok || !data?.authenticated) throw new Error("session");
      academyAccess = data.academyAccess === true;
      gangAccess = data.gangAccess === true;
      document.getElementById("agent-name").textContent = data.user?.globalName || data.user?.username || "Agent CPD";
      document.getElementById("admin-link").hidden = data.controlPanelAdmin !== true;
      await loadConfiguration();
      ready = true;
      renderLauncher();
      refreshBadges(data);
      clearInterval(homeTimer);
      homeTimer = setInterval(refreshBadgesWithSession, 60000);
      const requested = new URL(location.href).searchParams.get("view");
      requested ? navigate(R.fromShell(location.href, origin), false) : showHome(false);
    } catch {
      launcherMessage.hidden = false;
      launcherMessage.textContent = "Impossible de vérifier vos accès. Réessayez.";
      retry.hidden = false;
    } finally { retry.disabled = false; }
  }
  grid.addEventListener("click", event => {
    const button = event.target.closest("button");
    if (!button) return;
    if (button.dataset.section) { activeFolder = button.dataset.section; renderLauncher(); }
    if (button.dataset.view) navigate(routeFor(button.dataset.view));
  });
  document.getElementById("folder-back").addEventListener("click", () => { activeFolder = null; renderLauncher(); });
  document.getElementById("home-button").addEventListener("click", () => showHome());
  retry.addEventListener("click", session);
  frame.addEventListener("load", () => {
    clearTimeout(loadingTimer);
    try {
      const childWindow = frame.contentWindow, childDocument = frame.contentDocument, url = new URL(childWindow.location.href);
      if (url.href === "about:blank") return;
      if (url.origin !== origin) throw new Error("cross-origin");
      if (url.pathname.startsWith("/auth/") || url.pathname.startsWith("/academy-auth/")) return location.replace(url.pathname + url.search);
      const route = R.resolve(url.href, origin);
      if (!route) throw new Error("unknown-route");
      setView(route);
      history.replaceState(null, "", R.shellUrl(route, origin));
      workspaceMessage.hidden = true;
      childDocument.addEventListener("click", event => {
        const link = event.target.closest("a[href]");
        if (!link || event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || link.hasAttribute("download")) return;
        const target = R.resolve(new URL(link.href, childWindow.location.href).href, origin);
        if (target) { event.preventDefault(); navigate(target); }
      });
    } catch {
      workspaceMessage.textContent = "Impossible de charger la rubrique.";
      workspaceMessage.hidden = false;
    }
  });
  addEventListener("popstate", () => { const hasView = new URL(location.href).searchParams.has("view"); hasView ? navigate(R.fromShell(location.href, origin), false) : showHome(false); });
  addEventListener("message", event => { if (event.origin === origin && event.source === frame.contentWindow && event.data?.type === "academy-recruitment-updated") refreshBadgesWithSession(); });
  updateClock(); setInterval(updateClock, 15000); session();
})();
