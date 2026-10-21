import { describe, expect, it } from 'vitest'
import { leseKalender, plzAusOrt, wiederholungen } from './kalenderdatei'

const ICS = `BEGIN:VCALENDAR
BEGIN:VEVENT
UID:a1
SUMMARY:Besuch Muster
LOCATION:Dorfstrasse 3, 5630 Muri AG
DTSTART:20261022T090000
DTEND:20261022T100000
END:VEVENT
BEGIN:VEVENT
UID:a2
SUMMARY:Abgesagt
DTSTART:20261022T110000
STATUS:CANCELLED
END:VEVENT
BEGIN:VEVENT
UID:a3
SUMMARY:Ferien
DTSTART;VALUE=DATE:20261026
DTEND;VALUE=DATE:20261027
X-MICROSOFT-CDO-BUSYSTATUS:OOF
END:VEVENT
END:VCALENDAR`

describe('Kalender aus Datei', () => {
  it('liest .ics mit Ort, PLZ, ganztägigen und abgesagten Terminen', () => {
    const t = leseKalender(ICS)
    expect(t).toHaveLength(2)
    expect(t[0]?.betreff).toBe('Besuch Muster')
    expect(t[0]?.plz).toBe('5630')
    expect(t[1]?.ganztags).toBe(true)
    expect(t[1]?.anzeige_als).toBe('oof')
  })
  it('liest eine aus Outlook kopierte Liste mit Kopfzeile', () => {
    const text = 'Betreff\tOrt\tBeginn\tEnde\nKunde Roth\t3700 Spiez\t22.10.2026 13:00\t22.10.2026 14:30'
    const t = leseKalender(text)
    expect(t).toHaveLength(1)
    expect(t[0]?.plz).toBe('3700')
    expect(new Date(t[0]?.ende ?? '').getTime() - new Date(t[0]?.beginn ?? '').getTime()).toBe(90 * 60_000)
  })
  it('findet die PLZ auch in Klammern', () => {
    expect(plzAusOrt('Familie Roth (Seestrasse 4, 3700 Spiez)')).toBe('3700')
    expect(plzAusOrt('Büro')).toBeNull()
  })
  it('rollt wöchentliche Serien aus', () => {
    const start = new Date(2026, 9, 5, 8, 0)
    const d = wiederholungen(start, 'FREQ=WEEKLY;BYDAY=MO,WE;COUNT=4', new Date(2026, 9, 1), new Date(2027, 0, 1))
    expect(d.map((x) => x.getDate())).toEqual([5, 7, 12, 14])
  })
})
