import { useQuery } from '@tanstack/react-query'
import { ladeAuswahl } from '@/services/auswahl'
import { useUi } from '@/stores/ui'
import type { Auswahlwert } from '@/types/kontakt'

/**
 * Lädt eine Auswahlliste einmal pro Sitzung und liefert dazu den Text in der aktuellen Sprache.
 * Unbekannte Schlüssel (z. B. alte Werte aus V233) werden unverändert angezeigt statt verschluckt.
 */
export function useAuswahl(liste: string) {
  const sprache = useUi((z) => z.sprache)
  const abfrage = useQuery({ queryKey: ['auswahl', liste], queryFn: () => ladeAuswahl(liste), staleTime: 30 * 60_000 })
  const werte: Auswahlwert[] = abfrage.data ?? []
  const finde = (schluessel: string | null | undefined) => werte.find((w) => w.schluessel === schluessel)
  const text = (schluessel: string | null | undefined): string => {
    if (!schluessel) return ''
    const w = finde(schluessel)
    return w ? (sprache === 'fr' ? w.text_fr : w.text_de) : schluessel
  }
  return { werte, finde, text, laedt: abfrage.isPending }
}
