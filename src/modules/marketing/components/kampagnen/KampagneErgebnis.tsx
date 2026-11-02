import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { useAuswahl } from '@/hooks/useAuswahl'
import { formatChf, formatDatum } from '@/lib/format'
import { useAnmeldung } from '@/stores/anmeldung'
import { useKampagnenLeads, useKampagnenZahlen, useVersaende } from '../../hooks/useKampagnen'
import { kostenSichtbar } from '../../lib/rechte'
import { ladeKostenDerKampagne, ladeVersandErgebnisse } from '../../services/kampagnen'
import type { Werbekampagne } from '../../types'

const Abschnitt = ({ titel, children }: { titel: string; children: React.ReactNode }) => (
  <section className="flex flex-col gap-2">
    <h3 className="text-sm font-semibold">{titel}</h3>
    {children}
  </section>
)

/**
 * Ergebnis einer Kampagne: Trichter (erreicht → geöffnet → geklickt → Leads → Offerten → Aufträge), jeder Versand
 * mit Öffnungen und Klicks, die Leads (Klick öffnet den Lead) und mit Recht die Rechnungen aus AbaNinja.
 */
export function KampagneErgebnis({ kampagne }: { kampagne: Werbekampagne }) {
  const { t } = useTranslation()
  const ich = useAnmeldung((z) => z.ich)
  const stufe = useAuswahl('verkaufsstufe')
  const z = useKampagnenZahlen().data?.find((x) => x.kampagne_id === kampagne.id)
  const leads = (useKampagnenLeads().data ?? []).filter((l) => l.kampagne_id === kampagne.id)
  const versaende = (useVersaende().data ?? []).filter((v) => v.kampagne_id === kampagne.id)
  const ids = versaende.map((v) => v.id)
  const ergebnisse = useQuery({
    queryKey: ['marketing', 'versand-ergebnisse', ids],
    queryFn: () => ladeVersandErgebnisse(ids),
    enabled: ids.length > 0,
  })
  const kosten = useQuery({
    queryKey: ['marketing', 'kosten-kampagne', kampagne.id],
    queryFn: () => ladeKostenDerKampagne(kampagne.id),
    enabled: kostenSichtbar(ich),
  })

  const stufen = [
    ['erreicht', z?.erreicht],
    ['geoeffnet', z?.geoeffnet],
    ['geklickt', z?.geklickt],
    ['leads', z?.leads],
    ['offerten', z?.offerten],
    ['auftraege', z?.auftraege],
  ] as const
  const proLead = z?.kosten_rappen && z.leads ? Math.round(z.kosten_rappen / z.leads) : null

  return (
    <div className="flex flex-col gap-5">
      <ol className="grid grid-cols-3 gap-2 sm:grid-cols-6" aria-label={t('werbung.ergebnis.trichter')}>
        {stufen.map(([s, n]) => (
          <li key={s} className="bg-surface flex flex-col rounded-lg border px-3 py-2">
            <span className="text-muted-foreground text-xs">{t(`werbung.ergebnis.${s}`)}</span>
            <span className="zahlen text-lg font-semibold">{n ?? '–'}</span>
          </li>
        ))}
      </ol>
      <p className="text-muted-foreground zahlen text-sm">
        {kampagne.ziel_leads ? t('werbung.ergebnis.ziel', { ist: z?.leads ?? 0, ziel: kampagne.ziel_leads }) : null}{' '}
        {z?.auftragswert_rappen ? t('werbung.ergebnis.wert', { wert: formatChf(z.auftragswert_rappen, { mitWaehrung: true }) }) : null}{' '}
        {z?.kosten_rappen !== null && z?.kosten_rappen !== undefined
          ? t('werbung.ergebnis.kosten', {
              kosten: formatChf(z.kosten_rappen, { mitWaehrung: true }),
              budget: kampagne.budget_rappen ? formatChf(kampagne.budget_rappen, { mitWaehrung: true }) : '–',
              proLead: proLead ? formatChf(proLead, { mitWaehrung: true }) : '–',
            })
          : null}
      </p>

      {versaende.length > 0 && (
        <Abschnitt titel={t('werbung.ergebnis.versaende')}>
          <ul className="divide-y rounded-lg border text-sm">
            {versaende.map((v) => {
              const e = ergebnisse.data?.find((x) => x.versand_id === v.id)
              return (
                <li key={v.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                  <span className="min-w-0">
                    <span className="font-medium">{v.betreff ?? t(`marketing.letzte.art.${v.art}`)}</span>{' '}
                    <span className="text-muted-foreground zahlen text-xs">
                      {v.versendet_am ? formatDatum(v.versendet_am) : ''}
                    </span>
                  </span>
                  <span className="text-muted-foreground zahlen text-xs">
                    {e
                      ? t('werbung.ergebnis.versand', {
                          gesendet: e.gesendet,
                          geoeffnet: e.geoeffnet,
                          geklickt: e.geklickt,
                          leads: e.leads,
                          abgemeldet: e.abgemeldet,
                        })
                      : t('werbung.ergebnis.anzahl', { anzahl: v.anzahl ?? 0 })}
                  </span>
                </li>
              )
            })}
          </ul>
        </Abschnitt>
      )}

      <Abschnitt titel={t('werbung.ergebnis.leadsTitel', { anzahl: leads.length })}>
        {leads.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t('werbung.ergebnis.keineLeads')}</p>
        ) : (
          <ul className="divide-y rounded-lg border text-sm">
            {leads.slice(0, 50).map((l) => (
              <li key={l.id}>
                <a
                  href={`#/sales?lead=${l.id}`}
                  className="hover:bg-muted flex flex-wrap items-center justify-between gap-2 px-3 py-2"
                >
                  <span>
                    <span className="font-medium">{l.name}</span>{' '}
                    <span className="text-muted-foreground text-xs">{l.ort ?? ''}</span>
                  </span>
                  <span className="flex items-center gap-2">
                    <Badge ton="neutral">{stufe.text(l.stufe)}</Badge>
                    <span className="text-muted-foreground zahlen text-xs">
                      {l.eingang_am ? formatDatum(l.eingang_am) : ''}
                    </span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </Abschnitt>

      {kostenSichtbar(ich) && (
        <Abschnitt titel={t('werbung.ergebnis.rechnungen')}>
          {(kosten.data ?? []).length === 0 ? (
            <p className="text-muted-foreground text-sm">{t('werbung.ergebnis.keineRechnungen')}</p>
          ) : (
            <ul className="divide-y rounded-lg border text-sm">
              {kosten.data?.map((b) => (
                <li key={b.id} className="flex items-center justify-between gap-2 px-3 py-2">
                  <span className="min-w-0 truncate">
                    {b.firma} {b.text ? `· ${b.text}` : ''}
                  </span>
                  <span className="zahlen shrink-0">{formatChf(b.betrag_rappen ?? 0, { mitWaehrung: true })}</span>
                </li>
              ))}
            </ul>
          )}
        </Abschnitt>
      )}
    </div>
  )
}
