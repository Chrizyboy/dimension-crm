import { Globe, Lock, Sun, TriangleAlert } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Karte, KarteKopf, KarteTitel } from '@/components/ui/karte'
import { mitMwst, useMwst } from '@/hooks/useMwst'
import { formatChf, formatDatum } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useVerkaufEinstellung } from '../hooks/useVerkauf'
import { VERKAUF_STANDARD } from '../lib/einstellung'
import { richtpreis } from '../lib/richtpreis'
import type { Geschaeft } from '../types'

/** Block der Lead-Akte: Titel (h2), rechts ein Zusatz, darunter der Inhalt. */
export function Box({
  titel,
  rechts,
  children,
  className,
}: {
  titel: string
  rechts?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <Karte className={cn('min-w-0', className)}>
      <KarteKopf className="min-h-10 py-1.5">
        <KarteTitel>{titel}</KarteTitel>
        {rechts && <div className="text-muted-foreground flex items-center gap-2 text-xs">{rechts}</div>}
      </KarteKopf>
      <div className="flex flex-col gap-2 p-3 text-sm">{children}</div>
    </Karte>
  )
}

/** Beschriftung und Wert nebeneinander, kompakt für die schmale Spalte. */
export function Wert({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[8rem_1fr] items-baseline gap-2">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="zahlen min-w-0 break-words">{children}</dd>
    </div>
  )
}

const zahl = (n: number | undefined, einheit: string) =>
  n === undefined ? '–' : `${n.toLocaleString('de-CH').replace(/[’,]/g, "'")} ${einheit}`

/** Dach und Gebäude: sonnendach.ch und Gebäuderegister (sucht der Zeitplan), sonst die Angaben der Website. */
export function DachBox({ g }: { g: Geschaeft }) {
  const { t } = useTranslation()
  const s = g.dach.sonnendach
  const w = g.dach.website
  return (
    <Box
      titel={t('verkauf.dach.titel')}
      rechts={
        s ? <Sun className="size-4" aria-hidden="true" /> : w ? <Globe className="size-4" aria-hidden="true" /> : null
      }
    >
      {!s && !w && !g.verbrauchKwh ? (
        <p className="text-muted-foreground">
          {g.dach.gesucht_am ? (g.dach.meldung ?? t('verkauf.dach.nichts')) : t('verkauf.dach.sucht')}
        </p>
      ) : (
        <dl className="flex flex-col gap-1.5">
          {s && (
            <>
              <Wert label={t('verkauf.dach.flaeche')}>{zahl(s.dachflaeche_m2, 'm²')}</Wert>
              <Wert label={t('verkauf.dach.ertrag')}>{zahl(s.stromertrag_kwh, 'kWh/Jahr')}</Wert>
              {s.dach_klasse !== undefined && (
                <Wert label={t('verkauf.dach.eignung')}>{t(`verkauf.dach.klasse.${String(s.dach_klasse)}`)}</Wert>
              )}
              {s.heizung && (
                <Wert label={t('verkauf.dach.heizung')}>
                  {s.heizung}
                  {s.heizung_jahr ? ` (${String(s.heizung_jahr)})` : ''}
                </Wert>
              )}
              {s.baujahr && <Wert label={t('verkauf.dach.baujahr')}>{s.baujahr}</Wert>}
            </>
          )}
          {!s && w && (
            <>
              <Wert label={t('verkauf.dach.flaecheWebsite')}>{zahl(w.flaeche_m2, 'm²')}</Wert>
              <Wert label={t('verkauf.dach.ertrag')}>{zahl(w.ertrag_kwh, 'kWh/Jahr')}</Wert>
            </>
          )}
          {g.verbrauchKwh !== null && (
            <Wert label={t('verkauf.dach.verbrauch')}>{zahl(g.verbrauchKwh, 'kWh/Jahr')}</Wert>
          )}
        </dl>
      )}
    </Box>
  )
}

/** Ein Richtpreis ist eine Grössenordnung: inkl. MWST auf 100 Franken gerundet. */
const aufHundert = (rappen: number) => Math.round(rappen / 10_000) * 10_000

