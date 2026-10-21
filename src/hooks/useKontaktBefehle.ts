import { useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useDeferredValue } from 'react'
import { formatTelefon } from '@/lib/format'
import { adresseEinzeilig, formatKundennummer } from '@/lib/kontakt'
import { sucheKontakte } from '@/services/kontakte'
import { supabase } from '@/services/supabase'
import type { Befehl } from './useBefehle'
import { KONTAKT_SCHLUESSEL } from './useKontakte'

/** Kunden öffnen in der Kundenliste, alle anderen (Partner, Lieferanten …) im Adressbuch. */
const KUNDENARTEN = new Set(['privat', 'firma'])

/**
 * Kontakte als Treffer der Befehlspalette (Ctrl K): Name, Ort, Mail oder Telefonnummer tippen,
 * Enter öffnet die Akte. Gesucht wird in der Datenbank, höchstens 8 Treffer.
 */
export function useKontaktBefehle(suche: string, onGewaehlt?: () => void): { befehle: Befehl[]; laedt: boolean } {
  const navigate = useNavigate()
  const verzoegert = useDeferredValue(suche.trim())
  const abfrage = useQuery({
    queryKey: [...KONTAKT_SCHLUESSEL, 'suche', verzoegert],
    queryFn: () => sucheKontakte(verzoegert),
    enabled: supabase !== null && verzoegert.length >= 2,
    staleTime: 30_000,
  })
  const befehle = (abfrage.data ?? []).map<Befehl>((k) => ({
    id: `kontakt-${k.id}`,
    titel: k.name,
    untertitel: [
      formatKundennummer(k.kundennummer),
      adresseEinzeilig(k),
      k.telefon ? formatTelefon(k.telefon) : k.email,
    ]
      .filter(Boolean)
      .join(' · '),
    gruppe: 'kontakte',
    icon: 'contact',
    // Die Datenbank hat schon gefiltert; die Eingabe als Stichwort hält den Treffer in der Liste.
    stichworte: [suche, k.email ?? '', k.telefonZiffern],
    ausfuehren: () => {
      if (KUNDENARTEN.has(k.kontaktart) || k.stand !== null)
        void navigate({ to: '/customers', search: { kunde: k.id } })
      else void navigate({ to: '/contacts', search: { kontakt: k.id } })
      onGewaehlt?.()
    },
  }))
  return { befehle, laedt: abfrage.isFetching }
}
