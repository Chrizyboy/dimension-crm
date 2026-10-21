import { describe, expect, it } from 'vitest'
import { alsTabelle, planeAblauf, planeUmFixe, type Ort, type Stopp } from './ablauf'
import { dauer, fahrt, hm, km, mapsLinks, optimiere, planeLaden, STANDARD_TOUR, zuMinuten } from './route'

const MURI: Ort = { name: 'Muri', adresse: 'Muri AG', breite: 47.2747, laenge: 8.3381 }
const BULLE: Ort = { name: 'Bulle', adresse: 'Bulle', breite: 46.618, laenge: 7.0569 }
const stopp = (id: string, breite: number, laenge: number, fix: number | null = null): Stopp => ({
  id,
  name: id,
  adresse: id,
  breite,
  laenge,
  fix,
  besuchMin: 60,
})

describe('Fahrzeit-Schätzung', () => {
  it('rechnet Muri–Bulle mit Umwegfaktor und Zuschlag', () => {
    const luftlinie = km(MURI, BULLE)
    expect(Math.round(luftlinie)).toBe(122)
    const f = fahrt(MURI, BULLE, STANDARD_TOUR)
    expect(f.km).toBeCloseTo(luftlinie * 1.35, 5)
    expect(f.min).toBe(Math.round((f.km / 70) * 60 + 8))
  })
  it('formatiert Zeiten und Dauern', () => {
    expect(hm(8 * 60 + 5)).toBe('08:05')
    expect(dauer(45)).toBe('45 Min')
    expect(dauer(125)).toBe('2 h 05')
    expect(zuMinuten('14.30')).toBe(870)
    expect(zuMinuten('')).toBeNull()
  })
})

describe('optimiere', () => {
  it('findet die kurze Reihenfolge statt der eingegebenen', () => {
    const punkte = [stopp('weit', 47.5, 8.3), stopp('nah', 47.3, 8.33), stopp('mitte', 47.4, 8.31)]
    expect(optimiere(MURI, punkte, MURI).map((p) => p.id)).toEqual(['nah', 'mitte', 'weit'])
  })
})

describe('Laden mit dem Elektroauto', () => {
  it('plant einen Ladehalt, wenn die Reserve sonst unterschritten wird', () => {
    const auto = { ...STANDARD_TOUR.auto, start: 60 }
    const s = planeLaden([{ km: 100, min: 80 }, { km: 100, min: 80 }], auto)
    expect(s[0]?.laden).toBeNull()
    expect(s[1]?.laden?.min).toBeGreaterThan(0)
    expect(s.every((x) => !x.reichtNicht)).toBe(true)
  })
  it('macht nichts, wenn das Auto ausgeschaltet ist', () => {
    expect(planeLaden([{ km: 500, min: 300 }], { ...STANDARD_TOUR.auto, aktiv: false })[0]?.laden).toBeNull()
  })
})

describe('planeAblauf', () => {
  const e = { ...STANDARD_TOUR, auto: { ...STANDARD_TOUR.auto, aktiv: false } }
  it('fährt rechtzeitig zum ersten festen Termin los und zeigt den Puffer', () => {
    const a = planeAblauf({ start: MURI, stopps: [stopp('A', 47.3, 8.35, 9 * 60)], ziel: MURI, e })
    const z = a.zeilen[0]
    expect(z?.geplant).toBe(540)
    expect(z?.puffer).toBeGreaterThanOrEqual(0)
    expect(a.abfahrt % 15).toBe(0)
    expect(a.ankunft).not.toBeNull()
  })
  it('meldet einen Termin, der nicht erreicht wird', () => {
    const a = planeAblauf({
      start: MURI,
      stopps: [stopp('A', 47.3, 8.35, 9 * 60), stopp('B', 46.62, 7.06, 9 * 60 + 30)],
      ziel: null,
      e,
    })
    expect(a.zeilen[1]?.puffer).toBeLessThan(0)
  })
  it('weicht belegten Zeiten aus', () => {
    const a = planeAblauf({
      start: MURI,
      stopps: [stopp('A', 47.28, 8.34)],
      ziel: null,
      e,
      abfahrt: 8 * 60,
      belegt: [{ start: 8 * 60, ende: 11 * 60, betreff: 'Sitzung' }],
    })
    expect(a.zeilen[0]?.geplant).toBeGreaterThanOrEqual(11 * 60)
  })
  it('übernimmt von Hand korrigierte Fahrzeiten', () => {
    const a = planeAblauf({ start: MURI, stopps: [stopp('A', 47.3, 8.35)], ziel: null, e, abfahrt: 480, fahrzeiten: { 'Muri>A': 33 } })
    expect(a.strecken[0]?.min).toBe(33)
  })
  it('liefert Zeilen für Excel', () => {
    const a = planeAblauf({ start: MURI, stopps: [stopp('A', 47.3, 8.35, 600)], ziel: MURI, e })
    const t = alsTabelle('22.10.2026', MURI, a, hm)
    expect(t.split('\n')).toHaveLength(3)
    expect(t).toContain('22.10.2026')
  })
})

describe('planeUmFixe', () => {
  it('setzt Leads zwischen feste Termine, ohne einen zu verpassen', () => {
    const e = { ...STANDARD_TOUR, auto: { ...STANDARD_TOUR.auto, aktiv: false } }
    const fix = stopp('fix', 47.35, 8.3, 14 * 60)
    const flex = [stopp('x', 47.3, 8.34), stopp('y', 47.32, 8.32)]
    const r = planeUmFixe(MURI, [fix], flex, MURI, e, [], 8 * 60)
    expect(r.folge).toHaveLength(3)
    expect(r.passtNicht).toHaveLength(0)
  })
})

describe('mapsLinks', () => {
  it('teilt lange Routen in Etappen mit höchstens 9 Zwischenhalten', () => {
    const adressen = Array.from({ length: 15 }, (_, i) => `Ort ${i}`)
    const links = mapsLinks(adressen)
    expect(links).toHaveLength(2)
    expect(links[0]).toContain('origin=Ort%200')
    expect(links[1]).toContain('origin=Ort%2010')
  })
})
