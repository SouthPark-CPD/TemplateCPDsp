/* ==========================================================
   CPD — NAV.JS

   Génère automatiquement le header CPD dans :

      <div id="site-header"></div>

   Chaque page doit définir PAGE_CONFIG avant de charger
   nav-v5.js :

      <script>
        const PAGE_CONFIG = {
          subtitle:"Guide radio — Codes & procédures de communication",
          currentPage:"code.html",
          docCode:"CPD-RAD-001",
          version:"1.0"
        };
      </script>

      <script src="nav-v5.js"></script>

========================================================== */


/* ==========================================================
   LIENS DE NAVIGATION
========================================================== */

const NAV_LINKS = [

  {
    href:"index.html",
    label:"Procédures"
  },

  {
    href:"code.html",
    label:"Guide radio"
  },

  {
    href:"reglement.html",
    label:"Règlement"
  },

  {
    href:"tenues-vehicules.html",
    label:"Tenues"
  },

  {
    href:"organigramme.html",
    label:"Organigramme"
  },

  {
    href:"acces-rapide.html",
    label:"Accès rapide",
    gold:true,
    quick:true
  },
   
  {
    href:"https://guidejuridiquesp.netlify.app/",
    label:"Guide juridique ↗",
    gold:true,
    external:true
  },

  {
    href:"portail.html",
    label:"Portail agent"
  },

  {
    href:"/api/auth/logout",
    label:"Déconnexion",
    logout:true
  }

];


const BRAND_MARKUP = `
  <img
    class="star"
    src="images/Seal_of_the_Chicago_Police_Department.png"
    alt="Sceau du Chicago Police Department">
`;



/* ==========================================================
   SVG BADGE CPD — version adoucie

   Traits arrondis (linejoin round déjà présent), fonds
   repris sur la même palette marine que le header (au lieu
   du noir pur), bandeau "URBS IN HORTO" en pilule plutôt
   qu'en rectangle dur.
========================================================== */

const STAR_SVG = `

<svg
  class="star"
  viewBox="0 0 200 200"
  xmlns="http://www.w3.org/2000/svg">

  <defs>

    <path
      id="arc-top"
      d="M 34 100 A 66 66 0 0 1 166 100"/>

    <path
      id="arc-bottom"
      d="M 47 128 A 60 60 0 0 0 153 128"/>

    <path
      id="mini-star"
      d="M0,-7 L1.76,-2.43 L6.66,-2.16 L2.85,0.93 L4.12,5.66 L0,3 L-4.12,5.66 L-2.85,0.93 L-6.66,-2.16 L-1.76,-2.43 Z"/>

  </defs>


  <path
    d="M100,4 L123.5,67.6 L191.3,70.3 L138,112.4 L156.4,177.7 L100,140 L43.6,177.7 L62,112.4 L8.7,70.3 L76.5,67.6 Z"
    fill="none"
    stroke="var(--gold)"
    stroke-width="2.5"
    stroke-linejoin="round"
    stroke-linecap="round"/>


  <circle
    cx="100"
    cy="100"
    r="78"
    fill="var(--navy-2, #182338)"
    stroke="var(--gold)"
    stroke-width="2"/>


  <circle
    cx="100"
    cy="100"
    r="74"
    fill="none"
    stroke="var(--gold)"
    stroke-width="1"
    opacity="0.7"/>


  <circle
    cx="100"
    cy="100"
    r="55"
    fill="var(--navy-1, #0f1621)"
    stroke="var(--gold)"
    stroke-width="1.5"/>


  <text
    font-family="Oswald, sans-serif"
    font-size="16"
    font-weight="600"
    letter-spacing="2"
    fill="var(--gold)">

    <textPath
      href="#arc-top"
      startOffset="50%"
      text-anchor="middle">

      CHICAGO

    </textPath>

  </text>


  <text
    font-family="Oswald, sans-serif"
    font-size="16"
    font-weight="600"
    letter-spacing="2"
    fill="var(--gold)">

    <textPath
      href="#arc-bottom"
      startOffset="50%"
      text-anchor="middle">

      POLICE

    </textPath>

  </text>


  <use
    href="#mini-star"
    transform="translate(27,100) scale(1.1)"
    fill="var(--gold)"/>


  <use
    href="#mini-star"
    transform="translate(173,100) scale(1.1)"
    fill="var(--gold)"/>


  <use
    href="#mini-star"
    transform="translate(100,88) scale(2.4)"
    fill="var(--gold)"
    opacity="0.9"/>


  <rect
    x="62"
    y="115"
    width="76"
    height="19"
    rx="9.5"
    fill="var(--gold)"/>


  <text
    x="100"
    y="128"
    font-family="'IBM Plex Sans', sans-serif"
    font-size="9"
    font-weight="600"
    letter-spacing="0.5"
    text-anchor="middle"
    fill="var(--navy-1, #0f1621)">

    URBS IN HORTO

  </text>

</svg>

`;



