# ARCHITECTURE.md

## Architecture fonctionnelle cible

```text
Utilisateur
   |
   +--> Accueil
   |      |
   |      +--> Visiteur
   |      |      |
   |      |      +--> Informations publiques
   |      |      +--> Candidater Police Academy
   |      |
   |      +--> Policier
   |             |
   |             +--> Discord OAuth2
   |             +--> Vérification autorisation
   |             +--> MDT
   |
   +--> Police Academy Back-office
          |
          +--> Tableau de bord
          +--> Agents
          |      |
          |      +--> Annuaire
          |      +--> Fiche agent
          |      +--> Dossier général
          |      +--> Formations
          |      +--> Historique
          |
          +--> Demandes de recrutement
          |      |
          |      +--> En cours
          |      +--> Fermées
          |      +--> Archives
          |      +--> Toutes
          |      +--> Décisions
          |      +--> Historique ticket
          |
          +--> Discord Bot
          |
          +--> Neon PostgreSQL
```

## Flux candidature

```text
Formulaire site
   |
   v
Validation serveur
   |
   v
Création candidature Neon
   |
   v
Création ticket Discord
   |
   v
Instructeur
   |
   +--> Accepter
   +--> Refuser
   +--> Clôturer
   |
   v
Journalisation Neon
   |
   v
Archivage ticket
```

L'ordre réel peut différer selon le code existant. Ne pas réécrire une V1 stable uniquement pour respecter ce schéma.

## Séparation recommandée

### Frontend

Responsabilités :
- rendu ;
- navigation ;
- formulaires ;
- appels API ;
- affichage des états ;
- feedback utilisateur.

Ne jamais effectuer de décision d'autorisation critique uniquement côté frontend.

### API / Backend Vercel

Responsabilités :
- session ;
- OAuth ;
- autorisations ;
- appels Discord protégés ;
- accès Neon ;
- validation ;
- transitions de statuts ;
- journalisation.

### Discord

Responsabilités :
- rôles ;
- guilds ;
- tickets ;
- interactions boutons ;
- éventuelles notifications.

### Neon

Responsabilités :
- candidatures ;
- dossiers agents ;
- formations ;
- événements / historique ;
- métadonnées des tickets ;
- archivage logique.

## Modèle de données cible indicatif

Ne pas appliquer tel quel sans inspecter le schéma existant.

### candidatures

Champs possibles :
- id
- discord_user_id
- rp_name
- status
- ticket_channel_id
- created_at
- closed_at
- decided_at
- decided_by_discord_id
- decision_reason
- archived_at

### academy_agent_files

Champs déjà observés historiquement :
- discord_id
- rp_name
- matricule
- academy_status
- general_note
- created_at
- updated_at

### academy_trainings

Champs possibles :
- id
- agent_discord_id
- title
- training_type
- training_date
- note
- result
- instructor_discord_id
- instructor_name
- created_at
- updated_at
- updated_by_discord_id
- archived_at
- archived_by_discord_id

### recruitment_ticket_messages

Champs possibles :
- id
- candidature_id
- discord_message_id
- author_discord_id
- author_name
- content
- sent_at
- edited_at

### recruitment_ticket_attachments

Ne stocker que les métadonnées / références adaptées :
- id
- message_id
- filename
- content_type
- size
- source_url ou storage_key si une stratégie durable existe

### audit_log

Champs possibles :
- id
- actor_discord_id
- actor_name
- entity_type
- entity_id
- action
- previous_state JSONB
- new_state JSONB
- metadata JSONB
- created_at

## Statuts recommandés

Pour une candidature, préférer des valeurs explicites et stables, par exemple :

```text
OPEN
UNDER_REVIEW
ACCEPTED
REFUSED
CLOSED
ARCHIVED
```

Ne pas changer les valeurs actuelles si le dépôt en utilise déjà d'autres sans prévoir une migration compatible.

## Convention de suppression

Par défaut :

```text
Actif -> Archivé -> éventuellement suppression définitive administrative
```

Éviter :

```text
Actif -> DELETE immédiat
```

pour les dossiers métier importants.
