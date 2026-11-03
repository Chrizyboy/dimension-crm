---
stand: 2026-11-03
rollen: montage, projektleitung, buchhaltung
---

# Chantier & rapports

La vue mobile pour le montage et la vue bureau correspondante : planning du jour, un rapport pour tout (montage, service, maintenance, MES) avec travaux, matériel supplémentaire, photos, points de contrôle, suppléments et signature du client, ainsi que le temps de travail avec début et fin. Fonctionne aussi sans réseau.

## Qui travaille ici {#wer}

- **Montage** : planning du jour, rapport, temps et photos sur mobile.
- **Direction de projet** : voit tous les chantiers dans « Chantiers du jour », vise les rapports, règle les signalements, vérifie les suppléments.
- **Direction** : onglet **Analyse** (réel par rapport au prévu, heures par kWc).
- **Comptabilité** : vérifie les heures et fait l’export salaires.

## Comment faire {#so}

### Commencer la journée sur le chantier

1. Onglet **Ma journée** : interventions du jour et des jours suivants, avec équipe, électricien et matériel.
2. **Navigation** ouvre l’app de cartes, **Appeler le client** compose le numéro.
3. La carte montre l’avancement du chantier, ce qui est prévu aujourd’hui et les photos obligatoires manquantes. **Dossier** ouvre installation, plans, contacts et matériel à cocher au chargement (aussi sans réseau).
4. **Commencer le rapport** : pour un montage, d’abord le **Contrôle de sécurité**. Tout cocher, cocher qui travaille aujourd’hui, **Début du travail pour l’équipe**. Le temps démarre pour tous à la même heure.
5. Un problème (matériel, dégât, météo …) ? **Signaler un problème**, avec photo. Le chef de projet le reçoit tout de suite.

### Remplir un rapport

1. À l’intervention, **Commencer le rapport** (ou **Commencer le service**, **Commencer la maintenance**).
2. Sous **Étapes de travail**, cocher ce qui est terminé aujourd’hui. Le texte en découle, ou écrire soi-même les **Travaux effectués** (aussi avec **Dicter**). Saisir le **Matériel supplémentaire** avec quantité.
3. Prendre les photos obligatoires avec leurs propres boutons, **scanner** ou saisir les **numéros de série**.
4. Une **Note pour le bureau** reste interne. Le soir, **Fin de journée pour l’équipe** avec pause (proposition selon la loi sur le travail).
5. **Clôturer**. Un rapport journalier normal n’a pas besoin de signature. Le dernier jour, activer **Montage terminé, prêt pour la MES** : le client signe alors la réception, chaque réserve devient une tâche. Si des suppléments sont liés au rapport, le client signe aussi.

### Protocoler la mise en service (MES)

1. Le dernier jour de montage, **Commencer la MES**.
2. Saisir tous les points de contrôle et mesures, photos de l’onduleur et du compteur.
3. Clôturer avec signature. L’installation est créée dans [Service & garantie](kapitel:aftersales).

### Saisir un supplément (régie)

1. Dans le rapport, **Saisir un supplément** : quoi et pourquoi, heures, matériel.
2. Le client le confirme par sa signature à la fin du rapport.

### Vérifier et exporter les heures (bureau)

1. Onglet **Heures** : semaine par personne, travail et déplacement.
2. Saisir ou corriger les heures manquantes ou fausses, **Vérifier**.
3. **Export salaires** donne un fichier CSV pour la comptabilité salariale.

### Piloter les chantiers (direction de projet)

1. Onglet **Chantiers du jour** : qui a pointé, avancement, réel/prévu, photos, signalements, rapports manquants, rapports à viser.
2. Un clic sur un chantier ouvre le dossier avec journal de chantier, interventions, signalements, suppléments et numéros de série. **Modifier le prévu** remplace la règle.
3. Dans le rapport, **Viser** ou **Question** au monteur.
4. Onglet **Signalements** : **Réglé** avec une courte note.
5. Dans l’onglet **Heures**, la **Feuille hebdomadaire** montre réel/prévu, solde et remarques (pause, trop long, pas pointé). Chaque personne **confirme** sa semaine.

### Traiter les suppléments au bureau

1. Onglet **Suppléments** : ouverts, confirmés par le client, refusés.
2. Les suppléments confirmés vont dans la facture finale, voir [Factures](kapitel:invoices).

## Statuts {#staende}

- Rapport : **Ouvert** (en cours) ou **Clôturé** (retour avec **Rouvrir**) ; ensuite **visé** ou **Question ouverte**.
- Signalement : ouvert (urgent si « Chantier arrêté ») ou réglé.
- Semaine : ouverte ou confirmée.
- Supplément : **ouvert**, **confirmé par le client**, **refusé**.

## Automatique {#automatisch}

- Sans réseau, le mobile garde tout dans une file d’attente et envoie dès que le réseau revient.
- Le matériel du projet indique **Matériel prêt** ou combien il manque.
- Un cas de service dont le rendez-vous est passé reste aujourd’hui dans le planning jusqu’à **Terminé**, marqué en rouge **En retard depuis le …**.
- Les heures prévues découlent d’une règle (kWc, toit, batterie). À la MES, les numéros de série vont dans l’installation.
- Chaque signalement donne une tâche et une cloche au chef de projet.

## Règles {#regeln}

- Clôture, vérification des heures et statut des suppléments seulement avec les boutons ici, pour que rien ne compte double.
- Les montants des suppléments seulement avec le droit Prix. De même pour Chantiers du jour, Signalements et Analyse.
- Le contrôle de sécurité est obligatoire avant le début de l’équipe. Étapes, photos obligatoires et points de sécurité, seule l’administration les modifie.

## Questions fréquentes {#fragen}

### Je n’ai pas de réseau sur le toit.

Continuer simplement. En haut, le nombre de modifications en attente ; elles partent toutes seules.

### J’ai oublié de démarrer le temps.

Le rattraper dans l’onglet **Heures** ou le signaler au bureau ; la comptabilité corrige lors de la vérification.

## Nouveautés {#neu}

- 03.11.2026: Les cas de service d’hier restent dans le planning («En retard»). Temps de travail et trajet dans **Ma journée** aussi sans rapport ; les modifications partent tout de suite.
- 02.11.2026 : contrôle de sécurité et temps d’équipe, étapes de travail, photos obligatoires du chantier, scanner les numéros de série, dossier, signaler un problème, réception avec réserves ; chantiers du jour, dossier chantier, signalements, feuille hebdomadaire, visa et analyse.
- 31.10.2026: Vue simple pour les monteurs avec temps de travail d’un clic et frais.
