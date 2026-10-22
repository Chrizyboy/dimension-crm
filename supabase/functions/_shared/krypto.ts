// Verschlüsselung der Microsoft-Verbindung (Refresh-Token) mit AES-GCM. Der Schlüssel (32 Bytes, Base64)
// steht nur im Secret VERBINDUNG_SCHLUESSEL. In der Datenbank liegt nur «v1.<iv>.<daten>» (Base64url).
// Läuft in Deno und Node 22 (WebCrypto).

const VERSION = 'v1'

function b64url(bytes: Uint8Array): string {
  let s = ''
  for (const b of bytes) s += String.fromCharCode(b)
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function ausB64(text: string) {
  const s = atob(text.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((text.length + 3) % 4))
  return Uint8Array.from(s, (c) => c.charCodeAt(0))
}

async function schluessel(geheim: string): Promise<CryptoKey> {
  const roh = ausB64(geheim)
  if (roh.length !== 32) throw new Error('VERBINDUNG_SCHLUESSEL muss 32 Bytes (Base64) sein')
  return crypto.subtle.importKey('raw', roh, 'AES-GCM', false, ['encrypt', 'decrypt'])
}

/** Text verschlüsseln; jedes Mal mit neuem Zufallswert (iv). */
export async function verschluessle(text: string, geheim: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const daten = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    await schluessel(geheim),
    new TextEncoder().encode(text),
  )
  return `${VERSION}.${b64url(iv)}.${b64url(new Uint8Array(daten))}`
}

/** Text entschlüsseln; wirft, wenn der Schlüssel nicht passt oder die Daten verändert wurden. */
export async function entschluessle(paket: string, geheim: string): Promise<string> {
  const [version, iv, daten] = paket.split('.')
  if (version !== VERSION || !iv || !daten) throw new Error('Unbekanntes Format')
  const klar = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: ausB64(iv) }, await schluessel(geheim), ausB64(daten))
  return new TextDecoder().decode(klar)
}

/** Zufallswert für «state» und PKCE (Base64url). */
export function zufall(bytes = 32): string {
  return b64url(crypto.getRandomValues(new Uint8Array(bytes)))
}

/** PKCE: code_challenge = Base64url(SHA-256(verifier)). */
export async function pkceChallenge(pruefwert: string): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pruefwert))
  return b64url(new Uint8Array(hash))
}
