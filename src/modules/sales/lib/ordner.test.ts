import { expect, it } from 'vitest'
import { passtZu } from './ordner'

it('erkennt Planungstool-Excel und Kalenderdateien wie V233', () => {
  expect(passtZu('excel', 'Planungstool Kundentermine 2026.xlsx')).toBe(true)
  expect(passtZu('excel', '~$Planungstool.xlsx')).toBe(false)
  expect(passtZu('excel', 'Offerte.xlsx')).toBe(false)
  expect(passtZu('kalender', 'Kalender Chris.ics')).toBe(true)
  expect(passtZu('kalender', 'termine.csv')).toBe(true)
  expect(passtZu('kalender', 'notizen.txt')).toBe(false)
})
