import de from './de.json'
import fr from './fr.json'

/** Sammelt alle Schlüsselpfade eines verschachtelten Objekts, z.B. "nav.suchen". */
function schluessel(obj: object, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([k, v]) =>
    typeof v === 'object' && v !== null ? schluessel(v as object, `${prefix}${k}.`) : [`${prefix}${k}`],
  )
}

it('Deutsch und Französisch haben dieselben Texte', () => {
  expect(schluessel(fr).sort()).toEqual(schluessel(de).sort())
})
