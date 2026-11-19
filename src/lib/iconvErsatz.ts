// Ersatz für «iconv-lite» im Browser. Der .msg-Leser braucht es nur für ältere Mails mit ANSI-Text;
// das echte Paket zieht Node-«Buffer» mit, den es im Browser nicht gibt. TextDecoder kann dasselbe.

/** Bytes in der genannten Zeichenkodierung lesen (z. B. «windows-1252»). */
export function decode(bytes: Uint8Array, kodierung: string): string {
  try {
    return new TextDecoder(kodierung).decode(bytes)
  } catch {
    return new TextDecoder('windows-1252').decode(bytes)
  }
}

/** Nur UTF-8 schreiben; der Leser schreibt nie, die Funktion ist für die Vollständigkeit da. */
export function encode(text: string): Uint8Array {
  return new TextEncoder().encode(text)
}

export default { decode, encode }
