#!/usr/bin/env node
// Umzug in die Cloud (Phase 16), Schritt für Schritt. Läuft auf dem PC der Administration, nie in der App.
// Anleitung mit allen Klicks: docs/umzug.md.
//
//   npm run umzug -- pruefen            Was ist im Cloud-Projekt schon eingerichtet? (nichts wird geändert)
//   npm run umzug -- datenbank          Tabellen und Regeln anlegen (supabase db push)
//   npm run umzug -- funktionen         Server-Funktionen hochladen (supabase functions deploy)
//   npm run umzug -- tresor             zeigt, welche zwei Einträge der Zeitplan im Tresor (Vault) braucht
//   npm run umzug -- daten "CRM bisher.zip"   Daten aus V233 übernehmen, mit Zählbericht
//
// Schlüssel liest das Skript nur aus der Umgebung (SUPABASE_SERVICE_ROLE_KEY) und gibt sie nie aus.

import { execFileSync, spawnSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

/** Secrets, ohne die das Team nicht arbeiten kann (Zeitplan, Verschlüsselung, Rückkehr nach Microsoft). */
export const PFLICHT = ['ZEITPLAN_SCHLUESSEL', 'VERBINDUNG_SCHLUESSEL', 'APP_URL']

/** Dienste: nur vollständig gesetzt zählen sie als eingerichtet. */
export const DIENSTE = {
  'Microsoft 365': ['MS_CLIENT_ID', 'MS_TENANT_ID', 'MS_CLIENT_SECRET'],
  AbaNinja: ['ABANINJA_TOKEN', 'ABANINJA_KONTO'],
  'SMS (ASPSMS)': ['ASPSMS_USERKEY', 'ASPSMS_PASSWORT'],
  'KI (Claude)': ['ANTHROPIC_API_KEY'],
  Eturnity: ['ETURNITY_WEBHOOK_SECRET'],
  'Facebook/Instagram': ['META_APP_ID', 'META_APP_SECRET'],
  LinkedIn: ['LINKEDIN_CLIENT_ID', 'LINKEDIN_CLIENT_SECRET'],
  Canva: ['CANVA_CLIENT_ID', 'CANVA_CLIENT_SECRET'],
}

/** Nur für Tests mit Ersatz-Servern; im Betrieb würden sie echte Aufrufe umleiten. */
export const NUR_TEST = [
  'MS_LOGIN_URL',
  'MS_GRAPH_URL',
  'MS_RUECKRUF_URL',
  'ABANINJA_URL',
  'ASPSMS_URL',
  'SIMAP_URL',
  'AMTSBLATT_URL',
  'META_URL',
  'META_LOGIN_URL',
  'LINKEDIN_URL',
  'LINKEDIN_LOGIN_URL',
  'CANVA_URL',
  'CANVA_LOGIN_URL',
  'SOCIAL_RUECKRUF_URL',
  'SPEICHER_URL',
  'ANTHROPIC_URL',
]

/** Bewertet die gesetzten Secrets (nur Namen). */
export function secretsPruefen(namen) {
  const da = new Set(namen)
  return {
    pflichtFehlt: PFLICHT.filter((n) => !da.has(n)),
    dienste: Object.entries(DIENSTE).map(([dienst, noetig]) => ({
      dienst,
      fehlt: noetig.filter((n) => !da.has(n)),
    })),
    testWerte: NUR_TEST.filter((n) => da.has(n)),
  }
}

/** Regionen in Europa (Supabase/AWS): Frankfurt, Zürich, Irland, London, Paris, Stockholm, Mailand. */
export function istEuropa(region) {
  return /^eu-/.test(region ?? '')
}

/** Funktionen, die es im Ordner gibt, aber im Projekt noch nicht. */
export function fehlendeFunktionen(lokal, entfernt) {
  const da = new Set(entfernt)
  return lokal.filter((f) => !da.has(f))
}

const cli = (args) =>
  execFileSync('npx', ['supabase', ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
const json = (args) => JSON.parse(cli([...args, '-o', 'json']))
const zeile = (gut, text, weiter = '') =>
  console.log(`${gut ? '✓' : '✗'} ${text}${!gut && weiter ? `\n    → ${weiter}` : ''}`)

function projektRef() {
  const datei = 'supabase/.temp/project-ref'
  return existsSync(datei) ? readFileSync(datei, 'utf8').trim() : null
}

function lokaleFunktionen() {
  return readdirSync('supabase/functions', { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith('_'))
    .map((d) => d.name)
}

function pruefen() {
  const node = Number(process.versions.node.split('.')[0])
  zeile(node >= 22, `Node.js ${process.versions.node}`, 'Node.js 22 oder neuer installieren (nodejs.org).')
  let projekte
  try {
    projekte = json(['projects', 'list'])
    zeile(true, 'Bei Supabase angemeldet')
  } catch {
    zeile(false, 'Bei Supabase angemeldet', '«npx supabase login» ausführen.')
    return
  }
  const ref = projektRef()
  const projekt = projekte.find((p) => p.id === ref || p.ref === ref)
  zeile(
    Boolean(projekt),
    `Projekt verknüpft${projekt ? `: ${projekt.name}` : ''}`,
    '«npx supabase link» und das Projekt wählen.',
  )
  if (!projekt) return
  zeile(
    istEuropa(projekt.region),
    `Region ${projekt.region}`,
    'Das Projekt muss in Europa liegen (Frankfurt oder Zürich).',
  )

  const secrets = secretsPruefen(json(['secrets', 'list']).map((s) => s.name))
  zeile(
    !secrets.pflichtFehlt.length,
    'Pflicht-Secrets',
    `Fehlen: ${secrets.pflichtFehlt.join(', ')} (docs/umzug.md, Schritt 3).`,
  )
  for (const d of secrets.dienste) {
    console.log(
      `${d.fehlt.length ? '○' : '✓'} ${d.dienst}${d.fehlt.length ? ` (noch nicht: ${d.fehlt.join(', ')})` : ''}`,
    )
  }
  zeile(!secrets.testWerte.length, 'Keine Test-Adressen gesetzt', `Bitte entfernen: ${secrets.testWerte.join(', ')}`)

  const entfernt = json(['functions', 'list']).map((f) => f.slug ?? f.name)
  const fehlt = fehlendeFunktionen(lokaleFunktionen(), entfernt)
  zeile(!fehlt.length, 'Server-Funktionen hochgeladen', `Fehlen: ${fehlt.join(', ')} → npm run umzug -- funktionen`)
  console.log('\nDen Rest (Zeitplan, Sicherung, Personen, Daten) zeigt das CRM unter Einstellungen › Betrieb.')
}

function ausfuehren(befehl, args) {
  const r = spawnSync(befehl, args, { stdio: 'inherit' })
  process.exit(r.status ?? 1)
}

function tresor() {
  const ref = projektRef()
  const url = ref ? `https://${ref}.supabase.co/functions/v1` : 'https://<projekt>.supabase.co/functions/v1'
  // Über die Tresor-Seite statt per SQL: Im SQL Editor bliebe der Schlüssel im Verlauf stehen.
  console.log(`Supabase-Dashboard › Integrations › Vault › «Add new secret», zwei Einträge:

  Name: crm_funktionen_url        Wert: ${url}
  Name: crm_zeitplan_schluessel   Wert: derselbe Wert wie das Secret ZEITPLAN_SCHLUESSEL

Danach läuft der Zeitplan jede Minute. Kontrolle: im CRM Einstellungen › Betrieb.`)
}

function daten(zip) {
  const url = process.env.SUPABASE_URL ?? ''
  if (!zip || !existsSync(zip)) {
    console.error('Bitte den Export angeben: npm run umzug -- daten "CRM bisher.zip"')
    process.exit(1)
  }
  if (!/^https:\/\/[a-z0-9]+\.supabase\.co$/.test(url) || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error(
      'SUPABASE_URL (https://<projekt>.supabase.co) und SUPABASE_SERVICE_ROLE_KEY nur für diesen Aufruf setzen.',
    )
    console.error('Anleitung: docs/umzug.md, Schritt 5. Den Schlüssel nie speichern oder weitergeben.')
    process.exit(1)
  }
  ausfuehren('node', ['scripts/import/import-vorlage.mjs', zip, '--umzug', '--bericht', 'umzug-bericht.md'])
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [schritt, ...rest] = process.argv.slice(2)
  if (schritt === 'pruefen') pruefen()
  else if (schritt === 'datenbank') ausfuehren('npx', ['supabase', 'db', 'push'])
  else if (schritt === 'funktionen') ausfuehren('npx', ['supabase', 'functions', 'deploy'])
  else if (schritt === 'tresor') tresor()
  else if (schritt === 'daten') daten(rest[0])
  else {
    console.log('Schritte: pruefen, datenbank, funktionen, tresor, daten "<Export.zip>". Anleitung: docs/umzug.md')
    process.exit(schritt ? 1 : 0)
  }
}
