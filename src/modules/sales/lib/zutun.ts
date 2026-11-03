import type { Geschaeft } from '../types'
import { arbeitsminuten } from './arbeitszeit'
import type { VerkaufEinstellung } from './einstellung'
import { heuteIso, liegtSeit, tageZwischen } from './geschaeft'

/** Warum ein Geschäft auf der Liste «Zu tun» steht. */
export type ZuTunArt =
  'anrufen' | 'rueckruf' | 'termin' | 'nachTermin' | 'nachfassen' | 'wiedervorlage' | 'liegt' | 'offerteInArbeit'

export interface ZuTunEintrag {
  g: Geschaeft
  art: ZuTunArt
  /** Fälliges Datum oder Termin (ISO); bei «anrufen» der Eingang. */
  wann: string | null
  /** Nur «anrufen»: Arbeitsminuten seit Eingang. */
  minuten?: number
  ton: 'kritisch' | 'warnung' | 'normal'
}

export interface ZuTun {
  jetzt: ZuTunEintrag[]
  heute: ZuTunEintrag[]
  woche: ZuTunEintrag[]
  zahlen: { anrufen: number; zuSpaet: number; heute: number; termineWoche: number; offenRappen: number }
}

const OFFERIERT = new Set(['offeriert', 'nachfassen', 'vertagt'])

/**
 * Die Arbeitsliste des Verkaufs: «Jetzt» (neue Anfragen ohne Anruf, mit der 15-Minuten-Uhr), «Heute»
 * (Rückrufe, Termine, Nachfassen, Wiedervorlagen, liegengebliebene Leads) und «Diese Woche».
 * Übernommene Leads aus V233 zählen nicht für die Uhr, sie wären alle «zu spät».
 */
export function zuTun(geschaefte: readonly Geschaeft[], jetzt: Date, e: VerkaufEinstellung): ZuTun {
  const heute = heuteIso(jetzt)
  const jetztListe: ZuTunEintrag[] = []
  const heuteListe: ZuTunEintrag[] = []
  const woche: ZuTunEintrag[] = []
  let termineWoche = 0
  let offenRappen = 0

  const einreihen = (g: Geschaeft, art: ZuTunArt, wann: string | null) => {
    if (!wann) return
    const tage = tageZwischen(heute, wann)
    if (tage <= 0) heuteListe.push({ g, art, wann, ton: tage < 0 ? 'warnung' : 'normal' })
    else if (tage <= 7) woche.push({ g, art, wann, ton: 'normal' })
  }

  for (const g of geschaefte) {
    if (OFFERIERT.has(g.stand)) offenRappen += g.wertRappen ?? 0
    if (g.terminAm) {
      const t = tageZwischen(heute, g.terminAm)
      if (t >= 0 && t <= 7) termineWoche++
    }
    switch (g.stand) {
      case 'lead_neu': {
        if (!g.erstkontaktAm && !g.uebernommen && g.eingangZeit) {
          const minuten = arbeitsminuten(new Date(g.eingangZeit), jetzt, e)
          const ton =
            minuten >= e.eskalation_minuten ? 'kritisch' : minuten >= e.erstkontakt_minuten ? 'warnung' : 'normal'
          jetztListe.push({ g, art: 'anrufen', wann: g.eingangZeit, minuten, ton })
        } else if ((liegtSeit(g, heute) ?? 0) >= 5) {
          heuteListe.push({ g, art: 'liegt', wann: g.eingangAm, ton: 'warnung' })
        }
        break
      }
      case 'lead_offen':
      case 'lead_spaeter':
        if (g.wiedervorlageAm) einreihen(g, 'rueckruf', g.wiedervorlageAm)
        else if ((liegtSeit(g, heute) ?? 0) >= 5)
          heuteListe.push({ g, art: 'liegt', wann: g.eingangAm, ton: 'warnung' })
        break
      case 'termin':
        einreihen(g, 'termin', g.terminAm)
        break
      case 'nach_termin':
        heuteListe.push({ g, art: 'nachTermin', wann: g.terminAm, ton: 'warnung' })
        break
      case 'offeriert':
      case 'nachfassen':
        einreihen(g, 'nachfassen', g.nachfassenAm)
        break
      case 'offerte':
      case 'pruefung':
        woche.push({ g, art: 'offerteInArbeit', wann: g.standDatum, ton: 'normal' })
        break
      case 'kein':
        if (g.wiedervorlageAm && tageZwischen(heute, g.wiedervorlageAm) <= 0) {
          heuteListe.push({ g, art: 'wiedervorlage', wann: g.wiedervorlageAm, ton: 'normal' })
        }
        break
    }
  }

  // Älteste Anfrage zuerst: wer am längsten wartet, wird zuerst angerufen.
  jetztListe.sort((a, b) => (a.wann ?? '').localeCompare(b.wann ?? ''))
  const nachZeit = (a: ZuTunEintrag, b: ZuTunEintrag) => (a.wann ?? '').localeCompare(b.wann ?? '')
  heuteListe.sort(nachZeit)
  woche.sort(nachZeit)
  return {
    jetzt: jetztListe,
    heute: heuteListe,
    woche,
    zahlen: {
      anrufen: jetztListe.length,
      zuSpaet: jetztListe.filter((x) => x.ton !== 'normal').length,
      heute: heuteListe.length,
      termineWoche,
      offenRappen,
    },
  }
}

/** Gehört ein Geschäft zu einer Person (Verkauf oder Termin bei)? Ohne Person: alle. */
export function gehoertZu(g: Geschaeft, personId: string | null): boolean {
  return personId === null || g.personId === personId || g.terminPersonId === personId
}
