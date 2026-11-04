---
stand: 2026-11-04
rollen: administration
---

# Paramètres

Tout ce qui se règle dans le CRM se trouve ici, en quatre groupes : **Entreprise** (personnes, rôles, responsabilités, sites et régions, sociétés et banque), **Processus et listes** (listes de choix, boîte de réception, automatisations, catégories de frais), **Système** (connexions, classement, assistant, helpdesk, sauvegarde, exploitation, journal des modifications, corbeille). En haut à gauche, **Rechercher dans les réglages** (touche « / ») cherche dans tous les domaines, p. ex. « IBAN » ou « rappel ». Chaque personne gère son propre compte (données, Microsoft, signature) sous [Mon compte](/konto).

## Qui travaille ici {#wer}

- **Administration** : tous les domaines, modifie tout.
- **Direction** : voit tous les domaines, ne modifie rien.
- **Tous les autres** : aucun réglage de l’entreprise, seulement le leur dans [Mon compte](/konto).
- **Tout le monde** : [Mon compte](/konto) via la photo en haut à droite.

## Comment faire {#so}

### Trouver un domaine

1. À gauche, taper un mot dans **Rechercher dans les réglages**, p. ex. « IBAN ». Entrée ouvre le premier résultat.
2. **Vers le module** en haut à droite mène au domaine auquel appartient le réglage.

### Inviter une nouvelle personne

1. Domaine **Personnes**, **Inviter une personne**.
2. Saisir nom, e-mail, **Rôle** et **Site**, **Envoyer l’invitation**. La personne se connecte avec Microsoft ou un code par e-mail.
3. Rien reçu : sur la ligne, **Renvoyer l’invitation**.

### Ajouter une personne sans e-mail de l’entreprise (lien pour le téléphone)

1. **Inviter une personne**, saisir le nom et activer **Sans e-mail: lien pour le téléphone**.
2. Choisir **Rôle** et **Site**, **Créer un lien d’inscription**.
3. **Copier le lien** ou l’envoyer **Par WhatsApp**. La personne ouvre le lien sur son téléphone, saisit son e-mail privé et se connecte avec le code.
4. Le lien vaut 14 jours et une seule fois. Pour un nouveau lien, ouvrir la personne, **Créer un lien d’inscription**.

### Fixer les droits et les domaines visibles

1. Domaine **Rôles et droits** : par rôle, les **Droits du rôle** et les domaines visibles.
2. Domaine **Personnes**, ouvrir la personne, sous **Compléments** : **Complément direction** (voit tout, finances comprises) et **Complément administration** (configure le système, ne voit ni les finances ni les dossiers du personnel des autres).
3. Pour une seule personne : ouvrir la personne, **Sélection propre pour cette personne**.
4. **Vue simple (uniquement temps et frais)** sur le rôle : seulement temps de travail, frais et planning. Le montage travaille avec la vue normale pour accéder aux rapports, au service et aux véhicules.

### Régler les responsabilités

1. Domaine **Responsabilités**.
2. Sous **Vente : nouveaux leads**, des règles selon **Langue**, **Site**, **Région** et **Produit** avec **Ajouter une règle**. Aujourd’hui : français à Filipe, allemand à Loris.
3. **Établir les offres** : qui reçoit les nouvelles offres (aujourd’hui Andy).
4. **Remplacement en cas d'absence** par personne.

### Adapter les listes de choix

1. Domaine **Listes de choix**, choisir la liste à gauche, p. ex. **Source**.
2. Modifier les textes allemand et français, la **Couleur** et l’ordre (flèches), **Enregistrer**.
3. Listes sans cadenas : remplir **Nouvelle entrée (allemand)** en bas ou masquer avec **Actif**. Les listes avec cadenas pilotent des processus : seulement textes, couleur et ordre.

### Définir régions et NPA

1. Domaine **Sites et régions** : en haut les adresses de Muri et Bulle.
2. Sous **Régions**, saisir les **Règles NPA** par région, p. ex. « 5600-5649, 6300, ZG », **Enregistrer**.
3. **Quelle région pour ce NPA ?** teste un NPA avec **Tester**.

### Récupérer un élément supprimé

1. Domaine **Corbeille** : rechercher ou filtrer par **Domaine**.
2. **Restaurer** ramène l’entrée avec toutes ses données.

### Voir qui a modifié quoi

1. Domaine **Journal des modifications** : choisir **Période**, **Domaine** et **Personne**.
2. Chaque ligne montre qui a modifié quoi et quand, avec les champs modifiés.

### Vérifier les connexions

