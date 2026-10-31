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
