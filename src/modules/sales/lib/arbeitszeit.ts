import type { VerkaufEinstellung } from './einstellung'

const MIN = 60_000

function minutenVon(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return (h ?? 0) * 60 + (m ?? 0)
}

/** Datum, Wochentag (1 = Montag … 7 = Sonntag) und Minute des Tages in Schweizer Zeit. */
function zuerich(d: Date): { tag: string; wochentag: number; minute: number } {
  const teile = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Zurich',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    weekday: 'short',
    hourCycle: 'h23',
  }).formatToParts(d)
  const t = (art: string) => teile.find((x) => x.type === art)?.value ?? ''
  const wochentag = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(t('weekday')) + 1
  return {
    tag: `${t('year')}-${t('month')}-${t('day')}`,
    wochentag,
    minute: Number(t('hour')) * 60 + Number(t('minute')),
  }
}

/**
 * Arbeitsminuten zwischen zwei Zeitpunkten, wie die Datenbank (intern.pe_arbeitsminuten) sie für die
 * Erinnerung zählt: nur Arbeitstage ohne Feiertage, nur innerhalb der Arbeitszeit. Eine Anfrage am Samstag
 * zählt ab Montag 07:30, damit die 15-Minuten-Uhr nicht über das Wochenende rot wird.
 */
export function arbeitsminuten(
  von: Date,
  bis: Date,
  az: Pick<VerkaufEinstellung, 'arbeitszeit' | 'feiertage'>,
): number {
  if (bis <= von) return 0
  const start = minutenVon(az.arbeitszeit.von)
  const ende = minutenVon(az.arbeitszeit.bis)
  let summe = 0
  // Tag für Tag (höchstens 60 Tage, ältere Leads sind ohnehin «lange»).
  let zeiger = new Date(von)
  for (let i = 0; i < 60 && zeiger < bis; i++) {
    const z = zuerich(zeiger)
    const tagesBeginn = new Date(zeiger.getTime() - z.minute * MIN)
    const naechster = new Date(tagesBeginn.getTime() + 24 * 60 * MIN)
    if (az.arbeitszeit.tage.includes(z.wochentag) && !az.feiertage.includes(z.tag)) {
      const a = Math.max(z.minute, start)
      const b = Math.min(bis < naechster ? zuerich(bis).minute : 1440, ende)
      if (b > a) summe += b - a
    }
    zeiger = naechster
  }
  return summe
}

/** Nächster Arbeitstag nach `heute` (ISO), ohne Wochenende und Feiertage: Rückruf nach «nicht erreicht». */
export function naechsterArbeitstag(heute: string, az: Pick<VerkaufEinstellung, 'arbeitszeit' | 'feiertage'>): string {
  const d = new Date(`${heute}T12:00:00Z`)
  for (let i = 0; i < 14; i++) {
    d.setUTCDate(d.getUTCDate() + 1)
    const iso = d.toISOString().slice(0, 10)
    const wochentag = d.getUTCDay() === 0 ? 7 : d.getUTCDay()
    if (az.arbeitszeit.tage.includes(wochentag) && !az.feiertage.includes(iso)) return iso
  }
  return d.toISOString().slice(0, 10)
}

/** Datum in `monate` Monaten (ISO), für die Wiedervorlage eines verlorenen Leads. */
export function inMonaten(heute: string, monate: number): string {
  const d = new Date(`${heute}T12:00:00Z`)
  d.setUTCMonth(d.getUTCMonth() + monate)
  return d.toISOString().slice(0, 10)
}
