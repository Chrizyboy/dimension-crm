/**
 * Bildschirmfotos und Fotos für Meldungen: was angehängt werden darf und wie eingefügte Bilder heissen.
 * Rein (ohne Browser-Zugriff ausser `File`), damit es ohne Oberfläche testbar ist.
 */

/** Höchstens so viele Anhänge pro Meldung; mehr hilft selten und macht das Senden im Funkloch langsam. */
export const MAX_ANHAENGE = 8

/** Grösste Datei vor dem Verkleinern (Handyfotos haben 4–8 MB, PDFs selten mehr). */
export const MAX_BYTES = 20 * 1024 * 1024

/** Bilder über dieser Grösse werden vor dem Hochladen verkleinert; kleinere Bildschirmfotos bleiben scharf (PNG). */
export const VERKLEINERN_AB = 1.5 * 1024 * 1024

/** Ist das ein Bild, das der Browser anzeigen kann? */
export function istBild(mime: string | null | undefined): boolean {
  return !!mime && mime.startsWith('image/') && mime !== 'image/heic' && mime !== 'image/heif'
}

/** Darf diese Datei an eine Meldung? Bilder und PDF, nicht grösser als {@link MAX_BYTES}. */
export function erlaubt(f: { type: string; size: number }): boolean {
  return (f.type.startsWith('image/') || f.type === 'application/pdf') && f.size > 0 && f.size <= MAX_BYTES
}

/** Name für ein eingefügtes Bildschirmfoto (Strg+V hat keinen Dateinamen): «Bildschirmfoto 03.11.2026 16-42.png». */
export function bildschirmfotoName(jetzt: Date, nr: number, typ: string): string {
  const z = (n: number) => String(n).padStart(2, '0')
  const endung = typ === 'image/jpeg' ? 'jpg' : (typ.split('/')[1] ?? 'png')
  const datum = `${z(jetzt.getDate())}.${z(jetzt.getMonth() + 1)}.${String(jetzt.getFullYear())}`
  const zeit = `${z(jetzt.getHours())}-${z(jetzt.getMinutes())}`
  return `Bildschirmfoto ${datum} ${zeit}${nr > 1 ? ` (${String(nr)})` : ''}.${endung}`
}

/**
 * Neue Dateien zu den bisherigen hinzufügen: nur erlaubte, ohne doppelte (gleicher Name und Grösse),
 * höchstens {@link MAX_ANHAENGE}. `abgelehnt` zählt, was weggelassen wurde, damit die Oberfläche es sagen kann.
 */
export function hinzufuegen(bisher: File[], neu: File[]): { dateien: File[]; abgelehnt: number } {
  const dateien = [...bisher]
  let abgelehnt = 0
  for (const f of neu) {
    const doppelt = dateien.some((d) => d.name === f.name && d.size === f.size)
    if (doppelt) continue
    if (!erlaubt(f) || dateien.length >= MAX_ANHAENGE) {
      abgelehnt++
      continue
    }
    dateien.push(f)
  }
  return { dateien, abgelehnt }
}

/**
 * Bilder aus der Zwischenablage (Strg+V) oder aus einem hineingezogenen Bündel. Eingefügte Bildschirmfotos
 * heissen im Browser alle «image.png»; sie bekommen darum einen Namen mit Datum und Uhrzeit.
 */
export function dateienAus(daten: DataTransfer | null, jetzt = new Date()): File[] {
  if (!daten) return []
  const roh = [...daten.files].length
    ? [...daten.files]
    : [...daten.items].filter((i) => i.kind === 'file').flatMap((i) => i.getAsFile() ?? [])
  let nr = 0
  return roh.map((f) => {
    if (!f.type.startsWith('image/') || (f.name && f.name !== 'image.png')) return f
    nr++
    return new File([f], bildschirmfotoName(jetzt, nr, f.type), { type: f.type, lastModified: jetzt.getTime() })
  })
}
