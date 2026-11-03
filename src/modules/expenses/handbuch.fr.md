---
stand: 2026-11-03
rollen: verkauf, innendienst, projektleitung, montage, buchhaltung
---

# Frais

Saisir les frais en quelques secondes : photo du justificatif, l’IA remplit montant, date, catégorie et TVA, ou kilomètres avec la voiture privée. La comptabilité vérifie chaque frais, verse ceux vérifiés avec le salaire et rapproche la carte d’entreprise du relevé.

## Qui travaille ici {#wer}

- **Tout le monde** : saisir ses frais, les modifier ou les retirer jusqu’à la vérification, répondre aux questions.
- **Comptabilité (droit Finances)** : vérifier, poser une question, refuser, verser, rapprocher la carte d’entreprise, analyse ; règles et catégories en lecture seule.

## Comment faire {#so}

### Saisir des frais

1. **Saisir des frais** (dans la vue monteur directement sur la page d’accueil).
2. Prendre une **Photo** du justificatif ou **Choisir un fichier**. L’IA lit montant, date, catégorie, TVA et nombre de personnes ; **Lire avec l’IA** pour relire.
3. **Payé avec** : **Mon argent** ou **Carte d’entreprise**. Au besoin, choisir le **Projet**.
4. Décrire brièvement le motif (par exemple « Parking rendez-vous client Fribourg »), **Enregistrer** ou **Enregistrer et suivant**.

### Kilomètres avec la voiture privée

1. **Saisir des kilomètres**.
2. Indiquer le trajet et les kilomètres. Le montant (kilomètres × tarif) est calculé.
3. **Enregistrer**.

### Répondre à une question

1. Dans **Mes frais**, la question de la comptabilité est en haut, avec une notification.
2. **Répondre** : modifier les frais (par exemple remplacer le justificatif, compléter la note).
3. **Enregistrer**. Les frais retournent à la comptabilité.

### Vérifier les frais (comptabilité)

1. Onglet **Vérifier** : la liste à gauche, justificatif et données à droite avec remarques.
2. **Vérifié**, **Question** (avec la question) ou **Refuser** (avec le motif). Touches J/K pour naviguer, P pour vérifier.
3. Ce qui n’a pas de remarque : **Vérifier les … sans remarque**.

### Verser les frais (comptabilité)

1. Onglet **Verser** : frais vérifiés payés avec son propre argent, par personne.
2. Choisir les personnes, **Créer le versement**, date et type (**Avec le salaire** ou **Virement**).
3. **Décompte PDF** avec tous les justificatifs pour les salaires. Chaque personne reçoit une notification.

### Rapprocher la carte d’entreprise (comptabilité)

1. Onglet **Carte d’entreprise**, **Importer le relevé** : CSV de l’e-banking ou du portail de la carte.
2. Si un seul frais carte d’entreprise correspond (même montant, ±3 jours), la transaction est déjà associée. Sinon choisir la personne sous **Carte de** et **Associer à un frais**.
3. Justificatif manquant : **Demander les justificatifs**, la personne reçoit une notification. Dès qu’elle saisit les frais, la transaction s’associe seule.
4. Sans justificatif mais en ordre (abonnement, frais, privé) : **Sans justificatif**, indiquer le motif, **Régler**.

### Gérer les règles (administration)

1. Onglet **Règles** : e-mail de la comptabilité, tarif kilométrique, délai pour envoyer, versement par défaut.
2. Catégories avec compte, TVA usuelle, valeur indicative et « justificatif dès ». **Enregistrer**.

## Statuts {#staende}

- **Envoyé** : chez la comptabilité, encore modifiable.
- **Question** : la comptabilité a besoin de quelque chose de ta part.
- **Vérifié** : en ordre, versé avec le prochain versement (carte d’entreprise : justificatif seulement, pas de versement).
- **Versé** : avec date et type, figé.
- **Refusé** et **Retiré** : visibles avec le motif, figés.
- Carte d’entreprise : **Sans justificatif**, **Associées**, **Réglées**.

## Automatique {#automatisch}

- Les photos sont réduites avant l’envoi, pour que cela aille vite aussi sur le chantier.
- La base de données calcule le montant kilométrique et la TVA.
- Remarques lors de la vérification : doublon, sans justificatif, envoyé trop tard, au-dessus de la valeur indicative, devise étrangère.
- Les frais avec projet comptent dans le calcul final du [projet](kapitel:projects).
- Questions, frais à vérifier et à verser apparaissent sur [Ma journée](kapitel:today).

## Règles {#regeln}

- Chaque personne ne voit que ses propres frais, la comptabilité les voit tous.
- Retirer au lieu de supprimer. Vérifier, refuser et verser uniquement la comptabilité.
- La carte d’entreprise n’est jamais versée. Une transaction appartient à un seul frais.
- L’IA ne fait que proposer ; ce qui est enregistré, c’est ce qui figure dans la fenêtre.

## Questions fréquentes {#fragen}

### Je n’ai plus le justificatif.

Saisir quand même et le noter dans le motif. La comptabilité voit la remarque **Sans justificatif** et décide.

### J’ai saisi des frais en double.

**Retirer** l’un des deux, motif « doublon ». Après la vérification, contacte la comptabilité.

### Le relevé de carte n’est pas lu.

Le télécharger en CSV, pas en PDF. La ligne d’en-tête doit contenir une date et un montant ; les lignes comme total ou solde sont ignorées.

## Nouveautés {#neu}

- 03.11.2026 : seule l’administration modifie règles et catégories ; aussi sous Réglages › Catégories de frais.
- 03.11.2026 : rapprocher la carte d’entreprise du relevé, demander les justificatifs manquants.
- 02.11.2026 : vérification avec question et refus, kilomètres, carte d’entreprise, projet, TVA, versement groupé avec décompte PDF, analyse et règles.
- 31.10.2026 : frais en un clic dans la vue monteur.
- 23.10.2026 : lire le justificatif avec l’IA.
- 22.10.2026 : frais avec justificatif, Mes frais et Tous, versé, annulation, e-mail à la comptabilité.
