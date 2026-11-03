import { beforeEach, describe, expect, it, vi } from 'vitest'

// Ablage am Gerät im Speicher statt IndexedDB, Datenbank als Attrappe.
const auftraege: { nr: number; [k: string]: unknown }[] = []
let naechsteNr = 1
vi.mock('./speicher', () => ({
  auftraegeLesen: () => Promise.resolve([...auftraege]),
  auftragAnhaengen: (a: object) => {
    auftraege.push({ ...a, nr: naechsteNr++ })
    return Promise.resolve()
  },
  auftragEntfernen: (nr: number) => {
    auftraege.splice(
      auftraege.findIndex((a) => a.nr === nr),
      1,
    )
    return Promise.resolve()
  },
  auftragErsetzen: () => Promise.resolve(),
  ablageLesen: () => Promise.resolve(undefined),
  ablageSchreiben: () => Promise.resolve(),
}))
const gesendet: string[] = []
let waehrendDesSendens: (() => Promise<void>) | null = null
const rpc = vi.fn(async (name: string) => {
  gesendet.push(name)
  const dazu = waehrendDesSendens
  waehrendDesSendens = null
  if (dazu) await dazu()
  return { error: null }
})
vi.mock('@/services/supabase', () => ({ supabase: { rpc: (name: string) => rpc(name) } }))

const { einreihen, useWarteschlange } = await import('./warteschlange')

describe('Warteschlange', () => {
  beforeEach(() => {
    auftraege.length = 0
    gesendet.length = 0
  })

  it('sendet auch, was während des Sendens dazukommt (Rapport anlegen, dann Zeit starten)', async () => {
    const erstellt = new Date().toISOString()
    // Der zweite Auftrag kommt, während der erste noch unterwegs ist.
    waehrendDesSendens = () => einreihen({ art: 'rpc', name: 'zeit_starten', args: {}, erstellt })
    await einreihen({ art: 'rpc', name: 'rapport_speichern', args: {}, erstellt })
    await vi.waitFor(() => {
      expect(useWarteschlange.getState().laeuft).toBe(false)
    })
    expect(gesendet).toEqual(['rapport_speichern', 'zeit_starten'])
    expect(useWarteschlange.getState().offen).toBe(0)
  })
})
