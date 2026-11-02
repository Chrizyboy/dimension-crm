import { useAkte } from '../hooks/useTeam'
import { AkteDialog } from './AkteDialog'
import type { PersonAktion } from './PersonAkte'
import { DokumentDialog } from './DokumentDialog'
import { GespraechDialog } from './GespraechDialog'
import { LohnDialog } from './LohnDialog'

/** Öffnet das passende Fenster zur Akte (Teil, Lohn, Gespräch, Dokument) mit den geladenen Daten. */
export function AkteAktion({
  personId,
  aktion,
  onSchliessen,
}: {
  personId: string
  aktion: Exclude<PersonAktion, { ausweis: unknown }>
  onSchliessen: () => void
}) {
  const daten = useAkte(personId).data
  if (!daten) return null
  if ('akte' in aktion) {
    return (
      <AkteDialog
        personId={personId}
        akte={daten.akte.id ? daten.akte : null}
        teil={aktion.akte}
        onSchliessen={onSchliessen}
      />
    )
  }
  if ('lohn' in aktion) return <LohnDialog personId={personId} lohn={aktion.lohn} onSchliessen={onSchliessen} />
  if ('gespraech' in aktion) {
    return (
      <GespraechDialog
        personId={personId}
        gespraech={aktion.gespraech}
        naechstes={daten.akte.naechstes_gespraech}
        onSchliessen={onSchliessen}
      />
    )
  }
  return (
    <DokumentDialog personId={personId} vertraulichErlaubt={daten.sicht === 'personal'} onSchliessen={onSchliessen} />
  )
}
