#!/usr/bin/env node
/**
 * Legt ein neues Fachmodul aus der Vorlage docs/modul-vorlage an.
 *
 * Aufruf:
 *   npm run modul:neu -- <id> "<Titel DE>" "<Titel FR>" [icon] [gruppe] [phase]
 * Beispiel:
 *   npm run modul:neu -- lager "Lager" "Stock" package abwicklung 17
 *
 * Danach das Modul in src/lib/navigation.ts eintragen (das Skript zeigt die Zeile an).
 */
import { cpSync, existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const [id, titel, titelFr, icon = 'square', gruppe = 'weitere', phase = '0'] = process.argv.slice(2)

if (!id || !titel || !titelFr) {
  console.error('Bitte angeben: <id> "<Titel DE>" "<Titel FR>" [icon] [gruppe] [phase]')
  process.exit(1)
}
if (!/^\d+[abc]?$/.test(phase)) {
  console.error('Die Phase ist eine Zahl, für eingeschobene Phasen mit Buchstabe, z.B. "8b".')
  process.exit(1)
}
if (!/^[a-z][a-z0-9-]*$/.test(id)) {
  console.error('Die id darf nur Kleinbuchstaben, Ziffern und Bindestriche enthalten, z.B. "service-faelle".')
  process.exit(1)
}

const ziel = join(root, 'src', 'modules', id)
if (existsSync(ziel)) {
  console.error(`Das Modul "${id}" gibt es schon: ${ziel}`)
  process.exit(1)
}

const typ = id.replace(/(^|-)([a-z])/g, (_, __, c) => c.toUpperCase())
const ersetzungen = {
  __MODUL__: id,
  __TITEL__: titel,
  __TITEL_FR__: titelFr,
  __ICON__: icon,
  __GRUPPE__: gruppe,
  __PHASE__: phase,
  // Zahl bleibt Zahl, eingeschobene Phasen wie "8b" werden als Text eingesetzt.
  __PHASE_WERT__: /^\d+$/.test(phase) ? phase : `'${phase}'`,
  __TYP__: typ,
  __TYP_KLEIN__: typ.charAt(0).toLowerCase() + typ.slice(1),
}

cpSync(join(root, 'docs', 'modul-vorlage'), ziel, { recursive: true })

/** Ersetzt die Platzhalter in allen kopierten Dateien. */
function ersetzeIn(ordner) {
  for (const name of readdirSync(ordner)) {
    const pfad = join(ordner, name)
    if (statSync(pfad).isDirectory()) {
      ersetzeIn(pfad)
      continue
    }
    let text = readFileSync(pfad, 'utf8')
    // In Code-Dateien stehen die Titel in '…'; ein Apostroph wie in «Appels d'offres» muss maskiert werden.
    const imCode = pfad.endsWith('.ts')
    for (const [platzhalter, wert] of Object.entries(ersetzungen)) {
      const sicher = imCode && platzhalter.startsWith('__TITEL') ? wert.replaceAll("'", "\\'") : wert
      text = text.replaceAll(platzhalter, sicher)
    }
    writeFileSync(pfad, text)
  }
}
ersetzeIn(ziel)

console.log(`✓ Modul "${id}" angelegt in src/modules/${id}`)
console.log(`  Nächster Schritt: in src/lib/navigation.ts eintragen:`)
console.log(`    import { meta as ${ersetzungen.__TYP_KLEIN__} } from '@/modules/${id}'`)
