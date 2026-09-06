# SECURITY_AND_SECRETS.md

## Ne jamais committer

Ne jamais placer dans Git :

```text
DISCORD_BOT_TOKEN
DISCORD_CLIENT_SECRET
DATABASE_URL
NEON_DATABASE_URL
SESSION_SECRET
JWT_SECRET
COOKIE_SECRET
API_PRIVATE_KEY
```

ou toute valeur équivalente.

## Variables d'environnement

Les noms exacts doivent être découverts dans le dépôt / Vercel.

Ne pas renommer les variables existantes sans nécessité.

Exemples de catégories probables :
- Discord client ID
- Discord client secret
- Discord bot token
- Discord redirect URI
- session secret
- Neon / PostgreSQL connection string

## OAuth / session

- utiliser cookies sécurisés ;
- `HttpOnly` lorsque applicable ;
- `Secure` en production ;
- `SameSite` adapté au flux OAuth ;
- vérifier `state` dans OAuth si l'implémentation le permet ;
- expiration de session maîtrisée ;
- ne pas exposer les données de session sensibles dans le frontend.

## Autorisation

Une page cachée n'est pas une protection.

Toute API Academy doit vérifier côté serveur :
1. identité ;
2. session ;
3. rôle autorisé.

## Discord

Les IDs de guild/rôle ne sont pas des secrets.
Les tokens et secrets OAuth le sont.

## SQL

Toujours utiliser des requêtes paramétrées.

Interdit :
construire une requête SQL à partir de chaînes utilisateur concaténées.

## Logs

Ne jamais loguer :
- token Discord ;
- secret OAuth ;
- URL PostgreSQL complète ;
- cookie de session ;
- Authorization header.

## Archivage tickets

Avant de persister un transcript :
- limiter aux données réellement nécessaires au projet ;
- ne pas stocker de fichier binaire volumineux dans Neon ;
- vérifier la pérennité des URLs Discord si elles sont utilisées comme référence ;
- prévoir une stratégie dédiée si la conservation longue durée des pièces jointes devient nécessaire.
