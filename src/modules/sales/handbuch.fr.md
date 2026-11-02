---
stand: 2026-11-02
rollen: verkauf, geschaeftsleitung
---

# Demandes & leads

Du premier contact à l’accord : saisir et appeler les leads, fixer et planifier les rendez-vous, relancer et transmettre pour l’offre. Avec tournée du jour, tournée, calendrier, régions et le rapport mensuel pour les fournisseurs de leads.

## Qui travaille ici {#wer}

- **Vente** : Filipe tout ce qui est francophone, Loris tout ce qui est germanophone (par défaut selon Paramètres › Responsabilités, modifiable par lead).
- **Service interne** : reprend les leads au statut « Offre en préparation » dans le chapitre [Offres](kapitel:quotes).
- **Direction** : voit tous les leads et le pipeline.

## Comment faire {#so}

### Saisir un nouveau lead

1. **Nouveau** (ou touche **N**), saisir nom, téléphone, adresse avec NPA, langue et source.
2. Si la personne existe déjà, le CRM propose le contact existant : le prendre, pour éviter les doublons.
3. **Enregistrer**. Localité, région et situation viennent du NPA ; la base de données attribue la personne responsable.

### Appeler un lead et saisir le contact

1. Ouvrir le lead, **Saisir un contact**.
2. Choisir le résultat : atteint, pas atteint, rappel convenu, pas intéressé (avec motif).
3. Pour « plus tard », fixer une date sous **Quand recontacter**. Le lead revient alors comme rappel sur [Ma journée](kapitel:today).

### Fixer un rendez-vous

1. Ouvrir le lead, **Fixer un rendez-vous**, choisir date, heure, durée et personne.
2. Le rendez-vous apparaît dans le calendrier, la tournée du jour et, avec la connexion Microsoft, dans Outlook.
3. **Fiche de rendez-vous** imprime toutes les données pour la route.

### Après la visite, transmettre pour l’offre

1. Ouvrir le lead, section **Visite** : surface de toit, orientation, inclinaison, matériau, raccordement, consommation et particularités.
2. Mettre le statut sur **Offre en préparation**. Le lead apparaît au service interne sous « Nouvelles offres ».
3. Sans visite : **Offre indicative**, le service interne fait l’offre selon les indications au téléphone.

### Modifier plusieurs leads à la fois

1. Dans **Leads**, cocher les lignes.
2. En bas, fixer statut, personne ou région pour toutes les lignes choisies.

### Planifier la journée ou une tournée

1. **Tournée du jour** : choisir le jour et le départ (domicile ou autre adresse). Le CRM ordonne les rendez-vous et montre les trajets.
2. **Planifier une tournée** : choisir des leads sans rendez-vous dans une région ou coller des adresses, le CRM propose l’ordre.
3. **Calendrier** : les plages libres sont vertes, un clic planifie un lead ; les rendez-vous se déplacent par glisser.

### SMS de rappel pour demain

1. **SMS pour demain** : tous les rendez-vous de demain avec un texte dans la langue du client.
2. Vérifier et **Envoyer**. Le SMS passe par la [Boîte d’envoi](kapitel:outbox), un seul par rendez-vous.

### Rapport mensuel au fournisseur de leads

1. **Rapport mensuel**, choisir le mois.
2. Par source, ce qu’est devenu chaque lead. **Rapport au fournisseur** crée le texte.

## Statuts {#staende}

- **Nouveau lead** : pas encore de contact.
- **Lead ouvert** : un contact a eu lieu, ça continue.
- **Recontacter plus tard** : avec date, revient comme rappel.
- **RDV fixé** : la visite est prévue.
- **Visite faite – suite ?** : décider après le rendez-vous.
- **Offre en préparation / Offre à valider** : au service interne.
- **Offre envoyée / À relancer / Décision reportée** : chez le client.
- **Acceptée – à planifier**, **Chantier en cours**, **Construit**, **Dossier clos** : suite dans le chapitre [Projets & montage](kapitel:projects).
- **Perdue** et **Pas intéressé** : toujours avec motif.

## Automatique {#automatisch}

- Qui reçoit un nouveau lead est réglé par les responsabilités (langue, site, région, produit). En cas d’absence, il va au remplaçant.
- Les demandes du site web et de la boîte de réception deviennent des leads toutes seules.
- Les statuts après l’offre (envoyée, à relancer, acceptée, chantier) sont posés par le CRM. Pas à la main.

## Règles {#regeln}

- « Perdue » et « Pas intéressé » demandent un motif, « Plus tard » une date future.
- Les personnes avec **Pas de publicité** ne reçoivent ni e-mails en série ni newsletter.

## Questions fréquentes {#fragen}

### Pourquoi ne puis-je pas tirer le statut sur « Offre envoyée » ?

Le CRM pose ce statut dès que l’offre est envoyée. Ainsi, le pipeline concorde toujours avec les offres.

### La carte est grise.

La carte vient de swisstopo. Si elle est bloquée ou hors ligne, elle reste grise ; tournée et situation fonctionnent quand même.

### Comment enregistrer mes filtres ?

**Vues enregistrées**, **Enregistrer la vue actuelle**. Avec **Visible pour toute l’équipe**, tout le monde la voit.

## Nouveautés {#neu}

- 01.11.2026: Créer un lead directement depuis un e-mail de la boîte de réception.
- 31.10.2026: Le CRM répartit les nouveaux leads et offres selon Paramètres › Responsabilités.
