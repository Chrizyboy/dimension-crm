---
stand: 2026-11-04
rollen: verkauf, innendienst, projektleitung, buchhaltung, geschaeftsleitung, administration
---

# Assistant IA

Rédiger, lire les e-mails, ta journée en un coup d’œil et les coûts sous contrôle. L’IA propose, un humain décide. La plupart des boutons IA se trouvent là où l’on travaille : chaque dossier (client, lead, offre, projet, service) propose **Rédiger avec l’IA** et **Résumer**, les frais **Lire avec l’IA**.

## Qui travaille ici {#wer}

- **Tous ceux en contact avec les clients** : textes pour les clients, lecture des e-mails, style personnel.
- **Direction** : coûts.
- **Administration** : paramètres (modèles, limites, style de l’entreprise).

## Comment faire {#so}

### Poser des questions au CRM

1. Onglet **Questions** (ou partout **Ctrl J**) et taper la question avec tes mots, p. ex. « Trie ma boîte de réception par urgence » ou « Quelles commandes sont en retard ? ».
2. La réponse arrive avec un tableau tiré du CRM. Cliquer sur le numéro, l’objet, le client ou le projet ouvre la fiche.
3. En dessous, des propositions (**Créer une tâche**, **Rédiger un e-mail**, **Ouvrir**). Rien n’est enregistré avant ton clic.
4. L’assistant connaît : clients, leads, offres, projets, cas de service, installations, factures, contrats de maintenance, tâches, historique, **boîte de réception**, **boîte d’envoi**, commandes, factures fournisseurs, frais, grands projets, appels d’offres, interventions, échéances, stock, véhicules, appareils, campagnes et avenants.
5. Boîte de réception par urgence : en haut les mails dont le délai de réponse est dépassé, les pannes, les mails reconnus urgents et les clients qui n’ont pas répondu. Les mails reportés ou en attente sont plus bas. Le motif est indiqué pour chaque mail.

### Rédiger un texte pour un client

1. De préférence depuis le dossier du client ou du lead : **Rédiger avec l’IA**. L’IA connaît alors le client et l’historique.
2. Sans lien : onglet **Assistant**, carte **Texte pour un client**, **Ouvrir**.
3. Choisir **Pour quoi** (relance, réponse, rendez-vous …), sous **Que doit contenir le texte ?** des mots-clés, **Langue** (**Comme le client**).
4. **Rédiger le brouillon**. Si quelque chose ne va pas : **Que faut-il changer ?** et **Retravailler**.
5. **Continuer vers l’e-mail** : le mail passe comme toujours par la [Boîte d’envoi](kapitel:outbox) et ne part qu’après ta validation.

### Faire lire un e-mail reçu

1. Onglet **Assistant**, **Lire un e-mail reçu**, coller le texte ou **Choisir un fichier .eml**.
2. **Lire avec l’IA** : l’IA reconnaît la requête, le nom, l’adresse, l’intérêt et montre les **Clients correspondants dans le CRM**.
3. **Saisir comme lead** ou **Rédiger une réponse**. Les mails d’Outlook sont déjà classés par la [Boîte de réception](kapitel:inbox).

### Dicter et mettre en forme des notes

1. Dans un champ de note, **Dicter**, parler, **Arrêter la dictée**.
2. **Mettre en forme avec l’IA** fait du texte parlé une note propre.

### Ta journée

1. Sur [Ma journée](kapitel:today) figure le briefing **Ta journée** : ce qui compte aujourd’hui. **Recréer le briefing** récupère l’état le plus récent.

### Gérer son style personnel

1. Onglet **Mon style** : les règles que l’IA a apprises de tes corrections.
2. Ajouter des règles (**Ajouter**), les supprimer ou **Réinitialiser le style**.

### Coûts et paramètres (administration)

1. Onglet **Coûts** : **Consommé aujourd’hui** par rapport à la limite journalière, sur le mois **Par fonction**, **Par personne**, **Par modèle**.
2. Onglet **Paramètres** : **IA activée**, **Limite journalière (CHF)**, **Limite par personne (CHF)**, quelle fonction utilise quel modèle, style de l’entreprise DE/FR.

## Automatique {#automatisch}

- Chaque appel est enregistré avec son coût, sans le contenu. Quand la limite journalière est atteinte, l’IA fait une pause jusqu’au lendemain.
- En arrière-plan, la boîte de réception, les grands projets (recherche) et les automatisations utilisent aussi l’IA.

## Règles {#regeln}

- L’IA ne fait que proposer ; c’est repris seulement après ton clic. Les propositions portent la mention « Proposition de l’IA du …, à vérifier ».
- Les e-mails et fichiers externes ne sont que des données pour l’IA, jamais des instructions.
- Les mails aux clients partent uniquement via la fenêtre e-mail et la boîte d’envoi.
- Seule l’administration règle modèles, prix et limites.

## Questions fréquentes {#fragen}

### Le bouton IA est grisé.

L’IA est désactivée ou la limite journalière est atteinte. L’administration le voit sous **Coûts** et **Paramètres**.

### L’assistant voit-il les mails des autres ?

Non. Il lit avec ton identifiant et voit exactement ce que tu vois dans la [Boîte de réception](kapitel:inbox) : ta propre boîte, les boîtes d’équipe et les mails où tu es mentionné. Il en va de même pour les frais, les finances et tous les autres domaines.

### Puis-je donner des données clients à l’IA ?

Oui, via les boutons IA du CRM. L’appel passe par notre serveur avec la clé de l’entreprise ; le journal note seulement qu’un appel a eu lieu, pas le contenu. Ne pas copier de données clients dans des sites IA externes.

## Nouveautés {#neu}

- 04.11.2026: L’assistant lit aussi la boîte de réception (triée par urgence), la boîte d’envoi, les commandes, les factures fournisseurs, les frais, les grands projets, les appels d’offres, les installations, les interventions, les échéances, le stock, les véhicules, les appareils, les campagnes et les avenants.
- 24.10.2026: Texte de lecture dès 12 px, tableaux au clavier.
- 23.10.2026: Assistant IA avec coûts, Mon style, paramètres et briefing « Ta journée ».
