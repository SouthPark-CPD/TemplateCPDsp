/* ==========================================================
   DONNÉES — Tenues & Véhicules CPD
   Fichier chargé dynamiquement par tenues-vehicules.html via fetch().
   Ce fichier n'apparaît PAS dans le "Ctrl+U" de tenues-vehicules.html.
   -> Remplis "src" avec le lien de ta capture d'écran.
   -> Laisse src:"" pour garder l'emplacement vide.
========================================================== */

window.CPD_DATA = [

  {
    rank:"01",
    title:"Rookie",
    tenues:[
      "Uniforme standard CPD (chemise bleue, badge visible)",
      "Ceinturon réglementaire complet",
      "Gilet pare-balles obligatoire",
      "Casquette / béret CPD"
    ],
    note:"Aucune personnalisation de tenue autorisée à ce grade.",
    tenueShots:[
      { label:"Tenue Rookie — Vue face", src:"https://media.discordapp.net/attachments/1243266130508910751/1540068146470191244/image.png?ex=6a889bbb&is=6a874a3b&hm=ceca71ab617cc8bbf92951e5dfc749940998a0bc5e85866692cc76f270692a75&=&format=webp&quality=lossless" },
      { label:"Tenue Rookie — Vue dos", src:"https://media.discordapp.net/attachments/1243266130508910751/1540068192313942016/image.png?ex=6a889bc6&is=6a874a46&hm=3e469f7092b2002cfd248fcef23616297d14e7c2a2895307349768ece51ba0c7&=&format=webp&quality=lossless" }
    ],
    vehicules:[
      "Ford Crown Victoria (Patrouille)",
      "Chevrolet Impala (Patrouille)"
    ],
    vehiculeNote:"Véhicules banalisés et interventions spéciales non autorisés.",
    vehiculeShots:[
      { label:"Crown Victoria — Livrée CPD", src:"" }
    ]
  },

  {
    rank:"02",
    title:"Officer 1 à Office 3",
    tenues:[
      "Uniforme standard CPD",
      "Gilet pare-balles obligatoire",
      "Option : coupe-vent CPD par temps de pluie"
    ],
    note:"",
    tenueShots:[
      { label:"Tenue Officer 1 — Vue face", src:"https://media.discordapp.net/attachments/1243266130508910751/1540068544560103574/image.png?ex=6a889c1a&is=6a874a9a&hm=610e9dcd2eaf9cacc4a0390500a15cd52bf435974091ea6d98e0186ae8f52857&=&format=webp&quality=lossless" }
    ],
    vehicules:[
      "Ford Crown Victoria (Patrouille)",
      "Chevrolet Impala (Patrouille)",
      "Dodge Charger (Patrouille)"
    ],
    vehiculeNote:"",
    vehiculeShots:[
      { label:"Dodge Charger — Livrée CPD", src:"" }
    ]
  },

  {
    rank:"03",
    title:"SLO/FTO (Senior/Field Lead Officer)",
    tenues:[
      "Uniforme standard CPD ou tenue civile encadrée",
      "Gilet pare-balles obligatoire en intervention",
      "Insigne SLO visible"
    ],
    note:"Grade de transition vers l'encadrement — briefing formation requis avant changement de tenue.",
    tenueShots:[
      { label:"Tenue SLO — Vue face", src:"" },
      { label:"Insigne SLO — Détail", src:"" }
    ],
    vehicules:[
      "Ensemble du parc Officer",
      "Véhicule banalisé",
      "Véhicule de supervision"
    ],
    vehiculeNote:"",
    vehiculeShots:[
      { label:"Véhicule de supervision — Livrée", src:"" }
    ]
  },

  {
    rank:"04",
    title:"Sergeant",
    tenues:[
      "Uniforme d'encadrement CPD (galons Sergeant)",
      "Gilet pare-balles obligatoire en intervention",
      "Tenue civile encadrée autorisée hors patrouille"
    ],
    note:"",
    tenueShots:[
      { label:"Tenue Sergeant — Vue face", src:"" }
    ],
    vehicules:[
      "Ensemble du parc Officer",
      "Véhicule de supervision Sergeant",
      "Véhicule banalisé"
    ],
    vehiculeNote:"",
    vehiculeShots:[
      { label:"Véhicule Sergeant — Livrée", src:"" }
    ]
  },

  {
    rank:"05",
    title:"Lieutenant",
    tenues:[
      "Uniforme d'encadrement CPD (galons Lieutenant)",
      "Tenue civile encadrée autorisée",
      "Accès tenue cérémonie sur événement officiel"
    ],
    note:"Grade de commandement — toute tenue non listée doit être validée par la hiérarchie.",
    tenueShots:[
      { label:"Tenue Lieutenant — Vue face", src:"" },
      { label:"Tenue cérémonie — Exemple", src:"" }
    ],
    vehicules:[
      "Ensemble du parc Sergeant",
      "Véhicule de commandement",
      "Véhicule banalisé"
    ],
    vehiculeNote:"",
    vehiculeShots:[
      { label:"Véhicule de commandement — Livrée", src:"" }
    ]
  }

];
