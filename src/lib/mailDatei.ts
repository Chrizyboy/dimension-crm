// Gespeicherte Mails lesen: Outlook legt beim Hinausziehen .msg-Dateien ab, andere Programme .eml.
// Der Server versteht nur .eml; eine .msg wird darum hier im Browser in eine einfache .eml umgebaut.

import type MsgReaderTyp from '@kenjiuno/msgreader'

/** Dateiendungen und Typen, die eine Mail-Auswahl annimmt. */
export const MAIL_DATEIEN = '.eml,.msg,message/rfc822,application/vnd.ms-outlook'

/** Eine .msg ist eine OLE-Datei: sie beginnt mit D0 CF 11 E0. */
export function istMsg(bytes: Uint8Array): boolean {
  return bytes[0] === 0xd0 && bytes[1] === 0xcf && bytes[2] === 0x11 && bytes[3] === 0xe0
}

function base64(text: string): string {
  const bytes = new TextEncoder().encode(text)
  let roh = ''
  for (const b of bytes) roh += String.fromCharCode(b)
  // Zeilen à 76 Zeichen, wie es RFC 2045 verlangt.
  return (btoa(roh).match(/.{1,76}/g) ?? []).join('\r\n')
}

/** Kopfzeile mit Umlauten als «=?utf-8?B?…?=», sonst unverändert. */
function kopf(text: string): string {
  return /^[\x20-\x7e]*$/.test(text) ? text : `=?utf-8?B?${base64(text).replace(/\r\n/g, '')}?=`
}

/** Felder einer gelesenen .msg, soweit sie für den Import zählen. */
export interface MsgFelder {
  betreff?: string | undefined
  vonName?: string | undefined
  vonMail?: string | undefined
  datum?: string | undefined
  kennung?: string | undefined
  text?: string | undefined
  html?: string | undefined
}

/** Baut aus den Feldern einer .msg eine .eml (Text und, falls vorhanden, HTML als zweiter Teil). */
export function emlAusFeldern(f: MsgFelder): string {
  const von = f.vonMail ? (f.vonName ? `${kopf(f.vonName)} <${f.vonMail}>` : f.vonMail) : kopf(f.vonName ?? '')
  const datum = f.datum && !Number.isNaN(Date.parse(f.datum)) ? new Date(f.datum).toUTCString() : ''
  const koepfe = [
    `From: ${von}`,
    `Subject: ${kopf(f.betreff ?? '')}`,
    ...(datum ? [`Date: ${datum}`] : []),
    ...(f.kennung ? [`Message-ID: ${f.kennung}`] : []),
    'MIME-Version: 1.0',
  ]
  const teil = (art: string, inhalt: string) =>
    `Content-Type: ${art}; charset=utf-8\r\nContent-Transfer-Encoding: base64\r\n\r\n${base64(inhalt)}`
  // Leeren Text weglassen, sonst nähme der Server ihn statt des HTML (Landingpage-Mails haben nur HTML).
  const teile = [
    ...(f.text?.trim() || !f.html ? [teil('text/plain', f.text ?? '')] : []),
    ...(f.html ? [teil('text/html', f.html)] : []),
  ]
  if (teile.length === 1) return `${koepfe.join('\r\n')}\r\n${teile[0] ?? ''}\r\n`
  const grenze = 'dimension-work-msg'
  return [
    ...koepfe,
    `Content-Type: multipart/alternative; boundary="${grenze}"`,
    '',
    ...teile.flatMap((t) => [`--${grenze}`, t]),
    `--${grenze}--`,
    '',
  ].join('\r\n')
}

/**
 * Liest eine gespeicherte Mail (.eml oder Outlook-.msg) und gibt sie als .eml-Text zurück.
 * Der Leser für .msg wird erst gebraucht, wenn wirklich eine .msg kommt, und erst dann geladen.
 */
export async function mailDateiAlsEml(datei: Blob): Promise<string> {
  const puffer = await datei.arrayBuffer()
  if (!istMsg(new Uint8Array(puffer, 0, Math.min(4, puffer.byteLength)))) return new TextDecoder().decode(puffer)
  // Das Paket ist CommonJS: je nach Bündler liegt die Klasse unter default oder default.default.
  const modul = (await import('@kenjiuno/msgreader')) as { default: unknown }
  const MsgReader = (
    typeof modul.default === 'function' ? modul.default : (modul.default as { default: unknown }).default
  ) as typeof MsgReaderTyp
  const d = new MsgReader(puffer).getFileData()
  const html = d.bodyHtml ?? (d.html ? new TextDecoder().decode(d.html) : undefined)
  return emlAusFeldern({
    betreff: d.subject,
    vonName: d.senderName,
    vonMail: d.senderSmtpAddress ?? d.senderEmail,
    datum: d.clientSubmitTime ?? d.messageDeliveryTime,
    kennung: d.messageId,
    text: d.body,
    html,
  })
}
