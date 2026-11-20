/** Datei im Browser speichern lassen (CSV, PDF …), ohne sie abzulegen. */
export function herunterladen(inhalt: BlobPart, name: string, typ: string): void {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([inhalt], { type: typ }))
  a.download = name
  a.click()
  // Erst später freigeben: manche Browser lesen die Adresse nach dem Klick noch.
  setTimeout(() => {
    URL.revokeObjectURL(a.href)
  }, 10_000)
}

/** PDF in neuem Fenster öffnen, ohne es abzulegen. */
export function pdfZeigen(bytes: Uint8Array): void {
  const adresse = URL.createObjectURL(new Blob([bytes as BlobPart], { type: 'application/pdf' }))
  window.open(adresse, '_blank', 'noopener')
  setTimeout(() => {
    URL.revokeObjectURL(adresse)
  }, 60_000)
}

/** Gleiche Dateinamen in einem ZIP eindeutig machen: «Plan.pdf», «Plan (2).pdf», «Plan (3).pdf». */
export function eindeutigeNamen(namen: string[]): string[] {
  const gesehen = new Map<string, number>()
  return namen.map((roh) => {
    const name = roh.replace(/[\\/:*?"<>|]/g, '_').trim() || 'Datei'
    const schluessel = name.toLowerCase()
    const n = (gesehen.get(schluessel) ?? 0) + 1
    gesehen.set(schluessel, n)
    if (n === 1) return name
    const punkt = name.lastIndexOf('.')
    return punkt > 0 ? `${name.slice(0, punkt)} (${String(n)})${name.slice(punkt)}` : `${name} (${String(n)})`
  })
}

/** Welche Vorschau eine Datei bekommt: Bild und PDF direkt in der App, alles andere zum Herunterladen. */
export function vorschauArt(d: { name: string; mime_typ?: string | null }): 'bild' | 'pdf' | 'andere' {
  const typ = (d.mime_typ ?? '').toLowerCase()
  const endung = d.name.toLowerCase().split('.').pop() ?? ''
  if (typ === 'application/pdf' || endung === 'pdf') return 'pdf'
  // HEIC/TIFF zeigt der Browser nicht an, darum nur die gängigen Bildformate.
  if (
    /^image\/(jpeg|png|gif|webp|svg\+xml|bmp)$/.test(typ) ||
    ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(endung)
  )
    return 'bild'
  return 'andere'
}
