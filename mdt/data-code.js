/* ==========================================================
   DONNÉES — Guide radio CPD
   Fichier chargé dynamiquement par code.html via fetch().
   Ce fichier n'apparaît PAS dans le "Ctrl+U" de code.html.
========================================================== */

window.CPD_DATA = [

  {
    id:"statuts",
    label:"Statuts",
    desc:"Codes utilisés pour indiquer le statut d'une unité et les accusés de réception.",

    codes:[

      ["10-1","Radio défectueuse"],
      ["10-3","Retour radio"],
      ["10-4","Bien reçu / Affirmatif"],
      ["10-5","Négatif"],
      ["10-6","Occupé / En procédure"],
      ["10-7","Hors service temporaire / En pause"],
      ["10-8","Prise de service / Disponible pour appel"],
      ["10-9","Répéter le dernier message"],
      ["10-10","Fin de service"],
      ["10-12","Présence de visiteurs pouvant entendre la radio"],
      ["10-14","Escorte ou convoi"],
      ["10-15","Suspect détenu / Transport de prisonnier"],
      ["10-17","Ravitaillement en carburant"],
      ["10-19","En route vers (préciser la destination)"],
      ["10-20","Votre localisation"],
      ["10-22","Annuler ou ignorer"],
      ["10-23","Stand-by / En attente"],
      ["10-24","Demande de communication de véhicule à véhicule"],
      ["10-28","Vérification de plaque / casier / mandat"]

    ]
  },


  {
    id:"communication",
    label:"Communication",
    desc:"Codes utilisés pour les renseignements et les communications entre unités.",

    codes:[

      ["10-12","Présence de visiteurs pouvant entendre la radio"],
      ["10-20","Votre localisation"],
      ["10-24","Demande de communication de véhicule à véhicule"],
      ["10-28","Vérification de plaque / casier / mandat"],
      ["10-35","Demande de renfort sur (position)"]

    ]
  },


  {
    id:"interventions",
    label:"Interventions",
    desc:"Codes relatifs aux déplacements, interventions et événements sur le terrain.",

    codes:[

      ["10-14","Escorte ou convoi"],
      ["10-15","Suspect détenu / Transport de prisonnier"],
      ["10-17","Ravitaillement en carburant"],
      ["10-19","En route vers (préciser la destination)"],
      ["10-20","Votre localisation"],
      ["10-22","Annuler ou ignorer"],
      ["10-23","Stand-by / En attente"],
      ["10-24","Demande de communication de véhicule à véhicule"],
      ["10-31","Tirs d'armes à feu"],
      ["10-35","Demande de renfort sur (position)"],
      ["10-37","Cambriolage en cours"],
      ["10-38","Contrôle routier"],
      ["10-40","Braquage de supérette"],
      ["10-41","Début de patrouille"],
      ["10-48","Braquage à main armée"],
      ["10-49","Braquage de conteneur"],
      ["10-50","Accident léger"],
      ["10-51","Accident grave"],
      ["10-56","Refus d'obtempérer"],
      ["10-57","Délit de fuite"],
      ["10-58","Braquage de distributeur automatique"],
      ["10-59","Vol de véhicule"]

    ]
  },


  {
    id:"criminel",
    label:"Situations criminelles",
    desc:"Codes utilisés pour signaler différentes situations criminelles.",

    codes:[

      ["10-31","Tirs d'armes à feu"],
      ["10-37","Cambriolage en cours"],
      ["10-40","Braquage de supérette"],
      ["10-48","Braquage à main armée"],
      ["10-49","Braquage de conteneur"],
      ["10-58","Braquage de distributeur automatique"],
      ["10-59","Vol de véhicule"],
      ["10-60","Vente de drogue"],
      ["10-91","Braquage de banque / bijouterie"],
      ["10-99","Agent en danger, besoin d'aide urgente"]

    ]
  },


  {
    id:"priorites",
    label:"Priorités",
    desc:"Codes d'urgence utilisés à la radio ou sur le terrain en cas d'intervention ou d'organisation d'opération.",

    urgent:true,

    codes:[

      ["Code 2","Intervention prioritaire sans avertisseurs lumineux ni sirène"],
      ["Code 3","Intervention urgente avec avertisseurs lumineux et sirène"],
      ["Code 4","Aucune autre assistance nécessaire — situation stable"],
      ["Code 5","En surveillance, les autres unités doivent éviter les lieux"],
      ["Code 6","Arrivée sur les lieux — enquête ou observation en cours"],
      ["Code 7","En patrouille ou reprise de patrouille"],
      ["Code 99","AGENT EN DANGER — Besoin d'aide urgente ; toutes les unités doivent se rendre sur place !"]

    ]
  },


  {
    id:"types-patrouille",
    label:"Types de patrouille",
    desc:"Indicatifs correspondant au nombre d'agents en patrouille véhiculée.",

    codes:[

      ["L","Lincoln (L) — Un agent véhiculé"],
      ["A","Adam (A) — 2 agents véhiculés"],
      ["T","Tango (T) — 3 agents véhiculés"],
      ["X","X-Ray (X) — 4 agents véhiculés"]

    ]
  },


  {
    id:"unites",
    label:"Codes d'unité du CPD",
    desc:"Correspondance entre les indicatifs radio et les différents types d'unités.",

    codes:[

      ["H","ASD / Henry (H) — Unité Air Support Division"],
      ["K-9","K-9 — Patrouille avec un officier canin"],
      ["W","William (W) — Unité banalisée DB"],
      ["N","Nora (N) — Unité banalisée avec l'État-Major"],
      ["V","Victor (V) — Unité cycliste"],
      ["M","Mary (M) — Unité motocycliste"],
      ["D","David (D) — Véhicule blindé / SWAT"],
      ["B","Bravo (B) — Unité en bateau"],
      ["E","Edward (E) — Unité Traffic Division"]

    ]
  },


  {
    id:"alphabet",
    label:"Alphabet radio",
    desc:"Alphabet phonétique utilisé pour épeler les informations à la radio.",

    codes:[

      ["A","Adam"],
      ["B","Boy"],
      ["C","Charles"],
      ["D","David"],
      ["E","Edward"],
      ["F","Frank"],
      ["G","George"],
      ["H","Henry"],
      ["I","Ida"],
      ["J","John"],
      ["K","King"],
      ["L","Lincoln"],
      ["M","Mary"],
      ["N","Nora"],
      ["O","Ocean"],
      ["P","Paul"],
      ["Q","Queen"],
      ["R","Robert"],
      ["S","Sam"],
      ["T","Tom"],
      ["U","Union"],
      ["V","Victor"],
      ["W","William"],
      ["X","X-Ray"],
      ["Y","Young"],
      ["Z","Zebra"]

    ]
  }

];
