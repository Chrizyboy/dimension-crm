import { Paperclip } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { AkteAbschnitt } from '@/components/shared/AkteAbschnitt'
import { formatDatumZeit } from '@/lib/format'
import { useBestellMails } from '../hooks/useEinkauf'

/** Mails im Posteingang zu dieser Bestellung (Bestellnummer im Betreff oder vom Lieferanten). */
export function MailsAbschnitt({ id }: { id: string }) {
  const { t } = useTranslation()
  const mails = useBestellMails(id)
  const liste = mails.data ?? []
  return (
    <AkteAbschnitt titel={t('einkauf.mails.titel')} zusatz={String(liste.length)} offen={false}>
      {liste.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t('einkauf.mails.keine')}</p>
      ) : (
        <ul className="flex flex-col divide-y text-sm">
          {liste.map((m) => (
            <li key={m.id} className="py-1.5">
              <a href={`#/inbox?mail=${m.id}`} className="text-accent-ink flex items-center gap-1.5 underline">
                {m.hat_anhang && <Paperclip className="size-3.5" aria-label={t('einkauf.mails.anhang')} />}
                <span className="truncate">{m.betreff ?? '–'}</span>
              </a>
              <span className="text-muted-foreground block text-xs">
                {[formatDatumZeit(m.eingang_am), m.von_name ?? m.von_email].filter(Boolean).join(' · ')}
              </span>
              {m.vorschau && <span className="text-muted-foreground line-clamp-2 text-xs">{m.vorschau}</span>}
            </li>
          ))}
        </ul>
      )}
    </AkteAbschnitt>
  )
}
