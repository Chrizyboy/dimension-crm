import { useTranslation } from 'react-i18next'
import { formatDatumZeit } from '@/lib/format'
import { useAenderungen } from '../hooks/useAusbau'

/** Wer hat die Automation wann geändert (aus dem Änderungsprotokoll), damit niemand rätselt, wer sie ausschaltete. */
export function AenderungenListe({ id }: { id: string }) {
  const { t } = useTranslation()
  const abfrage = useAenderungen(id)
  const liste = abfrage.data ?? []
  if (!liste.length) return <p className="text-muted-foreground text-xs">{t('automationen.aenderungen.keine')}</p>
  return (
    <ul className="flex flex-col gap-1 text-xs">
      {liste.slice(0, 12).map((a, i) => (
        <li key={i} className="flex flex-wrap gap-x-2">
          <span className="zahlen text-muted-foreground">{formatDatumZeit(a.zeitpunkt)}</span>
          <span className="font-medium">{a.person}</span>
          <span className="text-muted-foreground">
            {a.felder.length
              ? a.felder.map((f) => t(`automationen.aenderungen.feld.${f}`, { defaultValue: f })).join(', ')
              : t(`automationen.aenderungen.aktion.${a.aktion}`, { defaultValue: a.aktion })}
          </span>
        </li>
      ))}
    </ul>
  )
}
