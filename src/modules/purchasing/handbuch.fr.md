---
stand: 2026-11-02
rollen: projektleitung, innendienst, geschaeftsleitung
---

# Achats & matériel

Saisir le matériel par projet, commander chez les fournisseurs (Krannich, Solarmarkt, Tritec, PM Green et d’autres), surveiller les délais de livraison et comptabiliser l’entrée de marchandise. Le stock propre est à Bulle : quantités, réservation par projet et quantités minimales.

## Qui travaille ici {#wer}

- **Direction de projet** : liste de matériel par projet, proposition de commande, entrée de marchandise.
- **Avec le droit Prix** : voit les prix d’achat, approuve les commandes.
- **Stock Bulle** : comptabilise entrées, sorties et inventaire.

## Comment faire {#so}

### Le tableau de bord

Vue de départ des achats. En haut les chiffres clés (à commander, en attente de validation, sans confirmation, montages en danger), en dessous chaque commande à son étape : validation, confirmation attendue, en route, partiellement livré, facture à contrôler. **En rouge** : la marchandise arrive après le montage ou n’est pas encore commandée. Un clic sur une carte ouvre la commande.

### Établir la liste de matériel d’un projet

1. Onglet **Plan matériel**, choisir le projet. Le plan matériel montre par chantier la couverture en pour cent et la date « commander d’ici ».
2. **Proposer** reprend la liste du calcul ou de l’offre. Adapter ou compléter les lignes.
3. Pour chaque ligne, le CRM montre ce qui est **Là**, **En route** ou **Manque**.

### Commander

1. Onglet **Commander** : tout ce dont les chantiers et le stock ont besoin, par fournisseur, avec « commander d’ici » (début des travaux moins délai et marge, en jours ouvrables), seuil franco de port et commande minimale.
2. **Créer le brouillon** (ou pour tous les fournisseurs) : le disponible en stock est réservé d’abord, le reste va dans un brouillon, arrondi aux unités d’emballage. S’il y a plusieurs brouillons d’un fournisseur vers le stock, **Regrouper les brouillons** en fait une commande groupée.
3. Ouvrir la commande, vérifier les positions, **Valider** (droit Prix). Au-dessus de la limite : **Soumettre pour validation**, la direction reçoit une notification et valide.
4. **Commander par e-mail** : PDF et e-mail sont dans la [Boîte d’envoi](kapitel:outbox). L’envoi vaut commande.
5. Commandé par téléphone ou en ligne : **Commandée sans e-mail**. Pour les fournisseurs avec boutique en ligne, **Ouvrir la boutique** ouvre la page.

### Contrôler la confirmation de commande

1. Ouvrir la commande, section **Confirmation et livraison**, **Saisir la confirmation**.
2. L’IA lit la confirmation dans un e-mail de la boîte de réception ou dans un PDF (**Lire un PDF**). Vérifier numéro, date, quantités et prix, **Enregistrer**.
3. Les écarts de quantité ou de prix sont signalés. La date confirmée devient la date de livraison.
4. Confirmée brièvement, sans détails : **Confirmation reçue** dans les indications. Rien ne vient : noter **Relancé**.
5. Suivi, indication de livraison et contact sur place dans la même section.

### Comptabiliser l’entrée de marchandise

1. Ouvrir la commande, **Entrée de marchandise**, saisir quantité livrée, date et n° de bulletin de livraison. Numéros de série au besoin avec **Saisir les numéros de série**.
2. **Comptabiliser l’entrée**. La marchandise pour le stock est réservée au projet ; celle livrée directement au chantier compte pour le projet.

### Contrôler la facture fournisseur

1. Après la livraison, dans la commande, section **Facture fournisseur** : le CRM propose les factures correspondantes d’AbaNinja, avec le montant attendu.
2. Choisir la facture, **Marquer comme contrôlée**. Si elle diffère nettement (plus de CHF 50 ou 1 %), une note est nécessaire (p. ex. port). La facture est alors aussi contrôlée dans les finances.

### Prendre du matériel au stock

1. Dans la liste de matériel, à la ligne : **réserver … du stock** ou **sortir … pour le chantier**.
2. Sans commande : onglet **Stock**, **Comptabiliser le stock** avec entrée, sortie, correction ou inventaire.

### Réapprovisionner le stock

1. Onglet **Stock**, filtre **Sous la quantité minimale**.
2. **Réapprovisionner** crée les commandes.

### Gérer les fournisseurs

1. Onglet **Fournisseurs** : adresse de commande, contact et conditions (délai, port, franco dès, commande minimale, délai de paiement, escompte, mode de commande).
2. La liste montre par fournisseur les achats des 12 derniers mois, la ponctualité et le délai effectif.

## Statuts {#staende}

- **Brouillon** : la commande est en préparation.
- **Approuvée** : peut être commandée.
- **Commandée** : e-mail envoyé ou commandée sans e-mail.
- **Partiellement livrée / Livrée** : entrée comptabilisée.
- **Livraison en retard** : la date de livraison est passée.
- **Annulée** : tombe.

## Automatique {#automatisch}

- Avec « Commandée » et l’entrée de marchandise, le CRM pose le statut du matériel dans la feuille de route du projet.
- Le stock ne change que par les entrées et écritures de stock, jamais directement.
- Chaque heure une notification si une confirmation manque, si un montage est en danger ou si la date « commander d’ici » est atteinte.

## Règles {#regeln}

- Commandes et prix d’achat seulement avec le droit **Prix**.
- L’e-mail de commande ne part que pour les commandes approuvées.
- Au-dessus de la limite de validation (par défaut CHF 5'000), seules les personnes définies valident. Limite et personnes : seulement l’administration.

## Questions fréquentes {#fragen}

### Il manque l’adresse de commande du fournisseur.

La saisir sous **Fournisseurs** ou à la main dans l’e-mail.

### Le stock n’est pas juste.

**Comptabiliser le stock**, type **Inventaire**, saisir la quantité comptée. La correction reste visible dans les mouvements.

## Nouveautés {#neu}

- 02.11.2026: Tableau de bord, commande groupée par fournisseur, plan matériel, limite de validation, confirmation de commande avec IA, contrôle de la facture fournisseur, conditions des fournisseurs.
- 31.10.2026: Recherche et fenêtre de détail uniformes comme dans tous les domaines.
