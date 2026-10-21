/**
 * Liest Kalendertermine aus einer .ics-Datei oder aus einer Tabelle (CSV oder aus der Outlook-Liste
 * kopiert), wie V233 parseICS/parseTable. Ab Phase 8 kommen die Termine direkt aus Outlook.
 */

/** Ein gelesener Termin, bereit für `kalender_ersetzen`. */
export interface Kalendertermin {
  beginn: string
  ende: string
  ganztags: boolean
  betreff: string
  ort: string
  plz: string | null
  anzeige_als: 'free' | 'tentative' | 'busy' | 'oof'
  extern_id: string
}

/** Findet eine PLZ mit Ort im Text («Rue 3, 1630 Bulle» oder «Kunde (5630 Muri)»). */
export function plzAusOrt(ort: string): string | null {
  const innen = /\(([^()]*\d{4}[^()]*)\)/.exec(ort)
  const text = innen?.[1] ?? ort
  const m = /(?:^|[\s,])(\d{4})\s+[A-Za-zÄÖÜäöüÀ-ÿ]/.exec(text)
  return m?.[1] ?? null
}

const iso = (d: Date) => d.toISOString()

function termin(
  betreff: string,
  ort: string,
  beginn: Date,
  ende: Date,
  ganztags: boolean,
  anzeige: Kalendertermin['anzeige_als'],
  id: string,
): Kalendertermin {
  return {
    beginn: iso(beginn),
    ende: iso(ende > beginn ? ende : new Date(beginn.getTime() + 3_600_000)),
    ganztags,
    betreff: betreff || '(ohne Betreff)',
    ort,
    plz: plzAusOrt(ort),
    anzeige_als: anzeige,
    extern_id: id,
  }
}

function icsDatum(schluessel: string, wert: string): { d: Date; nurDatum: boolean } | null {
  const m = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?/.exec(wert)
  if (!m) return null
  const [, j, mo, t, h, mi, , z] = m
  const nurDatum = !h || /VALUE=DATE(?!-)/.test(schluessel)
  if (z) return { d: new Date(Date.UTC(+(j ?? 0), +(mo ?? 1) - 1, +(t ?? 1), +(h ?? 0), +(mi ?? 0))), nurDatum: false }
  return { d: new Date(+(j ?? 0), +(mo ?? 1) - 1, +(t ?? 1), h ? +h : 0, mi ? +mi : 0), nurDatum }
}

const TAGE: Record<string, number> = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 }

/** Wiederholungen einer Serie (täglich, wöchentlich, monatlich, jährlich) im Zeitraum. */
export function wiederholungen(start: Date, regel: string, von: Date, bis: Date): Date[] {
  const r = Object.fromEntries(
    regel
      .split(';')
      .map((p) => p.split('=') as [string, string])
      .map(([k, v]) => [k.toUpperCase(), v]),
  )
  const schritt = Number(r.INTERVAL ?? 1)
  const anzahl = r.COUNT ? Number(r.COUNT) : Infinity
  let ende = bis
  const u = /^(\d{4})(\d{2})(\d{2})/.exec(r.UNTIL ?? '')
  if (u) ende = new Date(Math.min(+new Date(+(u[1] ?? 0), +(u[2] ?? 1) - 1, +(u[3] ?? 1), 23, 59), +bis))
  const h = start.getHours()
  const mi = start.getMinutes()
  const aus: Date[] = []
  let n = 0
  const nimm = (d: Date): boolean => {
    if (d < start || d > ende) return true
    n++
    if (n > anzahl) return false
    if (d >= von) aus.push(d)
    return true
  }
  const tag = (j: number, m: number, t: number) => new Date(j, m, t, h, mi)
  if (r.FREQ === 'DAILY') {
    for (
      let d = new Date(start);
      d <= ende && n < anzahl;
      d = tag(d.getFullYear(), d.getMonth(), d.getDate() + schritt)
    )
      if (!nimm(d)) break
  } else if (r.FREQ === 'WEEKLY') {
    const tage = (r.BYDAY ?? '')
      .split(',')
      .filter(Boolean)
      .map((x) => TAGE[x.slice(-2)])
      .filter((x): x is number => x !== undefined)
    const liste = (tage.length ? tage : [start.getDay()]).sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7))
    const montag = new Date(start.getFullYear(), start.getMonth(), start.getDate() - ((start.getDay() + 6) % 7))
    aussen: for (let w = 0; w < 600; w += schritt) {
      const basis = new Date(montag.getFullYear(), montag.getMonth(), montag.getDate() + w * 7)
      if (basis > ende) break
      for (const t of liste) {
        if (!nimm(tag(basis.getFullYear(), basis.getMonth(), basis.getDate() + ((t + 6) % 7)))) break aussen
      }
      if (n >= anzahl) break
    }
  } else if (r.FREQ === 'MONTHLY') {
    for (let k = 0; k < 240; k += schritt) {
      const d = tag(start.getFullYear(), start.getMonth() + k, start.getDate())
      if (d > ende) break
      if (d.getDate() === start.getDate() && !nimm(d)) break
    }
  } else if (r.FREQ === 'YEARLY') {
    for (let k = 0; k < 30; k += schritt) {
      const d = tag(start.getFullYear() + k, start.getMonth(), start.getDate())
      if (d > ende || !nimm(d)) break
    }
  } else aus.push(start)
  return aus
}

