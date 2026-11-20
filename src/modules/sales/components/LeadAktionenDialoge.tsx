import { Suspense, lazy } from 'react'
import type { LeadDialog } from './useLeadAktionen'

const TerminblattDialog = lazy(() => import('./TerminblattDialog'))
const KontaktErfassenDialog = lazy(() => import('./KontaktErfassenDialog'))
const StandWechselDialog = lazy(() => import('./StandWechselDialog'))

/** Uhrzeit «HH:MM» eines Termins in Schweizer Zeit, für den Vorschlag beim Verschieben. */
function zeitVon(iso: string): string {
  return new Date(iso).toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Zurich' })
}

/** Die Dialoge hinter dem Rechtsklick-Menü eines Leads (Terminblatt, Kontakt erfassen, Stand wechseln). */
export function LeadAktionenDialoge({ dialog, onSchliessen }: { dialog: LeadDialog | null; onSchliessen: () => void }) {
  if (!dialog) return null
  const { g } = dialog
  return (
    <Suspense>
      {dialog.art === 'blatt' && <TerminblattDialog g={g} onSchliessen={onSchliessen} />}
      {dialog.art === 'kontakt' && (
        <KontaktErfassenDialog
          geschaeft={g}
          {...(dialog.start ? { start: dialog.start } : {})}
          onSchliessen={onSchliessen}
        />
      )}
      {dialog.art === 'stand' && (
        <StandWechselDialog
          geschaeft={g}
          ziel={dialog.ziel}
          // Verschieben: mit dem bisherigen Termin anfangen, damit man nur ändert, was sich ändert.
          {...(dialog.ziel === 'termin' && g.terminAm && g.terminPersonId
            ? {
                vorschlag: {
                  datum: new Date(g.terminAm).toLocaleDateString('sv-SE', { timeZone: 'Europe/Zurich' }),
                  zeit: zeitVon(g.terminAm),
                  personId: g.terminPersonId,
                },
              }
            : {})}
          onSchliessen={onSchliessen}
        />
      )}
    </Suspense>
  )
}
