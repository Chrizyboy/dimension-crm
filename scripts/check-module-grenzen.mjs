#!/usr/bin/env node
/**
 * Prüft die wichtigste Architektur-Regel: Ein Modul importiert nie ein anderes Modul direkt.
 * Erlaubt sind gemeinsame Bausteine (@/components, @/lib, @/services, @/types …).
 * Nur src/lib/navigation.ts darf die Kenndaten (meta) aller Module einsammeln.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..')
const modulesDir = join(root, 'src', 'modules')
const fehler = []

/** Liefert alle .ts/.tsx-Dateien eines Ordners (rekursiv). */
function dateien(ordner) {
  return readdirSync(ordner).flatMap((name) => {
    const pfad = join(ordner, name)
    if (statSync(pfad).isDirectory()) return dateien(pfad)
    return /\.(ts|tsx)$/.test(name) ? [pfad] : []
  })
}

for (const modul of readdirSync(modulesDir)) {
  const ordner = join(modulesDir, modul)
  if (!statSync(ordner).isDirectory()) continue
  for (const datei of dateien(ordner)) {
    const text = readFileSync(datei, 'utf8')
    for (const [, ziel] of text.matchAll(/from\s+['"]([^'"]+)['"]/g)) {
      const fremd = ziel.match(/^@\/modules\/([^/]+)/) ?? ziel.match(/^\.\.\/\.\.\/([^/.][^/]*)/)
      if (fremd && fremd[1] !== modul) {
        fehler.push(`${relative(root, datei).split(sep).join('/')}: importiert Modul "${fremd[1]}" direkt (${ziel})`)
      }
    }
  }
}

if (fehler.length) {
  console.error('✗ Modul-Grenzen verletzt – Module sprechen nur über src/services/ oder Ereignisse miteinander:')
  for (const f of fehler) console.error('  ' + f)
  process.exit(1)
}
console.log('✓ Modul-Grenzen eingehalten')
