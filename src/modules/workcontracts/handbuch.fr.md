---
stand: 2026-11-02
rollen: verkauf, innendienst, buchhaltung, geschaeftsleitung
---

# Contrats d’entreprise

L’offre acceptée devient la commande : projet, plan de paiement et contrat d’entreprise selon le modèle de Muri (allemand ou français, avec CG). Le contrat part en PDF avec la facture d’acompte au client ; envoi, signature ou annulation sont notés ici.

## Qui travaille ici {#wer}

- **Vente et service interne** : créent la commande et envoient le contrat.
- **Comptabilité (droit Finances)** : crée la facture d’acompte.
- **Signataire** : Chris Rosenberg ; ta propre signature se dépose sous **Mon compte**.

## Comment faire {#so}

### Créer un contrat d’entreprise

1. **Nouveau contrat**, choisir l’offre acceptée (ou **Créer la commande** dans l’offre).
2. Choisir les conditions de paiement d’un clic : standard 40/30/30, batteries 70/30, 100 %, acompte propre en CHF ou tranches propres avec libellé et pourcentage.
3. Vérifier les données (installation, début des travaux, particularités). Le CRM arrondit les tranches au franc.
4. **Créer**. Projet, plan de paiement et PDF du contrat sont créés en une étape.

### Envoyer contrat et facture d’acompte

1. Ouvrir le contrat. Le CRM crée la **Facture d’acompte** à l’envoi (droit Finances) ; si elle existe déjà, elle est jointe.
2. **Envoyer au client**, **Préparer l’e-mail** : contrat et facture avec section de paiement QR sont dans la [Boîte d’envoi](kapitel:outbox) pour approbation.
3. Après l’envoi, le contrat est **Envoyé**.

### Noter la signature

1. Quand le contrat revient signé : **Signé**, saisir la date, joindre le PDF signé.
2. Le projet passe ainsi à la planification, voir [Projets & montage](kapitel:projects).

### Modifier ou annuler la commande

1. Avant la signature : **Modifier la commande** et recréer.
2. Si la commande tombe : **Annuler** avec motif.

## Statuts {#staende}

- **Brouillon** : pas encore terminé.
- **Créé** : le PDF existe, pas encore envoyé.
- **Envoyé** : chez le client pour signature.
- **Signé** : en vigueur, le projet démarre.
- **Annulé** : tombe, avec motif.

## Automatique {#automatisch}

- Le plan de paiement génère ensuite les factures des tranches dans le chapitre [Factures](kapitel:invoices).
- Texte, signataire et téléphone par langue viennent des paramètres.

## Règles {#regeln}

- Contrat et valeur du contrat sont **TTC**, l’offre hors TVA.
- Les tranches propres doivent faire 100 % ensemble.

## Questions fréquentes {#fragen}

### Dans quelle langue est le contrat ?

Dans la langue du client, avec les CG dans la même langue.

### Ma signature manque dans le PDF.

Déposer ta signature sous **Mon compte**, puis recréer le contrat.

## Nouveautés {#neu}

- 02.11.2026: Bouton « Nouveau contrat » avec choix de l’offre.
- 31.10.2026: Modèle de Muri, conditions de paiement d’un clic et facture d’acompte.
