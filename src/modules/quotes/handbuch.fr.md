---
stand: 2026-11-02
rollen: innendienst, verkauf, geschaeftsleitung
---

# Offres

Ici, un lead devient une offre : le service interne la prépare, le service externe la vérifie, le client la reçoit, puis on relance jusqu’à l’accord ou au refus. En cas d’accord, **Créer la commande** mène au contrat d’entreprise. La planification se fait dans Eturnity, les valeurs arrivent dans le CRM par PDF.

## Qui travaille ici {#wer}

- **Service interne** : prépare les nouvelles offres (par défaut Andy, Chris en appui).
- **Vente** : vérifie, relance et note la décision.
- **Direction** : vue d’ensemble Muri et Bulle.

## Comment faire {#so}

### Lire le travail en cours

1. **Offres** s’ouvre sur le **Travail en cours** : chaque offre est une carte dans sa phase, de « À offrir » à « Gagnée ».
2. Traiter d’abord les indications rouges et orange : en retard (visite il y a plus de 5 jours ouvrables), relance due, validation nécessaire, question.
3. Cliquer une carte : l’offre s’ouvre en pleine page avec étapes, variantes, documents et prochaine étape.

### Préparer une nouvelle offre

1. Ouvrir l’onglet **Nouvelles offres**. Tous les leads au statut « Offre en préparation » y figurent.
2. Cliquer la ligne et choisir **Traiter**. Les autres voient « En traitement par … ».
3. Planifier l’installation dans Eturnity et glisser le PDF sous **PDF de l’offre**. Date, montant, kWc et batterie se remplissent.
4. S’il manque une information du service externe : **Question** sous **Que manque-t-il ?**.
5. Terminé : **À valider** au service externe.

### Envoyer l’offre

1. Après accord, ouvrir l’offre et choisir **Envoyer par e-mail**. Le texte est dans la langue du client.
2. L’e-mail est dans la [Boîte d’envoi](kapitel:outbox) et part après ton approbation.
3. Si elle a été envoyée autrement (poste, en main propre) : mettre **Envoyée**.

### Relancer

1. Onglet **Relances** ou carte « relance due » : en haut, ce qui est dû aujourd’hui.
2. Appeler le client. Pas atteint : **Pas atteint**, l’offre revient dans 2 jours ouvrables.
3. Atteint : choisir le **Résultat** (compare, intéressé, nouvelle version, plus tard, oui, non). Le CRM fixe la prochaine relance selon le plan (jours 3, 10, 21, 30 après l’envoi). Avec **Oui**, on passe directement au contrat d’entreprise.
4. **Écrire avec l’IA** crée au besoin un e-mail de relance, que tu vérifies et approuves.

### Noter la décision

1. Ouvrir l’offre, **Décision**.
2. **Gagnée** : continuer avec **Créer la commande** dans le chapitre [Contrats d’entreprise](kapitel:workcontracts).
3. **Perdue** : choisir le motif du refus. **Reportée** : motif et nouvelle date.

### Saisir une version révisée

1. Ouvrir l’offre, **Nouvelle version**, glisser le nouveau PDF et noter brièvement ce qui a changé.
2. Toutes les versions restent visibles sous **Versions**.

### Attribuer les messages Eturnity

1. Onglet **Import PDF** : PDF et messages d’Eturnity pas encore attribués à une offre.
2. Choisir l’offre et attribuer.

## Statuts {#staende}

- **Nouveau** : prêt pour l’offre, personne n’y travaille encore.
- **En traitement** : quelqu’un du service interne y travaille.
- **Question** : il manque une information du service externe.
- **À valider** : terminée, le service externe la vérifie.
- **Offerte** : chez le client. L’offre passe à Muri ou Bulle, la première relance a lieu 3 jours après l’envoi.

## Automatique {#automatisch}

- Qui reçoit l’offre est réglé dans Paramètres › Responsabilités.
- Le dossier SharePoint est créé et déplacé en cas d’accord ou de refus.
- Les relances dues apparaissent sur Ma journée.

## Règles {#regeln}

- Dès 5 % de rabais ou sous 18 % de marge, l’offre doit être **validée** avant l’envoi (Chris ou l’administration).
- Une offre peut avoir plusieurs **variantes** (p. ex. avec et sans batterie). La variante choisie fixe le montant.
- La **chance** est calculée selon la phase ; on peut la fixer à la main, vide = de nouveau automatique.

- Le montant de l’offre est **hors TVA**. Contrat d’entreprise et valeur du contrat sont TTC.
- Prix d’achat, marge et calcul seulement avec le droit **Prix**.

## Questions fréquentes {#fragen}

### Le PDF Eturnity ne remplit rien.

Seuls les PDF d’Eturnity sont lus. Pour d’autres PDF, saisir les valeurs à la main.

### Comment accéder au calcul ?

Dans l’offre, choisir **Calcul**. Il s’ouvre dans le chapitre [Prix](kapitel:pricing).

## Nouveautés {#neu}

- 03.11.2026: Travail en cours comme vue de départ, offre en pleine page, relance avec résultat selon le plan, variantes, validation et chance.

- 31.10.2026: Les dossiers d’offres dans SharePoint sont créés et déplacés automatiquement.
