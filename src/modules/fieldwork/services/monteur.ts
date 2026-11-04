import type {
  LaufendeZeit,
  MeldungEingabe,
  MeinTag,
  NachtragEingabe,
  NeuerRapport,
  Rapport,
  RapportEingabe,
  Unterschrift,
  ZeitArt,
} from '../types'
import { ablageAendern, einreihen } from './warteschlange'

/**
 * Was der Monteur am Handy tut. Alles geht über die Warteschlange und wird gleichzeitig in der Ablage am
 * Gerät nachgeführt, damit die Ansicht ohne Netz stimmt. Die IDs entstehen am Handy (Wiederholung ohne Doppel).
 */

const jetzt = () => new Date().toISOString()

/** Schlüssel der Ablage: der zuletzt geladene Tagesplan und je Rapport die Angaben. */
export const ABLAGE_TAG = 'tag'
export const ablageRapport = (id: string) => `rapport:${id}`
export const ablageNachtraege = (id: string) => `nachtraege:${id}`

/** Tagesplan in der Ablage am Gerät ändern (bevor der Server die Änderung kennt). */
export const tagAendern = (f: (t: MeinTag) => MeinTag) =>
  ablageAendern<{ schluessel: string; daten: MeinTag }>(ABLAGE_TAG, (alt) =>
    alt ? { ...alt, daten: f(alt.daten) } : undefined,
  )

/** Rapport anlegen; erscheint sofort im Tagesplan, auch ohne Netz. */
export async function rapportAnlegen(n: NeuerRapport, kopf: Partial<Rapport>): Promise<void> {
  await einreihen({ art: 'rpc', name: 'rapport_speichern', args: { p: n }, bezug: n.id, erstellt: jetzt() })
  const rapport: Rapport = {
    nummer: '',
    projekt_id: null,
    service_fall_id: null,
    wartungsvertrag_id: null,
    einsatz_id: null,
    person_id: null,
    person: null,
    arbeiten: null,
    material: [],
    pruefpunkte: {},
    montage_fertig: false,
    verrechnung: null,
    notiz_intern: null,
    unterschrift_kunde: null,
    abgeschlossen_am: null,
    projekt_nummer: null,
    kunde: null,
    objekt_strasse: null,
    objekt_plz: null,
    objekt_ort: null,
    service_nummer: null,
    stunden: null,
    fotos_anzahl: 0,
    nachtraege_anzahl: 0,
    team: [],
    schritte: {},
    sicherheit: null,
    seriennummern: [],
    vorbehalte: [],
    visiert_am: null,
    visiert_von_name: null,
    rueckfrage: null,
    ...kopf,
    ...n,
  }
  await ablageAendern(ablageRapport(n.id), () => rapport)
  await tagAendern((t) => ({
    ...t,
    eintraege: t.eintraege.map((e) =>
      e.id === (n.einsatz_id ?? n.service_fall_id)
        ? {
            ...e,
            rapporte: [...e.rapporte, { id: n.id, nummer: '', art: n.art, datum: n.datum, abgeschlossen_am: null }],
          }
        : e,
    ),
  }))
}

/** Geänderte Felder des Rapports speichern (nur was mitkommt, wird überschrieben). */
export async function rapportAendern(id: string, e: RapportEingabe): Promise<void> {
  await einreihen({ art: 'rpc', name: 'rapport_speichern', args: { p: { id, ...e } }, bezug: id, erstellt: jetzt() })
  await ablageAendern<Rapport>(ablageRapport(id), (alt) => (alt ? eingabeAnwenden(alt, e) : undefined))
}

/**
 * Änderung auf den Rapport anwenden wie die Datenbank: Prüfpunkte zusammenführen, alles andere ersetzen.
 * So geht kein Prüfpunkt verloren, wenn der Monteur schnell nacheinander tippt und ein Neuladen dazwischenkommt.
 */
export function eingabeAnwenden(alt: Rapport, e: RapportEingabe): Rapport {
  return {
    ...alt,
    ...e,
    pruefpunkte: e.pruefpunkte ? { ...alt.pruefpunkte, ...e.pruefpunkte } : alt.pruefpunkte,
    schritte: e.schritte ? { ...alt.schritte, ...e.schritte } : alt.schritte,
  }
}

