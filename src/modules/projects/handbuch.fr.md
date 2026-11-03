---
stand: 2026-11-03
rollen: projektleitung, geschaeftsleitung, innendienst
---

# Projets & montage

Chaque commande signée passe ici par les autorisations, la préparation et le montage jusqu’à la mise en service (MES) et la clôture. Avec la planification des chantiers par site et par semaine, les sous-traitants et les absences.

## Qui travaille ici {#wer}

- **Direction de projet (Andy, José)** : mène les projets, planifie chantiers et interventions.
- **Service interne** : dépose les demandes et suit les autorisations.
- **Direction** : vue d’ensemble de tous les chantiers.

## Comment faire {#so}

### Commencer la journée au poste de pilotage

1. Vue **Poste de pilotage** : tous les projets en **Tableau** par phase ou en **Liste**. Les cartes avec une indication rouge sont bloquées (commander le matériel, autorisation en retard, paiement ouvert, défauts).
2. Vue **Ma semaine** : ce qui est dû cette semaine et la suivante, en haut **En retard et bloqués**. Basculer entre **Mes projets** et **Tous les projets**.
3. Un clic sur une carte ouvre le dossier du projet en pleine page.

### Noter défauts et travaux restants

1. Dans le dossier, la carte **Défauts et travaux restants** : choisir le type (**Défaut** ou **Travail restant**), texte, délai, **Saisir**.
2. La coche le marque réglé ; les éléments réglés peuvent être rouverts.
3. Tant que quelque chose est ouvert, la **remise** ne peut pas être clôturée.

### Saisir les intervenants

1. Dans le dossier, la carte **Intervenants**, **Ajouter** : rôle (électricien, échafaudage, gestionnaire de réseau …) et contact du carnet d’adresses.
2. Téléphone et e-mail figurent alors directement dans le dossier. Les rôles sont une liste de choix dans les paramètres.

### Planifier une nouvelle commande

1. Vue **Chantiers**, en haut **Commandes sans date de chantier** (les plus récentes d’abord).
2. **Date de chantier** : avec date (date fixée, intervention de l’équipe interne), sans date (**Reprendre sans date**) ou dans le passé (considérée comme construite).
3. Chaque reprise s’annule avec **Annuler la dernière étape de chantier**.

### Suivre la feuille de route d’un projet

1. Ouvrir le projet, onglet **Feuille de route** : six phases de la commande à la clôture.
2. Un clic sur une étape pose le statut suivant ; date, délai et note peuvent être saisis.
3. Les étapes **posées automatiquement** viennent du contrat, du plan de paiement, du planning ou de la date de MES. Pas à la main.

### Déposer et suivre les autorisations

1. Vue **Autorisations** : toutes les autorisations ouvertes, en retard et bientôt dues de tous les projets.
2. Dans le projet, imprimer les demandes pré-remplies : **Demande de raccordement (TAG)**, **Annonce à la commune**, **Subvention (Pronovo)**.
3. Noter dépôt et autorisation avec la date.

### Planifier les interventions

1. Vue **Planning** : vue **Chantiers** ou **Équipe**, période 2 semaines, 6 semaines ou trimestre.
2. À droite sous **À planifier** : chantiers sans date ; les glisser sur le planning.
3. Glisser une barre déplace l’intervention, au bord droit on change la fin. Rouge = conflit (absent ou en double).
4. **Imprimer / PDF** pour l’affichage.

### Demander un sous-traitant

1. Ouvrir le projet, onglet **Sous-traitants**, **Mandat au sous-traitant** : prestation, montant, date.
2. **Demande par e-mail** met la demande dans la [Boîte d’envoi](kapitel:outbox).
3. Noter la réponse : **Confirmé** ou **Annulé**.

### Saisir des absences

1. Vue **Absences**, **Saisir une absence** : personne, du, au, demi-journée.
2. Vacances et « absent » d’Outlook apparaissent tout seuls.

### Mise en service et clôture

1. Le monteur remplit le procès-verbal de MES sur mobile, voir [Chantier & rapports](kapitel:fieldwork).
2. Avec la MES, l’installation est créée dans [Service & garantie](kapitel:aftersales).

## Statuts {#staende}

- **Commande** : signée, pas encore en chantier.
- **Date en attente / Date fixée** : en planification.
- **En chantier** : montage en cours.
- **MES en attente** : construit, mise en service manquante.
- **Terminé / Clôturé** : tout est fait, dossier fermé.
- Matériel : **Matériel ouvert**, **Matériel commandé**, **Matériel en stock**.

## Automatique {#automatisch}

- Un projet naît avec le contrat d’entreprise signé.
- Contrat, date, montage, MES et paiements posent leurs étapes dans la feuille de route.
- Le matériel du projet vient du chapitre [Achats & matériel](kapitel:purchasing).

## Règles {#regeln}

- Ne jamais poser à la main les étapes automatiques. Annuler seulement avec **Annuler la dernière étape de chantier**.
- La check-list électricien fait partie de la feuille de route et doit être faite avant la MES.
- Remise seulement quand aucun défaut ni travail restant n’est ouvert.
- Les infos client aux étapes clés ne partent qu’après validation dans la [Boîte d’envoi](kapitel:outbox).

## Questions fréquentes {#fragen}

### Je ne peux pas cliquer une étape.

Elle est posée automatiquement ; l’indication montre d’où elle vient (p. ex. « Vient du plan de paiement »).

### La date est dans le passé.

L’installation est alors considérée comme construite : les étapes jusqu’au montage sont faites et l’installation créée. Tout peut être annulé.

### Pourquoi l’historique affiche « Info client en attente de validation » ?

Au contrat, à la date, au montage, à la MES et à la réception, l’automation prépare une info pour le client. Elle ne part que lorsque quelqu’un la valide dans la boîte d’envoi.

## Nouveautés {#neu}

- 03.11.2026: «Mettre à la corbeille» pour les projets (menu «⋯» dans le dossier du projet), avec confirmation et «Annuler». Restaurer depuis la corbeille (menu en haut à droite).
- 03.11.2026: Interventions avec activités (nacelle, remorque, toit avant 1990) ; s’il manque un permis obligatoire dans l’équipe, le planning avertit en jaune.
- 03.11.2026: Poste de pilotage, Ma semaine et dossier de projet en pleine page ; défauts et travaux restants, intervenants avec rôle, info client aux étapes clés avec validation.
- 01.11.2026: Planning des chantiers avec vue chantiers ou équipe, conflits en rouge.
