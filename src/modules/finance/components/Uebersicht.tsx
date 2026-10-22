import { AlertTriangle, ChevronDown, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Filterchips } from '@/components/shared/Filterchips'
import { Button } from '@/components/ui/button'
import { formatChf, formatDatum } from '@/lib/format'
import { cn } from '@/lib/utils'
import { heuteZuerich, montag, plusTage } from '../lib/datum'
import { vorschau, zaehlt } from '../lib/vorschau'
import type { Finanzdaten, Reiter, Szenario } from '../types'
import { BewegungZeile, type BewegungAktion } from './BewegungZeile'
import type { Bewegung } from '../types'
import { Wochenbalken } from './Wochenbalken'

/**
 * Übersicht der Liquidität (V233 «Finanzen»): Kontostand, tiefster Stand, was diese Woche zu zahlen ist,
 * Warnungen (Betreibung, Minus, Material fällig, ungeprüft) und die Wochen mit allen Bewegungen.
 */
export function Uebersicht({
  daten,
  lohnZeigen,
  onAktion,
  onReiter,
}: {
  daten: Finanzdaten
  lohnZeigen: boolean
  onAktion: (b: Bewegung, a: BewegungAktion) => void
  onReiter: (r: Reiter) => void
}) {
  const { t } = useTranslation()
  const [szenario, setSzenario] = useState<Szenario>('real')
  const [offen, setOffen] = useState<number | null>(0)
  const heute = heuteZuerich()
  const v = vorschau(daten, heute, szenario)
  const wochenEnde = plusTage(montag(heute), 6)
  const reserve = daten.einstellungen.reserve_rappen ?? 0
  const ausDieseWoche = v.bewegungen
    .filter((b) => b.richtung < 0 && (!b.datum || b.datum <= wochenEnde))
    .reduce((s, b) => s + b.rappen, 0)
  const ein30 = v.bewegungen
    .filter((b) => b.richtung > 0 && b.datum && b.datum <= plusTage(heute, 30) && zaehlt(b, 'real'))
    .reduce((s, b) => s + b.rappen, 0)
  const fixMonat = daten.fixkosten
    .filter((f) => f.aktiv)
    .reduce((s, f) => s + (f.betrag_rappen ?? 0) / (f.rhythmus === 'quartal' ? 3 : f.rhythmus === 'jahr' ? 12 : 1), 0)

  const warnungen: { ton: 'bad' | 'warn'; text: string; reiter: Reiter }[] = []
  if (!v.saldo.bekannt) warnungen.push({ ton: 'bad', text: t('finanzen.warnung.saldo'), reiter: 'bank' })
  daten.zahlungen
    .filter((z) => z.status !== 'bezahlt' && (z.prioritaet === 'betreibung' || z.prioritaet === 'mahnung'))
    .sort((a, b) => (a.faellig_am ?? '9').localeCompare(b.faellig_am ?? '9'))
    .slice(0, 4)
    .forEach((z) => {
      warnungen.push({
        ton: z.prioritaet === 'betreibung' ? 'bad' : 'warn',
        text: t(`finanzen.warnung.${z.prioritaet === 'betreibung' ? 'betreibung' : 'mahnung'}`, {
          firma: z.firma ?? '',
          betrag: formatChf(z.offen_rappen ?? z.betrag_rappen ?? 0, { mitWaehrung: true }),
          datum: z.faellig_am ? formatDatum(z.faellig_am) : '–',
        }),
        reiter: 'zahlungen',
      })
    })
  const minus = v.wochen.find((w) => w.ende < 0)
  const unterReserve = reserve > 0 ? v.wochen.find((w) => w.ende < reserve) : undefined
  if (minus) {
    warnungen.push({
      ton: 'bad',
      text: t('finanzen.warnung.minus', { kw: minus.kw, betrag: formatChf(minus.ende, { mitWaehrung: true }) }),
      reiter: 'uebersicht',
    })
  } else if (unterReserve) {
    warnungen.push({
      ton: 'warn',
      text: t('finanzen.warnung.reserve', {
        kw: unterReserve.kw,
        reserve: formatChf(reserve, { mitWaehrung: true }),
        betrag: formatChf(unterReserve.ende, { mitWaehrung: true }),
      }),
      reiter: 'uebersicht',
    })
  }
  for (const m of daten.material) {
    if (m.archiviert || !m.zahlbar_bis || m.zahlbar_bis > plusTage(heute, 5)) continue
    if (!m.positionen.some((p) => p.status !== 'bezahlt')) continue
    warnungen.push({
      ton: 'warn',
      text: t('finanzen.warnung.material', { baustelle: m.baustelle ?? '', datum: formatDatum(m.zahlbar_bis) }),
      reiter: 'material',
    })
  }
  const ungeprueft =
    daten.zahlungen.filter((z) => z.quelle === 'excel' && !z.geprueft && z.status !== 'bezahlt').length +
    daten.eingaenge.filter((e) => e.quelle === 'excel' && !e.geprueft && e.status !== 'eingegangen').length
  if (ungeprueft)
    warnungen.push({ ton: 'warn', text: t('finanzen.warnung.ungeprueft', { count: ungeprueft }), reiter: 'zahlungen' })

  const kacheln = [
    {
      label: t('finanzen.kachel.kontostand'),
      wert: v.saldo.bekannt ? formatChf(v.saldo.rappen, { mitWaehrung: true }) : '–',
      klein: v.saldo.seit
        ? t('finanzen.kachel.eingetragen', { datum: formatDatum(v.saldo.seit), count: v.saldo.buchungen })
        : t('finanzen.kachel.fehlt'),
    },
    {
      label: t('finanzen.kachel.tiefster'),
      wert: v.tiefste ? formatChf(v.tiefste.ende, { mitWaehrung: true }) : '–',
      klein: v.tiefste ? t('finanzen.kw', { kw: v.tiefste.kw }) : '',
      schlecht: Boolean(v.tiefste && v.tiefste.ende < 0),
    },
    {
      label: t('finanzen.kachel.ausWoche'),
      wert: formatChf(ausDieseWoche, { mitWaehrung: true }),
      klein: t('finanzen.kachel.ausWocheText'),
    },
    {
      label: t('finanzen.kachel.ein30'),
      wert: formatChf(ein30, { mitWaehrung: true }),
      klein: t('finanzen.kachel.ein30Text'),
    },
    {
      label: t('finanzen.kachel.fix'),
      wert: lohnZeigen ? formatChf(Math.round(fixMonat), { mitWaehrung: true }) : '••••',
      klein: t('finanzen.kachel.fixText'),
    },
  ]

  return (
    <div className="flex flex-col gap-4">
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-5" aria-label={t('finanzen.kennzahlen')}>
        {kacheln.map((k) => (
          <div key={k.label} className="bg-surface flex flex-col gap-1 rounded-lg border p-3">
            <span className="text-muted-foreground text-xs">{k.label}</span>
            <span className={cn('zahlen text-lg font-semibold', k.schlecht && 'text-bad')}>{k.wert}</span>
            <span className="text-muted-foreground text-xs">{k.klein}</span>
          </div>
        ))}
      </section>
      {warnungen.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {warnungen.map((w) => (
            <li key={w.text}>
              <button
                type="button"
                onClick={() => {
                  onReiter(w.reiter)
                }}
                className={cn(
                  'flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm',
                  w.ton === 'bad' ? 'bg-bad-soft text-bad' : 'bg-warn-soft text-warn',
                )}
              >
                <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />
                {w.text}
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Filterchips
          einzeln
          beschriftung={t('finanzen.szenario.titel')}
          optionen={(['real', 'pess', 'opt'] as const).map((s) => ({ wert: s, text: t(`finanzen.szenario.${s}`) }))}
          gewaehlt={[szenario]}
          onChange={([s]) => {
            if (s) setSzenario(s as Szenario)
          }}
        />
        {v.ohneDatum > 0 && (
          <span className="text-muted-foreground text-xs">{t('finanzen.ohneDatumAnzahl', { count: v.ohneDatum })}</span>
        )}
      </div>
      <Wochenbalken wochen={v.wochen} reserve={reserve} />
      <ul className="bg-surface flex flex-col divide-y rounded-lg border">
        {v.wochen.map((w) => (
          <li key={w.i}>
            <Button
              variant="ghost"
              className="h-auto w-full justify-start gap-3 rounded-none px-3 py-2 text-left"
              aria-expanded={offen === w.i}
              onClick={() => {
                setOffen(offen === w.i ? null : w.i)
              }}
            >
              {offen === w.i ? <ChevronDown /> : <ChevronRight />}
              <span className="text-foreground w-36 font-medium">
                {t('finanzen.kw', { kw: w.kw })}
                <span className="text-muted-foreground ml-2 text-xs font-normal">{formatDatum(w.von).slice(0, 6)}</span>
              </span>
              <span className="zahlen text-ok hidden w-28 text-right sm:inline">+{formatChf(w.ein)}</span>
              <span className="zahlen text-foreground hidden w-28 text-right sm:inline">−{formatChf(w.aus)}</span>
              <span
                className={cn(
                  'zahlen ml-auto w-32 text-right font-semibold',
                  w.ende < 0 ? 'text-bad' : 'text-foreground',
                )}
              >
                {formatChf(w.ende, { mitWaehrung: true })}
              </span>
            </Button>
            {offen === w.i && (
              <ul className="divide-y px-4 pb-2">
                {w.bewegungen.length === 0 ? (
                  <li className="text-muted-foreground py-2 text-sm">{t('finanzen.keineBewegung')}</li>
                ) : (
                  [...w.bewegungen]
                    .sort((a, b) => a.richtung - b.richtung || (a.datum ?? '0').localeCompare(b.datum ?? '0'))
                    .map((b) => (
                      <BewegungZeile
                        key={`${b.quelle}-${b.id}-${String(b.idx ?? b.monat ?? '')}`}
                        b={b}
                        lohnZeigen={lohnZeigen}
                        onAktion={onAktion}
                      />
                    ))
                )}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
