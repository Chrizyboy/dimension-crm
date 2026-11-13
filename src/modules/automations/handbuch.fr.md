---
stand: 2026-11-13
rollen: administration
---

# Automatisations

Quand quelque chose se passe, le CRM fait les étapes suivantes : tâches, notifications, brouillons. Chaque automatisation suit le schéma **Quand** (déclencheur) → **Seulement si** (conditions) → **Alors** (actions dans l’ordre). Le **Journal** montre chaque exécution avec toutes ses étapes.

## Qui travaille ici {#wer}

- **Administration** : crée les automatisations, les active et désactive, consulte le journal.
- **Tous les autres** le remarquent aux tâches, aux notifications et aux brouillons dans la [Boîte d’envoi](kapitel:outbox).

## Comment faire {#so}

### Créer une automatisation

1. **Nouvelle automatisation**, nom et description en allemand et en français.
2. Sous **Quand**, choisir le **Déclencheur**, par exemple **Nouveau lead**, **Offre envoyée**, **Facture en retard**, **Maintenance due** ou **Chaque mois**.
3. Sous **Seulement si**, limiter avec **Ajouter une condition**, par exemple « Site (MU/BU) est BU ». Sans condition, elle s’exécute à chaque événement.
4. Sous **Alors**, ajouter les étapes avec **Ajouter une action** : **Créer une tâche**, **Notifier**, **Attendre**, **Vérifier si encore utile**, **E-mail au client**, **SMS au client**, **Brouillon de facture**, **Rappel de paiement** et d’autres. Ordre avec **Monter** / **Descendre**.
5. Pour mail et SMS, on peut activer **L’IA rédige le texte** : style de l’entreprise, langue du client.
6. Enregistrer et activer.

### Utiliser un modèle

1. La liste contient onze modèles (par exemple nouveau lead → tâche premier contact). Ouvrir, adapter, activer.

### Consulter le journal

1. Vue **Journal**, filtre **En cours**, **Terminées**, **Ignorées** ou **Erreurs**.
2. Ouvrir une exécution : chaque étape avec son résultat. **Ouvrir la fiche** mène au lead, à l’offre ou à la facture.
3. Une exécution attend et n’est plus utile : **Arrêter l’exécution**.

### Paramètres

1. Vue **Paramètres** : **Rendez-vous passés (jours)**, **Maintenance : avance (jours)**, **Facture : délai de grâce (jours)** et le **Lien pour les avis** (variable `{Bewertungslink}`).

## Statuts {#staende}

- Automatisation : active ou **Désactivée** ; envoi **Avec validation** ou **Automatique**.
- Exécution : **En cours**, **En attente**, **Sur le serveur**, **Terminé**, **Ignoré**, **Erreur**, **Arrêté**.

## Automatique {#automatisch}

- Le moteur tourne sur le serveur chaque minute, même si personne n’a le CRM ouvert.
- Seul le nouveau déclenche : ce qui s’est passé avant l’activation ou vient de la reprise ne compte pas.
- Les tâches apparaissent sous [Tâches](kapitel:tasks) et sur [Ma journée](kapitel:today).

## Règles {#regeln}

- Les e-mails, SMS et rappels ne partent jamais tout seuls : ils arrivent comme brouillon dans la boîte d’envoi et attendent un clic. Seule une automatisation réglée expressément sur **Automatique** s’en passe.
- Seule l’administration voit et modifie les automatisations.
- Les automatisations supprimées vont à la corbeille.

## Questions fréquentes {#fragen}

### L’automatisation ne s’est pas déclenchée.

Regarder dans le **Journal**. S’il n’y a rien, la condition ne correspondait pas ou l’événement était antérieur à l’activation. **Ignorées** signifie : **Vérifier si encore utile** a constaté qu’il n’y avait plus rien à faire.

### J’ai besoin d’un déclencheur qui n’existe pas.

Les nouveaux déclencheurs sont construits par le développement dans la base de données. Décrire ce qui doit se passer via **Signaler un problème** dans le [Manuel](kapitel:knowledge).

## Nouveautés {#neu}

- 13.11.2026: La vue d’ensemble s’ouvre à nouveau, même quand des automatisations ont déjà tourné.
- 24.10.2026: Erreurs dans la liste avec « Réessayer » et « Signaler un problème ».
- 23.10.2026: L’IA rédige les textes de mail et SMS dans la langue du client.
- 23.10.2026: Automatisations avec journal ; tâches et notifications viennent du serveur.
