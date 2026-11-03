---
stand: 2026-11-03
rollen: buchhaltung, projektleitung, geschaeftsleitung
---

# Factures

Factures issues du plan de paiement d’un projet (acompte, montage, facture finale avec avenants), des rapports de service, des contrats d’entretien ou libres. On y émet, transmet à AbaNinja ou envoie par mail avec la section paiement QR, saisit les paiements et envoie les rappels.

## Qui travaille ici {#wer}

- **Comptabilité (droit Finances)** : émettre, paiements, rappels, synchronisation AbaNinja, données des sociétés.
- **Direction de projet** : voit dans l’onglet **À facturer** quelle tranche est due et crée des brouillons. Donne le premier visa pour les brouillons de ses projets.
- **Direction** : vue d’ensemble de l’ouvert et des retards.

## Comment faire {#so}

### Facturer une tranche due

1. Onglet **À facturer**. En haut les **Tranches du plan de paiement**, les dues d’abord, en dessous les **Rapports de service (payants)**.
2. Sur la ligne, **Créer la facture**. Le brouillon reprend client, projet, montant et texte.
3. Vérifier les positions, puis continuer comme sous « Émettre et envoyer une facture ».

### Une nouvelle facture à la main

1. Onglet **Factures**, **Nouvelle facture**, choisir le client.
2. Choisir le **Modèle** : **Acompte (30 %)**, **Montage (60 %)**, **Facture finale (solde avec avenants)**, **Montant total (100 %)**, **Contrat d’entretien** ou **Facture libre**.
3. **Créer le brouillon**. Dans le brouillon, on peut modifier et ajouter des lignes.

### Donner le premier visa (direction de projet)

1. Sur [Ma journée](kapitel:today), ouvrir la carte **Factures à viser**.
2. Cliquer sur la facture : contrôler positions, quantité et montant.
3. Si tout joue : **Donner le premier visa**. Sinon, écrire sous **Correction pour la comptabilité** ce qui ne joue pas et **Signaler une correction**.
4. La comptabilité reçoit une notification et voit dans le brouillon qui a visé.

### Émettre et envoyer une facture

1. Ouvrir le brouillon, **Émettre**. C’est seulement maintenant qu’elle reçoit son numéro (R2026-001 …) et son échéance. Ensuite, elle est figée.
2. Voie normale : **Vers AbaNinja**. La facture y est en brouillon avec facture QR, l’envoi se fait depuis AbaNinja.
3. Solution de repli : **Par e-mail**. Le PDF avec section paiement QR est avec le mail dans la [Boîte d’envoi](kapitel:outbox) et ne part qu’après validation.

### Saisir un paiement

1. Le plus souvent rien à faire : **Synchroniser AbaNinja** récupère les paiements et met à jour l’état.
2. À la main : ouvrir la facture, **Saisir un paiement**, montant et **Reçu le**.
3. Paiement partiel ? Le reste reste ouvert, état **Payée partiellement**.

### Envoyer un rappel

1. Filtre **En retard**, ouvrir la facture, **Rappel**.
2. Vérifier le niveau et le nouveau délai, regarder l’**Aperçu**, **Enregistrer le … rappel**.
3. Envoyer le rappel en PDF par mail via la boîte d’envoi.

### Annuler une facture

1. Ouvrir la facture émise, **Annuler**, indiquer le motif. Elle reste visible avec le motif.
2. Un brouillon va à la corbeille avec **Supprimer le brouillon**.

### Gérer les données des sociétés

1. Onglet **Sociétés & réglages** : adresse, n° TVA, IBAN, banque et délai de paiement par site (Muri GmbH, Bulle Sàrl).
2. On y trouve aussi **Délai de rappel (jours)** et **Tarif horaire service** pour les factures issues du rapport.

## Statuts {#staende}

- **Brouillon** : encore modifiable, sans numéro.
- **Émise** : numéro et échéance fixés, contenu figé.
- **Payée partiellement** : une partie est payée.
- **Payée** : entièrement payée. La tranche du plan de paiement est considérée comme payée.
- **Annulée** : n’est plus valable, le motif est indiqué.
- **En retard** et **1er à 3e rappel** s’affichent en plus comme indication.

## Automatique {#automatisch}

- Avec le paiement, le CRM met à jour le plan de paiement et la feuille de route du [Projet](kapitel:projects).
- Les factures annuelles des [Contrats d’entretien](kapitel:contracts) sont créées 30 jours avant en brouillon.
- La facture d’acompte peut être créée directement depuis le [Contrat d’entreprise](kapitel:workcontracts).

## Règles {#regeln}

- Numéro, échéance, état de paiement, niveaux de rappel et annulation sont fixés uniquement par le CRM.
- Une facture émise n’est pas modifiée, mais annulée puis recréée.
- L’envoi se fait uniquement via AbaNinja ou la boîte d’envoi avec validation.
- Seules les personnes avec le droit Finances modifient les données des sociétés et les réglages.

## Questions fréquentes {#fragen}

### Le client a payé, mais la facture est encore ouverte.

Lancer **Synchroniser AbaNinja**. Si rien n’arrive, saisir le paiement à la main.

### L’IBAN n’est pas accepté.

Le chiffre de contrôle est faux. Comparer l’IBAN chiffre par chiffre avec le relevé bancaire.

### Comment obtenir une liste pour la fiduciaire ?

Choisir les filtres et **Exporter la liste** (CSV).

## Nouveautés {#neu}

- 03.11.2026: Premier visa de la direction de projet avant l’émission.
- 31.10.2026: Le PDF de facture sert aussi pour la facture d’acompte du contrat d’entreprise.
- 31.10.2026: Recherche et fenêtre de détail uniformes comme dans tous les domaines.
- 22.10.2026: Factures avec À facturer, rappels, paiements et PDF avec section paiement QR.
