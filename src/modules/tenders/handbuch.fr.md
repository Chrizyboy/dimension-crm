---
stand: 2026-11-04
rollen: innendienst, verkauf, geschaeftsleitung, buchhaltung
---

# Appels d’offres

Le moniteur trouve les appels d’offres publics, demandes de permis et adjudications autour de Muri et Bulle, les classe en trois voies et les mène jusqu’à l’adjudication ou au courrier. Aucun e-mail ne part automatiquement : Andy approuve, Chris envoie.

## Qui travaille ici {#wer}

- **Service interne** : vérifie les nouveaux résultats, saisit à la main les annonces des cantons AG, LU, FR, VD et NE et tient la liste de contrôle du dépôt.
- **Andy (direction)** : décide Go ou No-Go et approuve les courriers.
- **Chris** : contrôle les grands dépôts (quatre yeux) et envoie les courriers approuvés.
- **Comptabilité** : dépose les attestations comme l’extrait des poursuites, SUVA et AVS.

## Comment faire {#so}

### Vérifier les nouveaux résultats

1. Onglet **Tableau de bord**, voie **Soumission** : la colonne « Go/No-Go » montre les nouveaux appels d’offres.
2. Ouvrir la carte. Le dossier montre la proposition **Go/No-Go** de 0 à 100 points et pourquoi.
3. **Participer** ou **Ne pas participer** (avec un motif de la liste).

### Mener une soumission jusqu’au dépôt

1. Dans le dossier, **Modifier** les données clés : puissance, estimation, délais et critères d’adjudication (100 % au total).
2. **Ouvrir l’offre** et calculer, voir [Offres](kapitel:quotes).
3. Cocher la liste de contrôle. « Attestations » et « Contrôle » sont gérés par le CRM.
4. Dès CHF 100'000, une deuxième personne confirme avec **Confirmer le contrôle**.
5. **Déposé** avec date, forme et montant hors TVA.

### Ouverture et adjudication

1. Dans le bloc **Procès-verbal d’ouverture**, **Saisir** : toutes les offres avec montant, la nôtre marquée « nous ».
2. **Adjugé** : le CRM crée le projet. Ou **Refusé** avec le gagnant ; le délai de recours apparaît alors dans les délais.

### Écrire à une entreprise (voie Acquisition)

1. Voie **Prospection** du tableau de bord, ouvrir la carte, ajouter le contact, vérifier le brouillon.
2. Onglet **Approuver** : Andy valide le brouillon.
3. Onglet **Envoyer** : Chris envoie via la [corbeille de sortie](kapitel:outbox). Un lead « Contacté » est créé avec relance après 5 jours ouvrables.

### Attestations et références

1. Onglet **Attestations & références** : par société, ce qui est valable et ce qui manque.
2. **Déposer une attestation** avec fichier ; la validité est calculée selon le type.
3. Reprendre des références **Depuis les projets** et indiquer si la personne de contact peut être contactée.

### Saisir un résultat à la main

1. **Saisir à la main**, coller le texte de la publication et **Lire avec l’IA**, ou remplir les champs soi-même.
2. Vérifier chaque champ, puis **Saisir**. Points et voie sont calculés par la base de données.

## Statuts {#staende}

- **Offre** : nous soumissionnons (Go/No-Go, calcul, déposé, adjugé ou refusé).
- **Acquisition** : un maître d’ouvrage ou planificateur doit nous connaître.
- **Observer** : encore trop tôt.

## Automatique {#automatisch}

- simap est lu à 06:52, 12:00 et 17:00, la feuille officielle à 06:52 (lundi à samedi).
- La base de données détecte les doublons ; un pouvoir adjudicateur reste bloqué jusqu’à l’adjudication.
- L’onglet **Délais** planifie le contrôle et l’envoi postal à rebours depuis le dépôt.
- 30 jours avant l’échéance d’une attestation, une tâche « Renouveler l’attestation » est créée.
- Chaque annonce est aussi vérifiée par le moniteur des [grands projets](kapitel:contracting).

## Règles {#regeln}

- Aucun courrier sans approbation ; une seule relance au maximum.
- La personne responsable ne contrôle pas elle-même.
- Adjudication et refus seulement avec procès-verbal ou un motif expliquant son absence.
- Qui peut approuver, contrôler et envoyer est défini dans les paramètres.

## Questions fréquentes {#fragen}

### Pourquoi pas d’e-mail pour le nouveau résultat ?

Le moniteur n’envoie pas d’e-mails. Les nouveaux résultats sont dans le tableau de bord et sur Ma journée.

### Le CRM calcule-t-il la capacité de montage ?

Non. Le dossier rappelle de la vérifier soi-même pour la période d’exécution.

### Où est l’entonnoir ?

Dans l’onglet **Analyse**, avec le taux de succès, les concurrents et les motifs de No-Go.

## Nouveautés {#neu}

- 04.11.2026: La fiche n’affiche les champs vides qu’après **+ autres informations** ; les champs remplis restent visibles.
- 03.11.2026: «Mettre à la corbeille» pour les appels d'offres, les contacts et les attestations, avec confirmation et «Annuler». Restaurer depuis la corbeille (menu en haut à droite).
- 03.11.2026 : tableau de bord, dossier en pleine page, Go/No-Go, liste de contrôle, contrôle à quatre yeux, procès-verbal d’ouverture, l’adjudication crée le projet, délais, attestations, références, analyse, saisie par IA.
- 31.10.2026 : recherche et fenêtre de détail uniformes dans tous les domaines.
