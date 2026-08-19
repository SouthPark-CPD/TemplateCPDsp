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

      ["10-1","Mauvaise réception radio / Radio défectueuse"],
      ["10-2","Signal clair, bonne réception"],
      ["10-3","Fin de transmission / silence radio"],
      ["10-4","Bien reçu / OK"],
      ["10-5","Relayer le message"],
      ["10-6","Occupé / attendre avant de poursuivre sauf urgence"],
      ["10-7","Hors service temporaire / indisponible pour appel"],
      ["10-8","En service / disponible pour appel"],
      ["10-9","Répéter le dernier message"],
      ["10-10","Fin de service"],
      ["10-22","Annuler ou ignorer"],
      ["10-23","Standby / attente"],
      ["10-98","Assignation terminée / fin du 10-97 / disponible pour appel"],
      ["10-99","Officier en danger, a besoin d'aide en urgence (similaire Code 99)"]

    ]
  },


  {
    id:"communication",
    label:"Communication",
    desc:"Codes utilisés pour les renseignements et les communications entre unités.",

    codes:[

      ["10-12","Présence de visiteurs et peuvent entendre la radio"],
      ["10-13","Veut connaître la météo ou les conditions routières"],
      ["10-14","Écoute ou convoi"],
      ["10-20","Votre localisation"],
      ["10-24","Demande une transmission de voiture à voiture (Dispatch présent)"],
      ["10-25","Sujet recherché"],
      ["10-28","Vérification immatriculation"],
      ["10-29","Vérification mandats / dossier criminel"],
      ["10-35","Demande de renfort sur position de l'officier (préciser rue, etc.)"]

    ]
  },


  {
    id:"interventions",
    label:"Interventions",
    desc:"Codes relatifs aux déplacements, interventions et événements sur le terrain.",

    codes:[

      ["10-17","Ajout de carburant"],
      ["10-18","En route vers... (préciser la localisation)"],
      ["10-19","Retour au commissariat"],
      ["10-21","Contactez-moi par téléphone"],
      ["10-23","Standby / attente"],
      ["10-30","Danger / précaution supplémentaire"],
      ["10-36","Heure exacte"],
      ["10-37","Cambriolage en cours"],
      ["10-38","Contrôle routier / Traffic Stop"],
      ["10-40","Accident (caractériser par défaut, préciser si blessure corpo)"],
      ["10-50","Demande dépanneuse / Tow Truck"],
      ["10-51","Demande ambulance / Paramedics"],
      ["10-56","Refus d'obtempérer"],
      ["10-57","Délit de fuite"],
      ["10-59","Vol de véhicule"]

    ]
  },


  {
    id:"criminel",
    label:"Situations criminelles",
    desc:"Codes utilisés pour signaler différentes situations criminelles.",

    codes:[

      ["10-70","Vente de drogue"],
      ["10-91","Braquage de banque"],
      ["10-97","Arrivé sur scène (couramment remplacé par le Code 6)"]

    ]
  },


  {
    id:"priorites",
    label:"Priorités",
    desc:"Codes permettant de définir le niveau de priorité d'une intervention.",

    urgent:true,

    codes:[

      ["Code 1","Répondez à votre radio"],
      ["Code 2","Prioritaire – répondre sans sirène"],
      ["Code 3","Urgent – répondre avec lumières et sirène"],
      ["Code 4","Aucune autre assistance nécessaire, situation stable"],
      ["Code 4-Adam","Idem, mais suspect toujours en fuite, les unités sont mobilisées"],
      ["Code 5","En surveillance, autres unités doivent éviter le lieu"],
      ["Code 6","Arrivé sur scène ou déjà occupé en intervention / investigation"],
      ["Code 6-Adam","Arrivé, peut avoir besoin de l'assistance d'unités proches"],
      ["Code 6-Charles","Idem, suspect dangereux (mandat), attente confirmation assistance"],
      ["Code 7","Pause repas (requête, renseignement du lieu)"],
      ["Code 20","Notifiez les médias ou soyez avisé que les médias sont sur les lieux"],
      ["Code 37","Véhicule rapporté volé"],
      ["Code 99","Officier en danger, a besoin d'aide en urgence (identique 11-99)"],
      ["Code 100","Unités en position pour intercepter suspect en fuite"],
      ["Code Robert","Requête pour déploiement fusil / carabine sur scène"],
      ["Code Sam","Requête pour déploiement d'un Beanbag PG"]

    ]
  },


  {
    id:"codes-criminels",
    label:"Codes criminels",
    desc:"Référentiel des principaux codes criminels utilisés par les unités.",

    codes:[

      ["187","Homicide"],
      ["207","Kidnapping"],
      ["211","Braquage de magasin"],
      ["212","Braquage Banque"],
      ["240","Agression"],
      ["374","Plongée illégale"],
      ["415","Trouble à l'ordre public"],
      ["417","Individu armé"],
      ["459","Cambriolage"],
      ["487","Vol de véhicule"],
      ["502","Conduite sous influence"],
      ["998","Officier Involved Shooting"],
      ["999","Identique Code-99"]

    ]
  },


  {
    id:"unites",
    label:"Unités",
    desc:"Formats et numérotation des unités du Chicago Police Department.",

    codes:[

      [
        "Format",
        "Un chiffre + une lettre + un second chiffre, dans cet ordre. Le premier chiffre correspond à la Division ou au District de l'unité, la lettre à son type opérationnel, et le second chiffre à sa position parmi les autres unités du même secteur."
      ],

      ["35","Autoroute Freeway (totalité)"],
      ["17","Los Santos [SUD]"],
      ["18","Los Santos [NORD]"],
      ["16","Secteur superviseur [NORD] et [SUD]"]

    ]
  },


  {
    id:"types",
    label:"Types d'unités",
    desc:"Correspondance entre les indicatifs radio et les types d'unités.",

    codes:[

      ["A","Deux Agents en patrouille véhiculée (\"Adam\")"],
      ["Air","Aéronef (\"Air Unit\")"],
      ["B","Unité Bateau (\"Bravo\")"],
      ["E","Traffic Division (\"Edward\")"],
      ["F3","Foot Beat (Foot Patrol – Patrouille à pied)"],
      ["K-9","Patrouille avec un officier canin"],
      ["K","Gang and Narcotics Division, Gang Section (\"King\")"],
      ["L","Un Agent en patrouille véhiculée (\"Lincoln\"), aussi utilisé par les superviseurs"],
      ["M","Motorcycle Unit (\"Mary\")"],
      ["C","Cycle Unit"],
      ["O","Événement spécial ou unité non-traditionnel (\"Queen\")"],
      ["SLO","Senior Logistic Officer (SLO – SLO Lincoln) (SAM – SLO Adam)"],
      ["S","Sierra, Investigation Division"],
      ["N","Narcotics (\"Nora\")"],
      ["W","Detective ID (\"William\")"],
      ["Y","Gang and Narcotics Division, Narcotics Section (\"Young\")"]

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
