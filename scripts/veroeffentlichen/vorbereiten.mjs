// Bereitet «Neue Version veröffentlichen» vor (GitHub Actions, Windows): prüft, ob alles eingerichtet ist,
// schreibt die Zusatz-Konfiguration für Tauri (Update-Schlüssel) und die Notizen zur Version.
// Aufruf im Workflow: node scripts/veroeffentlichen/vorbereiten.mjs
// Geheimnisse liest das Skript nur, um zu prüfen, OB sie gesetzt sind; es gibt sie nie aus.

import { appendFileSync, readFileSync, writeFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

/** Abschnitt «## <version>» aus docs/versionen.md, ohne Überschrift. */
export function notizenFuer(text, version) {
  const teile = text.split(/^## /m)
  const abschnitt = teile.find((t) => t.split('\n')[0].trim().split(/\s/)[0] === version)
  if (!abschnitt) return ''
  return abschnitt.split('\n').slice(1).join('\n').trim()
}

/** Welche Einstellungen fehlen (Namen, nie Werte). */
export function fehlende(env) {
  const noetig = ['TAURI_SIGNING_PRIVATE_KEY', 'TAURI_UPDATER_PUBKEY', 'VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY']
  return noetig.filter((n) => !env[n] || !String(env[n]).trim())
}

/** Zusatz-Konfiguration: Update-Dateien erzeugen und mit diesem öffentlichen Schlüssel prüfen. */
export function releaseKonfig(pubkey) {
  return { bundle: { createUpdaterArtifacts: true }, plugins: { updater: { pubkey: pubkey.trim() } } }
}

// pathToFileURL: unter Windows sieht der Pfad anders aus als die Modul-Adresse.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const version = JSON.parse(readFileSync('package.json', 'utf8')).version
  const fehlt = fehlende(process.env)
  if (fehlt.length) {
    console.error(`Es fehlen Einstellungen im GitHub-Projekt: ${fehlt.join(', ')}`)
    console.error('Anleitung: docs/installation.md, Abschnitt «Einmal einrichten».')
    process.exit(1)
  }
  if (!/^https:\/\//.test(process.env.VITE_SUPABASE_URL)) {
    console.error('VITE_SUPABASE_URL muss die Adresse des Cloud-Projekts sein (https://…supabase.co).')
    process.exit(1)
  }
  const notizen = notizenFuer(readFileSync('docs/versionen.md', 'utf8'), version)
  if (!notizen) {
    console.error(`In docs/versionen.md fehlt der Abschnitt «## ${version}».`)
    process.exit(1)
  }
  writeFileSync('src-tauri/tauri.release.conf.json', JSON.stringify(releaseKonfig(process.env.TAURI_UPDATER_PUBKEY)))
  writeFileSync('versionsnotizen.md', notizen + '\n')
  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(process.env.GITHUB_OUTPUT, `version=${version}\nnotizen<<NOTIZEN_ENDE\n${notizen}\nNOTIZEN_ENDE\n`)
  }
  console.log(`Version ${version} bereit.`)
}
