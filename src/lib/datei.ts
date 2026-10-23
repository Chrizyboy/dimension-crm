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
