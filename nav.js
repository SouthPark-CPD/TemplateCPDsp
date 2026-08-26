/* ==========================================================
   CPD — NAV.JS
   Génère le header (badge, titre, liens, statut, horloge)
   dans un conteneur unique.

   UTILISATION dans chaque page HTML :

   1. Dans <head> :
        <link rel="stylesheet" href="nav.css">

   2. Dans <body>, remplacer l'ancien header par :
        <div id="site-header"></div>

   3. Avant le script propre à la page :

        <script>
          const PAGE_CONFIG = {
            subtitle:"Procédures opérationnelles — Manuel CPD",
            currentPage:"index.html",
            docCode:"CPD-TPL-001",
            version:"1.0"
          };
        </script>

        <script src="nav.js"></script>

========================================================== */


/* ==========================================================
   LISTE DES LIENS DE NAVIGATION
========================================================== */

const NAV_LINKS = [

  {
    href:"index.html",
    label:"🗂 Procédures"
  },

  {
    href:"acces-rapide.html",
    label:"⚡ Accès rapide",
    gold:true
  },

  {
    href:"code.html",
    label:"📻 Guide radio"
  },

  {
    href:"reglement.html",
    label:"⚖ Règlement"
  },

  {
    href:"divisions.html",
    label:"🏛 Divisions"
  },

  {
    href:"tenues-vehicules.html",
    label:"🎽 Tenues & Véhicules"
  },

  {
    href:"organigramme.html",
    label:"🧭 Organigramme"
  },

  {
    href:"https://guidejuridiquesp.netlify.app/",
    label:"📖 Guide juridique ↗",
    gold:true,
    external:true
  }

];



/* ==========================================================
   SVG BADGE
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
    stroke-linejoin="round"/>


  <circle
    cx="100"
    cy="100"
    r="78"
    fill="#151b23"
    stroke="var(--gold)"
    stroke-width="2"/>


  <circle
    cx="100"
    cy="100"
    r="74"
    fill="none"
    stroke="var(--gold)"
    stroke-width="1"/>


  <circle
    cx="100"
    cy="100"
    r="55"
    fill="#0c1015"
    stroke="var(--gold)"
    stroke-width="1.5"/>


  <text
    font-family="Oswald, sans-serif"
    font-size="16"
    font-weight="700"
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
    font-weight="700"
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
    x="64"
    y="116"
    width="72"
    height="17"
    rx="2"
    fill="var(--gold)"/>


  <text
    x="100"
    y="128"
    font-family="Oswald, sans-serif"
    font-size="9.5"
    font-weight="700"
    letter-spacing="0.5"
    text-anchor="middle"
    fill="#0c1015">

    URBS IN HORTO

  </text>

</svg>

`;



/* ==========================================================
   DÉTECTION DE LA PAGE ACTUELLE
========================================================== */

function getCurrentPage(){

  const path =
    window.location.pathname;

  let currentFile =
    path.split("/").pop();


  /*
     Si aucune page n'est précisée dans l'URL,
     on considère qu'il s'agit de index.html.
  */

  if(!currentFile){

    currentFile =
      "index.html";

  }


  /*
     Retire éventuellement les paramètres
     présents dans l'URL.
  */

  currentFile =
    currentFile.split("?")[0];


  /*
     Retire éventuellement une ancre.
  */

  currentFile =
    currentFile.split("#")[0];


  return currentFile;

}



/* ==========================================================
   RENDU DU HEADER
========================================================== */

function renderSiteHeader(){

  const container =
    document.getElementById("site-header");


  if(!container){

    console.warn(
      "nav.js : aucun élément #site-header trouvé sur cette page."
    );

    return;

  }


  const config =
    window.PAGE_CONFIG || {};


  const subtitle =
    config.subtitle ||
    "Manuel CPD";


  /*
     PAGE_CONFIG.currentPage est prioritaire.

     Si currentPage n'est pas renseigné,
     nav.js détecte automatiquement le fichier
     actuellement ouvert dans le navigateur.
  */

  const currentPage =
    config.currentPage
      ? config.currentPage.split("/").pop().split("?")[0].split("#")[0]
      : getCurrentPage();


  const docCode =
    config.docCode || "";


  const version =
    config.version || "";



  /* ========================================================
     GÉNÉRATION DES LIENS
  ======================================================== */

  const linksHtml =

    NAV_LINKS.map(link => {


      /*
         Les liens externes ne peuvent jamais
         être considérés comme la page actuelle.
      */

      const isCurrent =

        !link.external &&

        link.href
          .split("/")
          .pop()
          .split("?")[0]
          .split("#")[0]
          === currentPage;



      /*
         Construction des classes CSS
      */

      const classes = [

        "header-link",

        link.gold
          ? "gold"
          : "",

        isCurrent
          ? "current"
          : ""

      ]

      .filter(Boolean)
      .join(" ");



      /*
         Attributs pour les liens externes
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
     INSERTION DU HEADER
  ======================================================== */

  container.innerHTML = `

    <header>

      <div class="header-inner">

        <div class="badge-row">


          <!-- BADGE + TITRE -->

          <div class="badge-left">

            ${STAR_SVG}

            <div>

              <div class="brand-title">

                Chicago Police Department

              </div>


              <div class="brand-sub">

                ${subtitle}

              </div>

            </div>

          </div>



          <!-- NAVIGATION -->

          <div class="header-actions">

            ${linksHtml}

          </div>


        </div>



        <!-- STATUS -->

        <div class="status-line">


          <span>

            <span class="dot"></span>

            Système opérationnel

          </span>


          ${
            docCode
              ? `
                <span>

                  DOCUMENT :

                  <b>
                    ${docCode}
                  </b>

                </span>
              `
              : ""
          }


          ${
            version
              ? `
                <span>

                  VERSION :

                  <b>
                    ${version}
                  </b>

                </span>
              `
              : ""
          }


          <span id="nav-clock">

            --/--/---- --:--

          </span>


        </div>

      </div>

    </header>

  `;

}



/* ==========================================================
   HORLOGE PARTAGÉE
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
    n =>
      String(n).padStart(2,"0");


  el.textContent =

    `${pad(d.getDate())}/${pad(d.getMonth()+1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;

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
