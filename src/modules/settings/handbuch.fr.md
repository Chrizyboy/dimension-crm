---
stand: 2026-11-02
rollen: administration
---

# Paramètres

L’administration configure ici le CRM : personnes et rôles, qui reçoit les nouveaux leads et les offres, les connexions à Microsoft 365, AbaNinja et SMS, le classement dans SharePoint, la sauvegarde et l’exploitation. Chaque personne gère son propre compte (données, Microsoft, signature) sous [Mon compte](/konto).

## Qui travaille ici {#wer}

- **Administration** : tous les onglets.
- **Tout le monde** : [Mon compte](/konto) via la photo en haut à droite.

## Comment faire {#so}

### Inviter une nouvelle personne

1. Onglet **Personnes**, **Inviter une personne**.
2. Saisir nom, e-mail, **Rôle** et **Site**, **Envoyer l’invitation**. La personne se connecte avec Microsoft ou un code par e-mail.
3. Rien reçu : sur la ligne, **Renvoyer l’invitation**.

### Fixer les droits et les domaines visibles

1. Onglet **Rôles** : par rôle, les **Droits du rôle** et les domaines visibles.
2. Pour une seule personne : ouvrir la personne, **Sélection propre pour cette personne**.
3. **Vue simple (uniquement temps et frais)** sur le rôle : ainsi travaille le rôle monteur, avec temps de travail, frais et planning.

### Régler les responsabilités

1. Onglet **Responsabilités**.
2. Sous **Vente : nouveaux leads**, des règles selon **Langue**, **Site**, **Région** et **Produit** avec **Ajouter une règle**. Aujourd’hui : français à Filipe, allemand à Loris.
3. **Établir les offres** : qui reçoit les nouvelles offres (aujourd’hui Andy).
4. **Remplacement en cas d'absence** par personne.

### Vérifier les connexions

1. Onglet **Connexions** : Microsoft 365, AbaNinja et SMS avec **Configuré** ou **Non configuré**.
2. **Tester maintenant** vérifie la connexion. **Qui est connecté à Microsoft ?** montre l’équipe.
3. En dessous, **Tâches en arrière-plan** et **Derniers appels**, ainsi que le **Classement dans SharePoint** (chemins et dossiers).

### Télécharger ou restaurer une sauvegarde

1. Onglet **Sauvegarde** : automatique à 12:00 et 16:00, en plus **Sauvegarder maintenant**.
2. **Télécharger** fournit la sauvegarde sous forme de fichier.
3. **Restaurer** revient à cet état. Avant, le CRM sauvegarde l’état du jour ; ce qui est nouveau depuis va à la corbeille.

### Vérifier que tout est prêt

1. Onglet **Exploitation** : **Prêt pour l’équipe ?** montre chaque point en vert, jaune ou rouge avec l’étape suivante.

### Gérer son propre compte

1. [Mon compte](/konto) : téléphone, jours de travail, point de départ des tournées, contact d’urgence.
2. **Se connecter avec Microsoft**, pour que les mails partent de sa propre boîte et que les rendez-vous arrivent dans son agenda.
3. **Ma signature** : **Dessiner** ou téléverser une image, pour les contrats d’entreprise.

## Statuts {#staende}

- Personne : **Actif** ou invitée, avec **Dernière activité**.
- Connexion : **Configuré** / **Non configuré**, dernier test réussi ou échoué.
- Exploitation : vert = prêt, jaune = à faire encore, rouge = manque.

## Automatique {#automatisch}

- La base de données attribue les nouveaux leads et offres selon les responsabilités, pas l’app.
- La sauvegarde tourne sur le serveur, même si personne n’est connecté, et dépose une copie dans SharePoint.
- Les mises à jour de l’app Windows arrivent toutes seules ; la version figure dans Mon compte sous « Cette app ».

## Règles {#regeln}

- Seule l’administration voit ce domaine.
- Les clés API ne sont jamais dans le CRM, mais comme secret sur le serveur.
- Seules les personnes saisies peuvent se connecter.
- Les personnes ne sont pas supprimées, mais désactivées.

## Questions fréquentes {#fragen}

### Quelqu’un ne voit pas un domaine.

Le rôle ou la sélection propre de la personne ne le montre pas. Compléter sous **Rôles** ou dans la personne.

### La connexion Microsoft affiche une erreur.

La personne se reconnecte dans Mon compte avec **Reconnecter**. Si cela n’aide pas, regarder **Derniers appels** sous **Connexions**.

## Nouveautés {#neu}

- 31.10.2026: Onglet Responsabilités pour leads, offres et remplacement.
- 31.10.2026: Classement dans SharePoint sous Connexions ; signature propre dans Mon compte.
- 31.10.2026: Rôle monteur avec vue simple.
- 26.10.2026: Sauvegarde, exploitation et mises à jour automatiques de l’app Windows.
