import { FileSpreadsheet, MessageSquareText, Plus, Users } from 'lucide-react'
import { Suspense, lazy, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Seitenkopf } from '@/components/shared/Seitenkopf'
import { Fehlerzustand, Leerzustand } from '@/components/shared/Zustaende'
import { Button } from '@/components/ui/button'
import { Kbd, Skelett } from '@/components/ui/diverses'
import { useGemerkterFilter } from '@/hooks/useGemerkterFilter'
import { useKuerzelAnzeige, useTaste } from '@/hooks/useTaste'
import { ReiterMehr, reiterKnopfKlasse, reiterListeKlasse, teileReiter } from '@/components/ui/reiter'
import { supabase } from '@/services/supabase'
import { useGeschaefte } from '../hooks/useVerkauf'
import { passtZuFilter } from '../lib/geschaeft'
import {
  ansichtVon,
  LEERER_FILTER,
  PLANUNG_ANSICHTEN,
  reiterVon,
  VERKAUF_REITER,
  type VerkaufAnsicht,
  type VerkaufFilter,
} from '../types'
import { AnfragenKnopf } from './AnfragenKnopf'
import { FilterLeiste } from './FilterLeiste'
import { OrdnerKnopf } from './OrdnerKnopf'
import { SpaltenWahl } from './SpaltenWahl'

const ZuTun = lazy(() => import('./ZuTun'))
const Pipeline = lazy(() => import('./Pipeline'))
const LeadListe = lazy(() => import('./LeadListe'))
const Tagesroute = lazy(() => import('./Tagesroute'))
const Tour = lazy(() => import('./Tour'))
const Wochenkalender = lazy(() => import('./Wochenkalender'))
const Regionen = lazy(() => import('./Regionen'))
const Monatsbericht = lazy(() => import('./Monatsbericht'))
const Steuerung = lazy(() => import('./Steuerung'))
const LeadAkte = lazy(() => import('./LeadAkte'))
const LeadDialog = lazy(() => import('./LeadDialog'))
const ExcelImport = lazy(() => import('./ExcelImport'))
const SmsListe = lazy(() => import('./SmsListe'))

export interface VerkaufProps {
  ansicht: VerkaufAnsicht
  /** Offenes Geschäft aus der Adresse (?lead=…). */
  leadId: string | null
  neu: boolean
  /** Mail aus dem Posteingang, aus der ein Lead entstehen soll (?ausMail=…). */
  ausMail?: string | null
  onAdresse: (a: { ansicht?: VerkaufAnsicht; lead?: string | null; neu?: boolean; ausMail?: string | null }) => void
}

/** Ansichten mit der gemeinsamen Filterleiste; Route, Tour und Kalender haben ihre eigene Auswahl. */
const MIT_FILTER = new Set<VerkaufAnsicht>(['pipeline', 'liste', 'regionen'])

/**
 * «Anfragen & Leads»: Zu tun (Start), Pipeline in sechs Schritten, Liste, Tagesroute, Tour, Kalender, Regionen,
 * Monatsbericht und Verkaufssteuerung (V233 und Neuentwurf 02.11.2026). Alle Ansichten arbeiten mit denselben
 * Geschäften; ein Klick öffnet überall die Lead-Akte als ganze Seite (?lead=…).
 */
