#!/usr/bin/env node
/**
 * Prüft, dass jede Migration einen eigenen Zeitstempel hat.
 * Warum: Supabase speichert nur die Nummer vor dem «_» als Version. Zwei Dateien mit
 * derselben Nummer (aus parallelen Pull Requests) lassen den Cloud-Upload scheitern.
 */
import { readdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ordner = join(fileURLToPath(new URL('.', import.meta.url)), '..', 'supabase', 'migrations')
const gesehen = new Map()
const fehler = []

for (const name of readdirSync(ordner)
  .filter((n) => n.endsWith('.sql'))
  .sort()) {
  const version = name.split('_')[0]
  if (!/^\d{14}$/.test(version)) {
    fehler.push(`${name}: Name muss mit 14 Ziffern beginnen (JJJJMMTThhmmss_…)`)
    continue
  }
  const frueher = gesehen.get(version)
  if (frueher) fehler.push(`${name}: gleicher Zeitstempel wie ${frueher}, bitte neue Nummer wählen`)
  else gesehen.set(version, name)
}

if (fehler.length > 0) {
  console.error('Migrationen mit doppeltem oder ungültigem Zeitstempel:\n  ' + fehler.join('\n  '))
  process.exit(1)
}
console.log(`Migrationen: ${gesehen.size} eindeutige Zeitstempel`)
