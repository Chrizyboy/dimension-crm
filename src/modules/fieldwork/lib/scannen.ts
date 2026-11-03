/**
 * Seriennummer aus einem Foto lesen: Barcode oder QR-Code über den `BarcodeDetector` des Browsers (Chrome/Edge am
 * Android-Handy). Fehlt er (z. B. iPhone), tippt der Monteur die Nummer ab; das Foto bleibt im Rapport.
 */
interface Erkannt {
  rawValue: string
}
type Detektor = new (o?: { formats?: string[] }) => { detect: (b: ImageBitmap) => Promise<Erkannt[]> }

/** Kann dieses Gerät Barcodes lesen? */
export function kannScannen(): boolean {
  return typeof window !== 'undefined' && 'BarcodeDetector' in window
}

/** Erste Nummer im Bild, bereinigt (Leerzeichen weg, Grossbuchstaben); `null`, wenn nichts erkannt wurde. */
export async function nummerAusBild(bild: Blob): Promise<string | null> {
  if (!kannScannen()) return null
  const D = (window as unknown as { BarcodeDetector: Detektor }).BarcodeDetector
  const treffer = await new D().detect(await createImageBitmap(bild))
  const roh = treffer.find((x) => x.rawValue.trim())?.rawValue
  return roh ? bereinigen(roh) : null
}

/** Seriennummer vereinheitlichen; aus QR-Codes mit «SN:…» oder «S/N …» nur die Nummer. */
export function bereinigen(roh: string): string {
  const m = /(?:S\/?N|SERIAL)\s*[:#]?\s*([A-Z0-9-]+)/i.exec(roh)
  return (m?.[1] ?? roh).replace(/\s+/g, '').toUpperCase()
}
