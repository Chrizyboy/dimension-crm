import { Copy, Mailbox, Plus } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Fehlerzustand, Leerzustand } from '@/components/shared/Zustaende'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skelett } from '@/components/ui/diverses'
import { formatDatum, formatDatumZeit } from '@/lib/format'
import { useQuery } from '@tanstack/react-query'
import { useVersaende } from '../hooks/useKampagnen'
import { useNewsletter, useZielgruppe } from '../hooks/useMarketing'
import { ladeVersandErgebnisse } from '../services/kampagnen'
import { mitMail } from '../lib/zielgruppe'
import type { Newsletter } from '../types'
import { NewsletterEditor } from './NewsletterEditor'

/**
 * Newsletter (V179): Kennzahlen (wer darf ihn bekommen, wer ist abgemeldet), Liste mit Stand und «Als Vorlage
 * verwenden». Empfänger brauchen einen Versandgrund: Kunde oder Einwilligung mit Datum und Nachweis.
 */
export function NewsletterSeite() {
  const { t } = useTranslation()
  const liste = useNewsletter()
  const ziel = useZielgruppe()
  const [offen, setOffen] = useState<Newsletter | Partial<Newsletter> | null>(null)
  // Ergebnis je versendetem Newsletter (Öffnungen, Klicks, Abmeldungen, Leads in 30 Tagen; Chris 2.11.)
  const versaende = (useVersaende().data ?? []).filter((v) => v.newsletter_id)
  const ids = versaende.map((v) => v.id)
  const ergebnisse = useQuery({
    queryKey: ['marketing', 'versand-ergebnisse', ids],
    queryFn: () => ladeVersandErgebnisse(ids),
    enabled: ids.length > 0,
  })
  const ergebnis = (id: string) => {
    const v = versaende.filter((x) => x.newsletter_id === id).map((x) => x.id)
    const e = (ergebnisse.data ?? []).filter((x) => v.includes(x.versand_id))
    if (!e.length) return null
    const s = (f: 'gesendet' | 'geoeffnet' | 'geklickt' | 'abgemeldet' | 'leads') => e.reduce((a, x) => a + x[f], 0)
    const quote = (n: number) => (s('gesendet') ? `${String(Math.round((n / s('gesendet')) * 100))}%` : '–')
    return t('werbung.newsletter.ergebnis', {
      geoeffnet: quote(s('geoeffnet')),
      geklickt: quote(s('geklickt')),
      abgemeldet: s('abgemeldet'),
      leads: s('leads'),
    })
  }
  if (liste.error) return <Fehlerzustand details={String(liste.error)} onNochmal={() => void liste.refetch()} />
  const z = ziel.data ?? []
  // Gezählt werden Mail-Adressen, nicht Kontakte: Paare und Firmen teilen oft eine Adresse und bekommen ihn einmal.
  const adressen = (f: (k: (typeof z)[number]) => boolean) =>
    new Set(z.filter((k) => mitMail(k) && !k.werbesperre && f(k)).map((k) => (k.email ?? '').trim().toLowerCase())).size
  const zahlen = [
    { text: t('marketing.newsletter.zahl.empfaenger'), wert: adressen((k) => Boolean(k.versandgrund)) },
    { text: t('marketing.newsletter.zahl.kunden'), wert: adressen((k) => k.versandgrund === 'kunde') },
    { text: t('marketing.newsletter.zahl.einwilligung'), wert: adressen((k) => k.versandgrund === 'einwilligung') },
    { text: t('marketing.newsletter.zahl.abgemeldet'), wert: z.filter((k) => k.werbesperre).length },
  ]
  return (
    <div className="flex flex-col gap-4">
      <ul className="grid grid-cols-2 gap-2 md:grid-cols-4" aria-label={t('marketing.newsletter.zahlen')}>
        {zahlen.map((x) => (
          <li key={x.text} className="bg-surface flex flex-col rounded-lg border px-3 py-2">
            <span className="text-muted-foreground text-xs">{x.text}</span>
            <span className="zahlen text-lg font-semibold">{ziel.data ? x.wert : '–'}</span>
          </li>
        ))}
      </ul>
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-display text-base font-semibold">{t('marketing.newsletter.liste')}</h2>
        <Button
          onClick={() => {
            setOffen({})
          }}
        >
          <Plus />
          {t('marketing.newsletter.neu')}
        </Button>
      </div>
      {!liste.data ? (
        <Skelett className="h-40" />
      ) : liste.data.length === 0 ? (
        <Leerzustand icon={Mailbox} titel={t('marketing.newsletter.leer')} text={t('marketing.newsletter.leerText')} />
      ) : (
        <ul className="bg-surface divide-y rounded-lg border">
          {liste.data.map((n) => (
            <li key={n.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
              <button
                type="button"
                className="hover:text-primary flex flex-col text-left"
                onClick={() => {
                  setOffen(n)
                }}
              >
                <span className="font-medium">{n.thema}</span>
                <span className="text-muted-foreground zahlen text-xs">
                  {n.status === 'versendet'
                    ? t('marketing.newsletter.versendetAm', {
                        wann: formatDatumZeit(n.versendet_am),
                        anzahl: n.anzahl ?? 0,
                        wer: n.versendet_von ?? '',
                      })
                    : n.geplant_am
                      ? t('werbung.newsletter.geplant', { wann: formatDatum(n.geplant_am) })
                      : t('marketing.newsletter.entwurfVom', { wann: formatDatumZeit(n.erstellt_am) })}
                </span>
                {n.status === 'versendet' && ergebnis(n.id) && (
                  <span className="zahlen text-xs font-medium">{ergebnis(n.id)}</span>
                )}
              </button>
              <div className="flex items-center gap-2">
                <Badge ton={n.status === 'versendet' ? 'ok' : 'neutral'}>
                  {t(`marketing.newsletter.status.${n.status}`)}
                </Badge>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setOffen({
                      thema: `${n.thema} (${t('marketing.newsletter.kopie')})`,
                      segment: n.segment,
                      betreff_de: n.betreff_de,
                      betreff_fr: n.betreff_fr,
                      text_de: n.text_de,
                      text_fr: n.text_fr,
                    })
                  }}
                >
                  <Copy />
                  {t('marketing.newsletter.alsVorlage')}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {offen && (
        <NewsletterEditor
          newsletter={offen}
          onSchliessen={() => {
            setOffen(null)
          }}
        />
      )}
    </div>
  )
}
