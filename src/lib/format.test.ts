import { formatChf, formatDatum, formatRelativ, formatTelefon, parseChf, rundeAuf5Rappen } from './format'

describe('formatChf', () => {
  it('setzt Apostroph als Tausendertrenner', () => {
    expect(formatChf(1_250_000)).toBe("12'500.00")
    expect(formatChf(123_456_789)).toBe("1'234'567.89")
  })
  it('zeigt kleine und negative Beträge', () => {
    expect(formatChf(5)).toBe('0.05')
    expect(formatChf(-1_250_000)).toBe("−12'500.00")
  })
  it('kann CHF voranstellen', () => {
    expect(formatChf(990, { mitWaehrung: true })).toBe('CHF 9.90')
  })
})

describe('parseChf', () => {
  it('liest Schweizer Schreibweisen', () => {
    expect(parseChf("12'500.50")).toBe(1_250_050)
    expect(parseChf('CHF 12 500,50')).toBe(1_250_050)
    expect(parseChf('12500')).toBe(1_250_000)
  })
  it('lehnt Unsinn ab', () => {
    expect(parseChf('zwölf')).toBeNull()
  })
})

describe('rundeAuf5Rappen', () => {
  it('rundet auf 5 Rappen', () => {
    expect(rundeAuf5Rappen(1_002)).toBe(1_000)
    expect(rundeAuf5Rappen(1_003)).toBe(1_005)
  })
})

describe('formatDatum', () => {
  it('formatiert als TT.MM.JJJJ', () => {
    expect(formatDatum('2026-10-21')).toBe('21.10.2026')
    expect(formatDatum(new Date(2026, 0, 5))).toBe('05.01.2026')
  })
})

describe('formatTelefon', () => {
  it('vereinheitlicht Schweizer Nummern', () => {
    expect(formatTelefon('076 123 45 67')).toBe('+41 76 123 45 67')
    expect(formatTelefon('0041761234567')).toBe('+41 76 123 45 67')
  })
  it('lässt ausländische Nummern stehen', () => {
    expect(formatTelefon('+33 6 12 34 56 78')).toBe('+33 6 12 34 56 78')
  })
})

describe('formatRelativ', () => {
  const jetzt = new Date('2026-10-21T15:00:00Z')
  it('zeigt kurze Abstände in Worten', () => {
    expect(formatRelativ('2026-10-21T14:55:00Z', 'de', jetzt)).toMatch(/5\sMin/)
    expect(formatRelativ('2026-10-21T12:00:00Z', 'fr', jetzt)).toMatch(/3\sh/)
  })
  it('zeigt ab 7 Tagen das Datum', () => {
    expect(formatRelativ('2026-10-01T12:00:00Z', 'de', jetzt)).toBe('01.10.2026')
  })
})