/** Liest eine .ics-Datei; abgesagte Termine fallen weg, Serien werden für ein gutes Jahr ausgerollt. */
export function leseIcs(text: string, jetzt: Date = new Date()): Kalendertermin[] {
  const zeilen = text.replace(/\r?\n[ \t]/g, '').split(/\r?\n/)
  const ent = (v: string) => v.replace(/\\n/gi, '\n').replace(/\\([,;\\])/g, '$1')
  type Roh = {
    uid?: string
    betreff?: string
    ort?: string
    s?: ReturnType<typeof icsDatum>
    e?: ReturnType<typeof icsDatum>
    status?: string
    regel?: string
    ohne: string[]
    frei?: string
  }
  const roh: Roh[] = []
  let akt: Roh | null = null
  for (const z of zeilen) {
    const i = z.indexOf(':')
    if (i < 0) continue
    const schluessel = z.slice(0, i)
    const wert = z.slice(i + 1)
    const name = (schluessel.split(';')[0] ?? '').toUpperCase()
    if (name === 'BEGIN' && wert === 'VEVENT') akt = { ohne: [] }
    else if (name === 'END' && wert === 'VEVENT') {
      if (akt?.s && akt.status !== 'CANCELLED') roh.push(akt)
      akt = null
    } else if (akt) {
      if (name === 'SUMMARY') akt.betreff = ent(wert)
      else if (name === 'LOCATION') akt.ort = ent(wert)
      else if (name === 'UID') akt.uid = wert
      else if (name === 'DTSTART') akt.s = icsDatum(schluessel, wert)
      else if (name === 'DTEND') akt.e = icsDatum(schluessel, wert)
      else if (name === 'STATUS') akt.status = wert.toUpperCase()
      else if (name === 'RRULE') akt.regel = wert
      else if (name === 'X-MICROSOFT-CDO-BUSYSTATUS' || name === 'TRANSP') akt.frei = wert.toUpperCase()
      else if (name === 'EXDATE')
        for (const v of wert.split(',')) {
          const x = icsDatum(schluessel, v)
          if (x) akt.ohne.push(x.d.toLocaleDateString('sv-SE'))
        }
    }
  }
  const von = new Date(jetzt.getTime() - 14 * 86_400_000)
  const bis = new Date(jetzt.getTime() + 400 * 86_400_000)
  const aus: Kalendertermin[] = []
  for (const r of roh) {
    if (!r.s) continue
    const s = r.s.d
    const e = r.e?.d ?? new Date(s.getTime() + (r.s.nurDatum ? 86_400_000 : 3_600_000))
    const laenge = e.getTime() - s.getTime()
    const anzeige =
      r.frei === 'FREE' || r.frei === 'TRANSPARENT'
        ? 'free'
        : r.frei === 'OOF'
          ? 'oof'
          : r.frei === 'TENTATIVE'
            ? 'tentative'
            : 'busy'
    const termine = r.regel
      ? wiederholungen(s, r.regel, von, bis).filter((d) => !r.ohne.includes(d.toLocaleDateString('sv-SE')))
      : [s]
    for (const d of termine)
      aus.push(
        termin(
          r.betreff ?? '',
          r.ort ?? '',
          d,
          new Date(d.getTime() + laenge),
          r.s.nurDatum,
          anzeige,
          `${r.uid ?? r.betreff ?? ''}:${d.toISOString()}`,
        ),
      )
  }
  return aus
}

