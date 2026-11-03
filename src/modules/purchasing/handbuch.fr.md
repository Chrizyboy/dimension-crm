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

### Établir la liste de matériel d’un projet

1. Onglet **Matériel par projet**, choisir le projet.
2. **Proposer** reprend la liste du calcul ou de l’offre. Adapter ou compléter les lignes.
3. Pour chaque ligne, le CRM montre ce qui est **Là**, **En route** ou **Manque**.

### Commander

1. Dans la liste de matériel, **Proposition de commande** : le CRM regroupe le matériel manquant par fournisseur.
2. Ouvrir la commande, vérifier les positions, **Approuver** (droit Prix).
3. **Commander par e-mail** : PDF et e-mail sont dans la [Boîte d’envoi](kapitel:outbox). L’envoi vaut commande.
4. Commandé par téléphone ou en ligne : **Commandé sans e-mail**.

### Comptabiliser l’entrée de marchandise

1. Ouvrir la commande, **Entrée de marchandise**, saisir quantité livrée et date.
2. **Comptabiliser l’entrée**. La marchandise pour le stock est réservée au projet ; celle livrée directement au chantier compte pour le projet.

### Prendre du matériel au stock

1. Dans la liste de matériel, à la ligne : **réserver … du stock** ou **sortir … pour le chantier**.
2. Sans commande : onglet **Stock**, **Comptabiliser le stock** avec entrée, sortie, correction ou inventaire.

### Réapprovisionner le stock

1. Onglet **Stock**, filtre **Sous la quantité minimale**.
2. **Réapprovisionner** crée les commandes.

### Gérer les fournisseurs

1. Onglet **Fournisseurs** : adresse de commande, contact, délai de livraison.

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

## Règles {#regeln}

- Commandes et prix d’achat seulement avec le droit **Prix**.
- L’e-mail de commande ne part que pour les commandes approuvées.

## Questions fréquentes {#fragen}

### Il manque l’adresse de commande du fournisseur.

La saisir sous **Fournisseurs** ou à la main dans l’e-mail.

### Le stock n’est pas juste.

**Comptabiliser le stock**, type **Inventaire**, saisir la quantité comptée. La correction reste visible dans les mouvements.

## Nouveautés {#neu}

- 31.10.2026: Recherche et fenêtre de détail uniformes comme dans tous les domaines.
