import { Inbox } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Datentabelle } from '@/components/shared/Datentabelle'
import { Filterchips } from '@/components/shared/Filterchips'
import { Leerzustand } from '@/components/shared/Zustaende'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/schalter'
import { formatDatum } from '@/lib/format'
import { meldeFehler } from '@/services/fehler'
import { fachFehlerSchluessel, zweisprachig } from '@/services/fachfehler'
import { melde } from '@/services/meldungen'
import { spaltenHelfer } from '@/lib/tabelle'
import { useOffertAenderung } from '../hooks/useOfferten'
import { STATUS_TON } from '../lib/status'
import { setzeEingangStatus } from '../services/offerten'
import { EINGANG_STATUS, type Eingang, type EingangStatus } from '../types'

const spalte = spaltenHelfer<Eingang>()

/** Sortierwert: Vor-Ort-Termin, sonst Tag der Übergabe an den Innendienst. Ältestes zuerst (V84). */
function sortwert(e: Eingang): string {
  return e.terminAm ?? e.zurOfferteAm ?? ''
}

/**
 * «Neue Offerten» für den Innendienst (V72, V76, V84): Status-Chips mit Zahl, ältester Termin zuoberst,
 * Mehrfachauswahl zum gemeinsamen Status setzen. Ein Klick öffnet den Eintrag mit allen Hinweisen.
 */
export default function EingangListe({
  eintraege,
  aktiveId,
  onOeffnen,
}: {
  eintraege: Eingang[]
  aktiveId: string | null
  onOeffnen: (id: string) => void
}) {
  const { t } = useTranslation()
  const [status, setStatus] = useState<string[]>([])
  const [auswahl, setAuswahl] = useState<Set<string>>(new Set())
  const setzen = useOffertAenderung((a: { ids: string[]; status: EingangStatus }) =>
    Promise.all(a.ids.map((id) => setzeEingangStatus(id, a.status, { uebernehmen: true }))),
  )

  const sichtbar = useMemo(
    () =>
      eintraege
        .filter((e) => status.length === 0 || status.includes(e.status))
        .sort((a, b) => sortwert(a).localeCompare(sortwert(b))),
    [eintraege, status],
  )

  const spalten = spalte.columns([
    spalte.display({
      id: 'wahl',
      header: () => <span className="sr-only">{t('offerten.eingang.waehlen')}</span>,
      cell: (c) => (
        <span
          onClick={(e) => {
            e.stopPropagation()
          }}
        >
          <Checkbox
            aria-label={t('offerten.eingang.waehlenName', { name: c.row.original.name })}
            checked={auswahl.has(c.row.original.id)}
            onCheckedChange={(an) => {
              const neu = new Set(auswahl)
              if (an === true) neu.add(c.row.original.id)
              else neu.delete(c.row.original.id)
              setAuswahl(neu)
            }}
          />
        </span>
      ),
      meta: { breite: 'w-8' },
    }),
    spalte.accessor((e) => e.offerteNummer ?? e.leadNummer ?? '', {
      id: 'nr',
      header: t('offerten.spalte.nr'),
      cell: (c) => <span className="zahlen font-mono text-[13px]">{c.getValue() || '–'}</span>,
      // Am Handy steht die Nummer unter dem Namen.
      meta: { breite: 'w-20', nurBreit: true },
    }),
    spalte.accessor('name', {
      header: t('offerten.spalte.name'),
      cell: (c) => (
        <span className="flex min-w-0 flex-col">
          <span className="line-clamp-2 font-medium">{c.getValue()}</span>
          <span className="text-muted-foreground line-clamp-2 text-xs md:hidden">
            {[
              c.row.original.offerteNummer ?? c.row.original.leadNummer,
              [c.row.original.plz, c.row.original.ort].filter(Boolean).join(' '),
            ]
              .filter(Boolean)
              .join(' · ')}
          </span>
        </span>
      ),
    }),
    spalte.accessor('plz', {
      header: t('offerten.spalte.plz'),
      cell: (c) => <span className="zahlen font-mono text-[13px]">{c.getValue() ?? '–'}</span>,
      meta: { nurBreit: true, breite: 'w-16' },
    }),
    spalte.accessor('ort', {
      header: t('offerten.spalte.ort'),
      cell: (c) => c.getValue() ?? '–',
      meta: { nurBreit: true },
    }),
    spalte.accessor('sprache', {
      header: t('offerten.spalte.sprache'),
      cell: (c) => c.getValue().toUpperCase(),
      meta: { nurBreit: true, breite: 'w-16' },
    }),
    spalte.accessor(sortwert, {
      id: 'termin',
      header: t('offerten.spalte.termin'),
      cell: (c) => {
        const e = c.row.original
        return e.richtofferte ? (
          <span className="text-muted-foreground">
            {t('offerten.eingang.richtofferte')}
            {e.zurOfferteAm ? ` · ${formatDatum(e.zurOfferteAm)}` : ''}
          </span>
        ) : (
          <span className="zahlen font-mono text-[13px]">{e.terminAm ? formatDatum(e.terminAm) : '–'}</span>
        )
      },
    }),
    spalte.accessor('status', {
      header: t('offerten.spalte.status'),
      cell: (c) => {
        const e = c.row.original
        return (
          <span className="flex flex-col items-start gap-0.5">
            <Badge ton={STATUS_TON[e.status]} punkt>
              {t(`offerten.status.${e.status}`)}
            </Badge>
            {e.von && e.status !== 'neu' && <span className="text-muted-foreground text-xs">{e.von}</span>}
          </span>
        )
      },
    }),
  ])

  async function sammel(neu: EingangStatus) {
    try {
      await setzen.mutateAsync({ ids: [...auswahl], status: neu })
      melde('ok', zweisprachig('offerten.eingang.gesetzt', { count: auswahl.size }))
      setAuswahl(new Set())
    } catch (f) {
      const s = fachFehlerSchluessel(f)
      if (!s) meldeFehler(f, 'offerten.eingang')
      melde('kritisch', zweisprachig(s ?? 'fachfehler.allgemein'))
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <Filterchips
        beschriftung={t('offerten.spalte.status')}
        gewaehlt={status}
        onChange={setStatus}
        optionen={EINGANG_STATUS.filter((s) => s !== 'offeriert').map((s) => ({
          wert: s,
          text: t(`offerten.status.${s}`),
          anzahl: eintraege.filter((e) => e.status === s).length,
        }))}
      />
      {auswahl.size > 0 && (
        <div
          className="bg-muted flex flex-wrap items-center gap-2 rounded-lg p-2 text-sm"
          role="region"
          aria-label={t('offerten.eingang.sammel')}
        >
          <span className="px-1 font-medium">{t('offerten.eingang.gewaehlt', { count: auswahl.size })}</span>
          {(['bearbeitung', 'pruefung', 'neu'] as const).map((s) => (
            <Button key={s} size="sm" variant="secondary" laedt={setzen.isPending} onClick={() => void sammel(s)}>
              {t(`offerten.status.${s}`)}
            </Button>
          ))}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setAuswahl(new Set())
            }}
          >
            {t('allgemein.abbrechen')}
          </Button>
        </div>
      )}
      <Datentabelle
        daten={sichtbar}
        spalten={spalten}
        kennung={(e) => e.id}
        aktiveId={aktiveId}
        onOeffnen={(e) => {
          onOeffnen(e.id)
        }}
        beschriftung={t('offerten.ansicht.eingang')}
        leer={<Leerzustand icon={Inbox} titel={t('offerten.eingang.leer')} text={t('offerten.eingang.leerText')} />}
      />
    </div>
  )
}
