/* Persistent shell; all module scripts and server authorization stay isolated. */
(() => {
  const R = CPDRoutes;
  const origin = location.origin;
  const frame = document.getElementById("module-frame");
  const message = document.getElementById("shell-message");
  const retry = document.getElementById("retry-session");
  const mdtMenu = document.getElementById("mdt-menu");
  const paMenu = document.getElementById("pa-menu");
  const liaisonMenu = document.getElementById("liaison-menu");

  const defaultMdt = [
    ["rapide", "Accès rapide", "grid"],
    ["procedures", "Procédures", "book"],
    ["radio", "Radio", "radio"],
    ["reglement", "Règlement", "list"],
    ["tenues", "Tenues", "users"],
    ["organigramme", "Organigramme", "chart"]
  ];
  const defaultAcademy = [
    ["pa", "Tableau de bord", "grid"],
    ["suivi", "Suivi pédagogique", "chart"],
    ["formations", "Formations", "book"],
    ["recrutements", "Recrutements", "inbox"],
    ["activite", "Historique", "clock"]
  ];
  const defaultLiaison = [
    ["liaison", "Dépôts de plainte", "inbox"],
    ["doj", "Communication DOJ", "radio"],
    ["liaison-gouv", "Liaison gouvernement", "users"],
    ["avocat", "Liaison avocat", "users"]
  ];
  const defaultNavigation = {
    siteTitle: "MDT — Chicago Police Department",
    departmentName: "CHICAGO",
    departmentSubtitle: "POLICE DEPARTMENT",
    guideUrl: "https://guidejuridiquesp.netlify.app/",
    sections: {
      mdt: { label: "MDT", enabled: true, open: true },
      academy: { label: "Police Academy", enabled: true, open: true },
      liaison: { label: "Liaison gouvernement", enabled: true, open: true }
    },
    mdtItems: defaultMdt.map(([key, label, icon], index) => ({ key, label, icon, enabled: true, sortOrder: (index + 1) * 10 })),
    academyItems: defaultAcademy.map(([key, label, icon], index) => ({ key, label, icon, enabled: true, sortOrder: (index + 1) * 10 }))
  };
  const paths = {
    grid: "M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z",
    users: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M16 3a4 4 0 0 1 0 8 M22 21v-2a4 4 0 0 0-3-3.87 M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0",
    chart: "M4 4v16h16 M8 16v-4 M12 16V8 M16 16V5",
    book: "M12 5v16 M12 5C8 2 4 3 2 4v16c4-2 7-1 10 1 3-2 6-3 10-1V4c-4-2-7-1-10 1",
    inbox: "M3 4h18v16H3z M3 13h5l2 3h4l2-3h5",
    clock: "M12 8v5l3 2 M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0",
    radio: "M5 9h14v12H5z M8 3v6 M8 13h8 M8 17h2",
    list: "M8 6h13 M8 12h13 M8 18h13 M3 6h1 M3 12h1 M3 18h1"
  };
  const escapeHtml = value => String(value ?? "").replace(/[&<>'"]/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
  }[char]));
  const icon = key => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[key] || paths.list}"></path></svg>`;

  let mdt = [...defaultMdt];
  let academy = [...defaultAcademy];
  let liaison = [...defaultLiaison];
  let navigation = defaultNavigation;
  let notificationSettings = { showBadges: true, showAcademyBadge: true, showLiaisonBadge: true, refreshSeconds: 15 };
  let authorized = false;
  let ready = false;
  let current = null;
  let loadingTimer;
  let notificationTimer;
  window.CPDUnifiedShell = true;

  function renderLinks(id, items) {
    const target = document.getElementById(id);
    if (!target) return;
    target.innerHTML = items.map(([key, label, keyIcon, url]) => {
      const route = R.resolve(url || R.routes[key], origin);
      if (!route) return "";
      return `<a class="${key === "rapide" ? "nav-mdt-quick" : ""}" href="${escapeHtml(R.shellUrl(route, origin))}" data-view="${escapeHtml(route.view)}">${icon(keyIcon)}<span>${escapeHtml(label)}</span></a>`;
    }).join("");
  }

  function configuredItems(items, fallback) {
    if (!Array.isArray(items) || !items.length) return [...fallback];
    return items
      .filter(item => item && item.enabled !== false && typeof item.key === "string")
      .slice()
      .sort((a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0))
      .map(item => [item.key, item.label || item.key, item.icon || "list"]);
  }

  function updateSection(element, key, fallbackLabel) {
    if (!element) return;
    const setting = navigation.sections?.[key] || {};
    const summary = element.querySelector("summary");
    if (summary?.firstChild) summary.firstChild.nodeValue = `${setting.label || fallbackLabel} `;
    element.hidden = setting.enabled === false || (key === "academy" && !authorized);
    element.open = setting.open !== false;
  }

  function applyNavigation() {
    const safeNavigation = navigation || defaultNavigation;
    document.title = safeNavigation.siteTitle || defaultNavigation.siteTitle;
    const departmentName = document.getElementById("department-name");
    const departmentSubtitle = document.getElementById("department-subtitle");
    if (departmentName) departmentName.textContent = safeNavigation.departmentName || defaultNavigation.departmentName;
    if (departmentSubtitle) departmentSubtitle.textContent = safeNavigation.departmentSubtitle || defaultNavigation.departmentSubtitle;
    const guide = document.querySelector('.nav-footer a[data-guide-link]');
    if (guide && safeNavigation.guideUrl) guide.href = safeNavigation.guideUrl;

    updateSection(mdtMenu, "mdt", "MDT");
    updateSection(paMenu, "academy", "Police Academy");
    updateSection(liaisonMenu, "liaison", "Liaison gouvernement");
    mdt = configuredItems(safeNavigation.mdtItems, defaultMdt);
    academy = configuredItems(safeNavigation.academyItems, defaultAcademy);
    renderLinks("mdt-links", mdt);
    renderLinks("pa-links", authorized ? academy : []);
    renderLinks("liaison-links", liaison);
  }

  function applyNotificationSettings(value) {
    notificationSettings = {
      showBadges: value?.showBadges !== false,
      showAcademyBadge: value?.showAcademyBadge !== false,
      showLiaisonBadge: value?.showLiaisonBadge !== false,
      refreshSeconds: Math.min(120, Math.max(5, Number(value?.refreshSeconds) || 15))
    };
    const academyBadge = document.getElementById("pa-count");
    const liaisonBadge = document.getElementById("liaison-count");
    if (!notificationSettings.showBadges || !notificationSettings.showAcademyBadge) {
      if (academyBadge) academyBadge.hidden = true;
    }
    if (!notificationSettings.showBadges || !notificationSettings.showLiaisonBadge) {
      if (liaisonBadge) liaisonBadge.hidden = true;
    }
    scheduleNotifications();
  }

  async function loadLiaisonMenu() {
    try {
      const response = await fetch("/api/liaison/complaints?configuration=1", { credentials: "same-origin", cache: "no-store" });
      const data = await response.json();
      if (!response.ok || !data?.liaison?.channels) return;
      navigation = data.liaison.navigation || defaultNavigation;
      applyNotificationSettings(data.liaison.notifications);
      liaison = data.liaison.channels.map(item => {
        if (item.type === "forum") return ["liaison", item.label, item.icon || "inbox", "/mdt/liaison.html"];
        const legacy = { doj: "doj", government: "liaison-gouv", lawyer: "avocat" }[item.key];
        const view = legacy || `channel:${item.key}`;
        const url = legacy ? R.routes[legacy] : `/mdt/channel.html?channelKey=${encodeURIComponent(item.key)}`;
        return [view, item.label, item.icon || "users", url];
      });
      applyNavigation();
    } catch {
      applyNavigation();
    }
  }

  const navToggle = document.getElementById("nav-toggle");
  navToggle.addEventListener("click", () => {
    const collapsed = document.body.classList.toggle("nav-collapsed");
    navToggle.setAttribute("aria-expanded", String(!collapsed));
    navToggle.setAttribute("aria-label", collapsed ? "Afficher le menu" : "Réduire le menu");
  });

  function refreshBadge() {
    const badge = document.getElementById("pa-count");
    if (!authorized || !notificationSettings.showBadges || !notificationSettings.showAcademyBadge) {
      if (badge) badge.hidden = true;
      return;
    }
    fetch("/api/auth/session", { credentials: "same-origin", cache: "no-store" })
      .then(response => response.ok ? response.json() : null)
      .then(data => {
        if (!badge || !data?.academyAccess) return;
        const count = Number(data.academySummary?.newCount || 0);
        badge.textContent = String(count);
        badge.hidden = count <= 0;
      }).catch(() => {});
  }

  function refreshLiaisonBadge() {
    const badge = document.getElementById("liaison-count");
    if (!notificationSettings.showBadges || !notificationSettings.showLiaisonBadge) {
      if (badge) badge.hidden = true;
      return;
    }
    fetch("/api/liaison/complaints", { credentials: "same-origin", cache: "no-store" })
      .then(response => response.ok ? response.json() : null)
      .then(data => {
        if (!badge || !data?.threads) return;
        const seen = JSON.parse(localStorage.getItem("liaisonSeen") || "{}");
        if (localStorage.getItem("liaisonBaseline") !== "1") {
          data.threads.forEach(thread => { if (thread.lastMessageId) seen[thread.id] = thread.lastMessageId; });
          localStorage.setItem("liaisonSeen", JSON.stringify(seen));
          localStorage.setItem("liaisonBaseline", "1");
        }
        const count = data.threads.filter(thread => thread.lastMessageId && seen[thread.id] !== thread.lastMessageId).length;
        badge.textContent = String(count);
        badge.hidden = count <= 0;
      }).catch(() => {});
  }

  function scheduleNotifications() {
    clearInterval(notificationTimer);
    notificationTimer = setInterval(() => {
      refreshBadge();
      refreshLiaisonBadge();
    }, notificationSettings.refreshSeconds * 1000);
  }

  function displayRoute(route) {
    current = route;
    const item = [...mdt, ...liaison, ...academy].find(entry => entry[0] === route.view);
    const title = item?.[1] || (route.view === "dossier" ? "Dossier agent" : "Sessions de formation");
    document.getElementById("view-title").textContent = title;
    frame.title = title;
    const inAcademy = academy.some(entry => entry[0] === route.view);
    const inLiaison = liaison.some(entry => entry[0] === route.view);
    document.getElementById("section-name").textContent = inAcademy
      ? (navigation.sections?.academy?.label || "Police Academy")
      : (inLiaison ? (navigation.sections?.liaison?.label || "Liaison gouvernement") : (navigation.sections?.mdt?.label || "MDT"));
    document.querySelectorAll("[data-view]").forEach(link => {
      if (link.dataset.view === route.view || (route.view === "dossier" && link.dataset.view === "agents")) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
    if (mdt.some(entry => entry[0] === route.view)) mdtMenu.open = true;
    if (inAcademy) paMenu.open = true;
    if (inLiaison) liaisonMenu.open = true;
  }

  function navigate(route, push = true) {
    if (!ready || !route) return;
    if (route.academy && !authorized) {
      message.textContent = "L’accès à la Police Academy est réservé aux instructeurs.";
      message.hidden = false;
      return;
    }
    if (push) history.pushState(null, "", R.shellUrl(route, origin));
    displayRoute(route);
    frame.hidden = false;
    message.hidden = false;
    message.textContent = "Chargement…";
    retry.hidden = true;
    clearTimeout(loadingTimer);
    loadingTimer = setTimeout(() => {
      message.textContent = "Le chargement prend plus de temps que prévu.";
      retry.hidden = false;
    }, 15000);
    frame.src = route.url;
  }

  document.querySelector(".unified-nav").addEventListener("click", event => {
    const link = event.target.closest("a[data-view]");
    if (!link || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    navigate(R.fromShell(link.href, origin) || R.resolve(R.routes[link.dataset.view], origin));
  });

  frame.addEventListener("load", () => {
    clearTimeout(loadingTimer);
    try {
      const childWindow = frame.contentWindow;
      const childDocument = frame.contentDocument;
      const url = new URL(childWindow.location.href);
      if (url.href === "about:blank") return;
      if (url.origin !== origin) {
        message.textContent = "Impossible d’afficher cette page.";
        message.hidden = false;
        return;
      }
      if (url.pathname.startsWith("/auth/") || url.pathname.startsWith("/academy-auth/")) {
        if (url.pathname.includes("denied")) {
          frame.hidden = true;
          message.textContent = "Accès refusé à cette rubrique.";
          message.hidden = false;
          return;
        }
        location.replace(url.pathname + url.search);
        return;
      }
      if (url.pathname === "/") {
        location.replace("/");
        return;
      }
      const route = R.resolve(url.href, origin);
      if (!route) {
        message.textContent = "Cette rubrique est indisponible.";
        message.hidden = false;
        retry.hidden = false;
        return;
      }
      displayRoute(route);
      history.replaceState(null, "", R.shellUrl(route, origin));
      message.hidden = true;
      retry.hidden = true;
      childDocument.addEventListener("click", event => {
        const link = event.target.closest("a[href]");
        if (!link || event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || link.hasAttribute("download")) return;
        const destination = new URL(link.href, childWindow.location.href);
        if (destination.origin !== origin) return;
        if (destination.pathname === url.pathname && destination.search === url.search && destination.hash) return;
        let target = R.resolve(destination.href, origin);
        if (destination.pathname === "/mdt/index.html" || destination.pathname === "/mdt/" || destination.pathname === "/mdt/portail.html") target = R.fromShell(destination.href, origin);
        if (target) {
          event.preventDefault();
          navigate(target);
        } else if (destination.pathname.includes("/logout")) {
          event.preventDefault();
          location.assign(destination.pathname);
        }
      });
    } catch {
      message.textContent = "Impossible de charger la rubrique. Réessayez.";
      message.hidden = false;
      retry.hidden = false;
    }
  });

  async function session() {
    retry.disabled = true;
    try {
      const response = await fetch("/api/auth/session", { credentials: "same-origin", cache: "no-store" });
      if (response.status === 401) {
        location.replace("/auth/login.html?error=login_required");
        return;
      }
      if (!response.ok) throw new Error("session");
      const data = await response.json();
      if (!data.authenticated) throw new Error("session");
      const adminLink = document.getElementById("admin-link");
      if (adminLink) adminLink.hidden = data.controlPanelAdmin !== true;
      authorized = data.academyAccess === true;
      ready = true;
      paMenu.hidden = !authorized;
      await loadLiaisonMenu();
      applyNavigation();
      if (authorized) {
        const count = Number(data.academySummary?.newCount || 0);
        const badge = document.getElementById("pa-count");
        if (badge) {
          badge.textContent = String(count);
          badge.hidden = count <= 0 || !notificationSettings.showBadges || !notificationSettings.showAcademyBadge;
        }
        refreshBadge();
      } else {
        document.getElementById("pa-links")?.replaceChildren();
      }
      document.getElementById("agent-name").textContent = data.user?.globalName || data.user?.username || "Agent CPD";
      let route = R.fromShell(location.href, origin);
      if (route?.academy && (!authorized || navigation.sections?.academy?.enabled === false)) {
        route = R.resolve(R.routes.procedures, origin);
        history.replaceState(null, "", R.shellUrl(route, origin));
      }
      refreshLiaisonBadge();
      navigate(route, false);
    } catch {
      message.textContent = "Impossible de vérifier vos accès. Réessayez.";
      message.hidden = false;
      retry.hidden = false;
    } finally {
      retry.disabled = false;
    }
  }

  retry.addEventListener("click", () => ready && current ? navigate(current, false) : session());
  addEventListener("message", event => {
    if (event.origin !== origin) return;
    if (event.data?.type === "academy-recruitment-updated") refreshBadge();
    if (event.data?.type === "liaison-updated") refreshLiaisonBadge();
  });
  addEventListener("popstate", () => navigate(R.fromShell(location.href, origin), false));
  applyNavigation();
  scheduleNotifications();
  session();
})();
