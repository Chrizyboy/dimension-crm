import { GRUPPEN, MODULE, findeModul, hatEintrag, moduleDerGruppe } from './navigation'

it('jedes Modul hat eine eindeutige id und einen passenden Pfad', () => {
  const ids = MODULE.map((m) => m.id)
  expect(new Set(ids).size).toBe(ids.length)
  for (const m of MODULE) expect(m.pfad).toBe(`/${m.id}`)
})

it('jedes Modul gehört zu einer bekannten Gruppe', () => {
  const summe = GRUPPEN.reduce((n, g) => n + moduleDerGruppe(g).length, 0)
  expect(summe).toBe(MODULE.length)
})

it('findet Module über die id', () => {
  expect(findeModul('sales')?.titel.de).toBe('Leads')
  expect(findeModul('gibt-es-nicht')).toBeUndefined()
})

it('jeder Bereich hat einen eindeutigen Namen und eine Erklärung in beiden Sprachen', () => {
  // Chris, 21.10.2026: «benenne die jeweiligen Tools so, dass bei niemandem Verwirrung entstehen kann».
  for (const sprache of ['de', 'fr'] as const) {
    const namen = MODULE.map((m) => m.titel[sprache].toLowerCase())
    expect(new Set(namen).size).toBe(namen.length)
    for (const m of MODULE) expect(m.untertitel[sprache].length).toBeGreaterThan(10)
  }
})

it('Seitenleiste wie V234: nur Übersicht, Verkauf, Abwicklung und Team haben Einträge', () => {
  const eintraege = MODULE.filter((m) => hatEintrag(m, MODULE))
  expect(new Set(eintraege.map((m) => m.gruppe))).toEqual(new Set(['uebersicht', 'verkauf', 'abwicklung', 'betrieb']))
  expect(eintraege.map((m) => m.id)).toEqual([
    'today',
    'inbox',
    'dashboard',
    'marketing',
    'sales',
    'tenders',
    'quotes',
    'pricing',
    'customers',
    'projects',
    'workcontracts',
    'invoices',
    'aftersales',
    'time',
    'fleet',
    'staff',
  ])
})