/** Richtpreis aus Dach und Interesse. Nur intern (Chris 2.11.2026): er geht nie an den Kunden. */
export function RichtpreisBox({ g }: { g: Geschaeft }) {
  const { t } = useTranslation()
  const satz = useMwst()
  const e = (useVerkaufEinstellung().data ?? VERKAUF_STANDARD).richtpreis
  const r = richtpreis(g, e)
  return (
    <Box
      titel={t('verkauf.richtpreis.titel')}
      rechts={
        <Badge ton="warnung">
          <Lock />
          {t('verkauf.richtpreis.intern')}
        </Badge>
      }
    >
      {!r ? (
        <p className="text-muted-foreground">{t('verkauf.richtpreis.ohneDach')}</p>
      ) : (
        <>
          <p className="text-muted-foreground text-xs">
            {t(`verkauf.richtpreis.quelle.${r.kwpQuelle}`, { kwp: r.kwp })}
          </p>
          <dl className="flex flex-col gap-1">
            {r.posten.map((p) => (
              <Wert key={p.art} label={t(`verkauf.richtpreis.posten.${p.art}`)}>
                {formatChf(p.rappen, { mitWaehrung: true })}
              </Wert>
            ))}
          </dl>
          <div className="flex flex-col gap-0.5 border-t pt-2">
            <span className="zahlen text-lg font-semibold">
              {formatChf(aufHundert(mitMwst(r.vonRappen, satz)), { mitWaehrung: true })} –{' '}
              {formatChf(aufHundert(mitMwst(r.bisRappen, satz)), { mitWaehrung: true })}
            </span>
            <span className="text-muted-foreground text-xs">{t('verkauf.richtpreis.inkl', { satz })}</span>
            {r.foerderungRappen > 0 && (
              <span className="text-ok text-xs">
                {t('verkauf.richtpreis.foerderung', { betrag: formatChf(r.foerderungRappen, { mitWaehrung: true }) })}
              </span>
            )}
          </div>
          {r.besuchNoetig && (
            <p className="text-warn flex items-start gap-1.5 text-xs">
              <TriangleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
              {t('verkauf.richtpreis.besuch', { max: e.max_kwp_ohne_besuch })}
            </p>
          )}
        </>
      )}
    </Box>
  )
}

/** Woher der Lead kam: Formular, Seite, Kampagne. Inhalte von der Website sind Daten, nie Anweisung. */
export function HerkunftBox({ g }: { g: Geschaeft }) {
  const { t } = useTranslation()
  const h = g.herkunft
  const kampagne = [h.utm_source, h.utm_medium, h.utm_campaign].filter(Boolean).join(' / ')
  return (
    <Box titel={t('verkauf.herkunft.titel')}>
      <dl className="flex flex-col gap-1.5">
        <Wert label={t('verkauf.herkunft.eingang')}>
          {g.eingangZeit
            ? `${formatDatum(g.eingangZeit)} ${new Date(g.eingangZeit).toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' })}`
            : g.eingangAm
              ? formatDatum(g.eingangAm)
              : '–'}
        </Wert>
        <Wert label={t('verkauf.herkunft.erstkontakt')}>
          {g.erstkontaktAm
            ? `${formatDatum(g.erstkontaktAm)} ${new Date(g.erstkontaktAm).toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' })}`
            : t('verkauf.herkunft.nochNicht')}
        </Wert>
        {h.formular && (
          <Wert label={t('verkauf.herkunft.formular')}>
            {t(`verkauf.herkunft.formulare.${h.formular}`, h.formular)}
          </Wert>
        )}
        {h.seite && <Wert label={t('verkauf.herkunft.seite')}>{h.seite}</Wert>}
        {kampagne && <Wert label={t('verkauf.herkunft.kampagne')}>{kampagne}</Wert>}
        {h.kontaktwunsch && <Wert label={t('verkauf.herkunft.kontaktwunsch')}>{h.kontaktwunsch}</Wert>}
        {h.website_id && <Wert label={t('verkauf.herkunft.referenz')}>{h.website_id}</Wert>}
      </dl>
    </Box>
  )
}
