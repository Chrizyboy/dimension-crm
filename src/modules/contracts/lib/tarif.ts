/**
 * Tarif und Laufzeit der Wartungsverträge nach «Wartungsverträge 2026» der Website (ohne React, darum testbar).
 * Die Datenbank rechnet dasselbe (wartung_tarif, wartung_laeuft_bis); hier für die sofortige Anzeige im Dialog.
 */
import type { Katalog, Paket } from '../types'

/** Stufe nach Anlagengrösse: 0 = bis 20 kWp, 1 = 20–50, 2 = 50–100, null = darüber (auf Anfrage). */
export function stufe(stufen: number[], kwp: number | null): number | null {
  const i = stufen.findIndex((bis) => (kwp ?? 0) <= bis)
  return i < 0 ? null : i
}

/** Tarif eines Pakets in Rappen exkl. MWST, null = auf Anfrage oder unbekanntes Paket. */
export function tarif(katalog: Katalog, paketId: string | null, kwp: number | null): number | null {
  const p = katalog.pakete.find((x) => x.id === paketId)
  const s = stufe(katalog.stufen_kwp, kwp)
  if (!p || s == null) return null
  return p.preise_rappen[s] ?? null
}

/** Text der Stufe, z. B. «bis 20 kWp», «20–50 kWp», «über 100 kWp». */
export function stufeText(stufen: number[], kwp: number | null, einheit = 'kWp'): string {
  const s = stufe(stufen, kwp)
  if (s == null) return `> ${String(stufen.at(-1) ?? 0)} ${einheit}`
  if (s === 0) return `≤ ${String(stufen[0])} ${einheit}`
  return `${String(stufen[s - 1])}–${String(stufen[s])} ${einheit}`
}

/** Rabatt in Prozent gegenüber dem Tarif (gerundet), 0 wenn keiner. */
export function rabattProzent(tarifRappen: number | null, preisRappen: number | null): number {
  if (!tarifRappen || preisRappen == null || preisRappen >= tarifRappen) return 0
  return Math.round(((tarifRappen - preisRappen) / tarifRappen) * 100)
}

function alsDatum(iso: string): Date {
  const [j, m, t] = iso.split('-').map(Number)
  return new Date(j ?? 1970, (m ?? 1) - 1, t ?? 1)
}

function alsIso(d: Date): string {
  return `${String(d.getFullYear())}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Tag vor dem Jahrestag: Start + n Jahre − 1 Tag. */
function jahrEnde(start: string, n: number): string {
  const d = alsDatum(start)
  return alsIso(new Date(d.getFullYear() + n, d.getMonth(), d.getDate() - 1))
}

/**
 * Ende des Vertragsjahrs, das am Stichtag läuft: Mindestlaufzeit, danach jeweils +1 Jahr (wie
 * public.wartung_laeuft_bis). Null ohne Start.
 */
export function laeuftBis(start: string | null, jahre: number, stichtag: string): string | null {
  if (!start) return null
  let n = Math.max(jahre || 3, 1)
  let ende = jahrEnde(start, n)
  while (ende < stichtag) {
    n += 1
    ende = jahrEnde(start, n)
  }
  return ende
}

/** Letzter Tag, an dem eine Kündigung auf dieses Ende noch rechtzeitig ist (Ende − Kündigungsfrist). */
export function kuendbarBis(ende: string | null, monate: number): string | null {
  if (!ende) return null
  const d = alsDatum(ende)
  return alsIso(new Date(d.getFullYear(), d.getMonth() - monate, d.getDate()))
}

/** Ende der Mindestlaufzeit. */
export function mindestBis(start: string | null, jahre: number): string | null {
  return start ? jahrEnde(start, Math.max(jahre || 3, 1)) : null
}

/** Braucht es vor Vertragsbeginn eine Bestandsaufnahme? Fremdanlage oder älter als n Jahre (Website). */
export function brauchtBestandsaufnahme(
  fremd: boolean,
  ibnJahr: number | null,
  jahr: number,
  abJahren: number,
): boolean {
  return fremd || (ibnJahr != null && jahr - ibnJahr >= abJahren)
}

/** Paket nach id oder undefined. */
export function findePaket(katalog: Katalog | undefined, id: string | null): Paket | undefined {
  return katalog?.pakete.find((p) => p.id === id)
}
