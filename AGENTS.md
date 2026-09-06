# AGENTS.md — CPD / Police Academy

Ce dépôt correspond au site MDT / Police Academy du serveur RP Chicago Police Department.

## Mission de Codex

Tu dois reprendre le projet existant, l'améliorer progressivement et préserver tout ce qui fonctionne déjà.

Avant toute modification :
1. Lis `PROJECT_CONTEXT.md`.
2. Lis `ARCHITECTURE.md`.
3. Lis `BACKLOG.md`.
4. Inspecte le dépôt réel avant de modifier quoi que ce soit.
5. Ne suppose jamais qu'une route, une table, une variable d'environnement ou un fichier existe sans l'avoir vérifié.

## Règles absolues

- Ne casse jamais une fonctionnalité existante pour en ajouter une nouvelle.
- Préfère modifier l'architecture existante plutôt que recréer le projet.
- Évite d'augmenter inutilement le nombre de fonctions serverless Vercel.
- Le projet doit rester compatible avec le plan gratuit Vercel.
- Neon PostgreSQL est la base persistante du projet.
- Les secrets doivent rester dans les variables d'environnement.
- Ne jamais écrire dans le dépôt :
  - token du bot Discord ;
  - `DATABASE_URL` ;
  - secret OAuth Discord ;
  - cookies/session secrets ;
  - credentials ou clés privées.
- Ne jamais exposer un secret côté navigateur.
- Ne supprime pas une table ou une colonne sans vérifier les dépendances.
- Pour les actions destructives importantes, privilégie l'archivage logique à la suppression définitive.
- Toute action administrative importante doit idéalement laisser une trace dans l'historique.
- Maintiens le design existant et les conventions du dépôt lorsque celles-ci sont cohérentes.

## Méthode de travail

Pour chaque demande :

1. Inspecter les fichiers concernés.
2. Identifier l'impact côté front, backend, Discord et Neon.
3. Vérifier les routes API déjà disponibles.
4. Réutiliser une route existante lorsque c'est proprement possible.
5. Modifier le minimum de fichiers nécessaire.
6. Tester syntaxe, imports, routes et SQL.
7. Signaler clairement :
   - fichiers modifiés ;
   - nouvelles variables d'environnement ;
   - migration SQL éventuelle ;
   - action manuelle à effectuer dans Neon/Vercel/Discord ;
   - risques ou éléments non testables localement.

## UX / design

Le style cible est moderne, professionnel et orienté application métier :
- esthétique glass / liquid inspirée d'Apple ;
- navigation horizontale en haut ;
- pas de sidebar principale si la navigation horizontale suffit ;
- navigation cohérente entre les pages ;
- bonne lisibilité ;
- responsive ;
- formulaires sans débordement horizontal ;
- accès rapides visibles ;
- français propre et professionnel.

## Autorisations

Les fonctions administratives Police Academy doivent être accessibles uniquement aux utilisateurs autorisés.

Le rôle Discord Instructor Police Academy est la référence actuelle pour les fonctions de gestion Academy.

Toute vérification d'autorisation critique doit être faite côté serveur et non uniquement dans l'interface.

## Base de données

Avant de produire une migration :
- inspecter le schéma existant ;
- privilégier `ALTER TABLE` / `CREATE TABLE IF NOT EXISTS` lorsque pertinent ;
- ne pas détruire les données ;
- prévoir les timestamps nécessaires ;
- conserver les historiques.

## Discord

Le même bot peut être utilisé pour les fonctions déjà présentes de candidature/tickets et les évolutions associées.

Ne jamais modifier les IDs de serveur/rôle/catégorie fournis dans `PROJECT_CONTEXT.md` sans demande explicite ou preuve qu'ils sont obsolètes.

## État de référence

Le dépôt réel est toujours la source de vérité technique.

Les fichiers de ce pack décrivent l'intention fonctionnelle et l'état connu au moment du transfert, mais si une divergence existe, inspecte le code puis adapte la solution au dépôt réel.
