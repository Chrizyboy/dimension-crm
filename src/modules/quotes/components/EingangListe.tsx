import { Inbox } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Datentabelle } from '@/components/shared/Datentabelle'
import { Filterchips } from '@/components/shared/Filterchips'
import { Leerzustand } from '@/components/shared/Zustaende'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/schalter'
import { formatDatum, unterzeile } from '@/lib/format'
import { meldeFehler } from '@/services/fehler'
import { fachFehlerSchluessel, zweisprachig } from '@/services/fachfehler'
import { melde } from '@/services/meldungen'
import { spaltenHelfer } from '@/lib/tabelle'
import { useOffertAenderung } from '../hooks/useOfferten'
import { STATUS_TON } from '../lib/status'
import { setzeEingangStatus } from '../services/offerten'
import { EINGANG_STATUS, type Eingang, type EingangStatus } from '../types'
import { DatumZelle, EinzeilerZelle, NameZelle, NummerZelle, StatusZelle } from '@/components/shared/Zellen'

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
      cell: (c) => <NummerZelle>{c.getValue() || '–'}</NummerZelle>,
      // Am Handy steht die Nummer unter dem Namen.
      meta: { breite: 'w-20', nurBreit: true },
    }),
    spalte.accessor('name', {
      header: t('offerten.spalte.name'),
      cell: (c) => {
        const e = c.row.original
        return (
          <NameZelle
            name={c.getValue()}
            unterNurHandy
            unter={unterzeile(
              e.offerteNummer ?? e.leadNummer,
              [e.plz, e.ort].filter(Boolean).join(' '),
              e.richtofferte ? t('offerten.eingang.richtofferte') : e.terminAm ? formatDatum(e.terminAm) : null,
            )}
          />
        )
      },
    }),
    spalte.accessor('plz', {
      header: t('offerten.spalte.plz'),
      cell: (c) => <NummerZelle>{c.getValue() ?? '–'}</NummerZelle>,
      meta: { nurBreit: true, breite: 'w-16' },
    }),
    spalte.accessor('ort', {
      header: t('offerten.spalte.ort'),
      cell: (c) => <EinzeilerZelle>{c.getValue() ?? '–'}</EinzeilerZelle>,
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
          <span className="text-muted-foreground whitespace-nowrap">
            {t('offerten.eingang.richtofferte')}
            {e.zurOfferteAm ? ` · ${formatDatum(e.zurOfferteAm)}` : ''}
          </span>
        ) : (
          <DatumZelle wert={e.terminAm} />
        )
      },
      meta: { nurBreit: true },
    }),
    spalte.accessor('status', {
      header: t('offerten.spalte.status'),
      cell: (c) => {
        const e = c.row.original
        return (
          <StatusZelle zusatz={e.von && e.status !== 'neu' ? <span className="max-md:hidden">{e.von}</span> : null}>
            <Badge ton={STATUS_TON[e.status]} punkt>
              {t(`offerten.status.${e.status}`)}
            </Badge>
          </StatusZelle>
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
