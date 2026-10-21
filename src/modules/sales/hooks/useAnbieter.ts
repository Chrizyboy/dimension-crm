import { useAuswahl } from '@/hooks/useAuswahl'

/** Ist eine Quelle ein Lead-Anbieter (gekaufte Leads) statt eigene Leads? Steht in der Auswahlliste. */
export function useAnbieter(): (quelle: string) => boolean {
  const quellen = useAuswahl('quelle')
  return (q) => quellen.finde(q)?.eigenschaften.anbieter === true
}
