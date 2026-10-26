/**
 * Liest Dauer und ein Vorschaubild (Bild bei 0.5 s) aus einer Videodatei, direkt im Browser.
 * Klappt das nicht (z. B. Format, das der Browser nicht abspielt), kommt null zurück; das Video wird
 * trotzdem abgelegt, nur ohne Bild und Dauer.
 */
export async function videoAngaben(datei: File): Promise<{ dauer_s: number | null; vorschaubild: Blob | null }> {
  const adresse = URL.createObjectURL(datei)
  const video = document.createElement('video')
  video.muted = true
  video.playsInline = true
  video.preload = 'metadata'
  video.src = adresse
  try {
    await new Promise<void>((ok, nein) => {
      video.onloadedmetadata = () => {
        ok()
      }
      video.onerror = () => {
        nein(new Error('Video nicht lesbar'))
      }
    })
    const dauer = Number.isFinite(video.duration) ? Math.round(video.duration) : null
    video.currentTime = Math.min(0.5, (video.duration || 1) / 2)
    await new Promise<void>((ok) => {
      video.onseeked = () => {
        ok()
      }
    })
    const breite = Math.min(640, video.videoWidth || 640)
    const hoehe = Math.round(breite * ((video.videoHeight || 360) / (video.videoWidth || 640)))
    const leinwand = document.createElement('canvas')
    leinwand.width = breite
    leinwand.height = hoehe
    leinwand.getContext('2d')?.drawImage(video, 0, 0, breite, hoehe)
    const bild = await new Promise<Blob | null>((ok) => {
      leinwand.toBlob(ok, 'image/jpeg', 0.8)
    })
    return { dauer_s: dauer, vorschaubild: bild }
  } catch {
    return { dauer_s: null, vorschaubild: null }
  } finally {
    URL.revokeObjectURL(adresse)
  }
}
