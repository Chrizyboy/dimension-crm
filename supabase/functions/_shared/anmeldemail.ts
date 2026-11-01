// Anmelde- und Einladungsmails über Microsoft 365 statt über den Supabase-Mailserver (Chris 01.11.2026:
// Absender noreply@dimension-solaire.ch, ein freigegebenes Postfach in M365). Supabase ruft dafür den
// «Send Email Hook» auf; diese Bausteine prüfen die Signatur (Standard Webhooks) und bauen die Mail im
// Design von Dimension Work, nur in der Sprache der Person. Läuft in Deno und Node (Tests), ohne Pakete.

/** Was Supabase an den Hook schickt (nur die Felder, die wir brauchen). */
export interface HookDaten {
  user: { email: string; new_email?: string; user_metadata?: { sprache?: string; name?: string } }
  email_data: { token: string; email_action_type: string; site_url?: string; redirect_to?: string }
}

/** Fertige Mail für Microsoft Graph. */
export interface Anmeldemail {
  an: string
  betreff: string
  html: string
}

const enc = new TextEncoder()

function ausB64(text: string): Uint8Array {
  const s = atob(text)
  return Uint8Array.from(s, (c) => c.charCodeAt(0))
}

function zuB64(bytes: ArrayBuffer): string {
  let s = ''
  for (const b of new Uint8Array(bytes)) s += String.fromCharCode(b)
  return btoa(s)
}

/** Vergleich in fester Zeit, damit die Signatur nicht Zeichen für Zeichen erraten werden kann. */
function gleich(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let d = 0
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return d === 0
}

/**
 * Prüft die Signatur nach Standard Webhooks (so signiert Supabase Auth-Hooks).
 * Geheimnis im Format «v1,whsec_<base64>», wie es das Dashboard erzeugt. Zu alte Aufrufe (> 5 Min.) gelten
 * als ungültig, damit ein abgefangener Aufruf nicht später wiederholt werden kann.
 */
