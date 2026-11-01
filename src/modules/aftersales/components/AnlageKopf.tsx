import { ExternalLink } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { AkteAbschnitt, Angabe } from '@/components/shared/AkteAbschnitt'
import { Badge } from '@/components/ui/badge'
import { formatDatum } from '@/lib/format'
import { useAnlage } from '../hooks/useService'
import { garantieAm } from '../lib/garantie'

/**
 * Kopf «Anlage» in der Akte eines Service-Falls: Leistung, IBN, Garantie und Komponenten mit Seriennummer,
 * damit beim Anruf alles auf einen Blick da ist, ohne in die Anlagen-Liste zu wechseln.
 */
export function AnlageKopf({ anlageId }: { anlageId: string | null }) {
  const { t } = useTranslation()
  const anlage = useAnlage(anlageId)
  const a = anlage.data
  if (!anlageId || !a) return null
  const heute = new Date().toISOString().slice(0, 10)
  const garantie = garantieAm(a, heute)
  return (
    <AkteAbschnitt
      titel={t('service.akte.anlage')}
      zusatz={a.leistung_kwp ? `${String(a.leistung_kwp)} kWp` : undefined}
    >
      <dl data-testid="anlage-kopf">
        <Angabe label={t('service.anlage.adresse')}>{a.adresse || '–'}</Angabe>
        <Angabe label={t('service.anlage.ibn')}>{a.ibn_am ? formatDatum(a.ibn_am) : '–'}</Angabe>
        <Angabe label={t('service.anlage.garantie')}>
          {a.garantie_bis ? formatDatum(a.garantie_bis) : '–'}{' '}
          {garantie ? <Badge ton="ok">{t('service.anlage.inGarantie')}</Badge> : null}
        </Angabe>
        {a.monitoring?.link && (
          <Angabe label={t('service.anlage.monitoring')}>
            <a
              href={a.monitoring.link}
              target="_blank"
              rel="noreferrer"
              className="text-accent-ink inline-flex items-center gap-1 underline"
            >
              {a.monitoring.hersteller || t('service.anlage.oeffnen')}
              <ExternalLink className="size-3.5" aria-hidden="true" />
            </a>
          </Angabe>
        )}
      </dl>
      {a.komponenten.length > 0 && (
        <ul className="mt-2 flex flex-col gap-1 text-sm">
          {a.komponenten.map((k, i) => (
            <li key={`${k.art}-${String(i)}`} className="flex flex-wrap items-center gap-x-2">
              <span className="font-medium">
                {k.anzahl ? `${String(k.anzahl)} × ` : ''}
                {[k.hersteller, k.modell].filter(Boolean).join(' ') || k.art}
              </span>
              {k.seriennummer && (
                <span className="text-muted-foreground zahlen font-mono text-xs">{k.seriennummer}</span>
              )}
              {k.garantie_bis && (
                <Badge ton={k.garantie_bis >= heute ? 'ok' : 'neutral'}>
                  {t('service.anlage.garantieBis', { datum: formatDatum(k.garantie_bis) })}
                </Badge>
              )}
            </li>
          ))}
        </ul>
      )}
    </AkteAbschnitt>
  )
}
