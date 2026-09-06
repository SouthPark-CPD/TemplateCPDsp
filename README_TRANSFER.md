# Pack de transfert Codex — CPD MDT / Police Academy

Ce dossier sert uniquement à transmettre le contexte du projet à Codex.

## Où placer les fichiers

Dépose tous les fichiers `.md` de ce pack à la racine du dépôt, au même niveau que `package.json` si le projet en possède un.

Exemple :

```text
mon-projet/
├── AGENTS.md
├── CODEX_START_HERE.md
├── PROJECT_CONTEXT.md
├── ARCHITECTURE.md
├── BACKLOG.md
├── SECURITY_AND_SECRETS.md
├── HANDOVER_CHECKLIST.md
├── package.json
├── ...
```

## Premier message conseillé à Codex

Copier :

```text
Lis d'abord AGENTS.md puis CODEX_START_HERE.md et tous les documents de contexte associés.

Inspecte ensuite l'intégralité du dépôt afin de comparer l'état réel du code avec PROJECT_CONTEXT.md.

Ne modifie encore aucun fichier.

Commence par me faire l'audit de reprise demandé dans CODEX_START_HERE.md, puis indique-moi précisément ce qui existe déjà, ce qui manque et quels fichiers seront concernés par la prochaine étape : le système complet "Demandes de recrutement" avec gestion et historique des tickets Discord.
```

Après son audit, Codex pourra commencer les modifications.

## Important

Ce pack ne contient volontairement aucun token, mot de passe ou secret.
Les valeurs sensibles doivent déjà être configurées dans Vercel ou votre environnement local.
