/** Ein Lead ohne Interesse im Bericht an den Anbieter. */
export interface OhneInteresse {
  id: string
  eingang_am: string
  name: string
  plz: string | null
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

/** Betreff der Mail an den Anbieter (V233). */
export function berichtBetreff(monat: string, sprache: 'de' | 'fr'): string {
  return sprache === 'fr'
    ? `Évaluation des leads ${monatName(monat, 'fr')} – Dimension Solaire`
    : `Lead-Auswertung ${monatName(monat, 'de')} – Dimension Solaire`
}

/** Stand der Leads einer Quelle, wie er im Bericht steht. */
export interface BerichtStand {
  inBearbeitung: number
  termin: number
  offeriert: number
  keinInteresse: number
}

function differenz(gekauft: number, erhalten: number, fr: boolean): string {
  const d = erhalten - gekauft
  if (d < 0)
    return fr
      ? `Différence : il manque ${String(-d)} lead${d === -1 ? '' : 's'}. Merci de vérifier et de livrer ou créditer.`
      : `Differenz: es fehlen ${String(-d)} Lead${d === -1 ? '' : 's'}. Bitte prüfen und nachliefern bzw. gutschreiben.`
  if (d === 0) return fr ? 'Différence : aucune – le nombre correspond.' : 'Differenz: keine – die Anzahl stimmt.'
  return fr
    ? `Différence : ${String(d)} lead${d === 1 ? '' : 's'} de plus que facturé${d === 1 ? '' : 's'}.`
    : `Differenz: ${String(d)} Lead${d === 1 ? '' : 's'} mehr erhalten als verrechnet.`
}

/**
 * Bericht-Text an den Lead-Anbieter wie V233 (lbReportText): erhalten im CRM, gekauft und Differenz,
 * Stand der Leads, die reklamierten Leads (Bitte um Gutschrift) und die übrigen ohne Interesse
 * zur Information. Die KI-Fassung (V233 lbAiText) bekommt dieselben Fakten über `berichtFakten`.
 */
export function berichtText(eingabe: {
  monat: string
  quelle: string
  erhalten: number
  gekauft: number | null
  stand: BerichtStand
  ohneInteresse: readonly OhneInteresse[]
  reklamiert: ReadonlySet<string>
  sprache: 'de' | 'fr'
}): string {
  const { monat, quelle, erhalten, gekauft, stand, ohneInteresse, reklamiert, sprache } = eingabe
  const fr = sprache === 'fr'
  const zeile = (l: OhneInteresse) =>
    `– ${datum(l.eingang_am)} · ${l.name} · ${[l.plz, l.ort].filter(Boolean).join(' ')} · ${fr ? 'Motif' : 'Grund'}: ${l.grund ?? (fr ? 'non saisi' : 'nicht erfasst')}`
  const z = [fr ? 'Bonjour' : 'Guten Tag', '']
  z.push(
    fr
      ? `Voici notre évaluation des leads pour ${monatName(monat, 'fr')} (${quelle}).`
      : `Anbei unsere Lead-Auswertung für ${monatName(monat, 'de')} (${quelle}).`,
    '',
    `${fr ? 'Leads reçus dans le CRM' : 'Erhaltene Leads im CRM'}: ${String(erhalten)}`,
  )
  if (gekauft)
    z.push(
      `${fr ? 'Achetés / facturés' : 'Gekauft / verrechnet'}: ${String(gekauft)}`,
      differenz(gekauft, erhalten, fr),
    )
  z.push(
    '',
    fr ? 'État des leads :' : 'Stand der Leads:',
    `– ${fr ? 'En cours' : 'In Bearbeitung'}: ${String(stand.inBearbeitung)}`,
    `– ${fr ? 'Rendez-vous fixé' : 'Termin vereinbart'}: ${String(stand.termin)}`,
    `– ${fr ? 'Offre envoyée' : 'Offeriert'}: ${String(stand.offeriert)}`,
    `– ${fr ? 'Pas intéressé' : 'Kein Interesse'}: ${String(stand.keinInteresse)}`,
  )
  const rek = ohneInteresse.filter((l) => reklamiert.has(l.id))
  const info = ohneInteresse.filter((l) => !reklamiert.has(l.id))
  if (rek.length) {
    z.push(
      '',
      fr
        ? 'Nous vous prions de vérifier et de créditer les leads suivants :'
        : 'Wir bitten um Prüfung und Gutschrift folgender Leads:',
    )
    z.push(...rek.map(zeile))
  }
  if (info.length) {
    z.push(
      '',
      rek.length
        ? fr
          ? 'Autres leads sans intérêt (pour information) :'
          : 'Weitere Leads ohne Interesse (zur Information):'
        : fr
          ? 'Leads sans intérêt (pour information) :'
          : 'Leads ohne Interesse (zur Information):',
    )
    z.push(...info.map(zeile))
  }
  z.push('', fr ? 'Meilleures salutations' : 'Freundliche Grüsse')
  return z.join('\n')
}

/**
 * Fakten für den KI-Text des Monatsberichts (V233 lbAiText): Die App rechnet, die KI formuliert nur.
 * Reklamierte Leads mit Datum, Name, Ort und Grund, die übrigen ohne Interesse nur zur Information.
 */
export function berichtFakten(eingabe: {
  monat: string
  erhalten: number
  gekauft: number | null
  stand: BerichtStand
  ohneInteresse: readonly OhneInteresse[]
  reklamiert: ReadonlySet<string>
}): Record<string, unknown> {
  const { monat, erhalten, gekauft, stand, ohneInteresse, reklamiert } = eingabe
  const zeile = (l: OhneInteresse) => ({
    datum: datum(l.eingang_am),
    name: l.name,
    ort: [l.plz, l.ort].filter(Boolean).join(' '),
    grund: l.grund ?? 'nicht erfasst',
  })
  return {
    monat: monatName(monat, 'de'),
    erhalten,
    gekauft,
    differenz: gekauft === null ? null : erhalten - gekauft,
    stand: {
      in_bearbeitung: stand.inBearbeitung,
      termin: stand.termin,
      offeriert: stand.offeriert,
      kein_interesse: stand.keinInteresse,
    },
    reklamation: ohneInteresse.filter((l) => reklamiert.has(l.id)).map(zeile),
    zur_info: ohneInteresse.filter((l) => !reklamiert.has(l.id)).map(zeile),
  }
}
