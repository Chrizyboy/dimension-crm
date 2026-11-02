import { CheckCheck, Inbox } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { AkteAbschnitt } from '@/components/shared/AkteAbschnitt'
import { Fehlerzustand, Leerzustand } from '@/components/shared/Zustaende'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skelett } from '@/components/ui/diverses'
import { formatChf, formatDatum } from '@/lib/format'
import { useAktion } from '../hooks/useAktion'
import { useHeute } from '../hooks/useRechnungen'
import { mahnungenFreigeben } from '../services/heute'

/** Eine Zeile: Text links, Betrag und Knopf rechts; die ganze Zeile öffnet die Rechnung. */
function Eintrag({
  titel,
  unten,
  betrag,
  onOeffnen,
}: {
  titel: string
  unten: string
  betrag: number | null
  onOeffnen?: () => void
}) {
  return (
    <li className="flex items-center gap-3 px-3 py-2">
      <button
        type="button"
        disabled={!onOeffnen}
        onClick={onOeffnen}
        className="focus-visible:ring-ring flex min-w-0 flex-1 flex-col rounded text-left outline-none focus-visible:ring-2"
      >
        <span className="line-clamp-1 text-sm font-medium">{titel}</span>
        <span className="text-muted-foreground line-clamp-1 text-xs">{unten}</span>
      </button>
      {betrag !== null && <span className="zahlen text-sm">{formatChf(betrag, { mitWaehrung: true })}</span>}
    </li>
  )
}

/**
 * «Heute prüfen» (Modul-Prüfung 25A): alles, was das CRM für die Buchhaltung vorbereitet hat, in einer Liste.
 * Entwürfe (nach IBN, Montage, Rapport, Wartung) zum Stellen, Mahnungen im Ausgangskorb zum Freigeben mit einem
 * Klick für alle, Zahlungen der letzten 14 Tagen aus dem Abgleich zur Kontrolle.
 */
export function HeutePruefen({ onRechnung }: { onRechnung: (id: string) => void }) {
  const { t } = useTranslation()
  const heute = useHeute()
  const { laeuft, aus } = useAktion()

  if (heute.error) return <Fehlerzustand details={String(heute.error)} onNochmal={() => void heute.refetch()} />
  if (!heute.data) return <Skelett className="h-64" />
  const { entwuerfe, mahnungen, zahlungen } = heute.data
  if (entwuerfe.length + mahnungen.length + zahlungen.length === 0)
    return <Leerzustand icon={CheckCheck} titel={t('rechnungen.heute.leer')} text={t('rechnungen.heute.leerText')} />

  return (
    <div className="flex flex-col">
      <div className="flex flex-wrap gap-1.5 pb-2">
        <Badge ton={entwuerfe.length ? 'warnung' : 'ok'}>
          {t('rechnungen.heute.zahlEntwuerfe', { count: entwuerfe.length })}
        </Badge>
        <Badge ton={mahnungen.length ? 'warnung' : 'ok'}>
          {t('rechnungen.heute.zahlMahnungen', { count: mahnungen.length })}
        </Badge>
        <Badge ton="info">{t('rechnungen.heute.zahlZahlungen', { count: zahlungen.length })}</Badge>
      </div>
      <AkteAbschnitt ebene={2} titel={t('rechnungen.heute.entwuerfe')} zusatz={String(entwuerfe.length)}>
        {entwuerfe.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t('rechnungen.heute.keineEntwuerfe')}</p>
        ) : (
          <ul className="bg-surface divide-y rounded-xl border">
            {entwuerfe.map((e) => (
              <Eintrag
                key={e.id}
                titel={e.titel ?? t(`rechnungen.art.${e.art}`)}
                unten={[e.kunde, e.projekt_nummer, t('rechnungen.heute.seit', { datum: formatDatum(e.erstellt_am) })]
                  .filter(Boolean)
                  .join(' · ')}
                betrag={e.total_rappen}
                onOeffnen={() => {
                  onRechnung(e.id)
                }}
              />
            ))}
          </ul>
        )}
      </AkteAbschnitt>
      <AkteAbschnitt ebene={2} titel={t('rechnungen.heute.mahnungen')} zusatz={String(mahnungen.length)}>
        {mahnungen.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t('rechnungen.heute.keineMahnungen')}</p>
        ) : (
          <>
            <Button
              size="sm"
              className="mb-2 self-start"
              laedt={laeuft}
              onClick={() =>
                void aus(
                  async () => {
                    await mahnungenFreigeben(mahnungen.map((m) => m.id))
                  },
                  { de: 'Mahnungen freigegeben', fr: 'Relances validées' },
                )
              }
            >
              <Inbox />
              {t('rechnungen.heute.alleFreigeben', { count: mahnungen.length })}
            </Button>
            <ul className="bg-surface divide-y rounded-xl border">
              {mahnungen.map((m) => (
                <Eintrag
                  key={m.id}
                  titel={m.betreff}
                  unten={[m.kunde, m.an, m.status === 'fehler' ? t('rechnungen.heute.fehler') : null]
                    .filter(Boolean)
                    .join(' · ')}
                  betrag={m.offen_rappen}
                  {...(m.rechnung_id
                    ? {
                        onOeffnen: () => {
                          onRechnung(m.rechnung_id ?? '')
                        },
                      }
                    : {})}
                />
              ))}
            </ul>
          </>
        )}
      </AkteAbschnitt>
      <AkteAbschnitt ebene={2} titel={t('rechnungen.heute.zahlungen')} zusatz={String(zahlungen.length)}>
        {zahlungen.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t('rechnungen.heute.keineZahlungen')}</p>
        ) : (
          <ul className="bg-surface divide-y rounded-xl border">
            {zahlungen.map((z) => (
              <Eintrag
                key={z.id}
                titel={[z.nummer, z.kunde].filter(Boolean).join(' · ')}
                unten={[
                  formatDatum(z.datum),
                  z.quelle === 'abaninja' ? 'AbaNinja' : z.quelle,
                  z.status ? t(`rechnungen.status.${z.status}`) : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
                betrag={z.betrag_rappen}
                onOeffnen={() => {
                  onRechnung(z.rechnung_id)
                }}
              />
            ))}
          </ul>
        )}
      </AkteAbschnitt>
    </div>
  )
}
