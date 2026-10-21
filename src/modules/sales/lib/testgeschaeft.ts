import type { Geschaeft } from '../types'

/** Ein Geschäft für Tests: nur die Felder, um die es geht, der Rest ist leer. */
export function testGeschaeft(felder: Partial<Geschaeft>): Geschaeft {
  return {
    id: 'g1',
    art: 'verkaufschancen',
    verkaufschanceId: 'v1',
    offerteId: null,
    projektId: null,
    nummer: 'L001',
    stand: 'lead_neu',
    gruppe: 'lead',
    interesse: [],
    name: 'Muster',
    ...felder,
  } as Geschaeft
}
