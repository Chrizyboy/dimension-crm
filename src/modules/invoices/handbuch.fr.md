---
stand: 2026-11-03
rollen: buchhaltung, projektleitung, geschaeftsleitung
---

# Factures

Factures issues du plan de paiement d’un projet (acompte, montage, facture finale avec avenants), des rapports de service, des contrats d’entretien ou libres. On y émet, transmet à AbaNinja ou envoie par mail avec la section paiement QR, saisit les paiements et envoie les rappels.

## Qui travaille ici {#wer}

- **Comptabilité (droit Finances)** : émettre, paiements, rappels, synchronisation AbaNinja ; données des sociétés en lecture seule.
- **Direction de projet** : voit dans l’onglet **À facturer** quelle tranche est due et crée des brouillons. Donne le premier visa pour les brouillons de ses projets.
- **Direction** : vue d’ensemble de l’ouvert et des retards.
- **Direction de projet et vente** : voient dans l’onglet **Mes projets** l’état des paiements de leurs projets (lecture seule). La direction de projet clique **Lancer la facturation** quand le jalon est atteint et donne le premier visa des factures fournisseurs.
- **Personne qui valide les relances (Chris)** : valide les rappels et relances. Sans elle, rien ne part.

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

### Lancer la facturation (direction de projet)

1. Onglet **Mes projets**. Chaque tranche indique si le jalon est atteint.
2. Pour **Étape atteinte**, cliquer **Lancer la facturation**. C’est seulement là que le brouillon est créé.
3. La comptabilité reçoit une notification, vérifie et émet la facture.

### Valider les relances (le lundi)

1. Chaque lundi, le CRM prépare l’onglet **Relances** : rappel, 1re à 3e relance ou sautée avec motif (blocage, promesse, déjà dans la boîte d’envoi, réclamation).
2. La personne qui valide choisit les lignes (**Tout choisir**) et clique **Valider …**.
3. Les e-mails passent par la boîte d’envoi ; pour la poste, le PDF s’ouvre pour l’impression.

### Viser les factures fournisseurs

1. Onglet **Factures fournisseurs**. Elles arrivent avec **Synchroniser AbaNinja** ou via **Saisir une facture**.
2. La direction de projet compare avec la commande et clique **Viser** ou **Refuser** avec motif.
3. Dès CHF 5'000 ou sans commande, le visa de la direction est aussi nécessaire. Ensuite elle passe à **Prête au paiement** ; le paiement se fait dans AbaNinja.

### Adresse de facturation, blocage, promesse, perte

1. Ouvrir la facture, **Modifier** : adresse de facturation différente, e-mail pour les factures, référence du client, envoi.
2. Si le client a dans sa [fiche client](kapitel:customers) une adresse de facturation, un e-mail de facturation ou un délai de paiement, chaque nouvelle facture les reprend automatiquement.
3. **Blocage relance** (avec motif) ou **Promesse de paiement** arrêtent les relances. **Passer en perte** clôt un petit reste (arrondi, escompte, geste commercial, perte).

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

- Chaque lundi, le CRM prépare les relances ; elles ne partent qu’après validation.
- Les nouvelles factures reprennent l’adresse de facturation, l’e-mail de facturation et le délai de paiement du client.

## Règles {#regeln}

- Numéro, échéance, état de paiement, niveaux de rappel et annulation sont fixés uniquement par le CRM.
- Une facture émise n’est pas modifiée, mais annulée puis recréée.
- L’envoi se fait uniquement via AbaNinja ou la boîte d’envoi avec validation.
- Seule l’administration modifie les données des sociétés et les réglages, aussi sous Réglages › **Sociétés et banque**. La comptabilité les voit en lecture seule.
- Seule la personne qui valide les relances valide rappels et relances.
- Factures fournisseurs : premier visa direction de projet, second visa direction dès CHF 5'000 ou sans commande.
- Seul le chef de projet responsable peut lancer la facturation, et seulement quand le jalon est atteint.

## Questions fréquentes {#fragen}

### Le client a payé, mais la facture est encore ouverte.

Lancer **Synchroniser AbaNinja**. Si rien n’arrive, saisir le paiement à la main.

### L’IBAN n’est pas accepté.

Le chiffre de contrôle est faux. Comparer l’IBAN chiffre par chiffre avec le relevé bancaire.

### Comment obtenir une liste pour la fiduciaire ?

Choisir les filtres et **Exporter la liste** (CSV).

## Nouveautés {#neu}

- 03.11.2026: L’adresse de facturation, l’e-mail de facturation et le délai de paiement de la fiche client valent pour les nouvelles factures.
- 03.11.2026: Aperçu, relances avec validation, Mes projets avec Lancer la facturation, factures fournisseurs avec visa, blocage, promesse et passage en perte.
- 03.11.2026: Premier visa de la direction de projet avant l’émission.
- 03.11.2026: Seule l’administration modifie les données des sociétés et les réglages des factures ; aussi sous Réglages › Sociétés et banque.
- 31.10.2026: Le PDF de facture sert aussi pour la facture d’acompte du contrat d’entreprise.
- 31.10.2026: Recherche et fenêtre de détail uniformes comme dans tous les domaines.
- 22.10.2026: Factures avec À facturer, rappels, paiements et PDF avec section paiement QR.
