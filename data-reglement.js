/* ==========================================================
   DONNÉES — Règlement intérieur CPD
   Fichier chargé dynamiquement par reglement.html via fetch().
   Ce fichier n'apparaît PAS dans le "Ctrl+U" de reglement.html.
========================================================== */

window.CPD_DATA = [
  {
    id:"general",
    label:"Généralités",
    desc:"Principes fondamentaux applicables à l'ensemble des membres du CPD.",
    articles:[
      {
        number:"01",
        title:"Objet du règlement",
        severity:"info",
        body:`
          <p>
            Le présent règlement définit les règles de conduite,
            les obligations professionnelles et les procédures
            applicables à tous les membres du Chicago Police Department.
          </p>
          <p>
            Tout membre du service est réputé avoir pris connaissance
            du présent règlement et s'engage à le respecter dans le cadre
            de ses fonctions.
          </p>
          <div class="notice">
            <div class="notice-title">Principe fondamental</div>
            L'uniforme, le grade ou l'ancienneté ne dispensent jamais
            un agent du respect des règles établies.
          </div>
        `
      },
      {
        number:"02",
        title:"Champ d'application",
        severity:"info",
        body:`
          <p>
            Le règlement s'applique à tous les membres du CPD,
            quel que soit leur grade, leur unité ou leur fonction.
          </p>
          <ul>
            <li>Agents en patrouille.</li>
            <li>Officiers et superviseurs.</li>
            <li>Unités spécialisées.</li>
            <li>Personnel administratif.</li>
            <li>Cadres et responsables hiérarchiques.</li>
            <li>Agents en formation.</li>
          </ul>
          <p>
            Les règles peuvent également s'appliquer hors service
            lorsqu'un comportement porte atteinte à l'image ou à
            l'intégrité du département.
          </p>
        `
      },
      {
        number:"03",
        title:"Principes fondamentaux",
        severity:"critical",
        body:`
          <p>
            Tout agent doit exercer ses fonctions avec
            <strong>professionnalisme, impartialité, maîtrise et respect</strong>.
          </p>
          <ul>
            <li>Respect de la loi.</li>
            <li>Respect de la hiérarchie.</li>
            <li>Respect des citoyens.</li>
            <li>Respect des collègues.</li>
            <li>Usage proportionné de l'autorité.</li>
            <li>Interdiction de tout abus de pouvoir.</li>
          </ul>
          <div class="notice red">
            <div class="notice-title">Tolérance zéro</div>
            La corruption, la violence gratuite, la discrimination,
            l'abus d'autorité et la falsification de rapports sont
            considérés comme des manquements graves.
          </div>
        `
      },
      {
        number:"04",
        title:"Obéissance et responsabilité",
        severity:"warning",
        body:`
          <p>
            Tout agent doit respecter les instructions légitimes
            données par un supérieur hiérarchique.
          </p>
          <p>
            Un agent demeure personnellement responsable de ses actes.
            L'ordre d'un supérieur ne justifie pas l'exécution
            d'une action manifestement illégale ou contraire au présent règlement.
          </p>
          <p>
            Tout agent recevant un ordre qu'il estime illégal doit
            immédiatement le signaler par la voie hiérarchique appropriée.
          </p>
        `
      }
    ]
  },
  {
    id:"hierarchie",
    label:"Hiérarchie",
    desc:"Organisation du commandement et obligations liées au grade.",
    articles:[
      {
        number:"05",
        title:"Respect de la chaîne hiérarchique",
        severity:"warning",
        body:`
          <p>
            La chaîne hiérarchique constitue la structure normale
            de fonctionnement du département.
          </p>
          <ul>
            <li>Les instructions doivent être transmises par les canaux appropriés.</li>
            <li>Les agents doivent respecter les décisions des superviseurs.</li>
            <li>Les désaccords doivent être exprimés de manière professionnelle.</li>
            <li>Le contournement volontaire de la hiérarchie est interdit.</li>
          </ul>
        `
      },
      {
        number:"06",
        title:"Autorité du superviseur",
        severity:"warning",
        body:`
          <p>
            Un superviseur peut organiser les effectifs,
            distribuer les missions et prendre les décisions
            nécessaires au bon déroulement d'une intervention.
          </p>
          <p>
            Le superviseur doit cependant exercer son autorité
            de manière proportionnée et ne peut utiliser son grade
            à des fins personnelles.
          </p>
        `
      },
      {
        number:"07",
        title:"Abus d'autorité",
        severity:"critical",
        body:`
          <p>
            Constitue un abus d'autorité tout usage du grade,
            de la fonction ou des moyens du CPD dans un but
            personnel ou disproportionné.
          </p>
          <ul>
            <li>Menacer un civil en raison de son statut.</li>
            <li>Utiliser les ressources du service à des fins privées.</li>
            <li>Favoriser volontairement un proche.</li>
            <li>Modifier une procédure pour obtenir un avantage personnel.</li>
            <li>Faire pression sur un collègue ou un subordonné.</li>
          </ul>
        `
      }
    ]
  },
  {
    id:"deontologie",
    label:"Déontologie",
    desc:"Comportement attendu de tout membre du département.",
    articles:[
      {
        number:"08",
        title:"Comportement professionnel",
        severity:"warning",
        body:`
          <p>
            L'agent représente le CPD auprès du public.
            Son comportement doit donc rester professionnel
            pendant toute période d'exercice de ses fonctions.
          </p>
          <ul>
            <li>Langage approprié.</li>
            <li>Attitude maîtrisée.</li>
            <li>Respect des citoyens.</li>
            <li>Respect des collègues.</li>
            <li>Absence de provocation volontaire.</li>
          </ul>
        `
      },
      {
        number:"09",
        title:"Corruption et avantages",
        severity:"critical",
        body:`
          <p>
            Il est strictement interdit d'accepter une somme d'argent,
            un cadeau, un service ou tout avantage en échange
            d'un traitement particulier.
          </p>
          <div class="notice red">
            <div class="notice-title">Infraction majeure</div>
            Toute tentative de corruption doit être signalée
            immédiatement à la hiérarchie.
          </div>
        `
      },
      {
        number:"10",
        title:"Confidentialité",
        severity:"critical",
        body:`
          <p>
            Les informations obtenues dans le cadre du service
            doivent rester confidentielles.
          </p>
          <ul>
            <li>Dossiers judiciaires.</li>
            <li>Identités des informateurs.</li>
            <li>Informations sur les enquêtes.</li>
            <li>Informations personnelles des citoyens.</li>
            <li>Informations internes au CPD.</li>
          </ul>
          <p>
            Toute diffusion non autorisée d'informations confidentielles
            peut entraîner une sanction disciplinaire lourde.
          </p>
        `
      },
      {
        number:"11",
        title:"Conflit d'intérêts",
        severity:"critical",
        body:`
          <p>
            Un agent ne doit pas intervenir dans une affaire
            lorsqu'il existe un conflit d'intérêts personnel,
            familial ou financier.
          </p>
          <p>
            L'agent concerné doit informer son supérieur
            et demander à être remplacé lorsque cela est nécessaire.
          </p>
        `
      }
    ]
  },
  {
    id:"interventions",
    label:"Interventions",
    desc:"Règles générales applicables lors des interventions sur le terrain.",
    articles:[
      {
        number:"12",
        title:"Avant intervention",
        severity:"info",
        body:`
          <p>
            Avant toute intervention, l'agent doit prendre en compte
            les informations disponibles et adapter son comportement
            au niveau de risque identifié.
          </p>
          <ul>
            <li>Identifier la nature de l'appel.</li>
            <li>Identifier les personnes potentiellement impliquées.</li>
            <li>Évaluer les risques.</li>
            <li>Demander des renforts lorsque nécessaire.</li>
          </ul>
        `
      },
      {
        number:"13",
        title:"Identification de l'agent",
        severity:"warning",
        body:`
          <p>
            Lorsque les circonstances le permettent, l'agent doit
            pouvoir s'identifier clairement auprès du citoyen.
          </p>
          <p>
            L'identification peut être adaptée lorsque sa divulgation
            compromettrait une opération ou la sécurité de l'agent.
          </p>
        `
      },
      {
        number:"14",
        title:"Contrôle d'une personne",
        severity:"warning",
        body:`
          <p>
            Tout contrôle doit reposer sur un motif légitime
            et être réalisé de manière professionnelle.
          </p>
          <ul>
            <li>Informer la personne lorsque les circonstances le permettent.</li>
            <li>Éviter les provocations inutiles.</li>
            <li>Limiter la durée du contrôle à ce qui est nécessaire.</li>
            <li>Respecter les droits de la personne.</li>
          </ul>
        `
      },
      {
        number:"15",
        title:"Gestion d'une situation hostile",
        severity:"critical",
        body:`
          <p>
            Face à une personne hostile, l'agent doit privilégier
            la désescalade lorsque les circonstances le permettent.
          </p>
          <ul>
            <li>Maintenir une distance de sécurité.</li>
            <li>Communiquer clairement.</li>
            <li>Éviter les provocations.</li>
            <li>Demander des renforts si nécessaire.</li>
            <li>Utiliser la force uniquement lorsque justifié.</li>
          </ul>
        `
      }
    ]
  },
  {
    id:"force",
    label:"Usage de la force",
    desc:"Cadre général relatif à l'utilisation de la force.",
    articles:[
      {
        number:"16",
        title:"Principe de nécessité",
        severity:"critical",
        body:`
          <p>
            L'usage de la force doit être nécessaire,
            proportionné à la menace et limité au strict nécessaire.
          </p>
          <div class="notice">
            <div class="notice-title">Principe</div>
            La force n'est jamais utilisée comme moyen de punition,
            d'intimidation ou de représailles.
          </div>
        `
      },
      {
        number:"17",
        title:"Progressivité",
        severity:"critical",
        body:`
          <p>
            Lorsque la situation le permet, l'agent doit adapter
            progressivement sa réponse au niveau de menace.
          </p>
          <table class="rules-table">
            <thead>
              <tr>
                <th>Niveau</th>
                <th>Réponse</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>1</td>
                <td>Présence et communication</td>
              </tr>
              <tr>
                <td>2</td>
                <td>Ordres verbaux et désescalade</td>
              </tr>
              <tr>
                <td>3</td>
                <td>Contrôle physique adapté</td>
              </tr>
              <tr>
                <td>4</td>
                <td>Moyens intermédiaires lorsque justifiés</td>
              </tr>
              <tr>
                <td>5</td>
                <td>Force létale uniquement en cas de menace grave et immédiate</td>
              </tr>
            </tbody>
          </table>
        `
      },
      {
        number:"18",
        title:"Usage de la force létale",
        severity:"critical",
        body:`
          <p>
            La force létale ne peut être envisagée que lorsqu'une
            menace grave et immédiate fait peser un danger sérieux
            sur la vie d'une personne.
          </p>
          <p class="danger">
            Elle ne doit jamais être utilisée pour punir,
            intimider, faire pression ou empêcher une simple fuite
            lorsqu'aucune menace grave et immédiate n'existe.
          </p>
          <p>
            Toute utilisation d'une arme entraînant un tir doit
            faire l'objet d'un rapport circonstancié.
          </p>
        `
      },
      {
        number:"19",
        title:"Après usage de la force",
        severity:"critical",
        body:`
          <p>
            Après tout usage significatif de la force, l'agent doit :
          </p>
          <ul>
            <li>Sécuriser la scène.</li>
            <li>Porter ou faire porter assistance aux blessés.</li>
            <li>Prévenir un superviseur.</li>
            <li>Préserver les éléments utiles à l'enquête.</li>
            <li>Rédiger un rapport complet.</li>
          </ul>
        `
      }
    ]
  },
  {
    id:"armes",
    label:"Armes",
    desc:"Port, utilisation, stockage et responsabilité concernant les armes de service.",
    articles:[
      {
        number:"20",
        title:"Port de l'arme",
        severity:"warning",
        body:`
          <p>
            L'arme de service est portée conformément aux procédures
            internes et doit rester sous le contrôle de l'agent.
          </p>
          <p>
            Toute perte, disparition ou vol d'une arme doit être
            signalé immédiatement à la hiérarchie.
          </p>
        `
      },
      {
        number:"21",
        title:"Manipulation",
        severity:"critical",
        body:`
          <p>
            Toute arme doit être considérée comme potentiellement chargée.
          </p>
          <ul>
            <li>Ne jamais pointer inutilement une arme vers une personne.</li>
            <li>Garder le doigt hors de la détente tant que le tir n'est pas justifié.</li>
            <li>Identifier clairement la cible avant toute utilisation.</li>
            <li>Respecter les règles de sécurité.</li>
          </ul>
        `
      },
      {
        number:"22",
        title:"Tir accidentel",
        severity:"critical",
        body:`
          <p>
            Tout tir accidentel doit être signalé immédiatement.
            La scène doit être sécurisée et un rapport doit être établi.
          </p>
        `
      }
    ]
  },
  {
    id:"arrestations",
    label:"Arrestations",
    desc:"Procédures générales relatives aux interpellations et placements en détention.",
    articles:[
      {
        number:"23",
        title:"Motif d'arrestation",
        severity:"critical",
        body:`
          <p>
            Toute arrestation doit reposer sur un motif légal,
            une situation justifiant l'interpellation ou une procédure
            applicable.
          </p>
          <p>
            L'agent doit être capable d'expliquer clairement
            le motif de l'arrestation.
          </p>
        `
      },
      {
        number:"24",
        title:"Annonce de l'arrestation",
        severity:"warning",
        body:`
          <p>
            Lorsque les circonstances le permettent, l'agent informe
            la personne qu'elle est placée en état d'arrestation
            et précise le motif.
          </p>
        `
      },
      {
        number:"25",
        title:"Fouille après arrestation",
        severity:"warning",
        body:`
          <p>
            Une fouille de sécurité peut être effectuée conformément
            aux procédures applicables afin de rechercher des armes,
            objets dangereux ou éléments nécessaires à la sécurité.
          </p>
          <p>
            Toute fouille approfondie doit être justifiée
            par le cadre légal ou procédural applicable.
          </p>
        `
      },
      {
        number:"26",
        title:"Transport d'un détenu",
        severity:"warning",
        body:`
          <p>
            Pendant le transport, l'agent reste responsable
            de la sécurité de la personne détenue.
          </p>
          <ul>
            <li>Vérifier les moyens de contention.</li>
            <li>Contrôler régulièrement la situation.</li>
            <li>Signaler tout problème médical.</li>
            <li>Éviter tout comportement humiliant ou abusif.</li>
          </ul>
        `
      }
    ]
  },
  {
    id:"vehicules",
    label:"Véhicules",
    desc:"Utilisation des véhicules du département et conduite opérationnelle.",
    articles:[
      {
        number:"27",
        title:"Utilisation des véhicules",
        severity:"warning",
        body:`
          <p>
            Les véhicules du CPD sont destinés exclusivement
            aux missions autorisées.
          </p>
          <ul>
            <li>Patrouille.</li>
            <li>Intervention.</li>
            <li>Transport.</li>
            <li>Mission administrative autorisée.</li>
          </ul>
          <p>
            L'utilisation personnelle non autorisée d'un véhicule
            du département est interdite.
          </p>
        `
      },
      {
        number:"28",
        title:"Conduite opérationnelle",
        severity:"critical",
        body:`
          <p>
            Une conduite urgente ou prioritaire doit rester maîtrisée.
            La vitesse et les manœuvres doivent être adaptées
            aux conditions de circulation.
          </p>
          <p>
            L'agent doit constamment prendre en compte les risques
            pour les civils, les collègues et les autres usagers.
          </p>
        `
      },
      {
        number:"29",
        title:"Accident avec un véhicule du CPD",
        severity:"warning",
        body:`
          <p>
            Tout accident impliquant un véhicule du département
            doit être signalé à la hiérarchie.
          </p>
          <p>
            L'agent doit fournir un rapport détaillé et honnête
            concernant les circonstances de l'accident.
          </p>
        `
      }
    ]
  },
  {
    id:"radio",
    label:"Radio",
    desc:"Règles de communication et de discipline radio.",
    articles:[
      {
        number:"30",
        title:"Discipline radio",
        severity:"warning",
        body:`
          <p>
            Les communications radio doivent rester courtes,
            claires et professionnelles.
          </p>
          <ul>
            <li>Éviter les conversations inutiles.</li>
            <li>Ne pas couper une communication prioritaire.</li>
            <li>Utiliser les indicatifs appropriés.</li>
            <li>Transmettre uniquement les informations utiles.</li>
          </ul>
        `
      },
      {
        number:"31",
        title:"Priorité radio",
        severity:"critical",
        body:`
          <p>
            Une communication d'urgence ou de priorité doit
            immédiatement monopoliser l'attention du réseau.
          </p>
          <div class="notice red">
            <div class="notice-title">Priorité opérationnelle</div>
            Toute communication non urgente doit être interrompue
            lorsqu'une situation prioritaire l'exige.
          </div>
        `
      },
      {
        number:"32",
        title:"Compte rendu radio",
        severity:"warning",
        body:`
          <p>
            Lorsqu'un agent intervient sur une situation importante,
            il doit transmettre les informations essentielles :
          </p>
          <ul>
            <li>Localisation.</li>
            <li>Nature de l'intervention.</li>
            <li>Nombre de personnes impliquées.</li>
            <li>Présence éventuelle d'armes.</li>
            <li>Besoin de renfort.</li>
          </ul>
        `
      }
    ]
  },
  {
    id:"enquetes",
    label:"Enquêtes",
    desc:"Principes applicables aux enquêtes et au traitement des éléments recueillis.",
    articles:[
      {
        number:"33",
        title:"Intégrité de l'enquête",
        severity:"critical",
        body:`
          <p>
            Toute enquête doit être menée de manière impartiale.
            L'agent ne doit pas modifier volontairement les faits
            afin de favoriser ou de nuire à une personne.
          </p>
        `
      },
      {
        number:"34",
        title:"Preuves et pièces",
        severity:"critical",
        body:`
          <p>
            Les éléments recueillis doivent être conservés,
            identifiés et transmis conformément aux procédures.
          </p>
          <p>
            La destruction, la dissimulation ou la modification
            volontaire d'une preuve constitue un manquement majeur.
          </p>
        `
      },
      {
        number:"35",
        title:"Rapports",
        severity:"warning",
        body:`
          <p>
            Les rapports doivent être factuels, précis et rédigés
            dans un langage professionnel.
          </p>
          <ul>
            <li>Ne pas inventer d'informations.</li>
            <li>Ne pas omettre volontairement un élément important.</li>
            <li>Distinguer les faits observés des informations rapportées.</li>
            <li>Utiliser des horaires et lieux précis lorsque disponibles.</li>
          </ul>
        `
      }
    ]
  },
  {
    id:"detention",
    label:"Détention",
    desc:"Traitement des personnes placées sous contrôle du CPD.",
    articles:[
      {
        number:"36",
        title:"Traitement des détenus",
        severity:"critical",
        body:`
          <p>
            Toute personne détenue doit être traitée avec dignité
            et sans violence inutile.
          </p>
          <p>
            Les sanctions, humiliations ou violences exercées
            contre un détenu sont interdites.
          </p>
        `
      },
      {
        number:"37",
        title:"État médical",
        severity:"critical",
        body:`
          <p>
            Toute demande médicale crédible ou tout signe apparent
            de détresse doit être pris en considération.
          </p>
          <ul>
            <li>Demander une assistance médicale si nécessaire.</li>
            <li>Surveiller une personne blessée.</li>
            <li>Signaler toute détérioration de son état.</li>
          </ul>
        `
      },
      {
        number:"38",
        title:"Évasion",
        severity:"critical",
        body:`
          <p>
            En cas de tentative d'évasion, la priorité est la sécurité
            des personnes présentes et la récupération du détenu.
          </p>
          <p>
            Toute utilisation de la force doit rester conforme
            aux principes de nécessité et de proportionnalité.
          </p>
        `
      }
    ]
  },
  {
    id:"civils",
    label:"Relations civils",
    desc:"Règles relatives aux interactions avec la population.",
    articles:[
      {
        number:"39",
        title:"Respect du public",
        severity:"warning",
        body:`
          <p>
            Les agents doivent traiter chaque citoyen avec respect,
            indépendamment de son comportement, de son statut
            ou de ses opinions.
          </p>
        `
      },
      {
        number:"40",
        title:"Provocation",
        severity:"warning",
        body:`
          <p>
            Un citoyen peut adopter un comportement provocateur
            sans que cela justifie automatiquement un usage de la force.
          </p>
          <p>
            L'agent doit privilégier la maîtrise et la désescalade
            lorsque la situation le permet.
          </p>
        `
      },
      {
        number:"41",
        title:"Discrimination",
        severity:"critical",
        body:`
          <p>
            Toute discrimination dans l'exercice des fonctions
            est interdite.
          </p>
          <p>
            Les décisions doivent être fondées sur les faits,
            le comportement observé et le cadre légal applicable.
          </p>
        `
      }
    ]
  },
  {
    id:"administratif",
    label:"Administration",
    desc:"Obligations administratives et gestion des documents du département.",
    articles:[
      {
        number:"42",
        title:"Rapports obligatoires",
        severity:"warning",
        body:`
          <p>
            Les agents doivent rédiger les rapports requis
            à l'issue des interventions concernées.
          </p>
          <ul>
            <li>Arrestation importante.</li>
            <li>Usage significatif de la force.</li>
            <li>Utilisation d'une arme.</li>
            <li>Accident de véhicule.</li>
            <li>Incident particulier.</li>
            <li>Événement nécessitant un suivi hiérarchique.</li>
          </ul>
        `
      },
      {
        number:"43",
        title:"Falsification",
        severity:"critical",
        body:`
          <p>
            Il est strictement interdit de falsifier un rapport,
            une preuve, une déclaration ou une information administrative.
          </p>
          <div class="notice red">
            <div class="notice-title">Manquement majeur</div>
            Toute falsification volontaire peut entraîner
            une procédure disciplinaire lourde.
          </div>
        `
      },
      {
        number:"44",
        title:"Absences et disponibilité",
        severity:"warning",
        body:`
          <p>
            Les agents doivent respecter les procédures internes
            relatives aux prises de service, absences et disponibilités.
          </p>
          <p>
            Toute absence non justifiée doit être signalée
            à la hiérarchie dans les meilleurs délais.
          </p>
        `
      }
    ]
  },
  {
    id:"discipline",
    label:"Discipline",
    desc:"Manquements, sanctions et procédure disciplinaire.",
    articles:[
      {
        number:"45",
        title:"Manquements disciplinaires",
        severity:"critical",
        body:`
          <p>
            Constitue notamment un manquement disciplinaire :
          </p>
          <ul>
            <li>Non-respect volontaire d'une procédure.</li>
            <li>Insulte envers un collègue ou un civil.</li>
            <li>Abus d'autorité.</li>
            <li>Usage injustifié de la force.</li>
            <li>Utilisation abusive du matériel du service.</li>
            <li>Falsification d'un rapport.</li>
            <li>Corruption.</li>
            <li>Divulgation d'informations confidentielles.</li>
            <li>Refus injustifié d'obéir à un ordre légitime.</li>
          </ul>
        `
      },
      {
        number:"46",
        title:"Échelle disciplinaire",
        severity:"warning",
        body:`
          <p>
            Les sanctions peuvent être adaptées à la gravité
            des faits et aux antécédents de l'agent.
          </p>
          <table class="rules-table">
            <thead>
              <tr>
                <th>Niveau</th>
                <th>Sanction possible</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>1</td>
                <td>Rappel à l'ordre</td>
              </tr>
              <tr>
                <td>2</td>
                <td>Avertissement officiel</td>
              </tr>
              <tr>
                <td>3</td>
                <td>Mise à pied / suspension</td>
              </tr>
              <tr>
                <td>4</td>
                <td>Rétrogradation ou retrait de fonction</td>
              </tr>
              <tr>
                <td>5</td>
                <td>Révocation</td>
              </tr>
            </tbody>
          </table>
          <p>
            La gravité des faits, les circonstances et les antécédents
            doivent être pris en considération.
          </p>
        `
      },
      {
        number:"47",
        title:"Circonstances aggravantes",
        severity:"critical",
        body:`
          <p>
            Peuvent notamment constituer des circonstances aggravantes :
          </p>
          <ul>
            <li>Récidive.</li>
            <li>Abus de grade.</li>
            <li>Volonté de dissimuler les faits.</li>
            <li>Conséquences graves pour une victime.</li>
            <li>Atteinte à l'image du département.</li>
            <li>Action commise avec préméditation.</li>
          </ul>
        `
      }
    ]
  },
  {
    id:"formation",
    label:"Formation",
    desc:"Maintien des compétences et obligations de formation.",
    articles:[
      {
        number:"48",
        title:"Formation obligatoire",
        severity:"warning",
        body:`
          <p>
            Les agents doivent participer aux formations
            et mises à niveau imposées par le département.
          </p>
          <p>
            Une formation peut être exigée à la suite d'un incident,
            d'une modification de procédure ou d'un changement
            de fonction.
          </p>
        `
      },
      {
        number:"49",
        title:"Évaluation des compétences",
        severity:"info",
        body:`
          <p>
            Le département peut procéder à des évaluations
            afin de vérifier que les agents disposent des compétences
            nécessaires à l'exercice de leurs fonctions.
          </p>
        `
      }
    ]
  },
  {
    id:"final",
    label:"Dispositions finales",
    desc:"Dispositions relatives à l'application et à la mise à jour du règlement.",
    articles:[
      {
        number:"50",
        title:"Connaissance du règlement",
        severity:"critical",
        body:`
          <p>
            Tout membre du CPD est responsable de connaître
            les règles applicables à ses fonctions.
          </p>
          <p>
            L'ignorance volontaire d'une règle ne constitue pas
            une justification suffisante à un manquement.
          </p>
        `
      },
      {
        number:"51",
        title:"Mise à jour",
        severity:"info",
        body:`
          <p>
            Le présent règlement peut être modifié par l'autorité
            compétente du département afin de tenir compte
            de l'évolution des procédures.
          </p>
          <p>
            Les agents sont responsables de prendre connaissance
            des nouvelles versions publiées.
          </p>
        `
      },
      {
        number:"52",
        title:"Entrée en vigueur",
        severity:"info",
        body:`
          <p>
            Le présent règlement entre en vigueur dès sa publication
            sur les supports officiels du Chicago Police Department.
          </p>
          <div class="notice green">
            <div class="notice-title">Fin du document</div>
            Toute question relative à l'interprétation d'une règle
            doit être adressée à la hiérarchie compétente.
          </div>
        `
      }
    ]
  }
];
