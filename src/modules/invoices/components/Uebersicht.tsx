import { ChevronRight, CircleCheck } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { AkteAbschnitt } from '@/components/shared/AkteAbschnitt'
import { Fehlerzustand } from '@/components/shared/Zustaende'
import { Badge } from '@/components/ui/badge'
import { Skelett } from '@/components/ui/diverses'
import { formatChf } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useUebersicht } from '../hooks/useRechnungen'
import type { RechnungFilter, Reiter, Uebersicht as Daten } from '../types'

/** Wohin ein Klick in der Übersicht führt. */
export interface Ziel {
  reiter: Reiter
  filter?: RechnungFilter
  rechnung?: string
}

const ALTER = ['nicht_faellig', 'bis_30', 'bis_60', 'bis_90', 'ueber_90'] as const
const chf = (r: number) => formatChf(r, { mitWaehrung: true })

/**
 * Übersicht der Buchhaltung: Kopfzahlen, «Heute zu tun» (jede Zeile führt in die passende Liste), Altersstruktur
 * der offenen Rechnungen, offen nach Standort und die grössten Überfälligen. Alles aus rechnungen_uebersicht.
 */
export function Uebersicht({
  onZiel,
  eingangBereit,
  eingangVisum,
}: {
  onZiel: (z: Ziel) => void
  eingangBereit: number
  eingangVisum: number
}) {
  const { t } = useTranslation()
  const daten = useUebersicht()
  if (daten.error) return <Fehlerzustand details={String(daten.error)} onNochmal={() => void daten.refetch()} />
  const u = daten.data
  if (!u) return <Skelett className="h-96" />

  const kacheln: { zahl: string; text: string; ton?: 'warn' | 'bad' | 'ok'; ziel: Ziel }[] = [
    {
      zahl: chf(u.offen_rappen),
      text: t('rechnungen.uebersicht.offen', { n: u.offen_anzahl }),
      ziel: { reiter: 'rechnungen', filter: 'offen' },
    },
    {
      zahl: chf(u.ueberfaellig_rappen),
      text: t('rechnungen.uebersicht.ueberfaellig', { n: u.ueberfaellig_anzahl }),
      ...(u.ueberfaellig_anzahl ? { ton: 'bad' as const } : {}),
      ziel: { reiter: 'rechnungen', filter: 'ueberfaellig' },
    },
    {
      zahl: chf(u.erwartet_30_rappen),
      text: t('rechnungen.uebersicht.erwartet'),
      ton: 'ok',
      ziel: { reiter: 'rechnungen', filter: 'offen' },
    },
    {
      zahl: chf(u.gestellt_monat_rappen),
      text: t('rechnungen.uebersicht.gestelltMonat'),
      ziel: { reiter: 'rechnungen', filter: 'alle' },
    },
    {
      zahl: chf(u.zu_verrechnen_rappen),
      text: t('rechnungen.uebersicht.zuVerrechnen', { n: u.zu_verrechnen }),
      ...(u.zu_verrechnen ? { ton: 'warn' as const } : {}),
      ziel: { reiter: 'verrechnen' },
    },
    {
      zahl: u.tage_bis_zahlung == null ? '–' : t('rechnungen.uebersicht.tageWert', { n: u.tage_bis_zahlung }),
      text: t('rechnungen.uebersicht.tage'),
      ziel: { reiter: 'rechnungen', filter: 'bezahlt' },
    },
  ]

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
        {kacheln.map((k) => (
          <button
            key={k.text}
            type="button"
            onClick={() => {
              onZiel(k.ziel)
            }}
            className="bg-surface hover:border-border-strong focus-visible:ring-ring flex flex-col gap-0.5 rounded-lg border px-3 py-2.5 text-left outline-none focus-visible:ring-2"
          >
            <span
              className={cn(
                'font-display zahlen text-lg font-semibold',
                k.ton === 'warn' && 'text-warn',
                k.ton === 'bad' && 'text-bad',
                k.ton === 'ok' && 'text-ok',
              )}
            >
              {k.zahl}
            </span>
            <span className="text-muted-foreground text-xs">{k.text}</span>
          </button>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-[3fr_2fr]">
        <Aufgaben u={u} onZiel={onZiel} eingangBereit={eingangBereit} eingangVisum={eingangVisum} />
        <div className="flex flex-col">
          <Altersstruktur u={u} />
          <AkteAbschnitt ebene={2} titel={t('rechnungen.uebersicht.firmen')}>
            <ul className="flex flex-col divide-y text-sm">
              {u.firmen.map((f) => (
                <li key={f.name} className="flex justify-between gap-2 py-1.5">
                  <span>
                    {f.name} <span className="text-muted-foreground text-xs">· {f.anzahl}</span>
                  </span>
                  <span className="zahlen">{chf(f.offen_rappen)}</span>
                </li>
              ))}
            </ul>
          </AkteAbschnitt>
        </div>
      </div>
      <AkteAbschnitt ebene={2} titel={t('rechnungen.uebersicht.groesste')}>
        {u.groesste.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t('rechnungen.uebersicht.keineUeberfaelligen')}</p>
        ) : (
          <ul className="flex flex-col divide-y text-sm">
            {u.groesste.map((g) => (
              <li key={g.id}>
                <button
                  type="button"
                  className="hover:bg-muted flex w-full items-center justify-between gap-2 rounded-md px-1 py-1.5 text-left"
                  onClick={() => {
                    onZiel({ reiter: 'rechnungen', filter: 'ueberfaellig', rechnung: g.id })
                  }}
                >
                  <span className="min-w-0">
                    <span className="zahlen font-mono text-xs">{g.nummer}</span> · {g.kunde}
                  </span>
                  <span className="flex shrink-0 items-center gap-1.5">
                    {g.mahnstufe > 0 && (
                      <Badge ton="kritisch">{t('rechnungen.mahnstufeKurz', { stufe: g.mahnstufe })}</Badge>
                    )}
                    <span className="text-bad text-xs">{t('rechnungen.uebersicht.tageUeber', { n: g.tage })}</span>
                    <span className="zahlen">{chf(g.rest_rappen)}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </AkteAbschnitt>
    </div>
  )
}

/** «Heute zu tun»: nur, was wirklich wartet; leer = alles erledigt. */
function Aufgaben({
  u,
  onZiel,
  eingangBereit,
  eingangVisum,
}: {
  u: Daten
  onZiel: (z: Ziel) => void
  eingangBereit: number
  eingangVisum: number
}) {
  const { t } = useTranslation()
  const a = 'rechnungen.uebersicht.aufgabe'
  const alle: { n: number; titel: string; text: string; ziel: Ziel; ton: 'kritisch' | 'warnung' | 'info' }[] = [
    {
      n: u.mahnlauf,
      titel: t(`${a}.mahnlauf`, { n: u.mahnlauf }),
      text: t(`${a}.mahnlaufText`, { betrag: chf(u.mahnlauf_rappen) }),
      ziel: { reiter: 'mahnlauf' },
      ton: 'kritisch',
    },
    {
      n: u.entwuerfe,
      titel: t(`${a}.entwuerfe`, { n: u.entwuerfe }),
      text: t(`${a}.entwuerfeText`, { betrag: chf(u.entwuerfe_rappen), ausgeloest: u.ausgeloest }),
      ziel: { reiter: 'rechnungen', filter: 'entwuerfe' },
      ton: 'warnung',
    },
    {
      n: u.zu_verrechnen,
      titel: t(`${a}.verrechnen`, { n: u.zu_verrechnen }),
      text: t(`${a}.verrechnenText`, { betrag: chf(u.zu_verrechnen_rappen) }),
      ziel: { reiter: 'verrechnen' },
      ton: 'info',
    },
    {
      n: eingangBereit,
      titel: t(`${a}.eingang`, { n: eingangBereit }),
      text: t(`${a}.eingangText`),
      ziel: { reiter: 'eingang' },
      ton: 'warnung',
    },
    {
      n: eingangVisum,
      titel: t(`${a}.visum`, { n: eingangVisum }),
      text: t(`${a}.visumText`),
      ziel: { reiter: 'eingang' },
      ton: 'info',
    },
    {
      n: u.nicht_versendet,
      titel: t(`${a}.nichtVersendet`, { n: u.nicht_versendet }),
      text: t(`${a}.nichtVersendetText`),
      ziel: { reiter: 'rechnungen', filter: 'nichtVersendet' },
      ton: 'warnung',
    },
    {
      n: u.zusage_abgelaufen,
      titel: t(`${a}.zusage`, { n: u.zusage_abgelaufen }),
      text: t(`${a}.zusageText`),
      ziel: { reiter: 'rechnungen', filter: 'ueberfaellig' },
      ton: 'info',
    },
    {
      n: u.kleiner_rest,
      titel: t(`${a}.kleinerRest`, { n: u.kleiner_rest }),
      text: t(`${a}.kleinerRestText`),
      ziel: { reiter: 'rechnungen', filter: 'offen' },
      ton: 'info',
    },
  ]
  const zeilen = alle.filter((z) => z.n > 0)

  return (
    <AkteAbschnitt
      ebene={2}
      titel={t('rechnungen.uebersicht.heute')}
      zusatz={zeilen.length ? String(zeilen.length) : null}
    >
      {zeilen.length === 0 ? (
        <p className="text-muted-foreground flex items-center gap-2 text-sm">
          <CircleCheck className="text-ok size-4" aria-hidden="true" />
          {t('rechnungen.uebersicht.nichtsZuTun')}
        </p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {zeilen.map((z) => (
            <li key={z.titel}>
              <button
                type="button"
                onClick={() => {
                  onZiel(z.ziel)
                }}
                className="bg-surface hover:border-border-strong focus-visible:ring-ring flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left outline-none focus-visible:ring-2"
              >
                <Badge ton={z.ton} punkt>
                  {z.n}
                </Badge>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="text-sm font-medium">{z.titel}</span>
                  <span className="text-muted-foreground text-xs">{z.text}</span>
                </span>
                <ChevronRight className="text-muted-foreground size-4 shrink-0" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </AkteAbschnitt>
  )
}

/** Balken je Altersklasse; je älter, desto kräftiger die Warnfarbe. */
function Altersstruktur({ u }: { u: Daten }) {
  const { t } = useTranslation()
  const max = Math.max(1, ...ALTER.map((k) => u.alter[k]))
  const farbe: Record<(typeof ALTER)[number], string> = {
    nicht_faellig: 'bg-reihe-1',
    bis_30: 'bg-warn/60',
    bis_60: 'bg-warn',
    bis_90: 'bg-bad/70',
    ueber_90: 'bg-bad',
  }
  return (
    <AkteAbschnitt ebene={2} titel={t('rechnungen.uebersicht.alter')}>
      <dl className="flex flex-col gap-1.5 text-sm">
        {ALTER.map((k) => (
          <div key={k} className="grid grid-cols-[6.5rem_1fr_auto] items-center gap-2">
            <dt className="text-muted-foreground text-xs">{t(`rechnungen.uebersicht.alterWert.${k}`)}</dt>
            <div className="bg-muted h-2.5 overflow-hidden rounded-full" aria-hidden="true">
              <div
                className={cn('h-full rounded-full', farbe[k])}
                style={{ width: `${String((u.alter[k] / max) * 100)}%` }}
              />
            </div>
            <dd className="zahlen text-right text-xs">{chf(u.alter[k])}</dd>
          </div>
        ))}
      </dl>
    </AkteAbschnitt>
  )
}