/** Zeit starten (Start-Knopf); eine laufende Zeit endet damit. */
export async function zeitStarten(z: {
  rapport_id?: string | null
  projekt_id?: string | null
  service_fall_id?: string | null
  intern?: string | null
  art: ZeitArt
}) {
  const laufend: LaufendeZeit = {
    id: crypto.randomUUID(),
    start: jetzt(),
    rapport_id: z.rapport_id ?? null,
    projekt_id: z.projekt_id ?? null,
    service_fall_id: z.service_fall_id ?? null,
    intern: z.intern ?? null,
    art: z.art,
  }
  await einreihen({ art: 'rpc', name: 'zeit_starten', args: { p: laufend }, erstellt: jetzt() })
  await tagAendern((t) => ({ ...t, laufend }))
  return laufend
}

/** Laufende Zeit stoppen, auf Wunsch mit Pause in Minuten. */
export async function zeitStoppen(id: string, pause_min?: number): Promise<void> {
  const p = { id, stopp: jetzt(), ...(pause_min ? { pause_min } : {}) }
  await einreihen({ art: 'rpc', name: 'zeit_stoppen', args: { p }, erstellt: jetzt() })
  await tagAendern((t) => ({ ...t, laufend: t.laufend?.id === id ? null : t.laufend }))
}

/** Nachtrag (Mehraufwand) im Rapport erfassen; der Kunde bestätigt ihn mit der Unterschrift. */
export async function nachtragErfassen(rapportId: string, n: NachtragEingabe): Promise<void> {
  const p = { ...n, rapport_id: rapportId }
  await einreihen({ art: 'rpc', name: 'nachtrag_speichern', args: { p }, bezug: rapportId, erstellt: jetzt() })
  await ablageAendern<NachtragEingabe[]>(ablageNachtraege(rapportId), (alt) => [
    ...(alt ?? []).filter((x) => x.id !== n.id),
    n,
  ])
}

/**
 * Foto oder Unterschrift (Bild) als Dokument ablegen, normal am Rapport; mit `kategorie` als Pflichtfoto
 * (z. B. «modulfeld»), mit `bezug` an einer Meldung.
 */
export async function bildAblegen(
  rapportId: string,
  blob: Blob,
  ordner: 'fotos' | 'unterschrift',
  extra: { kategorie?: string | null; bezug?: { tabelle: string; id: string } } = {},
): Promise<string> {
  const id = crypto.randomUUID()
  const endung = blob.type === 'image/png' ? 'png' : 'jpg'
  const name = `${ordner === 'fotos' ? 'Foto' : 'Unterschrift'}-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')}.${endung}`
  const bezug = extra.bezug ?? { tabelle: 'rapporte', id: rapportId }
  await einreihen({
    art: 'datei',
    blob,
    pfad: `${bezug.tabelle}/${bezug.id}/${id}.${endung}`,
    dokument: {
      id,
      name,
      mime_typ: blob.type,
      ordner,
      bezug_tabelle: bezug.tabelle,
      bezug_id: bezug.id,
      ...(extra.kategorie ? { kategorie: extra.kategorie } : {}),
    },
    bezug: rapportId,
    erstellt: jetzt(),
  })
  return id
}

/**
 * Teamleitung startet die Zeit für mehrere Personen (z. B. das ganze Team nach dem Sicherheits-Check).
 * Ist die angemeldete Person dabei, läuft ihre Zeit sofort auch in der Ansicht.
 */
export async function teamStarten(rapportId: string, projektId: string | null, personen: string[], ich: string | null) {
  const start = jetzt()
  const liste = personen.map((person_id) => ({ person_id, id: crypto.randomUUID() }))
  const p = { rapport_id: rapportId, start, personen: liste }
  await einreihen({ art: 'rpc', name: 'zeit_team_starten', args: { p }, bezug: rapportId, erstellt: start })
  const meine = liste.find((x) => x.person_id === ich)
  if (meine) {
    const laufend: LaufendeZeit = { id: meine.id, start, rapport_id: rapportId, projekt_id: projektId, art: 'arbeit' }
    await tagAendern((t) => ({ ...t, laufend }))
  }
}

