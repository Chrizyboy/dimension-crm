---
stand: 2026-11-02
rollen: verkauf, innendienst, projektleitung, montage, buchhaltung
---

# Frais

Saisir les frais avec photo ou PDF du justificatif, sur le portable directement avec l’appareil photo. Chaque personne voit ses propres frais ; la comptabilité les voit tous, les paie et les envoie avec les justificatifs à la comptabilité.

## Qui travaille ici {#wer}

- **Tout le monde** : saisir ses propres frais et les annuler au besoin.
- **Comptabilité (droit Finances)** : tous les frais, paiement, envoi à la comptabilité, catégories.

## Comment faire {#so}

### Saisir des frais

1. **Saisir des frais** (dans la vue monteur, directement sur la page d’accueil).
2. Prendre une **Photo** du justificatif ou **Choisir un fichier**.
3. **Lire avec l’IA** remplit date, montant et motif depuis le justificatif. Vérifier ; en devise étrangère, le CRM convertit en CHF.
4. **Choisir la catégorie**, décrire brièvement le motif (par exemple « parking rendez-vous client Fribourg »), **Enregistrer**.

### Reprendre des frais erronés

1. Sur la ligne, **Annuler**, indiquer le motif.
2. Les frais restent visibles avec le motif, mais ne sont pas payés.

### Payer les frais (comptabilité)

1. Vue **Tous les frais**, filtre **Ouverts**. **Ouverts par personne** montre la somme par personne.
2. Choisir des lignes ou **Choisir tous les ouverts**.
3. **… à la comptabilité** : le mail avec liste et justificatifs est dans la [Boîte d’envoi](kapitel:outbox).
4. Après le virement, **… payés**, fixer **Payé le**.

### Gérer les catégories (comptabilité)

1. Vue **Catégories** : noms en allemand et en français, ainsi que l’**Adresse e-mail de la comptabilité**.

## Statuts {#staende}

- **Ouvert** : saisi, pas encore payé.
- **Payé** : avec date, plus modifiable.
- **Annulé** : avec motif, plus modifiable.

## Automatique {#automatisch}

- Les photos sont réduites avant l’envoi, pour que ça aille vite aussi sur le chantier.
- Les frais ouverts figurent en somme sur [Ma journée](kapitel:today).

## Règles {#regeln}

- Chaque personne ne voit que ses propres frais, la comptabilité les voit tous.
- Annuler au lieu de supprimer. Seule la comptabilité marque comme payé.
- L’IA ne fait que proposer ; c’est ce qui figure dans la fenêtre qui est enregistré.

## Questions fréquentes {#fragen}

### Je n’ai plus de justificatif.

Saisir quand même et le noter dans le motif. La ligne apparaît alors avec **Sans justificatif**.

### J’ai saisi des frais deux fois.

**Annuler** l’un des deux, motif « doublon ».

## Nouveautés {#neu}

- 31.10.2026: Frais d’un clic dans la vue monteur.
- 23.10.2026: Lire le justificatif avec l’IA.
- 22.10.2026: Frais avec justificatif, Mes frais et Tous les frais, payé, annulation, mail à la comptabilité.
