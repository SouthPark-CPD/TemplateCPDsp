# BACKLOG.md

## Priorité actuelle — gestion complète des demandes de recrutement

C'est la prochaine grande fonctionnalité demandée avant le transfert.

### P0 — indispensable

- Ajouter / finaliser la section `Demandes de recrutement`.
- Onglet `En cours`.
- Onglet `Fermées`.
- Onglet `Archives`.
- Onglet `Toutes`.
- Liste des candidatures.
- Recherche candidat.
- Filtres par statut.
- Ouverture d'une candidature.
- Détails candidat.
- Référence au ticket Discord.
- Actions Accepter / Refuser / Clôturer.
- Historique des décisions.
- Identité de l'instructeur.
- Horodatage.
- Sauvegarde Neon.
- Protection serveur par rôle Instructor.

### P0 — historique ticket

Lors de la fermeture / archivage :
- récupérer les messages du ticket Discord lorsque possible ;
- sauvegarder les métadonnées nécessaires ;
- conserver auteur + date + contenu ;
- conserver les références des pièces jointes ;
- relier l'archive à la candidature ;
- permettre la consultation ultérieure dans le panneau.

### P1 — administration

- Réouverture / restauration lorsqu'elle est cohérente.
- Archivage manuel.
- Raison obligatoire pour un refus.
- Raison de clôture.
- Journal d'actions.
- Badge de statut.
- Tri par date.
- Filtres par instructeur.
- Pagination si volume important.

### P1 — UX

Dans une fiche demande :
- entête candidat ;
- statut visible ;
- timeline ;
- actions principales visibles sans descendre toute la page ;
- transcript du ticket lisible ;
- pièces jointes clairement identifiées ;
- confirmation UI pour actions destructives.

### P1 — intégration agents

Après acceptation :
prévoir la possibilité de créer ou préparer automatiquement le dossier Academy de l'agent si cela correspond au workflow existant.

Ne pas automatiser une attribution de rôle Discord sans vérifier la logique métier déjà présente.

### P2 — statistiques

Dashboard Academy :
- demandes ouvertes ;
- demandes acceptées ;
- demandes refusées ;
- délai moyen de traitement ;
- nombre de demandes par période ;
- activité par instructeur.

### P2 — qualité

- validation serveur de tous les statuts ;
- contrôle des transitions ;
- éviter doubles décisions ;
- empêcher une action concurrente incohérente ;
- messages d'erreur propres ;
- journalisation des erreurs API Discord sans fuite de secret.

---

## Dossiers agents — état fonctionnel attendu

Fonctions historiquement demandées / livrées par étapes :

- annuaire agents ;
- fiche agent ;
- dossier général ;
- note générale ;
- ajout de formation ;
- historique chronologique ;
- modification formation ;
- archivage formation ;
- restauration formation ;
- instructeur de création / modification.

Codex doit vérifier ce qui est réellement présent dans le dépôt avant de considérer ce backlog comme réalisé.

---

## Idées d'amélioration proposées

À n'implémenter qu'après stabilisation du P0/P1 :

- timeline unique candidature + actions Discord ;
- indicateur `Nouveau` pour demande non consultée ;
- assignation volontaire d'une demande à un instructeur ;
- filtre `Mes demandes` ;
- notes internes non visibles du candidat ;
- historique des changements de statut ;
- détection de doublons de candidature ;
- export d'un transcript HTML/PDF si réellement utile ;
- rétention configurable des archives ;
- recherche plein texte sur candidatures / transcripts ;
- indicateur de ticket Discord supprimé / encore existant.

---

## Critères d'acceptation généraux

Une évolution est considérée prête seulement si :

1. elle ne casse pas les fonctions existantes ;
2. les autorisations sont contrôlées côté serveur ;
3. les erreurs API sont gérées ;
4. les actions importantes sont persistées ;
5. le responsive reste correct ;
6. aucune clé secrète n'est ajoutée au dépôt ;
7. aucune migration destructive n'est faite sans nécessité ;
8. l'impact Vercel est vérifié.
