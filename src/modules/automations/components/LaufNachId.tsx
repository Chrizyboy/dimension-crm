import { useAutomationen } from '../hooks/useAutomationen'
import { useLauf } from '../hooks/useAusbau'
import { LaufDetail } from './LaufDetail'

/** Öffnet einen Lauf, von dem nur die id bekannt ist (Übersicht, Geplant). */
export function LaufNachId({ laufId, onSchliessen }: { laufId: string; onSchliessen: () => void }) {
  const lauf = useLauf(laufId)
  const automationen = useAutomationen()
  if (!lauf.data) return null
  return (
    <LaufDetail
      lauf={lauf.data}
      automation={automationen.data?.find((a) => a.id === lauf.data?.automation_id)}
      onSchliessen={onSchliessen}
    />
  )
}
