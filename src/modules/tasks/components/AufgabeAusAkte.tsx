import { useQueryClient } from '@tanstack/react-query'
import { Suspense, lazy, useEffect, useState } from 'react'
import { hoere, type EreignisKatalog } from '@/services/ereignisse'
import { useAnmeldung } from '@/stores/anmeldung'
import { usePersonen } from '../hooks/useAufgaben'

// Erst beim ersten «+ Aufgabe» laden, der Zuhörer selbst ist klein und läuft immer mit.
const NeueAufgabe = lazy(() => import('./NeueAufgabe').then((m) => ({ default: m.NeueAufgabe })))

/**
 * Hört im ganzen CRM auf «+ Aufgabe» aus einer Akte (`AufgabeKnopf`) und öffnet das Fenster «Neue Aufgabe»
 * mit dem Bezug. Danach laden «Mein Tag» und die Aufgaben neu.
 */
export default function AufgabeAusAkte() {
  const client = useQueryClient()
  const ichId = useAnmeldung((z) => z.ich?.id ?? null)
  const [bezug, setBezug] = useState<EreignisKatalog['aufgabe.neu'] | null>(null)
  useEffect(() => hoere('aufgabe.neu', setBezug), [])
  if (!bezug) return null
  return (
    <Suspense>
      <Fenster
        bezug={bezug}
        ichId={ichId}
        onSchliessen={() => {
          setBezug(null)
          void client.invalidateQueries({ queryKey: ['mein-tag'] })
          void client.invalidateQueries({ queryKey: ['aufgaben'] })
        }}
      />
    </Suspense>
  )
}

/** Das Fenster mit Personen-Liste (erst geladen, wenn es gebraucht wird). */
function Fenster({
  bezug,
  ichId,
  onSchliessen,
}: {
  bezug: EreignisKatalog['aufgabe.neu']
  ichId: string | null
  onSchliessen: () => void
}) {
  const personen = usePersonen()
  return (
    <NeueAufgabe
      personen={personen.data ?? []}
      ichId={ichId}
      vorlage={{
        bezug_tabelle: bezug.bezugTabelle,
        bezug_id: bezug.bezugId,
        ...(bezug.titel ? { titel: bezug.titel } : {}),
      }}
      onSchliessen={onSchliessen}
    />
  )
}
