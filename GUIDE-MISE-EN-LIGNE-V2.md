# Mise en ligne de la V2

## 1. Mettre à jour le bot en premier

1. Ouvrir le gestionnaire de fichiers de l'hébergeur du bot.
2. Arrêter temporairement le bot.
3. Ne pas supprimer le fichier `.env` et ne pas modifier `DISCORD_TOKEN`.
4. Envoyer les fichiers de l'archive du bot à la racine de son hébergement.
5. Remplacer les fichiers Python existants et le dossier `commands`.
6. Si les fichiers JSON de l'hébergement sont plus récents, conserver ceux de l'hébergement : `activity.json`, `convocations.json`, `members.json` et `grade_roles.json`.
7. Vérifier que `academy_tickets.py` et `academy_ticket_utils.py` sont bien à côté de `bot.py`.
8. Redémarrer le bot avec la commande habituelle.
9. Dans les logs, vérifier la présence de `Contrôles Academy vérifiés`.

## 2. Mettre ensuite ce site à jour

1. Décompresser cette archive sur le PC.
2. Ouvrir le dépôt GitHub `SouthPark-CPD/TemplateCPDsp`.
3. Envoyer le contenu de l'archive à la racine du dépôt, sans créer un dossier supplémentaire autour des fichiers.
4. Remplacer les fichiers portant le même nom.
5. Ne jamais envoyer de fichier `.env` sur GitHub.
6. Valider le commit sur la branche `main`.
7. Attendre que Vercel termine automatiquement le nouveau déploiement Production.

Aucune variable Vercel supplémentaire n'est nécessaire pour cette V2.

## 3. Test rapide

1. Tester une commande existante du bot.
2. Ouvrir le ticket déjà existant ou créer une nouvelle candidature.
3. Tester `Clore le ticket` puis `Rouvrir le ticket`.
4. Refermer le ticket et tester l'annulation de la suppression.
5. Confirmer la suppression uniquement avec un ticket qui peut réellement être supprimé.

