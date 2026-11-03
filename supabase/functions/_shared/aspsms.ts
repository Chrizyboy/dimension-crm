// SMS über ASPSMS (wie V172, dort über eine Cloudflare-Brücke). JSON-Schnittstelle: SendSimpleTextSMS und
// CheckCredits. Zugang (Userkey, Passwort) nur in den Secrets. Ein Versand wird nie wiederholt: Bei einem
// Zeitlimit ist unklar, ob die SMS raus ist, darum entscheidet dann ein Mensch (Ausgangskorb «unklar»).
// Der Aufruf geht über die Datenbank (pg_net, sms_anfrage/sms_antwort): ASPSMS bietet nur ältere TLS-Verfahren
// an, die die Edge Runtime ablehnt (Migration 20261112000200).

import { dienst } from './datenbank.ts'
import { DienstFehler } from './http.ts'
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

const warte = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** Ein Aufruf über pg_net: einreihen, dann bis zu 20 s auf die Antwort warten. */
async function einmal(pfad: string, inhalt: Record<string, unknown>): Promise<AspsmsAntwort> {
  const id = await dienst.rpc<number>('sms_anfrage', {
    p_url: `${basis()}${pfad}`,
    p_inhalt: { ...zugang(), ...inhalt },
    p_zeitlimit_ms: 15_000,
  })
  for (let i = 0; i < 80; i++) {
    await warte(250)
    const [a] = await dienst.rpc<
      { status: number | null; inhalt: string | null; zeitlimit: boolean; fehler: string | null }[]
    >('sms_antwort', { p_id: id })
    if (!a) continue
    if (a.zeitlimit) throw new DienstFehler('zeitlimit', 0, 'Zeitlimit überschritten')
    if (a.fehler || a.status === null) {
      console.warn(`ASPSMS über pg_net: ${a.fehler ?? 'ohne Antwort'}`)
      throw new DienstFehler('netzwerk', 0, 'Keine Verbindung')
    }
    let d: AspsmsAntwort = {}
    try {
      d = JSON.parse(a.inhalt ?? '{}') as AspsmsAntwort
    } catch {
      d = {}
    }
    if (a.status >= 400 || String(d.StatusCode) !== '1') {
      throw new DienstFehler(`sms_${d.StatusCode ?? a.status}`, a.status, d.StatusInfo ?? 'ASPSMS')
    }
    return d
  }
  throw new DienstFehler('zeitlimit', 0, 'Zeitlimit überschritten')
}

/** Aufruf mit Wiederholung bei Netz- oder Zeitfehler (nur, wo eine Wiederholung nichts doppelt macht). */
async function aufruf(pfad: string, inhalt: Record<string, unknown>, versuche: number): Promise<AspsmsAntwort> {
  for (let i = 1; ; i++) {
    try {
      return await einmal(pfad, inhalt)
    } catch (f) {
      const nochmal = f instanceof DienstFehler && (f.code === 'netzwerk' || f.code === 'zeitlimit') && i < versuche
      if (!nochmal) throw f
      await warte(500 * i)
    }
  }
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
