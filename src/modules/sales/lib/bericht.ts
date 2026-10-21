/** Ein Lead ohne Interesse im Bericht an den Anbieter. */
interface OhneInteresse {
  eingang_am: string
  name: string
  ort: string | null
  grund: string | null
}

const MONATE_DE = [
  'Januar',
  'Februar',
  'März',
  'April',
  'Mai',
  'Juni',
  'Juli',
  'August',
  'September',
  'Oktober',
  'November',
  'Dezember',
]
const MONATE_FR = [
  'janvier',
  'février',
  'mars',
  'avril',
  'mai',
  'juin',
  'juillet',
  'août',
  'septembre',
  'octobre',
  'novembre',
  'décembre',
]

/** «September 2026» bzw. «septembre 2026» aus «2026-09». */
export function monatName(monat: string, sprache: 'de' | 'fr'): string {
  const [j, m] = monat.split('-').map(Number)
  return `${(sprache === 'fr' ? MONATE_FR : MONATE_DE)[(m ?? 1) - 1] ?? ''} ${j ?? ''}`
}

function datum(iso: string): string {
  return iso.slice(0, 10).split('-').reverse().join('.')
}

/**
 * Bericht-Text an den Lead-Anbieter wie in V233: erhalten im CRM, gekauft, Differenz und die Leads
 * ohne Interesse mit Grund, dazu die Bitte um Ersatz. Die KI-Fassung kommt in Phase 13.
 */
export function berichtText(eingabe: {
  monat: string
  quelle: string
  erhalten: number
  gekauft: number | null
  ohneInteresse: readonly OhneInteresse[]
  sprache: 'de' | 'fr'
}): string {
  const { monat, quelle, erhalten, gekauft, ohneInteresse, sprache } = eingabe
  const fr = sprache === 'fr'
  const zeilen = [fr ? 'Bonjour' : 'Guten Tag', '']
  zeilen.push(
    fr
      ? `Voici notre évaluation des leads pour ${monatName(monat, 'fr')} (${quelle}).`
      : `Anbei unsere Lead-Auswertung für ${monatName(monat, 'de')} (${quelle}).`,
    '',
    `${fr ? 'Leads reçus dans le CRM' : 'Erhaltene Leads im CRM'}: ${erhalten}`,
  )
  if (gekauft !== null) {
    zeilen.push(`${fr ? 'Achetés / facturés' : 'Gekauft / verrechnet'}: ${gekauft}`)
    const diff = gekauft - erhalten
    if (diff > 0)
      zeilen.push(
        fr
          ? `Différence : il manque ${diff} lead(s). Merci de vérifier et de livrer le(s) lead(s) manquant(s).`
          : `Differenz: Es ${diff === 1 ? 'fehlt 1 Lead' : `fehlen ${diff} Leads`}. Wir bitten Sie, dies zu prüfen und ${diff === 1 ? 'den fehlenden Lead' : 'die fehlenden Leads'} nachzuliefern.`,
      )
  }
  if (ohneInteresse.length) {
    zeilen.push('', fr ? 'Leads sans intérêt (pour information) :' : 'Leads ohne Interesse (zur Information):')
    for (const l of ohneInteresse)
      zeilen.push(
        `– ${datum(l.eingang_am)} · ${l.name}${l.ort ? ` · ${l.ort}` : ''} · ${fr ? 'Motif' : 'Grund'}: ${l.grund ?? (fr ? 'non saisi' : 'nicht erfasst')}`,
      )
    zeilen.push(
      '',
      fr
        ? `Pour ${ohneInteresse.length === 1 ? 'ce lead' : `ces ${ohneInteresse.length} leads`} sans intérêt, nous vous prions de bien vouloir nous fournir des leads de remplacement.`
        : `Für ${ohneInteresse.length === 1 ? 'diesen Lead' : `diese ${ohneInteresse.length} Leads`} ohne Interesse bitten wir Sie freundlich um Ersatzleads.`,
    )
  }
  zeilen.push('', fr ? 'Meilleures salutations' : 'Freundliche Grüsse')
  return zeilen.join('\n')
}
