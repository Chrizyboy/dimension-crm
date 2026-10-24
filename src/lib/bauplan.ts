import type { Phasennummer, Zweisprachig } from '@/types/modul'

export interface Phase {
  nr: Phasennummer
  titel: Zweisprachig
  stand: 'fertig' | 'aktiv' | 'offen'
}

/**
 * Der freigegebene Phasenplan (Phase 0 vom 21.10.2026). Stand wird bei jedem Phasen-Abschluss nachgeführt.
 * 8b: Ausschreibungs-Monitor, von Chris am 21.10.2026 freigegeben. Braucht Kunden, Verkauf, Offerten
 * und den Mailversand über Microsoft 365, deshalb direkt nach Phase 8.
 * 9a, 9b, 17 und die Erweiterungen von 3, 5, 7, 9, 10, 12 und 14: ERP-Lückenanalyse, von Chris am 21.10.2026
 * freigegeben. Was genau dazukommt, steht in docs/entscheidungen/0009-erp-erweiterung.md.
 */
export const BAUPLAN: readonly Phase[] = [
  { nr: 0, titel: { de: 'Analyse der Vorlage', fr: 'Analyse du modèle' }, stand: 'fertig' },
  { nr: 1, titel: { de: 'Gerüst, Werkzeuge, Regeln', fr: 'Structure, outils, règles' }, stand: 'fertig' },
  { nr: 2, titel: { de: 'Design-System und Bedienoberfläche', fr: 'Système de design et interface' }, stand: 'fertig' },
  { nr: 3, titel: { de: 'Datenmodell und Import der Vorlage', fr: 'Modèle de données et import' }, stand: 'fertig' },
  { nr: 4, titel: { de: 'Anmeldung, Benutzer, Rollen', fr: 'Connexion, utilisateurs, rôles' }, stand: 'fertig' },
  { nr: 5, titel: { de: 'Kunden und Kontakte (360°)', fr: 'Clients et contacts (360°)' }, stand: 'fertig' },
  {
    nr: 6,
    titel: { de: 'Anfragen & Leads, Pipeline, Touren', fr: 'Demandes & leads, pipeline, tournées' },
    stand: 'fertig',
  },
  {
    nr: 7,
    titel: { de: 'Offerten, Werkverträge, Preise, Eturnity', fr: 'Offres, contrats, prix, Eturnity' },
    stand: 'fertig',
  },
  { nr: 8, titel: { de: 'Microsoft 365, AbaNinja, SMS', fr: 'Microsoft 365, AbaNinja, SMS' }, stand: 'fertig' },
  { nr: '8b', titel: { de: 'Ausschreibungs-Monitor', fr: 'Veille des appels d’offres' }, stand: 'fertig' },
  {
    nr: 9,
    titel: { de: 'Projekte, Montageplanung, Service, Verträge', fr: 'Projets, planification, service, contrats' },
    stand: 'fertig',
  },
  { nr: '9a', titel: { de: 'Einkauf und Material', fr: 'Achats et matériel' }, stand: 'fertig' },
  { nr: '9b', titel: { de: 'Baustelle und Service am Handy', fr: 'Chantier et service sur mobile' }, stand: 'fertig' },
  {
    nr: 10,
    titel: { de: 'Rechnungen, Nachkalkulation, Finanzen', fr: 'Factures, post-calcul, finances' },
    stand: 'fertig',
  },
  { nr: 11, titel: { de: 'Marketing und Social Media', fr: 'Marketing et réseaux sociaux' }, stand: 'fertig' },
  { nr: 12, titel: { de: 'Automationen', fr: 'Automatisations' }, stand: 'fertig' },
  { nr: 13, titel: { de: 'Assistent (KI)', fr: 'Assistant (IA)' }, stand: 'aktiv' },
  { nr: 14, titel: { de: 'Mein Tag und Kennzahlen', fr: 'Ma journée et indicateurs' }, stand: 'offen' },
  { nr: 15, titel: { de: 'Feinschliff', fr: 'Finitions' }, stand: 'offen' },
  { nr: 16, titel: { de: 'Installation und Umzug', fr: 'Installation et migration' }, stand: 'offen' },
  {
    nr: 17,
    titel: { de: 'Fahrzeuge, Geräte, Personal-Akte', fr: 'Véhicules, appareils, dossier du personnel' },
    stand: 'offen',
  },
]
