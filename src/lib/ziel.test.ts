import { describe, expect, it } from 'vitest'
import { istAppZiel, zielVon } from './ziel'

describe('zielVon', () => {
  it('kennt die Tabellen der Automationen', () => {
    expect(zielVon('verkaufschancen', 'a1')).toBe('/sales?lead=a1')
    expect(zielVon('ausschreibungen', 'd1')).toBe('/tenders?dossier=d1')
    expect(zielVon('unbekannt', 'x')).toBeNull()
    expect(zielVon('offerten', null)).toBeNull()
  })
  it('unterscheidet App-Adressen von externen', () => {
    expect(istAppZiel('/outbox?eintrag=1')).toBe(true)
    expect(istAppZiel('https://firma.sharepoint.com/x')).toBe(false)
    expect(istAppZiel('//boese.example')).toBe(false)
  })
})