export default function Verkauf({ ansicht, leadId, neu, ausMail = null, onAdresse }: VerkaufProps) {
  const { t } = useTranslation()
  const geschaefte = useGeschaefte()
  // Personen, Quellen, Regionen bleiben gemerkt (je Person); die Suche beginnt jedes Mal leer.
  const [gemerkt, setGemerkt] = useGemerkterFilter<VerkaufFilter>('verkauf', LEERER_FILTER)
  const [suche, setSuche] = useState('')
  const filter = useMemo(() => ({ ...gemerkt, suche }), [gemerkt, suche])
  const setFilter = (f: VerkaufFilter) => {
    setSuche(f.suche)
    const ohneSuche = { ...f, suche: '' }
    if (JSON.stringify(ohneSuche) !== JSON.stringify(gemerkt)) setGemerkt(ohneSuche)
  }
  const [dialog, setDialog] = useState<'excel' | 'sms' | null>(null)
  const [ordnerDatei, setOrdnerDatei] = useState<File | undefined>()
  const verzoegert = useDeferredValue(filter)
  const oeffne = (id: string | null) => {
    onAdresse({ lead: id })
  }

  useTaste(
    'n',
    () => {
      onAdresse({ neu: true })
    },
    true,
    t('kuerzel.neuerLead'),
  )
  useKuerzelAnzeige('1–7', t('kuerzel.ansicht'))
  // Die Tasten 1 bis 7 wechseln die Ansicht, wie die Reiter von links nach rechts.
  const wechsle = useRef(onAdresse)
  useEffect(() => {
    wechsle.current = onAdresse
  })
  useEffect(() => {
    const beiTaste = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || !/^[1-9]$/.test(e.key)) return
      const ziel = e.target
      if (ziel instanceof HTMLElement && (ziel.isContentEditable || /INPUT|TEXTAREA|SELECT/.test(ziel.tagName))) return
      if (document.querySelector('[role="dialog"]')) return
      const r = VERKAUF_REITER[Number(e.key) - 1]
      if (r) wechsle.current({ ansicht: ansichtVon(r) })
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

  // Offener Lead: die Akte als ganze Seite statt der Ansichten (zurück führt in die letzte Ansicht).
  if (leadId) {
    return (
      <div className="mx-auto flex w-full max-w-[110rem] flex-col gap-4 px-4 py-6 sm:px-6">
        <Suspense fallback={<Skelett className="h-[32rem]" />}>
          <LeadAkte
            key={leadId}
            id={leadId}
            geschaeft={daten.find((g) => g.id === leadId) ?? null}
            onSchliessen={() => {
              oeffne(null)
            }}
          />
        </Suspense>
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-[96rem] flex-col gap-4 px-4 py-6 sm:px-6">
      <Seitenkopf
        titel={t('verkauf.titel')}
        beschreibung={t('verkauf.beschreibung')}
        aktionen={
          <>
            <AnfragenKnopf
              ausMail={ausMail}
              onAusMailFertig={(lead) => {
                onAdresse({ ausMail: null, ...(lead ? { lead } : {}) })
              }}
            />
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
                setOrdnerDatei(undefined)
                setDialog('excel')
              }}
            >
              <FileSpreadsheet />
              {t('verkauf.excel.knopf')}
            </Button>
            {/* Erst wenn die Geschäfte da sind, sonst hielte der Abgleich alle Excel-Leads für neu. */}
            {geschaefte.data && (
              <OrdnerKnopf
                onExcel={(f) => {
                  setOrdnerDatei(f)
                  setDialog('excel')
                }}
              />
            )}
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

      <nav aria-label={t('verkauf.ansichten')} className={reiterListeKlasse}>
        {teileReiter(VERKAUF_REITER, reiterVon(ansicht)).sichtbar.map((r) => (
          <button
            key={r}
            type="button"
            aria-current={r === reiterVon(ansicht) ? 'page' : undefined}
            title={String(VERKAUF_REITER.indexOf(r) + 1)}
            onClick={() => {
              if (r !== reiterVon(ansicht)) onAdresse({ ansicht: ansichtVon(r) })
            }}
            className={reiterKnopfKlasse}
          >
            {t(`verkauf.reiter.${r}`)}
          </button>
        ))}
        <ReiterMehr
          eintraege={teileReiter(VERKAUF_REITER, reiterVon(ansicht)).mehr.map((r) => ({
            wert: r,
            inhalt: t(`verkauf.reiter.${r}`),
            onWahl: () => {
              onAdresse({ ansicht: ansichtVon(r) })
            },
          }))}
        />
      </nav>

      {reiterVon(ansicht) === 'planung' && (
        <div className="flex flex-wrap gap-1" role="group" aria-label={t('verkauf.reiter.planung')}>
          {PLANUNG_ANSICHTEN.map((a) => (
            <Button
              key={a}
              size="sm"
              variant={a === ansicht ? 'secondary' : 'ghost'}
              aria-pressed={a === ansicht}
              onClick={() => {
                onAdresse({ ansicht: a })
              }}
            >
              {t(`verkauf.ansicht.${a}`)}
            </Button>
          ))}
        </div>
      )}

      {MIT_FILTER.has(ansicht) && (
        <FilterLeiste
          filter={filter}
          onChange={setFilter}
          zusatz={ansicht === 'pipeline' && <SpaltenWahl geschaefte={gefiltert} />}
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
          {ansicht === 'zutun' && <ZuTun geschaefte={daten} onOeffnen={oeffne} />}
          {ansicht === 'steuerung' && <Steuerung geschaefte={daten} />}
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
            datei={ordnerDatei}
            onSchliessen={() => {
              setDialog(null)
              setOrdnerDatei(undefined)
            }}
          />
        )}
        {dialog === 'sms' && (
          <SmsListe
            onSchliessen={() => {
              setDialog(null)
            }}
          />
        )}
      </Suspense>
    </div>
  )
}
