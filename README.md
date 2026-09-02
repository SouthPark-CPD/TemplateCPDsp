# Portail Chicago Police Department

- `/` : accueil général avec les accès Visiteur et Policier
- `/public/` : espace public
- `/auth/login.html` : connexion agent via Discord
- `/mdt/` : MDT policier existant

## Authentification Discord sur Vercel

Le projet contient désormais le backend OAuth2 et la protection de `/mdt/*`.

Variables requises dans l'environnement `Production` de Vercel :

```text
DISCORD_CLIENT_ID=1539552880774746253
DISCORD_CLIENT_SECRET=<secret enregistré uniquement dans Vercel>
DISCORD_BOT_TOKEN=<token du bot enregistré uniquement dans Vercel>
```

Adresse de redirection à déclarer dans Discord Developer Portal :

```text
https://template-cp-dsp.vercel.app/api/auth/callback
https://template-cp-dsp.vercel.app/api/candidate-auth/callback
```

Le serveur autorisé est `1408092767963451615` et le rôle requis est `1408092768026365974`. La session chiffrée dure 30 jours. L'autorisation Discord est renouvelée silencieusement et le rôle est revérifié au maximum une heure après un changement.

La seconde adresse est utilisée par les candidats. Elle récupère uniquement leur identité Discord, sans demander le rôle policier. Leur connexion reste enregistrée pendant 30 jours.

## Candidatures Police Academy

Le formulaire public crée automatiquement un ticket privé dans :

```text
Serveur Academy : 1538858756354473984
Catégorie : 1538858758116089927
```

Le bot copie les permissions déjà présentes sur la catégorie, puis autorise uniquement le candidat concerné. Les rôles Academy n'ont donc pas besoin d'être inscrits dans le code.

Le rôle Discord du bot doit pouvoir voir la catégorie et disposer de :

```text
Voir les salons
Gérer les salons
Gérer les permissions
Envoyer des messages
Intégrer des liens
Joindre des fichiers
Lire l'historique des messages
```

Le token ne doit jamais être ajouté au dépôt GitHub. Après l'ajout ou la modification d'une variable Vercel, un nouveau déploiement est nécessaire.

Après ajout ou modification des variables Vercel, lancer un nouveau déploiement pour les appliquer.
