// SMS über ASPSMS (wie V172, dort über eine Cloudflare-Brücke). JSON-Schnittstelle: SendSimpleTextSMS und
// CheckCredits. Zugang (Userkey, Passwort) nur in den Secrets. Ein Versand wird nie wiederholt: Bei einem
// Zeitlimit ist unklar, ob die SMS raus ist, darum entscheidet dann ein Mensch (Ausgangskorb «unklar»).

import { DienstFehler, leseJson, rufe } from './http.ts'
import { brauche, env } from './umgebung.ts'

const basis = () => env('ASPSMS_URL') ?? 'https://json.aspsms.com'

/** Antwort von ASPSMS. StatusCode «1» heisst OK. */
interface AspsmsAntwort {
  StatusCode?: string | number
  StatusInfo?: string
  Credits?: string | number
}

const zugang = () => ({ UserName: brauche('ASPSMS_USERKEY'), Password: brauche('ASPSMS_PASSWORT') })

/** Absender: höchstens 11 Zeichen, nur Buchstaben und Ziffern (sonst lehnen Netze die SMS ab). */
export function absenderPruefen(absender: string): string {
  const sauber = absender.replace(/[^A-Za-z0-9]/g, '').slice(0, 11)
  return sauber || 'DimSolaire'
}

async function aufruf(pfad: string, inhalt: Record<string, unknown>, versuche: number): Promise<AspsmsAntwort> {
  const res = await rufe(
    `${basis()}${pfad}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...zugang(), ...inhalt }),
    },
    { versuche, zeitlimitMs: 15_000 },
  )
  const d = (await leseJson<AspsmsAntwort>(res)) ?? {}
  if (!res.ok || String(d.StatusCode) !== '1') {
    throw new DienstFehler(`sms_${d.StatusCode ?? res.status}`, res.status, d.StatusInfo ?? 'ASPSMS')
  }
  return d
}

/** Eine SMS senden. nummer im Format +41…, absender z. B. «DimSolaire». */
export async function smsSenden(nummer: string, text: string, absender: string): Promise<void> {
  await aufruf(
    '/SendSimpleTextSMS',
    { Originator: absenderPruefen(absender), Recipients: [nummer], MessageText: text, ForceGSM7bit: false },
    1,
  )
}

/** Guthaben (Anzahl Credits) – zugleich der Verbindungstest. */
export async function guthaben(): Promise<number> {
  const d = await aufruf('/CheckCredits', {}, 2)
  return Number(d.Credits ?? 0)
}
