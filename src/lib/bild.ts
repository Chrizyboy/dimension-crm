/**
 * Foto fürs Hochladen verkleinern: längste Seite höchstens 1600 Pixel, JPEG. Ein Handyfoto hat sonst 4–8 MB
 * und braucht im Funkloch ewig; 1600 Pixel reichen, um Montage und Typenschild zu erkennen.
 */
export async function verkleinern(datei: Blob, max = 1600, qualitaet = 0.8): Promise<Blob> {
  const bild = await createImageBitmap(datei).catch(() => null)
  if (!bild) return datei
  const faktor = Math.min(1, max / Math.max(bild.width, bild.height))
  const leinwand = document.createElement('canvas')
  leinwand.width = Math.round(bild.width * faktor)
  leinwand.height = Math.round(bild.height * faktor)
  leinwand.getContext('2d')?.drawImage(bild, 0, 0, leinwand.width, leinwand.height)
  bild.close()
  return new Promise((ok) => {
    leinwand.toBlob(
      (b) => {
        ok(b ?? datei)
      },
      'image/jpeg',
      qualitaet,
    )
  })
}
