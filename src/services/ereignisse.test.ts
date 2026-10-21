import { hoere, sende } from './ereignisse'

it('liefert Ereignisse an Zuhörer und meldet sie wieder ab', () => {
  const erhalten: string[] = []
  const ab = hoere('daten.geaendert', (d) => erhalten.push(d.id))
  sende('daten.geaendert', { tabelle: 'kontakte', id: 'K0001' })
  ab()
  sende('daten.geaendert', { tabelle: 'kontakte', id: 'K0002' })
  expect(erhalten).toEqual(['K0001'])
})
