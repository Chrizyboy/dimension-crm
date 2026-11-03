/** Zeilen der Datenbank-Ansichten in die App-Form bringen (Offerten-Liste, Neue Offerten, Versionen, Varianten). */
import type { Database, Json } from '@/types/datenbank'
import {
  OFFERT_PHASEN,
  type Eingang,
  type EingangStatus,
  type Offerte,
  type OffertVariante,
  type OffertVersion,
  type Wirtschaftlichkeit,
} from '../types'

type OffertZeile = Database['public']['Views']['offerten_liste']['Row']
type EingangZeile = Database['public']['Views']['offerten_eingang']['Row']

const PHASEN = new Set<string>([...OFFERT_PHASEN, 'verloren'])

function objekt(roh: Json | null): Record<string, unknown> {
  return roh && typeof roh === 'object' && !Array.isArray(roh) ? roh : {}
}

function zahlOderNull(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

function textOderNull(v: unknown): string | null {
  return typeof v === 'string' && v.trim() ? v : null
}

/** Varianten A/B/C aus der Datenbank (jsonb) in die App-Form; Einträge ohne Kennung fallen weg. */
export function variantenAus(roh: Json | null): OffertVariante[] {
  if (!Array.isArray(roh)) return []
  return roh.flatMap((x) => {
    const r = objekt(x)
    const k = textOderNull(r.k)
    if (!k) return []
    return [
      {
        k,
        titel: textOderNull(r.titel),
        betragRappen: zahlOderNull(r.betrag_rappen),
        kwp: zahlOderNull(r.kwp),
        batterie: textOderNull(r.batterie),
        text: textOderNull(r.text),
      },
    ]
  })
}

/** Varianten in die Form der Datenbank (`offerte_angaben_setzen`). */
export function variantenFuerDb(v: OffertVariante[]): Json {
  return v.map((x) => ({
    k: x.k,
    titel: x.titel,
    betrag_rappen: x.betragRappen,
    kwp: x.kwp,
    batterie: x.batterie,
    text: x.text,
  }))
}

function freigabeAus(roh: Json | null): Offerte['freigabe'] {
  const r = objekt(roh)
  if (Object.keys(r).length === 0) return null
  return { name: textOderNull(r.name), am: textOderNull(r.am), notiz: textOderNull(r.notiz) }
}

function standortVon(s: string | null): 'muri' | 'bulle' | null {
  return s === 'muri' || s === 'bulle' ? s : null
}

/** Versionen aus V233 (wert als Text in CHF) und neue (betrag_rappen) in eine Form bringen. */
export function versionenAus(roh: Json | null): OffertVersion[] {
  if (!Array.isArray(roh)) return []
  return roh.flatMap((x) => {
    if (!x || typeof x !== 'object' || Array.isArray(x)) return []
    const r = x as Record<string, unknown>
    const zahl = (v: unknown) => (v === null || v === undefined || v === '' ? null : Number(v))
    const datei = (r.dokument ?? r.file) as { pfad?: string; path?: string; name?: string; url?: string } | undefined
    return [
      {
        v: Number(r.v) || 1,
        am: typeof r.am === 'string' ? r.am : null,
        by: typeof r.by === 'string' ? r.by : null,
        text: typeof r.text === 'string' ? r.text : null,
        betragRappen: zahl(r.betrag_rappen) ?? (r.wert ? Math.round(Number(r.wert) * 100) : null),
        kwp: zahl(r.kwp),
        batterie: typeof r.batterie === 'string' && r.batterie ? r.batterie : null,
        dokument: datei
          ? {
              ...(datei.pfad ? { pfad: datei.pfad } : {}),
              ...(datei.name ? { name: datei.name } : {}),
              ...(datei.url ? { url: datei.url } : {}),
            }
          : null,
      },
    ]
  })
}

/** Zeile der Ansicht `offerten_liste` in die App-Form. */
export function offerteAusZeile(z: OffertZeile): Offerte {
  return {
    id: z.id ?? '',
    nummer: z.nummer ?? '',
    titel: z.titel,
    status: z.status ?? 'in_arbeit',
    stand: z.stand ?? 'offerte',
    sprache: z.sprache === 'fr' ? 'fr' : 'de',
    standort: standortVon(z.standort),
    standortId: z.standort_id,
    angebotAm: z.angebot_am,
    angebotAmFrueher: z.angebot_am_frueher ?? [],
    faelligAm: z.faellig_am,
    betragRappen: z.betrag_rappen,
    kwp: z.leistung_kwp,
    anzahlModule: z.anzahl_module,
    wechselrichter: z.wechselrichter,
    batterie: z.batterie,
    entscheid: z.entscheid,
    entscheidAm: z.entscheid_am,
    vertagtGrund: z.vertagt_grund,
    verlustgrund: z.verlustgrund,
    nachfassenAm: z.nachfassen_am,
    verantwortlichId: z.verantwortlich_id,
    verantwortlichName: z.verantwortlich_name,
    eturnityId: z.eturnity_id,
    versionen: versionenAus(z.versionen),
    wirtschaftlichkeit: (z.wirtschaftlichkeit as Wirtschaftlichkeit | null) ?? null,
    verkaufschanceId: z.verkaufschance_id,
    kontaktId: z.kontakt_id ?? '',
    kundennummer: z.kundennummer ?? 0,
    name: z.name ?? '–',
    telefon: z.telefon,
    email: z.email,
    plz: z.plz,
    ort: z.ort,
    strasse: z.strasse,
    imEingang: z.im_eingang ?? false,
    projektId: z.projekt_id,
    werkvertragId: z.werkvertrag_id,
    werkvertragStatus: z.werkvertrag_status,
    geaendertAm: z.geaendert_am,
    suchtext: z.suchtext ?? '',
    gueltigBis: z.gueltig_bis,
    abgelaufen: z.abgelaufen ?? false,
    varianten: variantenAus(z.varianten),
    variante: z.variante,
    chance: z.chance ?? 0,
    chanceProzent: z.chance_prozent,
    entscheidErwartet: z.entscheid_erwartet,
    konkurrenz: z.konkurrenz,
    rabattProzent: z.rabatt_prozent,
    unterlagen: objekt(z.unterlagen) as Record<string, boolean>,
    nachfassSchritt: z.nachfass_schritt ?? 0,
    nachfassErgebnis: z.nachfass_ergebnis,
    freigabe: freigabeAus(z.freigabe),
    freigabeGrund: z.freigabe_grund === 'rabatt' || z.freigabe_grund === 'marge' ? z.freigabe_grund : null,
    phase: PHASEN.has(z.phase ?? '') ? (z.phase as Offerte['phase']) : 'planung',
    terminAm: z.termin_am,
    zurOfferteAm: z.zur_offerte_am,
    verkaufPersonName: z.verkauf_person_name,
    eingangStatus: z.eingang_status,
    rueckfrage: z.rueckfrage,
  }
}

const EINGANG_STATUS = new Set(['neu', 'bearbeitung', 'rueckfrage', 'pruefung', 'offeriert'])

/** Zeile der Ansicht `offerten_eingang` in die App-Form. */
export function eingangAusZeile(z: EingangZeile): Eingang {
  return {
    id: z.id ?? '',
    leadNummer: z.lead_nummer,
    kontaktId: z.kontakt_id ?? '',
    name: z.name ?? '–',
    plz: z.plz,
    ort: z.ort,
    strasse: z.strasse,
    standort: standortVon(z.standort),
    sprache: z.sprache === 'fr' ? 'fr' : 'de',
    terminAm: z.termin_am,
    terminPersonId: z.tour_person_id,
    terminPersonName: z.termin_person_name,
    richtofferte: z.richtofferte ?? false,
    zurOfferteAm: z.zur_offerte_am,
    status: EINGANG_STATUS.has(z.offerte_status ?? '') ? (z.offerte_status as EingangStatus) : 'neu',
    von: z.offerte_von,
    seit: z.offerte_seit,
    hinweis: z.offerte_hinweis,
    hinweisVon: z.offerte_hinweis_von,
    rueckfrage: z.offerte_rueckfrage,
    kommentarKunde: z.kommentar_kunde,
    notizIntern: z.notiz_intern,
    offerteId: z.offerte_id,
    offerteNummer: z.offerte_nummer,
    betragRappen: z.betrag_rappen,
    kwp: z.leistung_kwp,
    suchtext: z.suchtext ?? '',
  }
}