export async function signaturGueltig(
  geheimnis: string,
  kopf: { id: string | null; zeit: string | null; signatur: string | null },
  inhalt: string,
  jetztSek = Math.floor(Date.now() / 1000),
): Promise<boolean> {
  if (!kopf.id || !kopf.zeit || !kopf.signatur) return false
  const zeit = Number(kopf.zeit)
  if (!Number.isFinite(zeit) || Math.abs(jetztSek - zeit) > 300) return false
  const roh = geheimnis.replace(/^v1,/, '').replace(/^whsec_/, '')
  const schluessel = await crypto.subtle.importKey(
    'raw',
    ausB64(roh) as BufferSource,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const erwartet = zuB64(await crypto.subtle.sign('HMAC', schluessel, enc.encode(`${kopf.id}.${kopf.zeit}.${inhalt}`)))
  return kopf.signatur
    .split(' ')
    .map((teil) => teil.split(',')[1] ?? '')
    .some((sig) => gleich(sig, erwartet))
}

const TEXTE = {
  de: {
    codeBetreff: 'Dein Anmeldecode · Dimension Work',
    codeHallo: 'Hallo, hier ist dein Code für die Anmeldung in Dimension Work:',
    codeGueltig: 'Er gilt 10 Minuten. Hast du keine Anmeldung gestartet, kannst du diese Mail ignorieren.',
    einladungBetreff: 'Einladung zu Dimension Work',
    einladungHallo: 'Hallo, du hast jetzt Zugang zu Dimension Work.',
    einladungText:
      'Öffne die App und melde dich mit deinem Microsoft-Firmenkonto an, oder lass dir einen Code an diese Adresse schicken.',
    knopf: 'Dimension Work öffnen',
    fuss: 'Dimension Solaire · Muri AG · Bulle FR · Automatisch versendet, bitte nicht antworten.',
  },
  fr: {
    codeBetreff: 'Ton code de connexion · Dimension Work',
    codeHallo: 'Bonjour, voici ton code de connexion à Dimension Work&nbsp;:',
    codeGueltig: 'Il est valable 10 minutes. Si tu n’as pas demandé de connexion, ignore ce message.',
    einladungBetreff: 'Invitation à Dimension Work',
    einladungHallo: 'Bonjour, tu as maintenant accès à Dimension Work.',
    einladungText:
      'Ouvre l’application et connecte-toi avec ton compte Microsoft professionnel, ou demande un code à cette adresse.',
    knopf: 'Ouvrir Dimension Work',
    fuss: 'Dimension Solaire · Muri AG · Bulle FR · Message automatique, merci de ne pas répondre.',
  },
} as const

const LOGO = 'https://raw.githubusercontent.com/Chrizyboy/dimension-crm/main/public/logo/dimension-work-hell.png'

/** Nur Ziffern/Buchstaben im Code und eine http(s)-Adresse im Knopf; alles andere wird nicht eingesetzt. */
const sicher = {
  code: (t: string) => t.replace(/[^0-9A-Za-z]/g, ''),
  adresse: (t: string | undefined) => (t && /^https?:\/\/[^\s"<>]+$/.test(t) ? t : 'https://dimension-solaire.ch'),
}

/** Rahmen wie supabase/templates/*.html: Karte mit oranger Linie oben, Tabellen wegen Outlook. */
function rahmen(inhalt: string, fuss: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:24px 0"><tr><td align="center">
<table role="presentation" width="520" cellpadding="0" cellspacing="0" style="max-width:520px;width:100%;background:#ffffff;border-radius:10px;border-top:4px solid #ef7c00">
<tr><td style="padding:24px 28px 8px 28px"><img src="${LOGO}" width="240" height="37" alt="Dimension Work" style="display:block;border:0" /></td></tr>
<tr><td style="padding:8px 28px 0 28px;font-family:Segoe UI,Arial,sans-serif;color:#02224f">
${inhalt}
<p style="font-size:12px;color:#4a5568;margin:24px 0">${fuss}</p>
</td></tr></table></td></tr></table>`
}

/**
 * Baut die Mail für einen Hook-Aufruf. Einladung mit Knopf zur App, alles andere (Code, Bestätigung,
 * neue Adresse) als Code-Mail. Sprache aus den Login-Metadaten, ohne Wert Deutsch.
 */
export function baueAnmeldemail(d: HookDaten): Anmeldemail {
  const t = TEXTE[d.user.user_metadata?.sprache === 'fr' ? 'fr' : 'de']
  const an = d.email_data.email_action_type === 'email_change' && d.user.new_email ? d.user.new_email : d.user.email
  if (d.email_data.email_action_type === 'invite') {
    const link = sicher.adresse(d.email_data.site_url)
    return {
      an,
      betreff: t.einladungBetreff,
      html: rahmen(
        `<p style="font-size:15px;margin:16px 0 8px 0">${t.einladungHallo}</p>
<p style="font-size:15px;margin:0 0 8px 0">${t.einladungText}</p>
<p style="margin:20px 0"><a href="${link}" style="background:#ef7c00;color:#1d1300;padding:12px 20px;border-radius:6px;text-decoration:none;font-weight:600;display:inline-block">${t.knopf}</a></p>`,
        t.fuss,
      ),
    }
  }
  return {
    an,
    betreff: t.codeBetreff,
    html: rahmen(
      `<p style="font-size:15px;margin:16px 0 8px 0">${t.codeHallo}</p>
<p style="font-size:32px;font-weight:700;letter-spacing:8px;margin:12px 0;padding:12px 0;text-align:center;background:#fdebd8;border-radius:8px;color:#02224f">${sicher.code(d.email_data.token)}</p>
<p style="font-size:13px;color:#4a5568;margin:8px 0 0 0">${t.codeGueltig}</p>`,
      t.fuss,
    ),
  }
}
