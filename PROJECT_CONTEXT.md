# PROJECT_CONTEXT.md

## 1. Présentation

Projet : CPD Administration Center / MDT / Police Academy

Objectif global :
fournir un site web RP moderne pour le Chicago Police Department avec plusieurs espaces fonctionnels et un back-office Police Academy relié à Discord et Neon.

Le projet est hébergé sur Vercel et le code est versionné sur GitHub.

URL Vercel historiquement utilisée :
`template-cp-dsp.vercel.app`

Le dépôt réel doit être inspecté car cette URL ou le nom du projet peuvent avoir évolué.

---

## 2. Stack connue

- HTML
- CSS
- JavaScript
- API / fonctions serverless Vercel
- Discord OAuth2
- Discord Bot API
- Neon PostgreSQL
- GitHub
- Vercel

La structure exacte du framework doit être déterminée depuis le dépôt actuel.

---

## 3. Contraintes d'hébergement

Le projet doit rester compatible avec le plan gratuit Vercel.

Une contrainte importante des précédentes étapes était de ne pas créer inutilement de nouvelles fonctions API.

Lors des dernières évolutions Academy, certaines fonctionnalités étaient regroupées dans un routeur existant, notamment un fichier nommé historiquement :

`academy-router.js`

Ne jamais supposer qu'il existe encore ou qu'il porte toujours ce nom : vérifier le dépôt.

---

## 4. Authentification

### Accès Policier

L'accès Policier utilise Discord OAuth2.

Le site doit vérifier l'appartenance / le rôle CPD côté serveur.

L'utilisateur souhaitait une session persistante afin d'éviter une reconnexion Discord systématique.

### Serveur CPD principal

Guild ID :
`1408092767963451615`

Rôle principal CPD historiquement vérifié :
`1408092768026365974`

Nom :
Chicago Police Department

### Serveur Police Academy

Guild ID :
`1538858756354473984`

Rôle Instructor Police Academy :
`1538858756371386400`

Les membres possédant ce rôle doivent pouvoir accéder aux fonctions de gestion de la Police Academy.

Catégorie Discord historiquement utilisée pour les tickets Academy :
`1538858758116089927`

---

## 5. Bot Discord

Nom historique :
`CPD – Administration Center`

Le même bot a été utilisé pour :
- OAuth / interactions Discord selon l'architecture du projet ;
- création de tickets de candidature ;
- gestion de fermeture de ticket ;
- futures fonctions d'archives et d'administration.

Ne jamais stocker son token dans le dépôt.

---

## 6. Accueil du site

La page d'accueil doit rester simple.

Choix principaux souhaités :
- Visiteur
- Policier

Pour le visiteur, le bouton / parcours `Candidater` doit être mis en avant.

---

## 7. Navigation et design

Préférences validées ou répétées :

- style moderne ;
- glass / liquid ;
- inspiration Apple ;
- rendu professionnel ;
- navigation horizontale en haut ;
- pas de sidebar principale ;
- toutes les pages doivent conserver une navigation cohérente ;
- l'accès rapide doit être visible ;
- corrections des fautes de français ;
- éviter les interfaces trop chargées.

La page `Tenues` avait été jugée satisfaisante sur la navigation.

Une ancienne page `Division` devait être supprimée.

---

## 8. Candidature Police Academy

Une V1 de candidature existe historiquement.

Fonctionnement :
1. formulaire multi-étapes sur le site ;
2. création d'un ticket Discord ;
3. ticket créé sur le serveur Police Academy.

La création de ticket avait été validée comme fonctionnelle.

Un problème UI avait été constaté sur la dernière étape du formulaire :
débordement / scroll horizontal.

Le visiteur ne devait initialement pas être forcé à se connecter à Discord avant de candidater, mais le fonctionnement réel du dépôt doit être préservé si la V1 actuellement déployée est stable.

---

## 9. Tickets Discord

La V1 permet la création d'un ticket de candidature.

Un bouton :
`Clore le ticket`

a été ajouté directement dans le ticket.

L'objectif est d'éviter les commandes texte pour la fermeture.

Une fermeture ne doit pas entraîner une perte irréversible des données utiles.

Le système cible doit pouvoir distinguer :
- tickets en cours ;
- tickets fermés ;
- tickets archivés ;
- éventuellement tickets supprimés de Discord après sauvegarde.

---

## 10. Police Academy — agents

Le back-office doit pouvoir récupérer ou synchroniser des agents CPD à partir de Discord.

Chaque agent peut disposer de plusieurs rôles Discord.

Le système doit déterminer le grade métier pertinent / le plus élevé selon la hiérarchie définie.

