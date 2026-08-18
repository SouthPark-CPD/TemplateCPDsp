/* ==========================================================
   CPD — NAV.JS
   Génère le header (badge, titre, liens, statut, horloge)
   dans un conteneur unique. Modifier UNE FOIS ici pour que
   le changement s'applique à toutes les pages qui l'incluent.

   UTILISATION dans chaque page HTML :

   1. Dans <head>, ajouter :
        <link rel="stylesheet" href="nav.css">

   2. Dans <body>, tout en haut, remplacer le bloc <header>...</header>
      existant par :
        <div id="site-header"></div>

   3. Juste avant </body> (ou en fin de <head> avec "defer"),
      ajouter, AVANT le <script> propre à la page :

        <script>
          const PAGE_CONFIG = {
            subtitle:"Procédures opérationnels — Manuel CPD", // sous-titre affiché
            currentPage:"index.html",                          // fichier de CETTE page
            docCode:"CPD-TPL-001",                              // code document affiché
            version:"1.0"                                       // version affichée
          };
        </script>
        <script src="nav.js"></script>

========================================================== */


/* ==========================================================
   LISTE DES LIENS DE NAVIGATION
   -> Ajouter / renommer / réordonner ICI, ça se répercute
      automatiquement sur TOUTES les pages qui incluent nav.js
========================================================== */

const NAV_LINKS = [
  { href:"index.html",              label:"🗂 Procédures" },
  { href:"code.html",               label:"📻 Guide radio" },
  { href:"reglement.html",          label:"⚖ Règlement" },
  { href:"divisions.html",          label:"🏛 Divisions" },
  { href:"tenues-vehicules.html",   label:"🎽 Tenues & Véhicules" },
  { href:"organigramme.html",       label:"🧭 Organigramme" },
  {
    href:"https://guidejuridiquesp.netlify.app/",
    label:"📖 Guide juridique ↗",
    gold:true,
    external:true
  }
];



/* ==========================================================
   SVG BADGE (identique sur toutes les pages)
========================================================== */

const STAR_SVG = `
<svg class="star" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">

  <defs>
    <path id="arc-top" d="M 34 100 A 66 66 0 0 1 166 100"/>
    <path id="arc-bottom" d="M 47 128 A 60 60 0 0 0 153 128"/>
    <path id="mini-star" d="M0,-7 L1.76,-2.43 L6.66,-2.16 L2.85,0.93 L4.12,5.66 L0,3 L-4.12,5.66 L-2.85,0.93 L-6.66,-2.16 L-1.76,-2.43 Z"/>
  </defs>

  <path d="M100,4 L123.5,67.6 L191.3,70.3 L138,112.4 L156.4,177.7 L100,140 L43.6,177.7 L62,112.4 L8.7,70.3 L76.5,67.6 Z"
        fill="none" stroke="var(--gold)" stroke-width="2.5" stroke-linejoin="round"/>

  <circle cx="100" cy="100" r="78" fill="#151b23" stroke="var(--gold)" stroke-width="2"/>
  <circle cx="100" cy="100" r="74" fill="none" stroke="var(--gold)" stroke-width="1"/>
  <circle cx="100" cy="100" r="55" fill="#0c1015" stroke="var(--gold)" stroke-width="1.5"/>

  <text font-family="Oswald, sans-serif" font-size="16" font-weight="700" letter-spacing="2" fill="var(--gold)">
    <textPath href="#arc-top" startOffset="50%" text-anchor="middle">CHICAGO</textPath>
  </text>

  <text font-family="Oswald, sans-serif" font-size="16" font-weight="700" letter-spacing="2" fill="var(--gold)">
    <textPath href="#arc-bottom" startOffset="50%" text-anchor="middle">POLICE</textPath>
  </text>

  <use href="#mini-star" transform="translate(27,100) scale(1.1)" fill="var(--gold)"/>
  <use href="#mini-star" transform="translate(173,100) scale(1.1)" fill="var(--gold)"/>
  <use href="#mini-star" transform="translate(100,88) scale(2.4)" fill="var(--gold)" opacity="0.9"/>

  <rect x="64" y="116" width="72" height="17" rx="2" fill="var(--gold)"/>

  <text x="100" y="128" font-family="Oswald, sans-serif" font-size="9.5" font-weight="700"
        letter-spacing="0.5" text-anchor="middle" fill="#0c1015">URBS IN HORTO</text>

</svg>
`;



/* ==========================================================
   RENDU DU HEADER
========================================================== */

function renderSiteHeader(){

  const container =
    document.getElementById("site-header");

  if(!container){
    console.warn("nav.js : aucun élément #site-header trouvé sur cette page.");
    return;
  }

  const config =
    window.PAGE_CONFIG || {};

  const subtitle =
    config.subtitle || "Manuel CPD";

  const currentPage =
    config.currentPage || "";

  const docCode =
    config.docCode || "";

  const version =
    config.version || "";


  const linksHtml =
    NAV_LINKS.map(link => {

      const isCurrent =
        !link.external && link.href === currentPage;

      const classes = [
        "header-link",
        link.gold ? "gold" : "",
        isCurrent ? "current" : ""
      ].filter(Boolean).join(" ");

      const targetAttrs =
        link.external
          ? ` target="_blank" rel="noopener"`
          : "";

      return `<a class="${classes}" href="${link.href}"${targetAttrs}>${link.label}</a>`;

    }).join("");


  container.innerHTML = `

    <header>

      <div class="header-inner">

        <div class="badge-row">

          <div class="badge-left">

            ${STAR_SVG}

            <div>
              <div class="brand-title">Chicago Police Department</div>
              <div class="brand-sub">${subtitle}</div>
            </div>

          </div>

          <div class="header-actions">
            ${linksHtml}
          </div>

        </div>


        <div class="status-line">

          <span><span class="dot"></span> Système opérationnel</span>

          ${docCode ? `<span>DOCUMENT : <b>${docCode}</b></span>` : ""}

          ${version ? `<span>VERSION : <b>${version}</b></span>` : ""}

          <span id="nav-clock">--/--/---- --:--</span>

        </div>

      </div>

    </header>

  `;

}



/* ==========================================================
   HORLOGE PARTAGEE
========================================================== */

function updateNavClock(){

  const el =
    document.getElementById("nav-clock");

  if(!el){
    return;
  }

  const d =
    new Date();

  const pad =
    n => String(n).padStart(2,"0");

  el.textContent =
    `${pad(d.getDate())}/${pad(d.getMonth()+1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;

}



/* ==========================================================
   INIT
========================================================== */

renderSiteHeader();
updateNavClock();
setInterval(updateNavClock, 15000);
