import { useEffect, useState } from 'react'
import { useDrucken } from '@/hooks/useDrucken'
import { formatKundennummer } from '@/lib/kontakt'
import { meldeFehler } from '@/services/fehler'
import { melde } from '@/services/meldungen'
import type { Kontaktzeile } from '@/types/kontakt'
import { exportiereKontakt, setzePapierkorb } from '../services/kundenakte'
import type { Objekt } from '../types'
import { useKontaktAenderung } from './useKunden'

/** Welcher Dialog über der Akte offen ist. */
export type OffenerDialog =
  | { art: 'kontakt' }
  | { art: 'aktivitaet' }
  | { art: 'objekt'; objekt: Objekt | null }
  | { art: 'papierkorb' }
  | { art: 'betreuung' }
  | { art: 'zusammenfuehren' }
  | null

/** Lädt die Daten als Datei herunter (Auskunft nach revDSG). */
function speichereDatei(name: string, inhalt: unknown) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(inhalt, null, 2)], { type: 'application/json' }))
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  URL.revokeObjectURL(url)
}

/**
 * Aktionen und Dialoge der Kundenakte, gemeinsam für das Seitenpanel (Adressbuch) und die ganze Seite (Kunden):
 * bearbeiten, Kontakt erfassen, Gebäude, Export, Papierkorb, Kundenblatt drucken.
 */
export function useAkteAktionen(id: string, kopf: Kontaktzeile | null | undefined, onSchliessen: () => void) {
  const [offen, setOffen] = useState<OffenerDialog>(null)
  const druck = useDrucken()
  const papierkorb = useKontaktAenderung((rein: boolean) => setzePapierkorb(id, rein))

  // Verschwindet die Akte (z. B. nach «In den Papierkorb»), solange Menü oder Dialog noch ausblenden, räumt Radix die
  // Klicksperre am body nicht mehr weg und nichts ist mehr anklickbar. Darum beim Verlassen selbst freigeben.
  useEffect(
    () => () => {
      document.body.style.pointerEvents = ''
    },
    [],
  )

  async function exportieren() {
    try {
      const daten = await exportiereKontakt(id)
      speichereDatei(`kontakt-${kopf ? formatKundennummer(kopf.kundennummer) : id}.json`, daten)
    } catch (f) {
      meldeFehler(f, 'export')
      melde('kritisch', { de: 'Export fehlgeschlagen', fr: "L'export a échoué" })
    }
  }

  async function verschiebe(rein: boolean) {
    try {
      await papierkorb.mutateAsync(rein)
      melde(
        'ok',
        rein
          ? { de: 'In den Papierkorb gelegt', fr: 'Mis à la corbeille' }
          : { de: 'Wiederhergestellt', fr: 'Restauré' },
      )
      setOffen(null)
      if (rein) onSchliessen()
    } catch (f) {
      meldeFehler(f, 'papierkorb')
      melde('kritisch', { de: 'Nicht gespeichert', fr: 'Non enregistré' })
    }
  }

  return { offen, setOffen, druck, papierkorb, exportieren, verschiebe }
}
