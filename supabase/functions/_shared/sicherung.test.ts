// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { dateiname, entpacken, istSicherung, packen, stuecke, zeitSlot } from './sicherung.ts'

describe('Datensicherung', () => {
  it('packt und entpackt verlustfrei (auch Umlaute)', async () => {
    const text = JSON.stringify({ name: 'Zürich – Müller', zahl: 12_500_00 })
    const gz = await packen(text)
    expect(gz[0]).toBe(0x1f) // gzip-Kennung
    expect(await entpacken(gz)).toBe(text)
  })
  it('benennt Dateien wie V233', () => {
    expect(dateiname('2026-10-26-12')).toBe('CRM-Backup_2026-10-26-12.json.gz')
    expect(dateiname('manuell-2026-10-26T10:15')).toBe('CRM-Backup_manuell-2026-10-26T10-15.json.gz')
  })
  it('macht aus der Zeit einen eindeutigen Termin', () => {
    expect(zeitSlot('manuell', new Date('2026-10-26T10:15:03.120Z'))).toBe('manuell-2026-10-26T10-15-03')
  })
  it('teilt grosse Tabellen in Stücke, leere bleiben ein Stück', () => {
    expect(stuecke([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]])
    expect(stuecke([], 2)).toEqual([[]])
  })
  it('erkennt nur eigene Sicherungsdateien', () => {
    expect(istSicherung({ format: 'dimension-crm-sicherung', version: 1, tabellen: {} })).toBe(true)
    expect(istSicherung({ format: 'ds-crm-backup', version: 1, collections: {} })).toBe(false)
    expect(istSicherung(null)).toBe(false)
  })
})
