import { lazy } from 'react'
import type { EinstellungsBereich } from '@/types/einstellungen'

/**
 * Bereiche der Einstellungen aus diesem Modul. Weitere melden die Fachmodule in ihrer index.ts;
 * die Route `src/app/settings.tsx` setzt alles zusammen.
 */
export const eigeneBereiche: EinstellungsBereich[] = [
  {
    id: 'personen',
    gruppe: 'firma',
    titel: { de: 'Personen', fr: 'Personnes' },
    beschreibung: {
      de: 'Wer Zugang hat, mit Rolle, Standort und Kurzzeichen. Nur hier erfasste Personen können sich anmelden.',
      fr: 'Qui a accès, avec rôle, site et initiales. Seules les personnes saisies ici peuvent se connecter.',
    },
    stichworte: {
      de: 'Benutzer einladen Mitarbeitende Konto sperren Kurzzeichen',
      fr: 'utilisateurs inviter collaborateurs initiales',
    },
    icon: 'users',
    recht: 'admin',
    Inhalt: lazy(() => import('./components/Personen')),
  },
  {
    id: 'rollen',
    gruppe: 'firma',
    titel: { de: 'Rollen & Rechte', fr: 'Rôles et droits' },
    beschreibung: {
      de: 'Was jede Rolle sehen und tun darf: Rechte und sichtbare Bereiche.',
      fr: 'Ce que chaque rôle peut voir et faire : droits et domaines visibles.',
    },
    stichworte: { de: 'Berechtigung Zugriff Bereiche', fr: 'autorisation accès' },
    icon: 'shield-check',
    recht: 'admin',
    Inhalt: lazy(() => import('./components/Rollen')),
  },
  {
    id: 'zustaendigkeiten',
    gruppe: 'firma',
    titel: { de: 'Zuständigkeiten', fr: 'Responsabilités' },
    beschreibung: {
      de: 'Wer neue Leads und Offerten bekommt und wer bei Abwesenheit vertritt.',
      fr: 'Qui reçoit les nouveaux leads et offres, et qui remplace en cas d’absence.',
    },
    stichworte: {
      de: 'Lead Zuteilung Vertretung Stellvertretung Sprache Region',
      fr: 'attribution remplacement langue région',
    },
    icon: 'route',
    recht: 'admin',
    Inhalt: lazy(() => import('./components/ZustaendigkeitenBereich')),
  },
  {
    id: 'regionen',
    gruppe: 'firma',
    titel: { de: 'Standorte & Regionen', fr: 'Sites et régions' },
    beschreibung: {
      de: 'Adressen von Muri und Bulle, Regionen mit PLZ-Regeln. Neue Adressen bekommen ihre Region aus der PLZ.',
      fr: 'Adresses de Muri et Bulle, régions avec règles NPA. Les nouvelles adresses reçoivent leur région selon le NPA.',
    },
    stichworte: { de: 'PLZ Tour Gebiet Kanton Muri Bulle Adresse', fr: 'NPA tournée zone canton adresse' },
    icon: 'map',
    recht: 'admin',
    Inhalt: lazy(() => import('./components/Regionen')),
  },
  {
    id: 'auswahllisten',
    gruppe: 'ablaeufe',
    titel: { de: 'Auswahllisten', fr: 'Listes de choix' },
    beschreibung: {
      de: 'Alle Auswahlfelder des CRM an einem Ort, Deutsch und Französisch, mit Farbe und Reihenfolge.',
      fr: 'Tous les champs de choix du CRM au même endroit, en allemand et en français, avec couleur et ordre.',
    },
    stichworte: {
      de: 'Kundenstand Quelle Dachform Status Kategorie Farbe Reihenfolge',
      fr: 'statut source toit catégorie couleur ordre',
    },
    icon: 'list',
    recht: 'admin',
    Inhalt: lazy(() => import('./components/Auswahllisten')),
  },
  {
    id: 'verbindungen',
    gruppe: 'system',
    titel: { de: 'Verbindungen & Dienste', fr: 'Connexions et services' },
    beschreibung: {
      de: 'Microsoft 365, AbaNinja, SMS und Zeitplan: Stand, Einstellungen und Protokoll.',
      fr: 'Microsoft 365, AbaNinja, SMS et planificateur : état, réglages et journal.',
    },
    stichworte: {
      de: 'AbaNinja SMS ASPSMS Microsoft Outlook Zeitplan Eturnity',
      fr: 'AbaNinja SMS Microsoft Outlook planificateur',
    },
    icon: 'plug',
    recht: 'admin',
    Inhalt: lazy(() => import('./components/Verbindungen').then((m) => ({ default: m.Verbindungen }))),
  },
  {
    id: 'ablage',
    gruppe: 'system',
    titel: { de: 'Dateiablage', fr: 'Classement des fichiers' },
    beschreibung: {
      de: 'Ordner je Offerte und Projekt in SharePoint: Pfade, Namen und Unterordner.',
      fr: 'Dossiers par offre et projet dans SharePoint : chemins, noms et sous-dossiers.',
    },
    stichworte: { de: 'SharePoint Ordner Public Pfad', fr: 'SharePoint dossier chemin' },
    icon: 'folder-open',
    recht: 'admin',
    Inhalt: lazy(() => import('./components/AblageEinstellungen').then((m) => ({ default: m.AblageEinstellungen }))),
  },
  {
    id: 'sicherung',
    gruppe: 'system',
    titel: { de: 'Datensicherung', fr: 'Sauvegarde' },
    beschreibung: {
      de: 'Sicherungen um 12:00 und 16:00, jetzt sichern und wiederherstellen.',
      fr: 'Sauvegardes à 12:00 et 16:00, sauvegarder maintenant et restaurer.',
    },
    stichworte: { de: 'Backup wiederherstellen', fr: 'backup restaurer' },
    icon: 'database-backup',
    recht: 'admin',
    Inhalt: lazy(() => import('./components/Datensicherung').then((m) => ({ default: m.Datensicherung }))),
  },
  {
    id: 'betrieb',
    gruppe: 'system',
    titel: { de: 'Betrieb', fr: 'Exploitation' },
    beschreibung: {
      de: 'Version, Umzug in die Cloud und Prüfpunkte des Betriebs.',
      fr: 'Version, migration vers le cloud et points de contrôle.',
    },
    stichworte: { de: 'Version Umzug Cloud Zustand Wächter', fr: 'version migration cloud état' },
    icon: 'activity',
    recht: 'admin',
    Inhalt: lazy(() => import('./components/Betrieb').then((m) => ({ default: m.Betrieb }))),
  },
  {
    id: 'protokoll',
    gruppe: 'system',
    titel: { de: 'Änderungsprotokoll', fr: 'Journal des modifications' },
    beschreibung: {
      de: 'Wer wann was geändert hat, mit den geänderten Feldern.',
      fr: 'Qui a modifié quoi et quand, avec les champs modifiés.',
    },
    stichworte: { de: 'Verlauf wer hat geändert Historie', fr: 'historique qui a modifié' },
    icon: 'history',
    recht: 'admin',
    Inhalt: lazy(() => import('./components/Protokoll')),
  },
  {
    id: 'papierkorb',
    gruppe: 'system',
    titel: { de: 'Papierkorb', fr: 'Corbeille' },
    beschreibung: {
      de: 'Gelöschtes aus allen Bereichen. Jeder Eintrag lässt sich mit einem Klick zurückholen.',
      fr: 'Éléments supprimés de tous les domaines. Chaque élément se restaure en un clic.',
    },
    stichworte: { de: 'gelöscht wiederherstellen zurückholen', fr: 'supprimé restaurer' },
    icon: 'trash-2',
    recht: 'admin',
    Inhalt: lazy(() => import('./components/Papierkorb')),
  },
]
