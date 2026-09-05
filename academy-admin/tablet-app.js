(function () {
  const path = location.pathname.toLowerCase();
  const page = path.endsWith("dossier.html") ? "effectifs" : path.includes("effectifs") ? "effectifs" : path.includes("evaluations") ? "formation" : path.includes("recrutements") ? "recrutement" : path.includes("activite") ? "activite" : "dashboard";
  const pageMeta = {
    dashboard:["Centre de formation","Tableau de bord"], effectifs:["Suivi pédagogique","Effectifs"],
    formation:["Centre pédagogique","Formations"], recrutement:["Admission Academy","Nouvelles recrues"],
    activite:["Traçabilité","Activité" ]
  };
  const nav = [
    ["dashboard","⌂","Tableau de bord","/academy-admin/"],
    ["effectifs","♙","Effectifs","/academy-admin/effectifs.html"],
    ["formation","◇","Formations","/academy-admin/evaluations.html"],
    ["recrutement","✦","Nouvelles recrues","/academy-admin/recrutements.html"],
    ["activite","≡","Activité","/academy-admin/activite.html"]
  ];
  const pad = value => String(value).padStart(2,"0");
  const escapeHtml = value => String(value ?? "").replace(/[&<>'"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"})[c]);

  function buildShell(){
    if(document.querySelector(".academy-command-app")) return;
    const legacyHeader = document.body.querySelector(":scope > .topbar");
    const main = document.body.querySelector(":scope > main");
    if(!main) return;
    legacyHeader?.setAttribute("hidden","");

    const app = document.createElement("div");
    app.className = "academy-command-app";
    app.innerHTML = `
      <div class="academy-statusbar"><span id="academy-command-clock">--:--</span><span>POLICE ACADEMY <i></i> SYNCHRONISÉ</span><span><b>▮▮▮</b><b>⌁</b><em>100</em></span></div>
      <header class="academy-command-topbar">
        <div class="academy-command-brand"><img src="../assets/cpd-seal.png" alt=""><div><strong>Police Academy</strong><span>Training Command</span></div></div>
        <div class="academy-command-context"><small>${escapeHtml(pageMeta[page][0])}</small><strong>${escapeHtml(pageMeta[page][1])}</strong></div>
        <div class="academy-command-user"><div><span>Instructeur en service</span><strong id="academy-command-user-name">Instructeur</strong></div><span id="academy-command-avatar">PA</span></div>
      </header>
      <div class="academy-command-layout">
        <aside class="academy-command-sidebar">
          <nav>${nav.map(([id,icon,label,href]) => `<a class="${id === page ? "active" : ""}" href="${href}"><i>${icon}</i><span>${label}</span>${id === "recrutement" ? "<b>PA</b>" : ""}</a>`).join("")}</nav>
          <div class="academy-command-tools"><a href="/mdt/index.html"><i>↗</i><span>Ouvrir le MDT</span></a><a class="danger" href="/api/academy-admin-auth/logout"><i>↪</i><span>Déconnexion</span></a></div>
        </aside>
        <section class="academy-command-workspace">
          <header class="academy-command-toolbar"><div><small>${escapeHtml(pageMeta[page][0])}</small><h1>${escapeHtml(pageMeta[page][1])}</h1></div><div class="academy-live"><i></i><span>Données en direct</span></div></header>
          <div class="academy-command-content"></div>
        </section>
      </div>`;
    document.body.insertBefore(app,document.body.firstChild);
    app.querySelector(".academy-command-content").appendChild(main);

    const updateClock = () => {
      const now = new Date();
      const clock = document.querySelector("#academy-command-clock");
      if(clock) clock.textContent = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
    };
    updateClock(); setInterval(updateClock,15000);
    fetch("/api/academy-admin-auth/session",{credentials:"same-origin",cache:"no-store"})
      .then(r => r.ok ? r.json() : null).then(data => {
        const name = data?.user?.globalName || data?.user?.username;
        if(!name) return;
        document.querySelector("#academy-command-user-name").textContent = name;
        document.querySelector("#academy-command-avatar").textContent = name.split(/\s+/).slice(0,2).map(part => part[0]).join("").toUpperCase();
      }).catch(()=>{});
    enhanceDossier(main);
  }

  function enhanceDossier(main){
    const dossier = main.querySelector("#dossier-content");
    if(!dossier) return;
    const hero = dossier.querySelector(".agent-hero"), pathPanel = dossier.querySelector(".path-panel"), workspace = dossier.querySelector(".workspace-grid");
    const filePanel = dossier.querySelector(".file-panel"), trainingPanel = dossier.querySelector(".training-panel");
    const history = dossier.querySelector(".history-panel"), archives = dossier.querySelector(".archive-panel");
    if(!hero || !workspace) return;
    const tabs = document.createElement("nav");
    tabs.className = "academy-view-tabs";
    tabs.innerHTML = '<button class="active" type="button" data-view="profile">Synthèse</button><button type="button" data-view="training">Nouvelle formation</button><button type="button" data-view="history">Historique</button>';
    hero.after(tabs);
    const select = view => {
      tabs.querySelectorAll("button").forEach(b => b.classList.toggle("active",b.dataset.view === view));
      pathPanel?.classList.toggle("app-hidden",view !== "profile"); filePanel?.classList.toggle("app-hidden",view !== "profile");
      trainingPanel?.classList.toggle("app-hidden",view !== "training"); history?.classList.toggle("app-hidden",view !== "history");
      archives?.classList.toggle("app-hidden",view !== "history"); workspace.classList.toggle("app-hidden",view === "history");
    };
    tabs.addEventListener("click",event => { const button=event.target.closest("[data-view]"); if(button) select(button.dataset.view); });
    document.addEventListener("click",event => { if(event.target.closest('[data-action="edit"],#agent-training-link')) select("training"); },true);
    select("profile");
  }

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded",buildShell); else buildShell();
})();
