import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { MeinTag, TagEintrag } from '../types'

const gesendet: { name: string; args: Record<string, unknown> }[] = []
let ablage: { schluessel: string; daten: MeinTag } | undefined

vi.mock('./warteschlange', () => ({
  einreihen: (a: { name: string; args: Record<string, unknown> }) => {
    gesendet.push({ name: a.name, args: a.args })
    return Promise.resolve()
  },
  ablageAendern: (_s: string, f: (alt: unknown) => unknown) => {
    ablage = f(ablage) as typeof ablage
    return Promise.resolve()
  },
}))

const { serviceAngekommen, serviceSchritt, serviceSeriennummer } = await import('./serviceHandy')

const eintrag = {
  typ: 'service',
  id: 'f1',
  rapporte: [],
  service: {
    id: 'f1',
    nummer: 'S014',
    titel: 'Wechselrichter aus',
    garantie: true,
    prioritaet: 'hoch',
    kategorie: 'stoerung',
    checkliste: [{ de: 'Fehlercode ablesen', fr: 'Lire le code', erledigt_am: null, person_id: null }],
    anlage: {
      id: 'a1',
      leistung_kwp: 11.2,
      komponenten: [{ art: 'wechselrichter', seriennummer: 'ALT1' }],
      monitoring: null,
    },
  },
} as unknown as TagEintrag

const fall = () => ablage?.daten.eintraege[0]?.service

describe('Service am Handy', () => {
  beforeEach(() => {
    gesendet.length = 0
    ablage = { schluessel: 'x', daten: { eintraege: [eintrag], laufend: null } as unknown as MeinTag }
  })

  it('meldet «angekommen» mit eigener ID und zeigt es sofort', async () => {
    await serviceAngekommen('f1')
    expect(gesendet[0]?.name).toBe('service_eintrag_handy')
    expect(gesendet[0]?.args).toMatchObject({ p_id: 'f1', p_art: 'besuch' })
    expect(typeof gesendet[0]?.args.p_eintrag).toBe('string')
    expect(fall()?.angekommen).toBe(true)
  })

  it('hakt einen Schritt ab, auch ohne Netz sichtbar', async () => {
    await serviceSchritt('f1', 0, true, 'p1')
    expect(gesendet[0]).toMatchObject({ name: 'service_checkliste', args: { p_nr: 0, p_erledigt: true } })
    expect(fall()?.checkliste?.[0]).toMatchObject({ person_id: 'p1' })
    expect(fall()?.checkliste?.[0]?.erledigt_am).not.toBeNull()
  })

  it('ändert die Seriennummer der Komponente', async () => {
    await serviceSeriennummer('f1', 0, '  NEU-77 ')
    expect(gesendet[0]?.args).toMatchObject({ p_nr: 0, p_seriennummer: 'NEU-77' })
    expect(fall()?.anlage?.komponenten[0]?.seriennummer).toBe('NEU-77')
  })
})
