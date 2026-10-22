// Ein Lauf einer Quelle des Ausschreibungs-Monitors: Meldungen holen, jede einzeln in die Datenbank
// geben (sie bewertet, ordnet die Spur zu und führt Doppelte zusammen) und den Lauf für die
// Quellen-Kontrolle festhalten. Ein Fehler bei einer Meldung hält die anderen nicht auf.

import { amtsblattMeldungen } from './amtsblatt.ts'
import { dienst } from './datenbank.ts'
import { DienstFehler } from './http.ts'
import { simapMeldungen, type Meldung } from './simap.ts'

/** Einstellungen des Monitors (Ausschnitt). */
export interface MonitorEinstellungen {
  kantone?: string[]
  simap_cpv?: string[]
  amtsblatt_rubriken?: string[]
  simap_zeiten?: string[]
  amtsblatt_zeiten?: string[]
  pruefen_zeit?: string
}

/** Ergebnis eines Laufs. */
export interface LaufErgebnis {
  quelle: string
  ok: boolean
  gelesen: number
  neu: number
  aktualisiert: number
  meldung: string
}

/** Stichworte für die Textsuche auf simap (zusätzlich zu den CPV-Codes). */
export const SIMAP_STICHWORTE = ['Photovoltaik', 'photovoltaïque', 'Solaranlage', 'PV-Anlage']

/** Einstellungen aus der Datenbank. */
export async function monitorEinstellungen(): Promise<MonitorEinstellungen> {
  const [z] = await dienst.lies<{ wert: MonitorEinstellungen }[]>(
    'einstellungen?schluessel=eq.ausschreibungen&select=wert',
  )
  return z?.wert ?? {}
}

/** Meldungen in die Datenbank geben und zählen. */
export async function einlesen(quelle: string, meldungen: Meldung[], beginn: string): Promise<LaufErgebnis> {
  let neu = 0
  let aktualisiert = 0
  let fehler = 0
  for (const m of meldungen) {
    try {
      const r = await dienst.rpc<{ aktion: string }>('ausschreibung_einlesen', { p: m })
      if (r.aktion === 'neu') neu++
      if (r.aktion === 'aktualisiert') aktualisiert++
    } catch {
      fehler++
    }
  }
  const e: LaufErgebnis = {
    quelle,
    ok: fehler === 0 || fehler < meldungen.length,
    gelesen: meldungen.length,
    neu,
    aktualisiert,
    meldung: `${meldungen.length} gelesen, ${neu} neu, ${aktualisiert} ergänzt${fehler ? `, ${fehler} Fehler` : ''}`,
  }
  await lauf(e, beginn)
  return e
}

async function lauf(e: LaufErgebnis, beginn: string): Promise<void> {
  await dienst.rpc('quellen_lauf', {
    p_quelle: e.quelle,
    p_ok: e.ok,
    p_gelesen: e.gelesen,
    p_neu: e.neu,
    p_aktualisiert: e.aktualisiert,
    p_meldung: e.meldung,
    p_beginn: beginn,
  })
}

/** Eine Quelle lesen. Fällt die Quelle aus, wird das als Lauf mit Fehler festgehalten (Quellen-Kontrolle). */
export async function quelleLesen(quelle: 'simap' | 'amtsblatt', tage = 3): Promise<LaufErgebnis> {
  const beginn = new Date().toISOString()
  try {
    const c = await monitorEinstellungen()
    const meldungen =
      quelle === 'simap'
        ? await simapMeldungen({
            tage,
            kantone: c.kantone ?? [],
            cpv: c.simap_cpv ?? [],
            stichworte: SIMAP_STICHWORTE,
          })
        : await amtsblattMeldungen({ tage, rubriken: c.amtsblatt_rubriken ?? [] })
    return await einlesen(quelle, meldungen, beginn)
  } catch (f) {
    const code = f instanceof DienstFehler ? `${f.code} ${f.status}` : f instanceof Error ? f.message : 'fehler'
    const e: LaufErgebnis = {
      quelle,
      ok: false,
      gelesen: 0,
      neu: 0,
      aktualisiert: 0,
      meldung: `Quelle nicht erreichbar: ${code}`,
    }
    await lauf(e, beginn)
    return e
  }
}

/**
 * Ist jetzt (Ortszeit «hhmm») ein Zeitfenster fällig? Ein Fenster gilt eine Stunde ab seiner Uhrzeit; der
 * Zeitplan sperrt den Job danach für den Rest des Tages, damit er pro Fenster nur einmal läuft.
 */
export function faelligesFenster(zeiten: string[], jetzt: string): string | null {
  const minuten = (z: string) => Number(z.slice(0, 2)) * 60 + Number(z.slice(3, 5))
  const j = minuten(jetzt)
  return zeiten.find((z) => j >= minuten(z) && j < minuten(z) + 60) ?? null
}
