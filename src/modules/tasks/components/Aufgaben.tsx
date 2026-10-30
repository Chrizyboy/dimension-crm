import { useNavigate } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { Plus, SquareCheck, Workflow } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Datentabelle } from '@/components/shared/Datentabelle'
import { Filterchips } from '@/components/shared/Filterchips'
import { Seitenkopf } from '@/components/shared/Seitenkopf'
import { Leerzustand } from '@/components/shared/Zustaende'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/schalter'
import { formatDatum } from '@/lib/format'
import { spaltenHelfer } from '@/lib/tabelle'
import { zielVon } from '@/lib/ziel'
import { meldeFehler } from '@/services/fehler'
import { supabase } from '@/services/supabase'
import { useAnmeldung } from '@/stores/anmeldung'
import { useAufgaben, usePersonen } from '../hooks/useAufgaben'
import { dringlichkeit } from '../lib/faelligkeit'
import { setzeErledigt } from '../services/aufgaben'
import type { Aufgabe, AufgabenFilter } from '../types'
import { NeueAufgabe } from './NeueAufgabe'

const spalte = spaltenHelfer<Aufgabe>()
const TON = { ueberfaellig: 'kritisch', heute: 'warnung', bald: 'info', spaeter: 'neutral', ohne: 'neutral' } as const

/**
 * Aufgaben (Phase 12): was wer bis wann erledigt. Viele entstehen aus Automationen («Erstkontakt innert 24 h»);
 * ein Klick öffnet den Lead, die Offerte oder das Projekt dazu.
 */
export default function Aufgaben({ wer = 'meine' }: { wer?: AufgabenFilter['wer'] }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const client = useQueryClient()
  const ichId = useAnmeldung((z) => z.ich?.id ?? null)
  const [filter, setFilter] = useState<AufgabenFilter>({ wer, stand: 'offen' })
  const [neu, setNeu] = useState(false)
  const aufgaben = useAufgaben(filter)
  const personen = usePersonen()
  const name = (id: string | null) => personen.data?.find((p) => p.id === id)?.name ?? '–'

  if (!supabase) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <Leerzustand icon={SquareCheck} titel={t('aufgaben.titel')} text={t('projekte.ohneDatenbank')} />
      </div>
    )
  }

  async function haken(a: Aufgabe, erledigt: boolean) {
    try {
      await setzeErledigt(a.id, erledigt, ichId)
    } catch (f) {
      meldeFehler(f, 'aufgaben')
    }
    void client.invalidateQueries({ queryKey: ['aufgaben'] })
  }

  const spalten = spalte.columns([
    spalte.display({
      id: 'haken',
      header: () => <span className="sr-only">{t('aufgaben.erledigt')}</span>,
      cell: (c) => (
        <span
          onClick={(e) => {
            e.stopPropagation()
          }}
          onKeyDown={(e) => {
            e.stopPropagation()
          }}
        >
          <Checkbox
            checked={c.row.original.erledigt_am !== null}
            aria-label={t('aufgaben.erledigtSetzen', { titel: c.row.original.titel })}
            onCheckedChange={(an) => void haken(c.row.original, an === true)}
          />
        </span>
      ),
      meta: { breite: 'w-10' },
    }),
    spalte.accessor('titel', {
      header: t('aufgaben.spalte.aufgabe'),
      cell: (c) => (
        <span className="flex min-w-0 flex-col">
          <span
            className={
              // Umbrechen statt abschneiden: am Handy würde eine lange Zeile die Spalte «Fällig» aus dem Bild schieben.
              c.row.original.erledigt_am
                ? 'text-muted-foreground line-clamp-2 line-through'
                : 'line-clamp-2 font-medium'
            }
          >
            {c.getValue()}
          </span>
          {c.row.original.text && (
            <span className="text-muted-foreground line-clamp-3 text-xs">{c.row.original.text}</span>
          )}
        </span>
      ),
    }),
    spalte.accessor((a) => a.faellig_am ?? '9999', {
      id: 'faellig',
      header: t('aufgaben.spalte.faellig'),
      cell: (c) => {
        const a = c.row.original
        if (!a.faellig_am) return null
        const d = a.erledigt_am ? 'ohne' : dringlichkeit(a.faellig_am)
        return <Badge ton={TON[d]}>{d === 'heute' ? t('aufgaben.heute') : formatDatum(a.faellig_am)}</Badge>
      },
      meta: { breite: 'w-28' },
    }),
    spalte.accessor((a) => name(a.person_id), {
      id: 'wer',
      header: t('aufgaben.spalte.wer'),
      meta: { breite: 'w-40', nurBreit: true },
    }),
    spalte.accessor((a) => a.bezug_tabelle ?? '', {
      id: 'bezug',
      header: t('aufgaben.spalte.bezug'),
      cell: (c) => (
        <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
          {c.row.original.lauf_id && <Workflow className="size-3.5" aria-label={t('aufgaben.ausAutomation')} />}
          {c.getValue() ? t(`aufgaben.bezug.${c.getValue()}`, { defaultValue: c.getValue() }) : ''}
        </span>
      ),
      meta: { breite: 'w-36', nurBreit: true },
    }),
  ])

  return (
    <div className="mx-auto flex w-full max-w-[96rem] flex-col gap-4 px-4 py-6 sm:px-6">
      <Seitenkopf
        titel={t('aufgaben.titel')}
        beschreibung={t('aufgaben.beschreibung')}
        aktionen={
          <Button
            onClick={() => {
              setNeu(true)
            }}
          >
            <Plus />
            {t('aufgaben.neu')}
          </Button>
        }
      />
      <div className="flex flex-wrap gap-3">
        <Filterchips
          einzeln
          beschriftung={t('aufgaben.spalte.wer')}
          gewaehlt={[filter.wer]}
          optionen={(['meine', 'vergeben', 'alle'] as const).map((w) => ({ wert: w, text: t(`aufgaben.filter.${w}`) }))}
          onChange={([w]) => {
            setFilter({ ...filter, wer: w === 'alle' || w === 'vergeben' ? w : 'meine' })
          }}
        />
        <Filterchips
          einzeln
          beschriftung={t('aufgaben.erledigt')}
          gewaehlt={[filter.stand]}
          optionen={(['offen', 'erledigt'] as const).map((s) => ({ wert: s, text: t(`aufgaben.filter.${s}`) }))}
          onChange={([s]) => {
            setFilter({ ...filter, stand: s === 'erledigt' ? 'erledigt' : 'offen' })
          }}
        />
      </div>
      <Datentabelle
        daten={aufgaben.data ?? []}
        spalten={spalten}
        kennung={(a) => a.id}
        laedt={aufgaben.isLoading}
        fehler={aufgaben.error}
        onNochmal={() => void aufgaben.refetch()}
        beschriftung={t('aufgaben.titel')}
        onOeffnen={(a) => {
          const ziel = zielVon(a.bezug_tabelle, a.bezug_id)
          if (ziel) void navigate({ href: ziel })
        }}
        leer={<Leerzustand icon={SquareCheck} titel={t('aufgaben.leerTitel')} text={t('aufgaben.leerText')} />}
      />
      {neu && (
        <NeueAufgabe
          personen={personen.data ?? []}
          ichId={ichId}
          onSchliessen={() => {
            setNeu(false)
          }}
        />
      )}
    </div>
  )
}
