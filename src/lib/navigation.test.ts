import { GRUPPEN, MODULE, findeModul, moduleDerGruppe } from './navigation'

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
  expect(findeModul('sales')?.titel.de).toBe('Verkauf')
  expect(findeModul('gibt-es-nicht')).toBeUndefined()
})
