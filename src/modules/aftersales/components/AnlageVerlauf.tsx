import { FileText, ShieldCheck } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { useAuswahl } from '@/hooks/useAuswahl'
import { formatDatum } from '@/lib/format'
import { dokumentAdresse } from '@/services/dokumente'
import { meldeFehler } from '@/services/fehler'
import type { AnlageAkte } from '../types'
import { Box } from './Box'

/** Was an der Anlage passiert ist: Service-Fälle (neueste zuerst), Rapporte von Service, Wartung und IBN, Dokumente. */
export function AnlageVerlauf({ akte }: { akte: AnlageAkte }) {
  const { t } = useTranslation()
  const stand = useAuswahl('servicestatus')
  const art = useAuswahl('rapportart')
  const oeffnen = (d: AnlageAkte['dokumente'][number]) => {
    void dokumentAdresse(d)
      .then((url) => {
        if (url) window.open(url, '_blank', 'noopener')
      })
      .catch((e: unknown) => {
        meldeFehler(e, 'service')
      })
  }
  return (
    <>
      <Box titel={t('service.anlage.faelle')} rechts={<span className="zahlen">{akte.faelle.length}</span>}>
        {akte.faelle.length === 0 ? (
          <p className="text-muted-foreground text-xs">{t('service.anlage.keineFaelle')}</p>
        ) : (
          <ul className="flex flex-col divide-y">
            {akte.faelle.map((f) => (
              <li key={f.id} className="flex items-center justify-between gap-2 py-1.5">
                <a href={`#/aftersales?fall=${f.id}`} className="flex min-w-0 items-baseline gap-2 hover:underline">
                  <span className="zahlen text-muted-foreground font-mono text-xs">{f.nummer}</span>
                  <span className="truncate">{f.titel}</span>
                </a>
                <span className="flex shrink-0 items-center gap-1.5">
                  {f.garantie && <ShieldCheck className="text-ok size-4" aria-label={t('service.feld.garantieFall')} />}
                  <span className="text-muted-foreground zahlen text-xs">{formatDatum(f.erstellt_am)}</span>
                  <Badge ton={f.status === 'erledigt' ? 'ok' : 'warnung'}>{stand.text(f.status)}</Badge>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Box>
      <Box titel={t('service.anlage.rapporte')} rechts={<span className="zahlen">{akte.rapporte.length}</span>}>
        {akte.rapporte.length === 0 ? (
          <p className="text-muted-foreground text-xs">{t('service.anlage.keineRapporte')}</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {akte.rapporte.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-2">
                <a href={`#/fieldwork?rapport=${r.id}`} className="min-w-0 truncate hover:underline">
                  {art.text(r.art)} {r.nummer ?? ''}
                </a>
                <span className="text-muted-foreground zahlen text-xs">{formatDatum(r.datum)}</span>
              </li>
            ))}
          </ul>
        )}
      </Box>
      <Box titel={t('service.anlage.dokumente')} rechts={<span className="zahlen">{akte.dokumente.length}</span>}>
        {akte.dokumente.length === 0 ? (
          <p className="text-muted-foreground text-xs">{t('service.anlage.keineDokumente')}</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {akte.dokumente.map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => {
                    oeffnen(d)
                  }}
                  className="flex min-w-0 items-center gap-1.5 text-left hover:underline"
                >
                  <FileText className="text-muted-foreground size-4 shrink-0" aria-hidden="true" />
                  <span className="truncate">{d.name}</span>
                </button>
                <span className="text-muted-foreground zahlen text-xs">
                  {d.hochgeladen_am ? formatDatum(d.hochgeladen_am) : ''}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Box>
    </>
  )
}
