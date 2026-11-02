import type { TFunction } from 'i18next'
import { Inbox, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Datentabelle } from '@/components/shared/Datentabelle'
import { Filterchips } from '@/components/shared/Filterchips'
import { Suchfeld, Werkzeugleiste } from '@/components/shared/Werkzeugleiste'
import { BetragZelle, DatumZelle } from '@/components/shared/Zellen'
import { Leerzustand } from '@/components/shared/Zustaende'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useFinanzEinstellungen } from '@/hooks/useFinanzEinstellungen'
import { formatChf } from '@/lib/format'
import { spaltenHelfer, type Spalten } from '@/lib/tabelle'
import { useEingang } from '../hooks/useRechnungen'
import { EINGANG_FILTER, type EingangFilter, type Eingangsrechnung } from '../types'
import { EingangAkte } from './EingangAkte'
import { EingangDialog } from './EingangDialog'
import { eingangTon } from './status'

const spalte = spaltenHelfer<Eingangsrechnung>()

function eingangSpalten(t: TFunction): Spalten<Eingangsrechnung> {
  return spalte.columns([
    spalte.accessor('lieferant', {
      header: t('rechnungen.eingang.spalte.lieferant'),
      cell: (c) => (
        <span className="flex max-w-[20rem] min-w-0 flex-col">
          <span className="line-clamp-2 font-medium">{c.getValue()}</span>
          <span className="text-muted-foreground truncate text-xs">{c.row.original.nummer ?? '–'}</span>
        </span>
      ),
    }),
    spalte.accessor((e) => e.projekt_nummer ?? '', {
      id: 'projekt',
      header: t('rechnungen.eingang.spalte.projekt'),
      cell: (c) => {
        const e = c.row.original
        return (
          <span className="flex min-w-0 flex-col">
            <span>{e.projekt_nummer ?? '–'}</span>
            <span className="text-muted-foreground truncate text-xs">{e.kunde ?? ''}</span>
          </span>
        )
      },
      meta: { nurBreit: true },
    }),
    spalte.accessor((e) => e.bestellung_nummer ?? '', {
      id: 'bestellung',
      header: t('rechnungen.eingang.spalte.bestellung'),
      cell: (c) => c.getValue() || '–',
      meta: { nurBreit: true },
    }),
    spalte.accessor((e) => e.faellig_am ?? '', {
      id: 'faellig',
      header: t('rechnungen.eingang.spalte.faellig'),
      cell: (c) => (
        <DatumZelle wert={c.getValue()} className={c.row.original.ueberfaellig ? 'text-bad font-medium' : ''} />
      ),
      meta: { nurBreit: true },
    }),
    spalte.accessor('betrag_rappen', {
      header: t('rechnungen.eingang.spalte.betrag'),
      cell: (c) => <BetragZelle rappen={c.getValue()} />,
      meta: { zahl: true },
    }),
    spalte.accessor('status', {
      header: t('rechnungen.eingang.spalte.visum'),
      cell: (c) => {
        const e = c.row.original
        const wer = e.status === 'visum_pl' ? e.visum_pl_person : null
        return (
          <span className="flex flex-col gap-0.5">
            <Badge ton={eingangTon(e.status)} punkt>
              {t(`rechnungen.eingang.status.${e.status}`)}
            </Badge>
            {wer && <span className="text-muted-foreground text-xs">{t('rechnungen.eingang.wartetAuf', { wer })}</span>}
          </span>
        )
      },
    }),
  ])
}

/**
 * Eingangsrechnungen: Filter (meine Visa zuerst), Suche, Liste und Akte. «Rechnung erfassen» nur mit Recht
 * «finanzen»; Projektleitung und Geschäftsleitung sehen nur, was sie visieren.
 */
export function EingangListe({
  finanzen,
  aktiveId,
  onOeffnen,
}: {
  finanzen: boolean
  aktiveId: string | null
  onOeffnen: (id: string | null) => void
}) {
  const { t } = useTranslation()
  const [filter, setFilter] = useState<EingangFilter>('meine')
  const [suche, setSuche] = useState('')
  const [neu, setNeu] = useState(false)
  const liste = useEingang(filter)
  const einstellungen = useFinanzEinstellungen()
  const spalten = useMemo(() => eingangSpalten(t), [t])
  const daten = useMemo(() => {
    const s = suche.trim().toLowerCase()
    return (liste.data ?? []).filter(
      (e) =>
        !s || `${e.lieferant} ${e.nummer ?? ''} ${e.projekt_nummer ?? ''} ${e.kunde ?? ''}`.toLowerCase().includes(s),
    )
  }, [liste.data, suche])
  const summe = daten.reduce((s, e) => s + e.betrag_rappen, 0)

  return (
    <div className="flex flex-col gap-3">
      <p className="text-muted-foreground max-w-3xl text-sm">
        {t('rechnungen.eingang.text', {
          betrag: formatChf(einstellungen.eingang?.visum_gl_ab_rappen ?? 500000, { mitWaehrung: true }),
        })}
      </p>
      <Werkzeugleiste
        suche={
          <Suchfeld
            beschriftung={t('rechnungen.eingang.suche')}
            value={suche}
            onChange={(e) => {
              setSuche(e.target.value)
            }}
          />
        }
        rechts={
          finanzen ? (
            <Button
              onClick={() => {
                setNeu(true)
              }}
            >
              <Plus />
              {t('rechnungen.eingang.neu')}
            </Button>
          ) : null
        }
      >
        <Filterchips
          einzeln
          beschriftung={t('rechnungen.eingang.filter')}
          optionen={EINGANG_FILTER.filter((f) => finanzen || ['meine', 'offen', 'bereit', 'alle'].includes(f)).map(
            (f) => ({
              wert: f,
              text: t(`rechnungen.eingang.filterwert.${f}`),
            }),
          )}
          gewaehlt={[filter]}
          onChange={([f]) => {
            if (f) setFilter(f as EingangFilter)
          }}
        />
      </Werkzeugleiste>
      {summe > 0 && <p className="text-muted-foreground text-sm">{formatChf(summe, { mitWaehrung: true })}</p>}
      <Datentabelle
        daten={daten}
        spalten={spalten}
        laedt={liste.isPending}
        fehler={liste.error}
        kennung={(e) => e.id}
        aktiveId={aktiveId}
        onOeffnen={(e) => {
          onOeffnen(e.id)
        }}
        beschriftung={t('rechnungen.eingang.titel')}
        leer={<Leerzustand icon={Inbox} titel={t('rechnungen.eingang.leer')} text={t('rechnungen.eingang.leerText')} />}
      />
      {neu && (
        <EingangDialog
          onSchliessen={() => {
            setNeu(false)
          }}
          onGespeichert={(id) => {
            setNeu(false)
            onOeffnen(id)
          }}
        />
      )}
      {aktiveId && (
        <EingangAkte
          key={aktiveId}
          id={aktiveId}
          finanzen={finanzen}
          onSchliessen={() => {
            onOeffnen(null)
          }}
        />
      )}
    </div>
  )
}