/* ==========================================================
   NETTOYAGE DU NOM DE FICHIER
========================================================== */

function cleanFileName(value){

  if(!value){

    return "";

  }


  return value

    .split("/")

    .pop()

    .split("?")[0]

    .split("#")[0]

    .toLowerCase();

}



/* ==========================================================
   DÉTECTION DE LA PAGE ACTUELLE
========================================================== */

function getCurrentPage(){

  let pathname =
    window.location.pathname;


  let currentFile =
    pathname.split("/").pop();


  /*
     Si le navigateur ne retourne aucun nom de fichier,
     on considère que nous sommes sur index.html.
  */

  if(!currentFile){

    currentFile =
      "index.html";

  }


  return cleanFileName(currentFile);

}



/* ==========================================================
   RENDU DU HEADER
========================================================== */

function renderSiteHeader(){

  if(!document.querySelector('link[data-tablet-ui="mdt"]')){
    const tabletStyles = document.createElement("link");
    tabletStyles.rel = "stylesheet";
    tabletStyles.href = "tablet-app.css?v=2";
    tabletStyles.dataset.tabletUi = "mdt";
    document.head.appendChild(tabletStyles);
  }

  const container =
    document.getElementById("site-header");


  if(!container){

    console.warn(
      "nav-v5.js : #site-header est introuvable."
    );

    return;

  }


  /*
     Récupération de la configuration de la page.
  */

  const config =
    window.PAGE_CONFIG || {};



  /*
     Sous-titre.
  */

  const subtitle =
    config.subtitle ||
    "Manuel CPD";



  /*
     Page configurée.

     Si currentPage est présent dans PAGE_CONFIG,
     il est utilisé.

     Sinon, nav-v5.js détecte automatiquement
     le fichier ouvert.
  */

  const currentPage =

    config.currentPage

      ? cleanFileName(config.currentPage)

      : getCurrentPage();



  /*
     Informations documentaires.
  */

  const docCode =
    config.docCode || "";


  const version =
    config.version || "";



  /* ========================================================
     GÉNÉRATION DES LIENS
  ======================================================== */

  const linksHtml =

    NAV_LINKS

      .map(link => {


        /*
           Nettoyage du href pour comparer
           correctement les fichiers locaux.
        */

        const linkFile =
          cleanFileName(link.href);



        /*
           Un lien externe ne peut jamais être
           considéré comme la page active.
        */

        const isCurrent =

          !link.external &&

          linkFile === currentPage;



        /*
           Classes CSS.
        */

        const classes = [

          "header-link",

          link.gold
            ? "gold"
            : "",

          link.logout
            ? "logout"
            : "",

          link.quick
            ? "quick"
            : "",

          isCurrent
            ? "current"
            : ""

        ]

        .filter(Boolean)

        .join(" ");



        /*
           Attributs des liens externes.
        */

        const targetAttrs =

          link.external

            ? ` target="_blank" rel="noopener"`

            : "";



        return `

          <a
            class="${classes}"
            href="${link.href}"${targetAttrs}>

            ${link.label}

          </a>

        `;

      })

      .join("");



  /* ========================================================
     CONSTRUCTION DU HEADER
  ======================================================== */

  container.innerHTML = `
    <header class="mdt-header">
      <div class="mdt-header-main">
        <a class="header-brand" href="index.html" aria-label="Accueil du MDT">
          ${BRAND_MARKUP}
          <span class="header-brand-copy">
            <strong>Chicago Police Department</strong>
            <small>Mobile Data Terminal</small>
          </span>
        </a>

        <button
          class="nav-toggle"
          type="button"
          aria-expanded="false"
          aria-controls="mdt-navigation"
          aria-label="Ouvrir la navigation">
          <span class="nav-toggle-label">Menu</span>
          <span class="nav-toggle-icon" aria-hidden="true"></span>
        </button>

        <nav class="header-actions" id="mdt-navigation" aria-label="Navigation principale">
          ${linksHtml}
        </nav>
      </div>

      <div class="mdt-system-strip">
        <span><i aria-hidden="true"></i> CPD Secure</span>
        <span id="nav-clock"></span>
      </div>

    </header>

    <button class="nav-overlay" type="button" aria-label="Fermer la navigation"></button>
  `;

  document.body.classList.add("mdt-ui");

  const toggle = container.querySelector(".nav-toggle");
  const navigation = container.querySelector(".header-actions");
  const overlay = container.querySelector(".nav-overlay");

  const setNavigationState = isOpen => {
    toggle?.setAttribute("aria-expanded", String(isOpen));
    navigation?.classList.toggle("open", isOpen);
    overlay?.classList.toggle("open", isOpen);
    document.body.classList.toggle("nav-open", isOpen);
  };

  toggle?.addEventListener("click", () => {
    setNavigationState(toggle.getAttribute("aria-expanded") !== "true");
  });

  overlay?.addEventListener("click", () => setNavigationState(false));
  container.querySelectorAll(".header-link").forEach(link => {
    link.addEventListener("click", () => setNavigationState(false));
  });
  document.addEventListener("keydown", event => {
    if(event.key === "Escape") setNavigationState(false);
  });

}



