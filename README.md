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
```

Adresse de redirection à déclarer dans Discord Developer Portal :

```text
https://template-cp-dsp.vercel.app/api/auth/callback
```

Le serveur autorisé est `1408092767963451615` et le rôle requis est `1408092768026365974`. La session chiffrée dure 30 jours. L'autorisation Discord est renouvelée silencieusement et le rôle est revérifié au maximum une heure après un changement.

Après ajout ou modification des variables Vercel, lancer un nouveau déploiement pour les appliquer.
