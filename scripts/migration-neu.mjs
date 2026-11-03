#!/usr/bin/env node
/**
 * Legt eine neue Migration mit der nächsten freien Nummer an:
 *   npm run migration:neu -- <name>
 * Warum nicht `supabase migration new`: Die echte Uhrzeit liegt vor bereits eingespielten
 * Nummern (die Reihe ist vorausdatiert), `db push` würde die Datei ablehnen.
 * Die Nummer liegt 1 Stunde nach der höchsten auf diesem Stand und auf origin/main,
 * plus zufällige Minuten/Sekunden, damit parallele Threads nicht dieselbe ziehen.
 * Doppelte fängt sonst `scripts/check-migrationen.mjs` in `npm run lint`.
 */
import { execSync } from 'node:child_process'
import { readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const name = process.argv[2]
if (!name || !/^[a-z0-9_]+$/.test(name)) {
  console.error('Bitte einen Namen angeben (klein, mit _): npm run migration:neu -- lager_ausbau')
  process.exit(1)
}

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..')
const ordner = join(root, 'supabase', 'migrations')

/** Nummern aus einer Liste von Dateinamen. */
const nummern = (namen) => namen.map((n) => n.split('/').pop().split('_')[0]).filter((v) => /^\d{14}$/.test(v))

let alle = nummern(readdirSync(ordner))
try {
  execSync('git fetch -q origin main', { cwd: root, stdio: 'ignore' })
  const main = execSync('git ls-tree --name-only FETCH_HEAD supabase/migrations/', { cwd: root })
  alle = alle.concat(nummern(main.toString().split('\n')))
} catch {
  console.warn('Hinweis: origin/main nicht erreichbar, nur lokaler Stand berücksichtigt.')
}

const hoechste = alle.sort().at(-1)
const zeit = (v) =>
  new Date(
    Date.UTC(+v.slice(0, 4), +v.slice(4, 6) - 1, +v.slice(6, 8), +v.slice(8, 10), +v.slice(10, 12), +v.slice(12, 14)),
  )
const neu = new Date(zeit(hoechste).getTime() + 3600_000 + Math.floor(Math.random() * 3600) * 1000)
const zwei = (z) => String(z).padStart(2, '0')
const version = `${neu.getUTCFullYear()}${zwei(neu.getUTCMonth() + 1)}${zwei(neu.getUTCDate())}${zwei(neu.getUTCHours())}${zwei(neu.getUTCMinutes())}${zwei(neu.getUTCSeconds())}`

const datei = join(ordner, `${version}_${name}.sql`)
writeFileSync(datei, `-- ${name}\n`)
console.log(`Angelegt: supabase/migrations/${version}_${name}.sql (höchste bisher ${hoechste})`)
