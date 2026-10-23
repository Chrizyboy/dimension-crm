import type { Automation } from '../types'

/** Entwurf im Editor: wie eine Automation, aber eine neue hat noch keine id. */
export type Entwurf = Omit<Automation, 'id' | 'aktiv_seit'> & { id?: string }

/** Leere Automation für «Neue Automation». */
export const NEU: Entwurf = {
  vorlage: null,
  name_de: '',
  name_fr: '',
  beschreibung_de: '',
  beschreibung_fr: '',
  aktiv: false,
  modus: 'freigabe',
  ausloeser: 'lead.neu',
  bedingungen: [],
  aktionen: [],
  reihenfolge: 500,
}
