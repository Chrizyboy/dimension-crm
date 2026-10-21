import type { Zweisprachig } from '@/types/modul'

export interface Phase {
  nr: number
  titel: Zweisprachig
  stand: 'fertig' | 'aktiv' | 'offen'
}

/** Der freigegebene Phasenplan (Phase 0 vom 21.10.2026). Stand wird bei jedem Phasen-Abschluss nachgeführt. */
export const BAUPLAN: readonly Phase[] = [
  { nr: 0, titel: { de: 'Analyse der Vorlage', fr: 'Analyse du modèle' }, stand: 'fertig' },
  { nr: 1, titel: { de: 'Gerüst, Werkzeuge, Regeln', fr: 'Structure, outils, règles' }, stand: 'aktiv' },
  { nr: 2, titel: { de: 'Design-System und Bedienoberfläche', fr: 'Système de design et interface' }, stand: 'offen' },
  { nr: 3, titel: { de: 'Datenmodell und Import der Vorlage', fr: 'Modèle de données et import' }, stand: 'offen' },
  { nr: 4, titel: { de: 'Anmeldung, Benutzer, Rollen', fr: 'Connexion, utilisateurs, rôles' }, stand: 'offen' },
  { nr: 5, titel: { de: 'Kunden und Kontakte (360°)', fr: 'Clients et contacts (360°)' }, stand: 'offen' },
  { nr: 6, titel: { de: 'Verkauf: Leads, Pipeline, Touren', fr: 'Vente : leads, pipeline, tournées' }, stand: 'offen' },
  { nr: 7, titel: { de: 'Offerten und Preise', fr: 'Offres et prix' }, stand: 'offen' },
  { nr: 8, titel: { de: 'Microsoft 365, AbaNinja, SMS', fr: 'Microsoft 365, AbaNinja, SMS' }, stand: 'offen' },
  { nr: 9, titel: { de: 'Bauplanung, Service, Verträge', fr: 'Chantiers, service, contrats' }, stand: 'offen' },
  { nr: 10, titel: { de: 'Rechnungen, Spesen, Finanzen', fr: 'Factures, frais, finances' }, stand: 'offen' },
  { nr: 11, titel: { de: 'Marketing und Social Media', fr: 'Marketing et réseaux sociaux' }, stand: 'offen' },
  { nr: 12, titel: { de: 'Automationen', fr: 'Automatisations' }, stand: 'offen' },
  { nr: 13, titel: { de: 'Assistent (KI)', fr: 'Assistant (IA)' }, stand: 'offen' },
  { nr: 14, titel: { de: 'Heute und Dashboard', fr: 'Aujourd’hui et tableau de bord' }, stand: 'offen' },
  { nr: 15, titel: { de: 'Feinschliff', fr: 'Finitions' }, stand: 'offen' },
  { nr: 16, titel: { de: 'Installation und Umzug', fr: 'Installation et migration' }, stand: 'offen' },
]
