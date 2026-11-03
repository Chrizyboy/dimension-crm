---
stand: 2026-11-02
rollen: buchhaltung, geschaeftsleitung
---

# Finances

La liquidité semaine par semaine : solde, ce que nous devons payer (fournisseurs, matériel par chantier, frais fixes) et ce qui rentre (factures ouvertes, tranches, entrées attendues). En plus, la planification des paiements et le post-calcul par projet. Visible uniquement avec le droit **Finances**.

## Qui travaille ici {#wer}

- **Comptabilité** : solde, paiements, planification, frais fixes, attribution des justificatifs.
- **Direction** : aperçu, scénarios, post-calcul.

## Comment faire {#so}

### Planifier la semaine

1. Onglet **Banque**, **Saisir le solde** avec **Solde au**. Sans solde actuel, la prévision est fausse.
2. Onglet **Aperçu** : tuiles **Solde**, **Solde le plus bas**, **À payer cette semaine**. Si une semaine passe sous la réserve, un avertissement s’affiche en haut.
3. Changer de **Scénario** : **Réaliste**, **Prudent (entrées sûres seulement)** ou **Optimiste (toutes les entrées)**.
4. Déplier une semaine montre chaque mouvement avec sa source.

### Planifier les paiements

1. Onglet **Paiements**, **Planifier les paiements**.
2. Choisir la **Date de paiement**. Le CRM propose selon l’urgence ce qui tient jusqu’au solde moins la réserve.
3. Ajuster la sélection, **Planifier …**. Le paiement se fait à la banque, ensuite marquer **Payé**.

### Saisir ou reporter un paiement

1. Onglet **Paiements**, **Paiement** : entreprise, montant, **Échéance**, **Urgence** (Normal, Important, Rappel, Poursuite imminente), projet.
2. Reporter : sur la ligne **Date**, fixer **Payer le**.
3. Les lignes **D’Excel, non vérifiés** viennent de la reprise ; vérifier et enregistrer.

### Gérer matériel, frais fixes et entrées

1. **Matériel** : par **Chantier**, positions avec date de montage et **Payable jusqu’au**. **Archiver** ce qui est réglé.
2. **Frais fixes** : loyer, salaires, assurances avec rythme et jour ; payé ou reporté chaque mois.
3. **Entrées** : paiements attendus hors factures avec **Probabilité** (Sûr, Probable, Incertain). L’argent est là : **Reçu**.

### Faire le post-calcul d’un projet

1. Onglet **Post-calcul**, chercher le projet.
2. Le CRM compare valeur du contrat et avenants au matériel, au travail et aux factures fournisseurs et montre la **Marge de contribution**.
3. Sous **Sans projet (d’AbaNinja)**, **Attribuer** les factures fournisseurs au projet.

## Statuts {#staende}

- Paiements : ouvert, planifié, **Payé** ; groupés en **En retard / immédiat**, **Cette semaine**, **Semaine prochaine**, **Plus tard**, **Sans date**.
- Entrées : **Sûr**, **Probable**, **Incertain** ou **Ne pas compter**.

## Automatique {#automatisch}

- Les [Factures](kapitel:invoices) ouvertes et les tranches pas encore facturées comptent comme entrées, sans ressaisie.
- La synchronisation AbaNinja récupère les factures fournisseurs comme paiements.
- Le matériel est planifié autant de jours avant le montage qu’indiqué sous **Banque** › **Avance matériel**.

## Règles {#regeln}

- Tout le domaine uniquement avec le droit Finances. La comptabilité elle-même reste dans AbaNinja.
- Rien n’est supprimé : **Mettre à la corbeille** se restaure.

## Questions fréquentes {#fragen}

### L’aperçu montre un solde bien trop bas.

Le plus souvent, le solde est ancien. Saisir le solde du jour sous **Banque**.

### Je ne veux pas montrer les salaires à l’écran.

En haut, **Masquer les salaires**. La somme reste dans le calcul, seules les lignes sont masquées.

## Nouveautés {#neu}

- 26.10.2026: Colonnes regroupées sur le portable, noms sur deux lignes.
- 22.10.2026: Finances avec liquidité semaine par semaine, planification des paiements et post-calcul.
