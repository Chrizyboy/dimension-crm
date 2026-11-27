---
stand: 2026-11-27
rollen: projektleitung, innendienst, montage, geschaeftsleitung
---

# Après-vente

Tout ce qui suit la construction : pannes, réclamations, cas de garantie chez le fabricant et contrôles. La **Centrale** montre chaque cas ouvert par étape et le temps restant jusqu’à la réaction. L’onglet **Installations** contient les données de chaque installation construite avec garantie et composants.

## Qui travaille ici {#wer}

- **Service interne** : prend les appels et mails, saisit le cas, planifie le rendez-vous.
- **Andy (attribue)** : reçoit chaque nouveau cas et choisit le collaborateur qui le reprend.
- **Direction de projet et responsables du service** : diagnostic, cas de garantie chez le fabricant, clôture et facturation.
- **Montage** : voit l’intervention sur le portable et rédige le [Rapport](kapitel:fieldwork).

## Comment faire {#so}

### Saisir un nouveau cas

1. **Nouveau cas**, choisir la source sous **Provenance ?** (appel, mail …).
2. Choisir client et installation. Le CRM indique tout de suite si une **Garantie** court encore.
3. Fixer **Gravité ?** (par exemple « Installation à l’arrêt »), puis **Composant**, **Code d’erreur**, **Sur place**, **Accès** et photos.
4. **Enregistrer**. Numéro (S001 …), priorité, délai de réaction et liste de contrôle sont fixés par le CRM. Le cas va d’abord à Andy pour attribution.

### Attribuer un cas

1. Dans la centrale, choisir **À attribuer**. Ces cartes portent l’étiquette **À attribuer**.
2. Ouvrir la carte. En haut : « Qui reprend le cas ? » : choisir la personne sous **Choisir le collaborateur**.
3. Elle reçoit une cloche, l’historique indique « Zugeteilt an … ». Pour réattribuer plus tard : en haut à droite **Attribuer à**.

### Traiter un cas

1. Dans la centrale, cliquer sur la carte. Le dossier s’ouvre en pleine page.
2. En haut, les **Étapes** : Entrée, Diagnostic, Rendez-vous, Sur place, Pièces / RMA, Terminé, Facturé.
3. Sous **Historique**, noter ce qui se passe : **Note**, **Appel**, **E-mail** ou **SMS**, puis **Noter**.
4. Cocher la **Liste de contrôle** ; s’il manque un point, **Ajouter une étape**.
5. Dans la centrale, une carte peut aussi passer à la colonne suivante avec **Changer l’état**.

### Gérer un cas de garantie chez le fabricant

1. Dans le dossier, **Saisir un cas de garantie** : fabricant, composant, numéro de série, **Numéro RMA**.
2. Mettre à jour le statut jusqu’à l’arrivée de la pièce ; saisir une **Note de crédit** si le fabricant paie.

### Clôturer et facturer

1. Après l’intervention, le rapport figure sous **Rapports et facturation**.
2. Payant ? **Créer la facture** crée un brouillon dans [Factures](kapitel:invoices).
3. Mettre le cas sur **Terminé**. Si le client revient : **Rouvrir**.

### Traiter une annonce du site web

1. Filtre rapide **Site web**. Le CRM a cherché client et installation via numéro de projet, adresse, mail ou téléphone.
2. Pas trouvé : filtre **Sans client**, ouvrir le cas et choisir le client ou **Créer comme nouveau client**.

### Gérer les installations

1. Onglet **Installations**, filtre **Contrôle à faire** ou **Garantie échue bientôt**.
2. Ouvrir l’installation : mise en service, **Garantie jusqu’au**, **Prochain contrôle**, lien de monitoring et composants avec numéro de série (**Ajouter un composant**).

## Statuts {#staende}

- **Entrée** : nouveau, personne dessus.
- **En cours** : diagnostic en cours.
- **Planifié** : rendez-vous sur place fixé.
- **Attente pièces** : pièce de rechange ou RMA chez le fabricant.
- **Terminé** : clôturé ; visible 14 jours dans le tableau.
- La carte montre le délai de réaction : **encore …** ou **… de retard**.

## Automatique {#automatisch}

- Chaque nouveau cas, aussi du site ou d’un mail, va d’abord à Andy (en cas d’absence au remplaçant). Il reçoit une cloche.
- Le CRM complète projet, lieu, priorité, délai de réaction, liste de contrôle et garantie à l’enregistrement.
- Les annonces du formulaire de panne du site deviennent des cas ; le client reçoit une confirmation via la [Boîte d’envoi](kapitel:outbox), les responsables une notification.
- Un cas peut naître directement d’un mail dans la [Boîte de réception](kapitel:inbox).
- Les installations sont créées avec la mise en service dans le [Projet](kapitel:projects).
- Les cas urgents et ouverts ainsi que les contrôles dans 30 jours figurent sur [Ma journée](kapitel:today).

## Règles {#regeln}

- Seule l’administration règle délais de réaction, listes de contrôle, responsables et textes de confirmation.
- Ce qui part vers le client passe par la boîte d’envoi.

## Questions fréquentes {#fragen}

### En combien de temps devons-nous réagir ?

Cela dépend de **Gravité ?** et figure sur la carte comme « Rendez-vous au plus tard … ». L’administration fixe les délais.

### Le client a deux installations.

Choisir la bonne installation dans le cas. **Cas précédents** montre ce qui s’est déjà passé sur cette installation.

## Nouveautés {#neu}

- 27.11.2026: « Service & garantie » s’appelle de nouveau **Après-vente**, sous Réalisation, comme dans l’ancien CRM.
- 19.11.2026 : Les **pièces jointes** du cas s’ouvrent dans l’app (photo avec agrandissement et copie, PDF), ✉ envoie un fichier au client, **Les … en ZIP** par ex. pour le fabricant.
- 19.11.2026 : Dans le dossier du cas **Historique des modifications** : qui a modifié quoi et quand.
- 19.11.2026: Tous les nouveaux cas vont d’abord à Andy ; dans le dossier, il choisit avec **Choisir le collaborateur** qui reprend. Nouveau filtre **À attribuer**.
- 04.11.2026: La fiche n’affiche les champs vides qu’après **+ autres informations** ; les champs remplis restent visibles.
- 04.11.2026: Le tableau de bord n’affiche que les chiffres différents de 0 ; « cas ouverts » reste toujours affiché.
- 03.11.2026: «Mettre à la corbeille» pour les cas de service, les installations et les cas de garantie, avec confirmation et «Annuler». Restaurer depuis la corbeille (menu en haut à droite).
- 02.11.2026: Centrale en tableau avec délai de réaction, dossier en pleine page avec étapes, liste de contrôle et coûts ; annonces du formulaire de panne du site.
- 31.10.2026: Cas de service directement depuis un mail de la boîte de réception.
- 22.10.2026: Cas de garantie chez le fabricant dans le cas de service.
