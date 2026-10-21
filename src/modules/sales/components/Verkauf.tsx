import { FileSpreadsheet, MessageSquareText, Plus, Users } from 'lucide-react'
import { Suspense, lazy, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Seitenkopf } from '@/components/shared/Seitenkopf'
import { Fehlerzustand, Leerzustand } from '@/components/shared/Zustaende'
import { Button } from '@/components/ui/button'
import { Kbd, Skelett } from '@/components/ui/diverses'
import { useTaste } from '@/hooks/useTaste'
import { cn } from '@/lib/utils'
import { supabase } from '@/services/supabase'
import { useGeschaefte } from '../hooks/useVerkauf'
import { passtZuFilter } from '../lib/geschaeft'
import { LEERER_FILTER, VERKAUF_ANSICHTEN, type VerkaufAnsicht, type VerkaufFilter } from '../types'
import { FilterLeiste } from './FilterLeiste'

const Pipeline = lazy(() => import('./Pipeline'))
const LeadListe = lazy(() => import('./LeadListe'))
const Tagesroute = lazy(() => import('./Tagesroute'))
const Tour = lazy(() => import('./Tour'))
const Wochenkalender = lazy(() => import('./Wochenkalender'))
const Regionen = lazy(() => import('./Regionen'))
const Monatsbericht = lazy(() => import('./Monatsbericht'))
const LeadAkte = lazy(() => import('./LeadAkte'))
const LeadDialog = lazy(() => import('./LeadDialog'))
const ExcelImport = lazy(() => import('./ExcelImport'))
const SmsListe = lazy(() => import('./SmsListe'))

export interface VerkaufProps {
  ansicht: VerkaufAnsicht
  /** Offenes Geschäft aus der Adresse (?lead=…). */
  leadId: string | null
  neu: boolean
  onAdresse: (a: { ansicht?: VerkaufAnsicht; lead?: string | null; neu?: boolean }) => void
}

/** Ansichten mit der gemeinsamen Filterleiste; Route, Tour und Kalender haben ihre eigene Auswahl. */
const MIT_FILTER = new Set<VerkaufAnsicht>(['pipeline', 'liste', 'regionen'])

/**
 * «Anfragen & Leads» (V233 Leads, Pipeline, Tagesroute, Tour planen, Kalender, Regionen, Monatsbericht).
 * Alle Ansichten arbeiten mit denselben Geschäften; ein Klick öffnet überall die Lead-Akte.
 */