/** «21.10.2026 14:30» oder «2026-10-21 14:30» → Datum und Minuten. */
export function leseDatumZeit(v: string): { datum: Date; minuten: number | null } | null {
  let m = /(\d{1,2})\.(\d{1,2})\.(\d{2,4})(?:\s+(\d{1,2})[:.](\d{2}))?/.exec(v)
  if (m) {
    const j = (m[3] ?? '').length === 2 ? `20${m[3] ?? ''}` : (m[3] ?? '')
    return {
      datum: new Date(+j, +(m[2] ?? 1) - 1, +(m[1] ?? 1)),
      minuten: m[4] != null ? +m[4] * 60 + +(m[5] ?? 0) : null,
    }
  }
  m = /(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?/.exec(v)
  if (m)
    return {
      datum: new Date(+(m[1] ?? 0), +(m[2] ?? 1) - 1, +(m[3] ?? 1)),
      minuten: m[4] != null ? +m[4] * 60 + +(m[5] ?? 0) : null,
    }
  return null
}

/** Liest eine Tabelle (CSV, Semikolon oder aus Outlook kopiert) mit Betreff, Ort, Beginn, Ende. */
export function leseTabelle(text: string): Kalendertermin[] {
  const zeilen = text.split(/\r?\n/).filter((z) => z.trim())
  const kopf = zeilen[0]
  if (!kopf) return []
  const trenner = kopf.includes('\t') ? '\t' : kopf.split(';').length > kopf.split(',').length ? ';' : ','
  const teile = (z: string) => {
    const aus: string[] = []
    let akt = ''
    let inAnf = false
    for (const c of z) {
      if (c === '"') inAnf = !inAnf
      else if (c === trenner && !inAnf) {
        aus.push(akt.trim())
        akt = ''
      } else akt += c
    }
    aus.push(akt.trim())
    return aus
  }
  const zellen = zeilen.map(teile)
  const k = (zellen[0] ?? []).map((c) => c.toLowerCase())
  const such = (re: RegExp) => k.findIndex((h) => re.test(h))
  let sp = {
    betreff: such(/betreff|subject|titel/),
    ort: such(/^ort|location|standort/),
    s: such(/beginn|^start|anfang/),
    e: such(/^ende|^end/),
    ganz: such(/ganzt|all.?day/),
  }
  let daten = zellen.slice(1)
  if (sp.s < 0) {
    // Ohne Kopfzeile: Spalten erraten (erste Zeile mit Datum).
    daten = zellen
    const erste = zellen[0] ?? []
    const dt = erste.map((c, i) => (leseDatumZeit(c) ? i : -1)).filter((i) => i >= 0)
    sp = {
      betreff: erste.findIndex((c) => c && !leseDatumZeit(c) && !/\d{4}\s+\D/.test(c)),
      ort: erste.findIndex((c) => /\d{4}\s+\D/.test(c) && !leseDatumZeit(c)),
      s: dt[0] ?? -1,
      e: dt[1] ?? -1,
      ganz: -1,
    }
  }
  if (sp.s < 0) return []
  const aus: Kalendertermin[] = []
  for (const r of daten) {
    const s = leseDatumZeit(r[sp.s] ?? '')
    if (!s) continue
    const e = sp.e >= 0 ? leseDatumZeit(r[sp.e] ?? '') : null
    const ganz = sp.ganz >= 0 ? /^(ja|yes|true|wahr|1)$/i.test(r[sp.ganz] ?? '') : s.minuten == null
    const beginn = new Date(s.datum.getTime() + (ganz ? 0 : (s.minuten ?? 0)) * 60_000)
    const ende = e
      ? new Date(e.datum.getTime() + (e.minuten ?? (ganz ? 1440 : (s.minuten ?? 0) + 60)) * 60_000)
      : new Date(beginn.getTime() + (ganz ? 86_400_000 : 3_600_000))
    const betreff = sp.betreff >= 0 ? (r[sp.betreff] ?? '') : ''
    aus.push(
      termin(
        betreff,
        sp.ort >= 0 ? (r[sp.ort] ?? '') : '',
        beginn,
        ende,
        ganz,
        'busy',
        `${betreff}:${beginn.toISOString()}`,
      ),
    )
  }
  return aus
}

/** Datei oder eingefügter Text: erkennt .ics an «BEGIN:VCALENDAR», sonst Tabelle. Doppelte fallen weg. */
export function leseKalender(text: string): Kalendertermin[] {
  const termine = /BEGIN:VCALENDAR/i.test(text) ? leseIcs(text) : leseTabelle(text)
  const gesehen = new Set<string>()
  return termine
    .filter((t) => {
      const k = t.beginn + t.betreff
      if (gesehen.has(k)) return false
      gesehen.add(k)
      return true
    })
    .sort((a, b) => a.beginn.localeCompare(b.beginn))
}
