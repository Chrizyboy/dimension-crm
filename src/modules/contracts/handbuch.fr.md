---
stand: 2026-11-03
rollen: innendienst, verkauf, buchhaltung, geschaeftsleitung
---

# Contrats d’entretien

Contrats d’entretien selon les trois formules du site : **Essentiel**, **Comfort** (recommandée) et **Premium**. On y saisit le contrat, note l’inspection, enregistre la résiliation et prépare la facture annuelle. Le contrat existe en PDF dans la langue du client.

## Qui travaille ici {#wer}

- **Service interne et vente** : saisir les nouveaux contrats, PDF au client, résiliations.
- **Montage et service** : noter l’inspection effectuée.
- **Comptabilité (droit Finances)** : émettre les factures annuelles.

## Comment faire {#so}

### Saisir un nouveau contrat

1. **Nouveau contrat**, choisir le client.
2. Choisir l’installation : puissance, batterie, mise en service et onduleur sont repris de l’installation existante. Sans installation dans le CRM : **Saisir à la main**. Pas installée par nous : cocher **Installation tierce**.
3. Choisir la **Formule**. Le prix annuel hors TVA arrive comme tarif selon la tranche de kWc. Un prix plus bas est possible et s’affiche comme **Rabais**.
4. Pour une installation tierce ou de 2 ans et plus, **État des lieux nécessaire** apparaît : **Facturer** ou **Offrir**.
5. Fixer **Début du contrat** et **Langue du contrat**, **Enregistrer**. Numéro (W001 …), rythme et première inspection sont fixés par le CRM.
6. Dans le dossier, **Contrat en PDF**, imprimer ou envoyer par mail et faire signer.

### Noter une inspection

1. Ouvrir le contrat, **Entretien effectué**.
2. **Effectué le** et en bref ce qui a été fait. Le CRM calcule la prochaine inspection selon la formule.

### Planifier une inspection

1. Onglet **Inspections** : inspections dues dans les 90 jours sans rendez-vous, avec **Planifiées** celles déjà planifiées.
2. **Planifier** : jour, de, à et qui y va. **Enregistrer**.
3. 14 jours avant, l’annonce au client attend dans la [Corbeille de sortie](kapitel:outbox). Elle ne part qu’après ta validation. Tout de suite : dans le rendez-vous, **Annoncer maintenant**.
4. L’inspection apparaît sur le mobile de la personne dans [Chantier](kapitel:fieldwork) sous «Ma journée».

### Envoyer une offre aux clients sans contrat

1. Onglet **Sans contrat** : nos installations après la mise en service sans contrat en cours, avec formule et prix adaptés.
2. **Envoyer l’offre** pour un client, ou en cocher plusieurs et envoyer à tous. Le clic vaut validation, le mail part dans la langue du client.
3. Réponse du client : **Acceptée** ouvre «Nouveau contrat», sinon **Refusée**. Le filtre **À relancer** montre les offres ouvertes après 14 jours.

### Saisir une résiliation

1. Ouvrir le contrat, **Saisir une résiliation**, date de réception.
2. Le CRM indique quand le contrat prend fin (fin de l’année contractuelle en cours). Jusque-là, il court normalement.
3. Erreur ou le client reste : **Annuler la résiliation**.

### Créer une facture annuelle à la main

1. Ouvrir le contrat, **Créer la facture annuelle** (seulement avec le droit Finances).
2. La facture est créée comme brouillon dans [Factures](kapitel:invoices) et y est émise.

## Statuts {#staende}

- **Actifs** : en cours, inspections et factures suivent.
- **Résiliable dans 90 jours** : le délai de résiliation (3 mois avant l’échéance) approche.
- **Résiliés** : court jusqu’à **Prend fin le**.
- **Terminé** : après la fin, fixé par le CRM.

## Automatique {#automatisch}

- 14 jours avant un rendez-vous planifié, le CRM met l’annonce au client dans la corbeille de sortie (attend la validation). Après «Entretien effectué», le rendez-vous est à nouveau vide.
- 30 jours avant chaque année contractuelle, le CRM crée la facture annuelle en brouillon. « facturé jusqu’au » évite les doublons.
- Les entretiens dus dans les 30 jours figurent sur [Ma journée](kapitel:today).
- Après la durée minimale (3 ans), le contrat se prolonge d’une année à chaque fois.

## Règles {#regeln}

- Seule l’administration modifie formules, prix et conditions. Les contrats en cours gardent leur prix.
- Les prix dans la liste et le dossier sont hors TVA, le PDF montre aussi le total TVA incluse.
- Les anciens contrats sans formule gardent leurs prestations et n’ont pas de facture automatique.

## Questions fréquentes {#fragen}

### L’installation dépasse 100 kWc.

La formule indique « sur devis ». Saisir le prix soi-même, il apparaît alors comme écart au tarif.

### Pourquoi le contrat affiche-t-il « Rabais » ?

Le prix est inférieur au tarif de la formule. C’est visible exprès, aussi dans le PDF et sur la facture.

### La facture annuelle n’est pas arrivée.

Seuls les contrats avec formule la reçoivent automatiquement. Pour les anciens contrats, **Créer la facture annuelle** à la main.

## Nouveautés {#neu}

- 03.11.2026: Planifier les inspections avec annonce 14 jours avant, onglet «Sans contrat» avec offre seule ou en série, inspection sur mobile avec les valeurs de la dernière fois.
- 02.11.2026: Contrats selon les formules du site, tarif selon les kWc avec rabais visible, résiliation avec « résiliable jusqu’au », facture annuelle automatique en brouillon.
- 31.10.2026: Recherche et fenêtre de détail uniformes comme dans tous les domaines.
