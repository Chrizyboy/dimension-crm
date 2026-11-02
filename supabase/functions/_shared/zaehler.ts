// Öffnungen und Klicks von Serien-Mails und Newslettern (Chris 2.11.2026, Entscheid 0039). Der Text der Mail wird
// beim Senden zu HTML: Links gehen über die Edge Function «zaehler» (zählt, dann weiter zum Ziel), am Schluss ein
// unsichtbares Bild (zählt das Öffnen) und ein kurzer Hinweis. Der Abmelde-Link bleibt direkt.
// Ohne Importe, damit die Tests in Node laufen.

const URL_MUSTER = /https?:\/\/[^\s<>"]+/g

const schuetzen = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/** Ist der Ausgangs-Eintrag eine Werbe-Mail, deren Öffnen und Klicks gezählt werden? */
export function wirdGezaehlt(a: { kanal: string; art?: string | null; html?: string | null }): boolean {
  return a.kanal === 'mail' && (a.art === 'newsletter' || a.art === 'serienmail') && !a.html?.trim()
}

/** Text → HTML mit gezählten Links, Hinweis und Zählbild. basis = SUPABASE_URL. */
export function marketingHtml(text: string, basis: string, ausgangId: string, hinweis = ''): string {
  const fn = `${basis.replace(/\/$/, '')}/functions/v1/zaehler`
  let html = ''
  let pos = 0
  for (const m of text.matchAll(URL_MUSTER)) {
    // Satzzeichen am Ende gehören nicht zum Link («… unter https://x.ch.»).
    const url = m[0].replace(/[.,;:!?)\]]+$/, '')
    const start = m.index
    html += schuetzen(text.slice(pos, start))
    const ziel = url.includes('/functions/v1/abmelden')
      ? url
      : `${fn}?k=${encodeURIComponent(ausgangId)}&u=${encodeURIComponent(url)}`
    html += `<a href="${schuetzen(ziel)}">${schuetzen(url)}</a>`
    pos = start + url.length
  }
  html += schuetzen(text.slice(pos))
  const fuss = hinweis.trim()
    ? `<p style="color:#6b7280;font-size:8pt;margin-top:16px">${schuetzen(hinweis.trim())}</p>`
    : ''
  const bild = `<img src="${schuetzen(`${fn}?o=${encodeURIComponent(ausgangId)}`)}" width="1" height="1" alt="" style="display:block;border:0">`
  return `<div style="font-family:Aptos,Calibri,Arial,sans-serif;font-size:11pt">${html.replace(/\r?\n/g, '<br>')}</div>${fuss}${bild}`
}
