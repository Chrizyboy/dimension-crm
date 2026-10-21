import { useQuery } from '@tanstack/react-query'
import type { Ort } from '../lib/ablauf'
import { plzAusOrt } from '../lib/kalenderdatei'
import { ladeLagen } from '../services/planung'
import { useOrte } from './useVerkauf'

/** Start oder Ziel einer Route: Zuhause, ein Standort oder eine andere Adresse. */
export type StartArt = 'heim' | 'muri' | 'bulle' | 'andere'

/** Der gewählte Start bzw. das Ziel als Ort mit Lage; null, solange die Lage fehlt. */
export function useStartOrt(art: StartArt, andere: string, personId: string | null): Ort | null {
  const orte = useOrte()
  const plz = art === 'andere' ? (plzAusOrt(andere) ?? (/^\d{4}$/.test(andere.trim()) ? andere.trim() : null)) : null
  const lage = useQuery({
    queryKey: ['plz', 'lage', plz],
    queryFn: () => ladeLagen(plz ? [plz] : []),
    enabled: plz !== null,
    staleTime: 60 * 60_000,
  })
  if (art === 'andere') {
    const l = plz ? lage.data?.get(plz) : undefined
    return l ? { name: andere.trim(), adresse: andere.trim(), breite: l.breite, laenge: l.laenge } : null
  }
  if (art === 'heim') return (personId ? orte.data?.heime[personId] : undefined) ?? orte.data?.standorte.muri ?? null
  return orte.data?.standorte[art] ?? null
}
