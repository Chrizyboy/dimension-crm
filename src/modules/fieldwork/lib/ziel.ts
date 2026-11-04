import type { InternerPosten, TagEintrag, ZeitZiel } from '../types'

/** Eine Wahl im Feld «Ziel»: Wert für die Auswahl und Text für die Anzeige. */
export interface ZielOption {
  wert: string
  text: string
}

/**
 * Ziel als Wert für eine Auswahl, z. B. «p:<id>», «s:<id>» oder «i:lager». Ein Feld für alle drei Arten,
 * damit der Monteur nur eine Liste sieht.
 */
export function zielWert(z: ZeitZiel): string {
  if ('projekt_id' in z) return `p:${z.projekt_id}`
  if ('service_fall_id' in z) return `s:${z.service_fall_id}`
  return `i:${z.intern}`
}

/** Wert aus der Auswahl zurück in ein Ziel; ungültig = null (dann gibt es keinen Start). */
export function zielAusWert(wert: string | null | undefined): ZeitZiel | null {
  const [art, ...rest] = (wert ?? '').split(':')
  const id = rest.join(':')
  if (!id) return null
  if (art === 'p') return { projekt_id: id }
  if (art === 's') return { service_fall_id: id }
  if (art === 'i') return { intern: id }
  return null
}

/** Ziel einer bestehenden Zeit (Projekt geht vor Service-Fall, beides vor internem Posten). */
export function zielVonZeit(z: {
  projekt_id?: string | null
  service_fall_id?: string | null
  intern?: string | null
}): ZeitZiel | null {
  if (z.projekt_id) return { projekt_id: z.projekt_id }
  if (z.service_fall_id) return { service_fall_id: z.service_fall_id }
  if (z.intern) return { intern: z.intern }
  return null
}

/**
 * Wahl für das Ziel: zuerst die Einsätze und Service-Termine aus dem Plan (heute zuerst, jedes Ziel einmal),
 * dann die internen Posten. So steht die heutige Baustelle oben und ist schon gewählt.
 */
export function zielOptionen(
  eintraege: TagEintrag[],
  posten: InternerPosten[],
  sprache: 'de' | 'fr',
  tag: string,
): ZielOption[] {
  const sortiert = [...eintraege].sort((a, b) => {
    const heuteA = a.von <= tag && a.bis >= tag ? 0 : 1
    const heuteB = b.von <= tag && b.bis >= tag ? 0 : 1
    return heuteA - heuteB || a.von.localeCompare(b.von)
  })
  const optionen = new Map<string, ZielOption>()
  for (const e of sortiert) {
    const ziel: ZeitZiel | null =
      e.typ === 'service' && e.service
        ? { service_fall_id: e.service.id }
        : e.projekt
          ? { projekt_id: e.projekt.id }
          : null
    if (!ziel) continue
    const wert = zielWert(ziel)
    if (optionen.has(wert)) continue
    const nummer = e.typ === 'service' ? e.service?.nummer : e.projekt?.nummer
    optionen.set(wert, { wert, text: [nummer, e.kunde.name, e.adresse.ort].filter(Boolean).join(' · ') })
  }
  for (const p of posten) {
    const wert = zielWert({ intern: p.schluessel })
    optionen.set(wert, { wert, text: sprache === 'fr' ? p.fr : p.de })
  }
  return [...optionen.values()]
}