/* ==========================================================
   HORLOGE
========================================================== */

function updateNavClock(){

  const clock =
    document.getElementById("nav-clock");


  if(!clock){

    return;

  }


  const now =
    new Date();


  const pad =
    number =>
      String(number).padStart(2,"0");


  clock.textContent =

    `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}`;

}



/* ==========================================================
   INITIALISATION
========================================================== */

renderSiteHeader();

updateNavClock();


setInterval(
  updateNavClock,
  15000
);

/* ==========================================================
   CPD COMMAND — SHELL TABLETTE
   Transforme les pages documentaires en application NUI.
========================================================== */

const COMMAND_ICONS = {
  "index.html":"⌂",
  "code.html":"⌁",
  "reglement.html":"≡",
  "tenues-vehicules.html":"♙",
  "organigramme.html":"⌘",
  "acces-rapide.html":"⚡",
  "portail.html":"◎"
};

function buildCommandShell(){
  if(document.querySelector(".command-app")) return;

  const config = window.PAGE_CONFIG || {};
  const currentPage = config.currentPage ? cleanFileName(config.currentPage) : getCurrentPage();
  const legacyHeader = document.getElementById("site-header");
  const search = document.body.querySelector(":scope > .search-container");
  const categories = document.body.querySelector(":scope > #categories");
  const main = document.body.querySelector(":scope > main");
  const quickAccess = document.body.querySelector(":scope > .qr-wrap");
  const footer = document.body.querySelector(":scope > footer");

  const app = document.createElement("div");
  app.className = "command-app";
  app.innerHTML = `
    <div class="command-statusbar">
      <span id="command-clock">--:--</span>
      <span class="command-status-center">CPD COMMAND <i></i> RÉSEAU SÉCURISÉ</span>
      <span class="command-device-status"><b>▮▮▮</b><b>⌁</b><em>100</em></span>
    </div>
    <header class="command-topbar">
      <div class="command-brand">
        ${BRAND_MARKUP}
        <div><strong>Chicago Police Department</strong><span>Command · Mobile Data Terminal</span></div>
      </div>
      <div class="command-page-identity">
        <small>${escapeCommandText(config.docCode || "CPD · INTERNE")}</small>
        <strong>${escapeCommandText(commandPageTitle(currentPage))}</strong>
      </div>
      <div class="command-user">
        <div><span>Session active</span><strong id="command-user-name">Agent CPD</strong></div>
        <span class="command-avatar" id="command-avatar">CPD</span>
      </div>
    </header>
    <div class="command-layout">
      <aside class="command-sidebar">
        <nav class="command-nav" aria-label="Modules du MDT">
          ${NAV_LINKS.filter(link => !link.logout && !link.external).map(link => {
            const file = cleanFileName(link.href);
            const active = file === currentPage ? " active" : "";
            return `<a class="command-nav-item${active}${link.quick ? " quick" : ""}" href="${link.href}"><i>${COMMAND_ICONS[file] || "•"}</i><span>${escapeCommandText(link.label)}</span>${link.quick ? "<b>PRIORITÉ</b>" : ""}</a>`;
          }).join("")}
        </nav>
        <div class="command-sidebar-footer">
          <a href="https://guidejuridiquesp.netlify.app/" target="_blank" rel="noopener"><i>↗</i><span>Guide juridique</span></a>
          <a class="danger" href="/api/auth/logout"><i>↪</i><span>Déconnexion</span></a>
        </div>
      </aside>
      <section class="command-workspace">
        <header class="command-toolbar">
          <div><small>ESPACE DE TRAVAIL</small><h1>${escapeCommandText(commandPageTitle(currentPage))}</h1></div>
          <div class="command-toolbar-slot"></div>
        </header>
        <div class="command-subnav"></div>
        <div class="command-content"></div>
      </section>
    </div>`;

  document.body.insertBefore(app, document.body.firstChild);
  legacyHeader?.setAttribute("hidden", "");
  footer?.setAttribute("hidden", "");

  const toolbarSlot = app.querySelector(".command-toolbar-slot");
  const subnav = app.querySelector(".command-subnav");
  const content = app.querySelector(".command-content");
  if(search) toolbarSlot.appendChild(search);
  if(categories) subnav.appendChild(categories);
  else subnav.hidden = true;
  if(main) content.appendChild(main);
  else if(quickAccess) content.appendChild(quickAccess);

  const tick = () => {
    const now = new Date();
    const node = document.getElementById("command-clock");
    if(node) node.textContent = `${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`;
  };
  tick();
  setInterval(tick,15000);

  fetch("/api/auth/session",{credentials:"same-origin",cache:"no-store"})
    .then(response => response.ok ? response.json() : null)
    .then(data => {
      const name = data?.user?.globalName || data?.user?.username;
      if(!name) return;
      const nameNode = document.getElementById("command-user-name");
      const avatarNode = document.getElementById("command-avatar");
      if(nameNode) nameNode.textContent = name;
      if(avatarNode) avatarNode.textContent = name.split(/\s+/).slice(0,2).map(part => part[0]).join("").toUpperCase();
    }).catch(()=>{});
}

function commandPageTitle(page){
  return ({
    "index.html":"Procédures",
    "code.html":"Communications radio",
    "reglement.html":"Règlement intérieur",
    "tenues-vehicules.html":"Tenues réglementaires",
    "organigramme.html":"Organisation du CPD",
    "acces-rapide.html":"Accès rapide",
    "portail.html":"Portail agent"
  })[page] || "Mobile Data Terminal";
}

function escapeCommandText(value){
  return String(value ?? "").replace(/[&<>'"]/g, character => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"})[character]);
}

if(document.readyState === "loading") document.addEventListener("DOMContentLoaded",buildCommandShell);
else buildCommandShell();
