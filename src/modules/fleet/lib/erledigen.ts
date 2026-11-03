import type { Belegung, Fahrzeug, Frist, Geraet, Schaden } from '../types'
import { konflikte, plusTage } from './belegung'
import { fristStand, serviceKmStand, tageBis } from './fristen'

/** Eine Zeile in «Zu erledigen». Texte macht die Oberfläche aus `art` und den Angaben. */
export interface Aufgabe {
  schluessel: string
  ton: 'kritisch' | 'warnung' | 'info'
  art: 'frist' | 'service_km' | 'schaden' | 'konflikt' | 'km_fehlt' | 'lange_weg'
  fahrzeug_id?: string
  geraet_id?: string
  titel: string
  /** Frist-Art, Datum, Tage, Kilometer … je nach `art`. */
  angaben: Record<string, string | number>
}

const RANG = { kritisch: 0, warnung: 1, info: 2 } as const

/** Wie lange ein Gerät ohne «zurück bis» bei einer Person sein darf, bevor das Büro nachfragt. */
export const LANGE_WEG_TAGE = 30

/**
 * Alles, was im Bereich ansteht, an einem Ort: Fristen (überfällig oder im Vorlauf; Ausweise gehören zu «Team &
 * Ausweise»), Service nach Kilometern, offene Schäden, doppelte Belegungen der nächsten 14 Tage, fehlender
 * Kilometerstand im Monat und Geräte, die lange nicht zurückkamen. Kritisches zuerst, dann nach Datum.
 */
export function zuErledigen(d: {
  fahrzeuge: Fahrzeug[]
  geraete: Geraet[]
  fristen: Frist[]
  schaeden: Schaden[]
  belegung: Belegung[]
  heute: string
}): Aufgabe[] {
  const { heute } = d
  const liste: Aufgabe[] = []
  const name = (f: Fahrzeug) => `${f.bezeichnung} ${f.kennzeichen}`
  const geraetName = (g: Geraet) => `${g.bezeichnung}${g.inventar_nr ? ` (${g.inventar_nr})` : ''}`

  for (const f of d.fristen) {
    if (f.art === 'ausweis') continue
    const vorlauf = f.art === 'leasing' ? 90 : f.art === 'ausleihe' ? 0 : 30
    const stand = fristStand(f.faellig_am, heute, vorlauf)
    if (stand === 'ok') continue
    liste.push({
      schluessel: `frist:${f.art}:${f.bezug_id}`,
      ton: stand === 'ueberfaellig' ? 'kritisch' : f.art === 'leasing' ? 'info' : 'warnung',
      art: 'frist',
      ...(f.bezug_tabelle === 'fahrzeuge' ? { fahrzeug_id: f.bezug_id } : { geraet_id: f.bezug_id }),
      titel: f.titel,
      angaben: { frist: f.art, datum: f.faellig_am, tage: tageBis(f.faellig_am, heute) },
    })
  }

  for (const f of d.fahrzeuge) {
    if (f.ausser_betrieb) continue
    const km = serviceKmStand(f.km_stand, f.service_km)
    if (km !== 'ok' && f.service_km !== null && f.km_stand !== null)
      liste.push({
        schluessel: `km:${f.id}`,
        ton: km === 'ueberfaellig' ? 'kritisch' : 'warnung',
        art: 'service_km',
        fahrzeug_id: f.id,
        titel: name(f),
        angaben: { bei: f.service_km, rest: f.service_km - f.km_stand },
      })
    // Ab dem 3. des Monats: Erinnerung ging am 1. raus, der Stand fehlt noch.
    const monat = `${heute.slice(0, 8)}01`
    if (f.person_id && f.art !== 'anhaenger' && Number(heute.slice(8)) >= 3 && (f.km_stand_am ?? '') < monat)
      liste.push({
        schluessel: `kmfehlt:${f.id}`,
        ton: 'info',
        art: 'km_fehlt',
        fahrzeug_id: f.id,
        titel: name(f),
        angaben: { person: f.person_id },
      })
  }

  for (const s of d.schaeden) {
    const f = d.fahrzeuge.find((x) => x.id === s.fahrzeug_id)
    const g = d.geraete.find((x) => x.id === s.geraet_id)
    if (!f && !g) continue
    liste.push({
      schluessel: `schaden:${s.id}`,
      ton: s.stand === 'offen' ? 'kritisch' : 'warnung',
      art: 'schaden',
      ...(f ? { fahrzeug_id: f.id } : g ? { geraet_id: g.id } : {}),
      titel: f ? name(f) : g ? geraetName(g) : '',
      angaben: { stand: s.stand ?? 'offen', datum: s.datum, text: s.text ?? '', person: s.person ?? '' },
    })
  }

  for (const [s, tage] of konflikte(d.belegung, heute, plusTage(heute, 13))) {
    const id = s.slice(2)
    const f = s.startsWith('f:') ? d.fahrzeuge.find((x) => x.id === id) : undefined
    const g = s.startsWith('g:') ? d.geraete.find((x) => x.id === id) : undefined
    if (!f && !g) continue
    liste.push({
      schluessel: `konflikt:${s}`,
      ton: 'warnung',
      art: 'konflikt',
      ...(f ? { fahrzeug_id: id } : { geraet_id: id }),
      titel: f ? name(f) : g ? geraetName(g) : '',
      angaben: { datum: tage[0] ?? heute, tage: tage.length },
    })
  }

  for (const g of d.geraete) {
    if (!g.person_id || g.zurueck_bis || !g.uebernommen_am || g.ausgemustert_am) continue
    const tage = tageBis(heute, g.uebernommen_am.slice(0, 10))
    if (tage > LANGE_WEG_TAGE)
      liste.push({
        schluessel: `weg:${g.id}`,
        ton: 'info',
        art: 'lange_weg',
        geraet_id: g.id,
        titel: geraetName(g),
        angaben: { tage, person: g.person_id },
      })
  }

  const datum = (a: Aufgabe) => String(a.angaben.datum ?? '9999')
  return liste.sort((a, b) => RANG[a.ton] - RANG[b.ton] || datum(a).localeCompare(datum(b)))
}
