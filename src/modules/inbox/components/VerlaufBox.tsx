import { useTranslation } from 'react-i18next'
import { AkteAbschnitt } from '@/components/shared/AkteAbschnitt'
import { formatDatumZeit } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useVerlauf } from '../hooks/useArbeit'
import { useText } from '../hooks/usePosteingang'
import type { Mail } from '../types'

/**
 * Die ganze Unterhaltung aus Outlook: Mails des Kunden und unsere Antworten untereinander, älteste zuerst, je nur der
 * neue Teil. Gibt es nur eine Mail (oder keine Verbindung), steht der ganze Text dieser Mail da.
 */
export function VerlaufBox({ m }: { m: Mail }) {
  const { t } = useTranslation()
  const verlauf = useVerlauf(m.id, Boolean(m.konversation_id))
  const mehrere = (verlauf.data?.length ?? 0) > 1
  const text = useText(m.id)
  return (
    <AkteAbschnitt
      titel={
        mehrere ? t('posteingang.akte.unterhaltung', { anzahl: verlauf.data?.length ?? 0 }) : t('posteingang.akte.mail')
      }
    >
      {mehrere ? (
        <ol className="flex flex-col gap-2">
          {(verlauf.data ?? []).map((v) => (
            <li
              key={v.id}
              className={cn(
                'rounded-lg border px-3 py-2',
                v.wir ? 'bg-info-soft ml-6 border-transparent' : 'bg-surface',
              )}
            >
              <p className="text-muted-foreground mb-1 flex flex-wrap justify-between gap-2 text-xs">
                <span className="text-foreground font-medium">
                  {v.von_name}
                  {v.wir ? ` (${t('posteingang.akte.wir')})` : ''}
                </span>
                <span className="zahlen">{formatDatumZeit(v.zeit)}</span>
              </p>
              <p className="text-sm break-words whitespace-pre-wrap">{v.text || '–'}</p>
            </li>
          ))}
        </ol>
      ) : text.isPending || (verlauf.isPending && Boolean(m.konversation_id)) ? (
        <p className="text-muted-foreground text-sm">{t('posteingang.akte.laedt')}</p>
      ) : (
        <>
          {text.isError && <p className="text-muted-foreground mb-2 text-xs">{t('posteingang.akte.nurVorschau')}</p>}
          <p className="text-sm break-words whitespace-pre-wrap">{text.data ?? m.vorschau ?? '–'}</p>
        </>
      )}
    </AkteAbschnitt>
  )
}
