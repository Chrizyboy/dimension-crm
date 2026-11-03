import { ExternalLink } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Auswahl } from '@/components/ui/auswahl'
import { Badge } from '@/components/ui/badge'
import { useAuswahl } from '@/hooks/useAuswahl'
import { formatDatum } from '@/lib/format'
import { tonVonFarbe } from '@/lib/kontakt'
import { useAktion } from '../hooks/useAktion'
import { useKundenAnlagen } from '../hooks/useService'
import { fallSpeichern } from '../services/service'
import type { Akte, ServiceFall } from '../types'
import { Box, Zeile } from './Box'

/**
 * Die Anlage zum Fall: Leistung, IBN, Projekt, Komponenten mit Seriennummer, Monitoring, Wartungsvertrag und
 * frühere Fälle von Anlage oder Kunde. Ohne Anlage: Auswahl aus den Anlagen des Kunden.
 */
export function AnlageBox({ f, akte }: { f: ServiceFall; akte: Akte | undefined }) {
  const { t } = useTranslation()
  const { aus } = useAktion()
  const art = useAuswahl('komponente')
  const stand = useAuswahl('servicestatus')
  const kundenAnlagen = useKundenAnlagen(f.anlage_id ? null : f.kontakt_id)
  const a = akte?.anlage ?? null
  return (
    <>
      <Box
        titel={t('service.akte.anlage')}
        rechts={a?.leistung_kwp ? <span className="zahlen font-mono">{String(a.leistung_kwp)} kWp</span> : null}
      >
        {a ? (
          <dl className="flex flex-col gap-1">
            <Zeile label={t('service.anlagen.ibn')}>{a.ibn_am ? formatDatum(a.ibn_am) : null}</Zeile>
            {akte?.projekt && (
              <Zeile label={t('service.akte.projekt')}>
                <a href={`#/projects?projekt=${akte.projekt.id}`} className="text-accent-ink underline">
                  {akte.projekt.nummer}
                </a>
              </Zeile>
            )}
            {a.komponenten.map((k, i) => (
              <Zeile key={`${k.art ?? ''}-${String(i)}`} label={art.text(k.art ?? 'pv')}>
                <span className="flex flex-col">
                  <span>
                    {[k.anzahl && k.anzahl > 1 ? `${String(k.anzahl)} ×` : null, k.hersteller, k.modell]
                      .filter(Boolean)
                      .join(' ') || '–'}
                  </span>
                  {k.seriennummer && (
                    <span className="text-muted-foreground zahlen font-mono text-xs">SN {k.seriennummer}</span>
                  )}
                </span>
              </Zeile>
            ))}
            {a.monitoring?.link && (
              <Zeile label={t('service.anlagen.monitoring')}>
                <a
                  href={a.monitoring.link}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="text-accent-ink inline-flex items-center gap-1 underline"
                >
                  {a.monitoring.hersteller ?? t('service.akte.oeffnen')}
                  <ExternalLink className="size-3.5" aria-hidden="true" />
                </a>
              </Zeile>
            )}
            {f.anlage_id && (
              <a href={`#/aftersales?anlage=${f.anlage_id}`} className="text-accent-ink mt-1 text-sm underline">
                {t('service.anlage.akteOeffnen')}
              </a>
            )}
            {a.notiz && <p className="bg-muted/60 rounded-md p-2 text-xs whitespace-pre-wrap">{a.notiz}</p>}
          </dl>
        ) : (kundenAnlagen.data ?? []).length > 0 ? (
          <Auswahl
            aria-label={t('service.feld.anlage')}
            platzhalter={t('service.akte.anlageWaehlen')}
            value=""
            onValueChange={(v) => {
              void aus(() => fallSpeichern({ anlage_id: v }, f.id))
            }}
            optionen={(kundenAnlagen.data ?? []).map((x) => ({
              wert: x.id,
              text: [x.adresse, x.leistung_kwp ? `${String(x.leistung_kwp)} kWp` : null, x.projekt]
                .filter(Boolean)
                .join(' · '),
            }))}
          />
        ) : (
          <p className="text-muted-foreground text-xs">{t('service.akte.keineAnlage')}</p>
        )}
        {akte?.vertrag && (
          <p className="bg-info-soft text-info rounded-md p-2 text-xs">
            {t('service.akte.vertrag', {
              nummer: akte.vertrag.nummer,
              naechste: akte.vertrag.naechste_wartung ? formatDatum(akte.vertrag.naechste_wartung) : '–',
            })}
          </p>
        )}
      </Box>
      {(akte?.fruehere.length ?? 0) > 0 && (
        <Box titel={t('service.akte.fruehere')} rechts={String(akte?.fruehere.length ?? 0)}>
          <ul className="flex flex-col gap-1.5">
            {akte?.fruehere.map((x) => (
              <li key={x.id} className="flex items-center justify-between gap-2">
                <a href={`#/aftersales?fall=${x.id}`} className="min-w-0 truncate underline-offset-2 hover:underline">
                  <span className="zahlen text-muted-foreground font-mono text-xs">{x.nummer}</span> {x.titel}
                </a>
                <Badge ton={tonVonFarbe(stand.finde(x.status)?.farbe)}>{formatDatum(x.erstellt_am)}</Badge>
              </li>
            ))}
          </ul>
        </Box>
      )}
    </>
  )
}
