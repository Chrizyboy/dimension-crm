---
stand: 2026-11-03
rollen: buchhaltung, geschaeftsleitung
---

# Finances

Les finances pour la direction et la comptabilité : l’argent sur les comptes, ce que les clients nous doivent et ce que nous devons, les factures fournisseurs prêtes à payer, l’ordre de paiement validé par une deuxième personne, les liquidités semaine par semaine, la marge des projets ainsi que comptes, TVA et clôture mensuelle. En haut, tu choisis **Dimension Solaire GmbH**, **Dimension Solaire Sàrl** ou **Les deux**. Visible uniquement avec le droit **Finances**.

## Qui travaille ici {#wer}

- **Comptabilité** : valider les factures fournisseurs, préparer l’ordre de paiement, importer le relevé, saisir la TVA, clôturer le mois.
- **Direction** : cockpit, valider l’ordre de paiement, projets & marge.

## Comment faire {#so}

### Commencer la journée

1. Onglet **Cockpit** : en haut l’argent sur les comptes, le point le plus bas, ce que les clients nous doivent et ce que nous devons aux fournisseurs, la prochaine TVA.
2. **À faire aujourd’hui** montre escomptes, poursuites menaçantes, validations, ordres en attente, soldes anciens et TVA échue. **Ouvrir** mène au bon onglet.
3. **Factures clients par ancienneté** montre ce qui est échu. Les relances se font sous [Factures](kapitel:invoices).

### Contrôler les factures fournisseurs

1. Onglet **Factures fournisseurs**, filtre **À valider**.
2. Cliquer sur le nom : le dossier montre montant, escompte, IBAN et la comparaison avec la commande.
3. **Valider**, **À clarifier** ou **Retenir** (les deux derniers avec motif). Les factures visées dans les factures entrantes sont déjà **Prêt à payer**.

### Faire un ordre de paiement

1. Onglet **Ordre de paiement**, **Préparer un ordre de paiement** : choisir société, **Compte débité** et **Exécuter le**.
2. Le CRM propose les factures prêtes, poursuites et escomptes en premier. En bas : somme, **Solde après** et **Escompte économisé**.
3. **Soumettre … paiements**. Une deuxième personne de la direction reçoit une cloche et clique **Valider**.
4. Déclencher les paiements dans AbaNinja ou l’e-banking, puis **Exécuté dans l’e-banking**.

### Importer un relevé

1. Dans l’e-banking, télécharger le relevé camt.053 (XML).
2. Onglet **Comptes, TVA & clôture**, **Importer un relevé**, choisir le fichier.
3. Le CRM trouve le compte par l’IBAN, reprend les nouvelles écritures et reconnaît comme payés les paiements d’un ordre validé.

### Clôturer le mois

1. Sous **Clôture mensuelle**, choisir le mois.
2. La liste montre ce qui reste ouvert : soldes, attributions, société, validations, frais, tranches, heures.
3. **Clôturer le mois**, même avec des points ouverts (ils sont enregistrés). **Postes ouverts (CSV)** pour la fiduciaire.

## Statuts {#staende}

- Facture fournisseur : **À valider**, **Prêt à payer**, **À clarifier**, **Retenu**, dans un ordre, payé.
- Ordre de paiement : **À valider**, **Validé**, **Exécuté**, **Rejeté**.
- TVA : **Estimation**, **AbaNinja** (montant définitif saisi), **Payé**.

## Automatique {#automatisch}

- Les nouvelles factures fournisseurs d’AbaNinja arrivent avec la société (du projet) et la commande correspondante.
- Dès qu’une facture entrante est visée, le paiement devient prêt ici.
- La TVA est estimée par trimestre à partir des factures et des factures fournisseurs et entre dans les liquidités.
- La marge par produit et les travaux en cours sont calculés sur tous les projets.

## Règles {#regeln}

- Qui prépare un ordre de paiement ne peut pas le valider soi-même.
- L’application ne déclenche aucun paiement ; on paie dans AbaNinja ou l’e-banking.
- Comptabilité, salaires et décompte TVA restent dans AbaNinja. Rien n’est supprimé.

## Questions fréquentes {#fragen}

### Le cockpit montre un solde bien trop bas.

Souvent un solde est ancien. Importer le relevé ou saisir le solde sur le compte.

### Je ne veux pas montrer les salaires à l’écran.

En haut **Masquer les salaires**. La somme reste dans le calcul, seules les lignes sont masquées.

## Nouveautés {#neu}

- 03.11.2026 : Nouvelle construction : cockpit, factures fournisseurs avec validation, ordre de paiement à deux personnes, comptes avec relevé, estimation TVA, projets & marge, clôture mensuelle, choix de la société.
- 03.11.2026: Paiements : cliquer plusieurs catégories à la fois ; **D’Excel, non vérifiés** filtre en plus.
- 26.10.2026: Colonnes regroupées sur le portable, noms sur deux lignes.
- 22.10.2026: Finances avec liquidité semaine par semaine, planification des paiements et post-calcul.