/** Teamleitung stoppt die Zeiten des Rapports (alle oder einzelne Personen), mit Pause in Minuten. */
export async function teamStoppen(rapportId: string, pause_min: number, personen?: string[]) {
  const p = { rapport_id: rapportId, stopp: jetzt(), pause_min, ...(personen ? { personen } : {}) }
  await einreihen({ art: 'rpc', name: 'zeit_team_stoppen', args: { p }, bezug: rapportId, erstellt: jetzt() })
  await tagAendern((t) => ({ ...t, laufend: t.laufend?.rapport_id === rapportId ? null : t.laufend }))
}

/** Problem von der Baustelle melden, mit Fotos; geht an die Projektleitung, auch ohne Netz (später). */
export async function meldungErfassen(m: MeldungEingabe, fotos: Blob[]): Promise<void> {
  await einreihen({
    art: 'rpc',
    name: 'meldung_erfassen',
    args: { p: m },
    bezug: m.rapport_id ?? m.id,
    erstellt: jetzt(),
  })
  for (const f of fotos) {
    await bildAblegen(m.id, f, 'fotos', { bezug: { tabelle: 'baustellen_meldungen', id: m.id } })
  }
}

/**
 * Rapport abschliessen: Unterschrift (zuerst als Bild hochgeladen) oder Grund ohne Unterschrift.
 * Die Folgen (Montage fertig → IBN, IBN → Anlage, Service → Verlauf, Wartung → erledigt) setzt die Datenbank.
 */
export async function rapportAbschliessen(
  id: string,
  a: {
    unterschrift?: { bild: Blob; name: string }
    ohne_unterschrift?: string
    verrechnung?: string | null
    montage_fertig?: boolean
    fall_erledigt?: boolean
    vorbehalte?: { text: string }[]
    /** Kunde erlaubt Fotos für Werbung (ohne Namen): nach der IBN entsteht ein Referenz-Post als Entwurf. */
    fotos_werbung?: boolean
  },
): Promise<void> {
  let unterschrift: Unterschrift | null = null
  if (a.unterschrift) {
    const dokument_id = await bildAblegen(id, a.unterschrift.bild, 'unterschrift')
    unterschrift = { name: a.unterschrift.name, dokument_id, am: jetzt() }
  }
  const p = {
    ...(unterschrift ? { unterschrift } : a.ohne_unterschrift ? { ohne_unterschrift: a.ohne_unterschrift } : {}),
    ...(a.verrechnung ? { verrechnung: a.verrechnung } : {}),
    ...(a.montage_fertig !== undefined ? { montage_fertig: a.montage_fertig } : {}),
    ...(a.fall_erledigt ? { fall_erledigt: true } : {}),
    ...(a.vorbehalte?.length ? { vorbehalte: a.vorbehalte } : {}),
    ...(a.fotos_werbung ? { fotos_werbung: true } : {}),
    stopp: jetzt(),
  }
  await einreihen({ art: 'rpc', name: 'rapport_abschliessen', args: { p_id: id, p }, bezug: id, erstellt: jetzt() })
  const am = jetzt()
  await ablageAendern<Rapport>(ablageRapport(id), (alt) =>
    alt
      ? {
          ...alt,
          abgeschlossen_am: am,
          unterschrift_kunde: unterschrift ?? (a.ohne_unterschrift ? { ohne: a.ohne_unterschrift, am } : null),
        }
      : undefined,
  )
  await tagAendern((t) => ({
    ...t,
    laufend: t.laufend?.rapport_id === id ? null : t.laufend,
    eintraege: t.eintraege
      // Erledigter Service-Fall fällt aus dem Tagesplan, auch solange der Abschluss noch am Handy wartet.
      .filter((e) => !(a.fall_erledigt && e.typ === 'service' && e.rapporte.some((r) => r.id === id)))
      .map((e) => ({
        ...e,
        rapporte: e.rapporte.map((r) => (r.id === id ? { ...r, abgeschlossen_am: am } : r)),
      })),
  }))
}