export default function Verkauf({ ansicht, leadId, neu, onAdresse }: VerkaufProps) {
  const { t } = useTranslation()
  const geschaefte = useGeschaefte()
  const [filter, setFilter] = useState<VerkaufFilter>(LEERER_FILTER)
  const [dialog, setDialog] = useState<'excel' | 'sms' | null>(null)
  const verzoegert = useDeferredValue(filter)
  const oeffne = (id: string | null) => {
    onAdresse({ lead: id })
  }

  useTaste('n', () => {
    onAdresse({ neu: true })
  })
  // Die Tasten 1 bis 7 wechseln die Ansicht, wie die Reiter von links nach rechts.
  const wechsle = useRef(onAdresse)
  useEffect(() => {
    wechsle.current = onAdresse
  })
  useEffect(() => {
    const beiTaste = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || !/^[1-7]$/.test(e.key)) return
      const ziel = e.target
      if (ziel instanceof HTMLElement && (ziel.isContentEditable || /INPUT|TEXTAREA|SELECT/.test(ziel.tagName))) return
      if (document.querySelector('[role="dialog"]')) return
      const a = VERKAUF_ANSICHTEN[Number(e.key) - 1]
      if (a) wechsle.current({ ansicht: a })
    }
    window.addEventListener('keydown', beiTaste)
    return () => {
      window.removeEventListener('keydown', beiTaste)
    }
  }, [])

  const gefiltert = useMemo(
    () => (geschaefte.data ?? []).filter((g) => passtZuFilter(g, verzoegert)),
    [geschaefte.data, verzoegert],
  )

  if (!supabase) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <Leerzustand icon={Users} titel={t('verkauf.vorschau')} text={t('verkauf.vorschauText')} />
      </div>
    )
  }

  const daten = geschaefte.data ?? []
  return (
    <div className="mx-auto flex w-full max-w-[96rem] flex-col gap-4 px-4 py-6 sm:px-6">
      <Seitenkopf
        titel={t('verkauf.titel')}
        beschreibung={t('verkauf.beschreibung')}
        aktionen={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setDialog('sms')
              }}
            >
              <MessageSquareText />
              {t('verkauf.sms.knopf')}
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setDialog('excel')
              }}
            >
              <FileSpreadsheet />
              {t('verkauf.excel.knopf')}
            </Button>
            <Button
              onClick={() => {
                onAdresse({ neu: true })
              }}
            >
              <Plus />
              {t('verkauf.neu')}
              <Kbd className="bg-primary-foreground/15 text-primary-foreground ml-1 border-0">N</Kbd>
            </Button>
          </>
        }
      />

      <nav aria-label={t('verkauf.ansichten')} className="-mx-1 flex gap-1 overflow-x-auto border-b px-1">
        {VERKAUF_ANSICHTEN.map((a, i) => (
          <button
            key={a}
            type="button"
            aria-current={a === ansicht ? 'page' : undefined}
            title={String(i + 1)}
            onClick={() => {
              onAdresse({ ansicht: a })
            }}
            className={cn(
              'text-muted-foreground hover:text-foreground focus-visible:ring-ring -mb-px h-9 shrink-0 border-b-2 border-transparent px-3 text-sm outline-none focus-visible:ring-2',
              a === ansicht && 'border-accent text-foreground font-medium',
            )}
          >
            {t(`verkauf.ansicht.${a}`)}
          </button>
        ))}
      </nav>

      {MIT_FILTER.has(ansicht) && (
        <FilterLeiste
          filter={filter}
          onChange={setFilter}
          {...(geschaefte.isSuccess ? { anzahl: t('verkauf.anzahl', { count: gefiltert.length }) } : {})}
        />
      )}

      {geschaefte.isError ? (
        <Fehlerzustand details={String(geschaefte.error)} onNochmal={() => void geschaefte.refetch()} />
      ) : geschaefte.isPending ? (
        <div className="grid gap-3 md:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skelett key={i} className="h-64" />
          ))}
        </div>
      ) : (
        <Suspense fallback={<Skelett className="h-96" />}>
          {ansicht === 'pipeline' && <Pipeline geschaefte={gefiltert} aktiveId={leadId} onOeffnen={oeffne} />}
          {ansicht === 'liste' && (
            <LeadListe
              geschaefte={gefiltert}
              filter={filter}
              onFilter={setFilter}
              aktiveId={leadId}
              onOeffnen={oeffne}
            />
          )}
          {ansicht === 'tagesroute' && <Tagesroute geschaefte={daten} onOeffnen={oeffne} />}
          {ansicht === 'tour' && <Tour geschaefte={daten} onOeffnen={oeffne} />}
          {ansicht === 'kalender' && <Wochenkalender geschaefte={daten} onOeffnen={oeffne} />}
          {ansicht === 'regionen' && <Regionen geschaefte={gefiltert} onOeffnen={oeffne} />}
          {ansicht === 'bericht' && <Monatsbericht onOeffnen={oeffne} />}
        </Suspense>
      )}

      <Suspense>
        {leadId && (
          <LeadAkte
            id={leadId}
            geschaeft={daten.find((g) => g.id === leadId) ?? null}
            onSchliessen={() => {
              oeffne(null)
            }}
          />
        )}
        {neu && (
          <LeadDialog
            onSchliessen={(id) => {
              onAdresse({ neu: false, ...(id ? { lead: id } : {}) })
            }}
          />
        )}
        {dialog === 'excel' && (
          <ExcelImport
            geschaefte={daten}
            onSchliessen={() => {
              setDialog(null)
            }}
          />
        )}
        {dialog === 'sms' && (
          <SmsListe
            geschaefte={daten}
            onSchliessen={() => {
              setDialog(null)
            }}
          />
        )}
      </Suspense>
    </div>
  )
}