1. Domaine **Connexions et services** : Microsoft 365, AbaNinja et SMS avec **Configuré** ou **Non configuré**.
2. **Tester maintenant** vérifie la connexion. **Qui est connecté à Microsoft ?** montre l’équipe.
3. En dessous, **Tâches en arrière-plan** et **Derniers appels**. Les chemins SharePoint sont dans le domaine **Classement des fichiers**.
4. Si un service est perturbé, une cloche part à l’administration. Si la cause change, une nouvelle cloche arrive ; le texte sous **Tester maintenant** fait foi.

### Télécharger ou restaurer une sauvegarde

1. Domaine **Sauvegarde** : automatique à 12:00 et 16:00, en plus **Sauvegarder maintenant**.
2. **Télécharger** fournit la sauvegarde sous forme de fichier.
3. **Restaurer** revient à cet état. Avant, le CRM sauvegarde l’état du jour ; ce qui est nouveau depuis va à la corbeille.

### Vérifier que tout est prêt

1. Domaine **Exploitation** : **Prêt pour l’équipe ?** montre chaque point en vert, jaune ou rouge avec l’étape suivante.

### Gérer son propre compte

1. [Mon compte](/konto) : téléphone, jours de travail, point de départ des tournées, contact d’urgence.
2. **Se connecter avec Microsoft**, pour que les mails partent de sa propre boîte et que les rendez-vous arrivent dans son agenda.
3. **Ma signature** : **Dessiner** ou téléverser une image, pour les contrats d’entreprise.

## Statuts {#staende}

- Personne : **Actif** ou invitée, avec **Dernière activité**.
- Connexion : **Configuré** / **Non configuré**, dernier test réussi ou échoué.
- Exploitation : vert = prêt, jaune = à faire encore, rouge = manque.

## Automatique {#automatisch}

- Une nouvelle adresse sans région la reçoit à l’enregistrement selon le NPA (première région correspondante par numéro). Un choix manuel reste.
- Chaque modification va dans le journal, aussi les automatiques (comme « Système »).
- La base de données attribue les nouveaux leads et offres selon les responsabilités, pas l’app.
- La sauvegarde tourne sur le serveur, même si personne n’est connecté, et dépose une copie dans SharePoint.
- Les mises à jour de l’app Windows arrivent toutes seules ; la version figure dans Mon compte sous « Cette app ».

## Règles {#regeln}

- Seule l’administration modifie les réglages de l’entreprise, aussi dans les différents domaines (p. ex. sociétés, catégories de frais, modèles marketing, coût par lead). Les autres les voient en lecture seule. La base de données le vérifie aussi.
- Ce qui ne concerne que soi (profil, langue, signature, style d’écriture, vues personnelles), chaque personne le règle elle-même.
- Rien n’est supprimé définitivement dans le CRM ; les éléments supprimés sont dans la corbeille.
- Les entrées des listes de choix ne sont jamais supprimées, seulement masquées, car des données y renvoient.
- Les clés API ne sont jamais dans le CRM, mais comme secret sur le serveur.
- Seules les personnes saisies peuvent se connecter.
- Les personnes ne sont pas supprimées, mais désactivées.

## Questions fréquentes {#fragen}

### Quelqu’un ne voit pas un domaine.

Le rôle ou la sélection propre de la personne ne le montre pas. Compléter sous **Rôles et droits** ou dans la personne.

### La connexion Microsoft affiche une erreur.

La personne se reconnecte dans Mon compte avec **Reconnecter**. Si cela n’aide pas, regarder **Derniers appels** sous **Connexions et services**.

## Nouveautés {#neu}

- 04.11.2026 : Si la cause d’une panne de service change, une nouvelle cloche arrive avec la nouvelle cause. SMS : les identifiants refusés sont signalés comme tels.
- 03.11.2026: Compléments direction et administration, lien pour le téléphone pour les personnes sans e-mail de l’entreprise.
- 03.11.2026: Tous les réglages au même endroit avec recherche ; nouveau listes de choix, sites et régions (règles NPA), journal des modifications et corbeille ; seule l’administration modifie les réglages de l’entreprise ; réglages des factures, boîte de réception, automatisations, frais, assistant et helpdesk aussi ici.
- 31.10.2026: Onglet Responsabilités pour leads, offres et remplacement.
- 31.10.2026: Classement dans SharePoint sous Connexions ; signature propre dans Mon compte.
- 31.10.2026: Rôle monteur avec vue simple.
- 26.10.2026: Sauvegarde, exploitation et mises à jour automatiques de l’app Windows.