### Grades inclus dans le suivi formation

| Grade | Role ID |
|---|---|
| Officier 1 | `1408092768043270224` |
| Officier 2 | `1408092768047337692` |
| Officier 3 | `1408092768047337693` |
| Detective | `1408092768047337694` |
| FTO | `1408092768047337697` |
| Sergeant 1 | `1408092768047337700` |
| Sergeant 2 | `1443306212488646848` |
| Lieutenant 1 | `1408092768055595314` |
| Lieutenant 2 | `1443306145463926895` |
| Capitaine | `1505210763499798750` |

### Grades supérieurs exclus du suivi formation standard

| Grade | Role ID |
|---|---|
| Commander | `1505209645764055100` |
| Deputy Chief | `1530139558333907014` |
| Chief | `1530139086474444831` |
| First Deputy Chief | `1540684488043143280` |
| Superintendant Chief | `1530139099757805741` |
| Chief Supreme | `1540495833529589770` |

Ces grades supérieurs peuvent rester visibles ailleurs dans le système, mais ne doivent pas nécessairement être inclus dans le parcours standard de formation Academy.

---

## 11. Dossiers agents

Le back-office Academy doit permettre :

- annuaire des agents ;
- recherche ;
- ouverture de la fiche d'un agent ;
- affichage du grade ;
- dossier général ;
- note générale ;
- historique des formations ;
- ajout d'une formation ;
- modification d'une formation ;
- archivage d'une formation ;
- restauration d'une formation archivée ;
- traçabilité de l'instructeur ;
- dates de création et de dernière modification.

Un schéma Neon historiquement observé comportait notamment une table :

`academy_agent_files`

Colonnes vues :
- `discord_id`
- `rp_name`
- `matricule`
- `academy_status`
- `general_note`
- `created_at`
- `updated_at`

Le schéma actuel doit être vérifié avant toute migration.

---

## 12. Formations

Le système a été conçu pour conserver un historique chronologique.

Une formation doit idéalement inclure :
- agent ;
- type / titre de formation ;
- date ;
- note / compte rendu ;
- résultat / statut si pertinent ;
- instructeur ;
- date de création ;
- dernière modification ;
- auteur de la dernière modification ;
- statut actif / archivé.

Archivage logique recommandé :
une formation erronée ne doit pas être supprimée définitivement par défaut.

Les formations archivées doivent pouvoir être affichées séparément et restaurées.

---

## 13. Demandes de recrutement

Une section back-office doit être présente ou ajoutée sous le nom :

`Demandes de recrutement`

Elle doit centraliser les candidatures et tickets Academy.

Structure fonctionnelle cible :

- En cours
- Fermées
- Archives
- Toutes

Fonctions souhaitées :
- voir la liste des demandes ;
- recherche ;
- filtres ;
- ouvrir une demande ;
- voir les informations du candidat ;
- afficher le ticket / historique ;
- accepter ;
- refuser ;
- clôturer ;
- archiver ;
- supprimer uniquement lorsque cela est réellement nécessaire ;
- conserver une trace des décisions ;
- connaître l'instructeur ayant réalisé une action ;
- horodatage des actions.

La suppression définitive doit rester exceptionnelle.

---

## 14. Historique des tickets

Objectif :
conserver l'historique d'un ticket Discord même lorsque le salon est ensuite supprimé.

À sauvegarder si techniquement disponible :
- Discord user ID candidat ;
- nom / pseudo ;
- RP name ;
- numéro / ID de candidature ;
- channel ID ;
- statut ;
- date de création ;
- date de fermeture ;
- décision ;
- instructeur ayant pris la décision ;
- messages utiles ;
- auteurs ;
- timestamps ;
- références des pièces jointes ;
- raison de fermeture / refus ;
- journal d'actions.

Attention :
la stratégie de stockage des pièces jointes doit être réaliste. Neon n'est pas destiné à stocker de gros fichiers binaires directement.

---

## 15. Données / historique

L'objectif métier général est :
ne pas perdre l'information lors d'une fermeture ou d'une correction.

Pour les données sensibles à l'historique :
- utiliser des timestamps ;
- stocker l'auteur de l'action ;
- préférer un statut d'archive ;
- prévoir un journal d'événements lorsque pertinent.

---

## 16. Source de vérité

Ce document est un contexte de reprise.

Codex doit d'abord inspecter :
- `package.json`
- arborescence du projet
- routes API
- fichiers Discord
- fichiers OAuth/session
- SQL ou migrations
- appels Neon
- pages Academy
- variables d'environnement référencées

Le code actuel reste prioritaire sur toute hypothèse de ce document.
