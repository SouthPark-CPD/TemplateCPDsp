# CODEX_START_HERE.md

Tu reprends un projet existant en production.

## Première tâche obligatoire

Avant d'écrire du code, inspecte le dépôt et produis une synthèse courte avec :

1. stack détectée ;
2. arborescence importante ;
3. pages principales ;
4. routes API ;
5. fichiers liés à Discord ;
6. fichiers liés à Neon ;
7. mécanisme d'authentification ;
8. nombre approximatif de fonctions Vercel ;
9. tables / migrations détectées ;
10. état réel du module Police Academy ;
11. état réel du système de candidatures / tickets ;
12. différences éventuelles avec `PROJECT_CONTEXT.md`.

Ensuite seulement, propose les fichiers à modifier pour la demande courante.

## Demande fonctionnelle prioritaire

Finaliser un système complet de :

`Demandes de recrutement`

avec gestion des tickets Discord et historique consultable dans le back-office Academy.

Lire `BACKLOG.md`.

## Important

Ne recrée pas tout le projet.

Réutilise :
- les composants ;
- styles ;
- routes ;
- helpers ;
- middleware ;
- clients Discord ;
- clients DB ;
- mécanismes de session

déjà présents lorsqu'ils sont corrects.

## Format attendu après chaque intervention Codex

Répondre avec :

```text
Résumé
- ...

Fichiers modifiés
- ...

Base de données
- aucune migration
ou
- migration SQL : ...

Variables d'environnement
- aucune
ou
- ...

Tests effectués
- ...

Actions manuelles restantes
- ...
```

Si une hypothèse n'est pas vérifiable, le signaler explicitement.
