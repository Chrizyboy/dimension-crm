// Bildschirmfotos einer Meldung für die Prüfung durch Claude (Entscheid 0030, Nachtrag 04.11.2026): nur Bilder,
// höchstens wenige pro Meldung, als Links, die nach einer Stunde verfallen. Nichts davon wird gespeichert.

/** Ein Anhang einer Meldung, wie ihn die Tabelle `dokumente` liefert. */
export interface MeldungAnhang {
  bezug_id: string
  name: string
  mime_typ: string | null
  speicher_pfad: string | null
}

/** So viele Bilder pro Meldung bekommt Claude höchstens (wie in der App, MAX_ANHAENGE). */
export const BILDER_PRO_MELDUNG = 8

/** Gültigkeit der Links in Sekunden: genug für einen Lauf, kurz genug, dass ein weitergegebener Link nichts nützt. */
export const LINK_GUELTIG_S = 3600

/** Ist der Anhang ein Bild, das Claude lesen kann (PNG, JPEG, GIF, WebP)? HEIC und PDF bleiben weg. */
export function lesbaresBild(a: Pick<MeldungAnhang, 'mime_typ' | 'speicher_pfad'>): boolean {
  return !!a.speicher_pfad && /^image\/(png|jpe?g|gif|webp)$/.test(a.mime_typ ?? '')
}

/** Bilder je Meldung, in der Reihenfolge wie geliefert, höchstens {@link BILDER_PRO_MELDUNG}. */
export function bilderJeMeldung(anhaenge: MeldungAnhang[]): Map<string, MeldungAnhang[]> {
  const je = new Map<string, MeldungAnhang[]>()
  for (const a of anhaenge) {
    if (!lesbaresBild(a)) continue
    const liste = je.get(a.bezug_id) ?? []
    if (liste.length < BILDER_PRO_MELDUNG) liste.push(a)
    je.set(a.bezug_id, liste)
  }
  return je
}

/** Abfrage der Anhänge zu den Meldungen (eine Abfrage für alle). */
export function anhaengeAbfrage(ids: string[]): string {
  return (
    'dokumente?select=bezug_id,name,mime_typ,speicher_pfad&bezug_tabelle=eq.rueckmeldungen' +
    `&bezug_id=in.(${ids.join(',')})&geloescht_am=is.null&order=erstellt_am.asc`
  )
}
