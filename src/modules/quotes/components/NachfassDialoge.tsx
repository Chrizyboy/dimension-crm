import { Suspense, lazy } from 'react'
import type { Offerte } from '../types'
import type { Entscheid } from './EntscheidDialog'

const EntscheidDialog = lazy(() => import('./EntscheidDialog'))
const ErgebnisDialog = lazy(() => import('./ErgebnisDialog'))
const ZurueckDialog = lazy(() => import('./ZurueckDialog'))
const NachfassMail = lazy(() => import('./NachfassMail'))

/** Was ein Knopf oder Rechtsklick für eine Offerte öffnet. */
export type NachfassWahl = Entscheid | 'ergebnis' | 'mail' | 'zurueck'

/**
 * Der passende Dialog für eine Offerte: Entscheid (angenommen, abgelehnt, vertagt, bereits verbaut),
 * Gespräch erfassen, Nachfass-Mail oder Zurück zur Offerte. Gemeinsam für «Mein Tag» und den Rechtsklick.
 */
export function NachfassDialoge({
  offen,
  onSchliessen,
}: {
  offen: { wahl: NachfassWahl; o: Offerte } | null
  onSchliessen: () => void
}) {
  if (!offen) return null
  const { wahl, o } = offen
  return (
    <Suspense>
      {wahl === 'ergebnis' && <ErgebnisDialog o={o} onSchliessen={onSchliessen} />}
      {wahl === 'mail' && <NachfassMail o={o} onSchliessen={onSchliessen} />}
      {wahl === 'zurueck' && <ZurueckDialog o={o} onSchliessen={onSchliessen} />}
      {wahl !== 'ergebnis' && wahl !== 'mail' && wahl !== 'zurueck' && (
        <EntscheidDialog offerten={[o]} ziel={wahl} onSchliessen={onSchliessen} />
      )}
    </Suspense>
  )
}
