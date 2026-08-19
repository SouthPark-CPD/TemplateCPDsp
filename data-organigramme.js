/* ==========================================================
   DONNÉES — Organigramme CPD
   Fichier chargé dynamiquement par organigramme.html via fetch().
   Ce fichier n'apparaît PAS dans le "Ctrl+U" de organigramme.html.
========================================================== */

window.CPD_DATA = {

  chainOfCommand:[

    {
      label:"Direction générale",
      tier:"tier-exec",
      ranks:[
        { title:"Chief of Police",         sub:"Autorité suprême du département" },
        { title:"Superintendent of Police", sub:"Direction générale des opérations" }
      ]
    },

    {
      label:"Commandement",
      tier:"tier-command",
      ranks:[
        { title:"Deputy Chief", sub:"Second du Chief of Police" },
        { title:"Commander",    sub:"Supervise plusieurs Captains / bureaux" },
        { title:"Captain",      sub:"Responsable d'une division ou d'un secteur" }
      ]
    },

    {
      label:"Supervision",
      tier:"tier-super",
      ranks:[
        { title:"Lieutenant", sub:"Coordination des opérations de terrain" },
        { title:"Sergeant",   sub:"Supervision des équipes de patrouille" },
        { title:"SLO / FTO",  sub:"Senior Lead / Field Training Officer" }
      ]
    },

    {
      label:"Grades de base",
      tier:"tier-base",
      ranks:[
        { title:"Officer 3", sub:"" },
        { title:"Officer 2", sub:"" },
        { title:"Officer 1", sub:"" },
        { title:"Rookie",    sub:"Grade d'entrée — sous formation" }
      ]
    }

  ],


  divisions:[

    {
      tag:"DB",
      name:"Detective Bureau",
      leads:"78 & 39",
      desc:"Bureau chargé des enquêtes criminelles et du traitement des affaires majeures.",
      unitsCount:6,
      unitSlots:["Unité 1","Unité 2","Unité 3","Unité 4","Unité 5","Unité 6"]
    },

    {
      tag:"SWAT",
      name:"SWAT Division",
      leads:"12 & 47",
      desc:"Division tactique spécialisée dans les interventions à haut risque.",
      unitsCount:4,
      unitSlots:["Unité 1","Unité 2","Unité 3","Unité 4"]
    },

    {
      tag:"TRN",
      name:"Training Division",
      leads:"20",
      desc:"Division responsable de la formation et de l'évaluation des membres du département.",
      unitsCount:1,
      unitSlots:["Unité 1"]
    },

    {
      tag:"TRF",
      name:"Traffic Division",
      leads:"07",
      desc:"Division spécialisée dans la circulation, les infractions routières et les accidents.",
      unitsCount:4,
      unitSlots:["Unité 1","Unité 2","Unité 3","Unité 4"]
    }

  ],


  gradeDetails:[

    {
      rank:"01",
      title:"Chief of Police",
      reportsTo:"—",
      responsabilites:[
        "Autorité suprême du CPD",
        "Définit les orientations générales du département",
        "Représente officiellement le CPD"
      ],
      prerequis:[
        "Poste unique — attribution par la direction du serveur"
      ],
      tempsService:"—"
    },

    {
      rank:"02",
      title:"Superintendent of Police",
      reportsTo:"Chief of Police",
      responsabilites:[
        "Seconde le Chief of Police dans la gestion globale du département",
        "Supervise l'ensemble des Deputy Chiefs / Commanders",
        "Peut agir en autorité suprême en l'absence du Chief"
      ],
      prerequis:[
        "Nomination directe par le Chief of Police"
      ],
      tempsService:"À définir"
    },

    {
      rank:"03",
      title:"Deputy Chief",
      reportsTo:"Superintendent of Police",
      responsabilites:[
        "Supervise plusieurs Commanders",
        "Participe aux décisions stratégiques du département"
      ],
      prerequis:[
        "Grade Commander validé",
        "Nomination directe par le Superintendent ou le Chief"
      ],
      tempsService:"À définir"
    },

    {
      rank:"04",
      title:"Commander",
      reportsTo:"Deputy Chief",
      responsabilites:[
        "Supervise plusieurs Captains / divisions",
        "Représente le CPD lors d'événements inter-factions"
      ],
      prerequis:[
        "Grade Captain validé",
        "Nomination par le Commandement"
      ],
      tempsService:"À définir"
    },

    {
      rank:"05",
      title:"Captain",
      reportsTo:"Commander",
      responsabilites:[
        "Responsable d'une division ou d'un secteur entier",
        "Encadre les Lieutenants",
        "Interlocuteur direct du Commandement"
      ],
      prerequis:[
        "Grade Lieutenant validé",
        "Entretien avec le Commandement"
      ],
      tempsService:"À définir"
    },

    {
      rank:"06",
      title:"Lieutenant",
      reportsTo:"Captain",
      responsabilites:[
        "Supervise plusieurs Sergeants",
        "Coordonne les opérations sur son secteur/service",
        "Valide les demandes de renfort et d'autorisation"
      ],
      prerequis:[
        "Grade Sergeant validé",
        "Entretien avec le Commandement",
        "Aucune sanction disciplinaire active"
      ],
      tempsService:"À définir"
    },

    {
      rank:"07",
      title:"Sergeant",
      reportsTo:"Lieutenant",
      responsabilites:[
        "Supervise plusieurs équipes de patrouille",
        "Gère la répartition des effectifs sur le service",
        "Traite les signalements de premier niveau"
      ],
      prerequis:[
        "Grade SLO/FTO validé",
        "Entretien de passation encadrement",
        "Recommandation d'un Lieutenant"
      ],
      tempsService:"À définir"
    },

    {
      rank:"08",
      title:"SLO / FTO",
      reportsTo:"Sergeant",
      responsabilites:[
        "Encadre une équipe de patrouille",
        "Forme les nouveaux membres (Field Training Officer)",
        "Valide les rapports des grades inférieurs"
      ],
      prerequis:[
        "Grade Officer 3 validé",
        "Entretien de passage avec un Sergeant ou supérieur",
        "Aucune sanction disciplinaire active récente"
      ],
      tempsService:"À définir"
    },

    {
      rank:"09",
      title:"Officer 3",
      reportsTo:"SLO / FTO",
      responsabilites:[
        "Patrouille en autonomie complète",
        "Accès aux interventions à risque modéré",
        "Peut être référent terrain ponctuel"
      ],
      prerequis:[
        "Grade Officer 2 validé",
        "Évaluation positive d'un SLO ou Sergeant"
      ],
      tempsService:"À définir"
    },

    {
      rank:"10",
      title:"Officer 2",
      reportsTo:"Officer 3",
      responsabilites:[
        "Patrouille en autonomie",
        "Rédige ses propres rapports d'intervention"
      ],
      prerequis:[
        "Grade Officer 1 validé",
        "Temps de service minimum requis"
      ],
      tempsService:"À définir"
    },

    {
      rank:"11",
      title:"Officer 1",
      reportsTo:"Officer 2",
      responsabilites:[
        "Patrouille en semi-autonomie",
        "Applique les procédures standards (contrôle, arrestation)"
      ],
      prerequis:[
        "Grade Rookie validé",
        "Aucune sanction disciplinaire active"
      ],
      tempsService:"À définir"
    },

    {
      rank:"12",
      title:"Rookie",
      reportsTo:"Officer 1 / SLO",
      responsabilites:[
        "Effectue des patrouilles encadrées par un Officer/SLO",
        "Applique les procédures de base",
        "Suit la formation académie"
      ],
      prerequis:[
        "Avoir terminé la formation académie",
        "Réussir l'examen de sortie académie"
      ],
      tempsService:"—"
    }

  ]

};
