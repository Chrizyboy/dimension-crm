import { supabase } from '@/services/supabase'

// Eigene Unterschrift (Chris 31.10.2026): jede Person legt sie selbst in «Mein Konto» ab und setzt sie in
// Dokumente ein, die sie aus dem CRM unterschreibt (z. B. Werkvertrag). Privater Speicher «unterschriften»,
// Ordner = Person; nur die Person selbst kommt daran (RLS), auch die Administration nicht.

const BUCKET = 'unterschriften'
/** Grösse, auf die jede Unterschrift gebracht wird (Seitenverhältnis des Kastens im Vertrag, etwa 4.7 : 1). */
export const UNTERSCHRIFT_BREITE = 940
export const UNTERSCHRIFT_HOEHE = 200

function db() {
  if (!supabase) throw new Error('Keine Datenbank verbunden')
  return supabase
}

const pfad = (personId: string) => `${personId}/unterschrift.png`

/** Eigene Unterschrift als PNG-Bytes, oder null, wenn keine abgelegt ist. */
export async function ladeUnterschrift(personId: string): Promise<Uint8Array | null> {
  if (!supabase) return null
  const { data, error } = await supabase.storage.from(BUCKET).download(pfad(personId))
  if (error) {
    // «nicht gefunden» heisst: noch keine Unterschrift. Andere Fehler melden.
    const status = (error as { statusCode?: string | number }).statusCode
    if (String(status) === '404' || String(status) === '400' || /not.?found/i.test(error.message)) return null
    throw error
  }
  return new Uint8Array(await data.arrayBuffer())
}

/** Unterschrift (PNG) ablegen oder ersetzen. */
export async function speichereUnterschrift(personId: string, png: Blob): Promise<void> {
  const { error } = await db()
    .storage.from(BUCKET)
    .upload(pfad(personId), png, { contentType: 'image/png', upsert: true, cacheControl: '0' })
  if (error) throw error
}

/** Unterschrift entfernen (die Person zieht sie zurück; bereits erstellte Dokumente bleiben). */
export async function entferneUnterschrift(personId: string): Promise<void> {
  const { error } = await db()
    .storage.from(BUCKET)
    .remove([pfad(personId)])
  if (error) throw error
}

/**
 * Bild (Foto oder Scan der Unterschrift) auf ein PNG mit fester Grösse bringen: eingepasst, mittig, weisser
 * Grund wird durchsichtig, damit die Unterschrift im Kasten ohne weissen Block steht.
 */
export async function bildAlsUnterschrift(quelle: Blob): Promise<Blob> {
  const bild = await createImageBitmap(quelle)
  const leinwand = document.createElement('canvas')
  leinwand.width = UNTERSCHRIFT_BREITE
  leinwand.height = UNTERSCHRIFT_HOEHE
  const ctx = leinwand.getContext('2d')
  if (!ctx) throw new Error('Kein Zeichenbereich')
  const mass = Math.min(UNTERSCHRIFT_BREITE / bild.width, UNTERSCHRIFT_HOEHE / bild.height)
  const b = bild.width * mass
  const h = bild.height * mass
  ctx.drawImage(bild, (UNTERSCHRIFT_BREITE - b) / 2, (UNTERSCHRIFT_HOEHE - h) / 2, b, h)
  const daten = ctx.getImageData(0, 0, UNTERSCHRIFT_BREITE, UNTERSCHRIFT_HOEHE)
  const p = daten.data
  for (let i = 0; i < p.length; i += 4) {
    // Helles Papier ausblenden, dunkle Tinte behalten (weicher Übergang gegen Treppen am Rand).
    const hell = ((p[i] ?? 0) + (p[i + 1] ?? 0) + (p[i + 2] ?? 0)) / 3
    if (hell > 200) p[i + 3] = Math.round(((p[i + 3] ?? 0) * Math.max(0, 245 - hell)) / 45)
  }
  ctx.putImageData(daten, 0, 0)
  return leinwandAlsPng(leinwand)
}

/** Leinwand als PNG-Blob. */
export function leinwandAlsPng(leinwand: HTMLCanvasElement): Promise<Blob> {
  return new Promise((ok, fehler) => {
    leinwand.toBlob((b) => {
      if (b) ok(b)
      else fehler(new Error('PNG nicht erstellt'))
    }, 'image/png')
  })
}
