import { FileText, Search } from 'lucide-react'
import { Suspense, lazy, useDeferredValue, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Seitenkopf } from '@/components/shared/Seitenkopf'
import { Fehlerzustand, Leerzustand } from '@/components/shared/Zustaende'
import { Skelett } from '@/components/ui/diverses'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { supabase } from '@/services/supabase'
import { useEingang, useOfferten } from '../hooks/useOfferten'
import { treffer, zaehleTreffer } from '../lib/suche'
import { OFFERT_ANSICHTEN, type OffertAnsicht } from '../types'

const EingangListe = lazy(() => import('./EingangListe'))
const OffertListe = lazy(() => import('./OffertListe'))
const Nachfassen = lazy(() => import('./Nachfassen'))
const PdfImport = lazy(() => import('./PdfImport'))
const OffertAkte = lazy(() => import('./OffertAkte'))
const EingangAkte = lazy(() => import('./EingangAkte'))

export interface OffertenProps {
  ansicht: OffertAnsicht
  /** Offene Offerte aus der Adresse (?offerte=…). */
  offerteId: string | null
  /** Offener Eintrag in «Neue Offerten» (?lead=…). */
  leadId: string | null
  onAdresse: (a: { ansicht?: OffertAnsicht; offerte?: string | null; lead?: string | null }) => void
}

/**
 * «Offerten» (V233: Neue Offerten, Offerten Muri, Offerten Bulle, Nachfassen) mit einer Suche über alle
 * Reiter (V186): die Zahl an jedem Reiter zeigt, wo die Suche etwas findet.
 */
export default function Offerten({ ansicht, offerteId, leadId, onAdresse }: OffertenProps) {
  const { t } = useTranslation()
  const offerten = useOfferten()
  const eingang = useEingang()
  const [suche, setSuche] = useState('')
  const s = useDeferredValue(suche)

  const gefunden = useMemo(
    () => ({
      offerten: (offerten.data ?? []).filter((o) => treffer(o.suchtext, s)),
      eingang: (eingang.data ?? []).filter((e) => treffer(e.suchtext, s)),
    }),
    [offerten.data, eingang.data, s],
  )
  const zahlen = zaehleTreffer(gefunden.offerten, gefunden.eingang)

  if (!supabase) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <Leerzustand icon={FileText} titel={t('offerten.vorschau')} text={t('offerten.vorschauText')} />
      </div>
    )
  }

  const fehler = offerten.error ?? eingang.error
  const laedt = offerten.isPending || eingang.isPending
  const offen = offerteId ? (offerten.data ?? []).find((o) => o.id === offerteId) : undefined
  const offenerEingang = leadId ? (eingang.data ?? []).find((e) => e.id === leadId) : undefined

  return (
    <div className="mx-auto flex w-full max-w-[96rem] flex-col gap-4 px-4 py-6 sm:px-6">
      <Seitenkopf titel={t('offerten.titel')} beschreibung={t('offerten.beschreibung')} />

      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <nav aria-label={t('offerten.ansichten')} className="-mx-1 flex gap-1 overflow-x-auto border-b px-1">
          {OFFERT_ANSICHTEN.map((a) => (
            <button
              key={a}
              type="button"
              aria-current={a === ansicht ? 'page' : undefined}
              onClick={() => {
                onAdresse({ ansicht: a })
              }}
              className={cn(
                'text-muted-foreground hover:text-foreground focus-visible:ring-ring -mb-px inline-flex h-9 shrink-0 items-center gap-1.5 border-b-2 border-transparent px-3 text-sm outline-none focus-visible:ring-2',
                a === ansicht && 'border-accent text-foreground font-medium',
              )}
            >
              {t(`offerten.ansicht.${a}`)}
              {a !== 'import' && !laedt && (
                <span className="zahlen text-muted-foreground font-mono text-[11px]">{zahlen[a]}</span>
              )}
            </button>
          ))}
        </nav>
        <label className="relative w-full md:w-72">
          <span className="sr-only">{t('offerten.suche')}</span>
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input
            type="search"
            value={suche}
            placeholder={t('offerten.sucheHinweis')}
            className="pl-8"
            onChange={(e) => {
              setSuche(e.target.value)
            }}
          />
        </label>
      </div>

      {fehler ? (
        <Fehlerzustand
          details={String(fehler)}
          onNochmal={() => {
            void offerten.refetch()
            void eingang.refetch()
          }}
        />
      ) : laedt ? (
        <Skelett className="h-96" />
      ) : (
        <Suspense fallback={<Skelett className="h-96" />}>
          {ansicht === 'eingang' && (
            <EingangListe
              eintraege={gefunden.eingang}
              aktiveId={leadId}
              onOeffnen={(id) => {
                onAdresse({ lead: id })
              }}
            />
          )}
          {(ansicht === 'muri' || ansicht === 'bulle') && (
            <OffertListe
              standort={ansicht}
              offerten={gefunden.offerten}
              aktiveId={offerteId}
              onOeffnen={(id) => {
                onAdresse({ offerte: id })
              }}
            />
          )}
          {ansicht === 'nachfassen' && (
            <Nachfassen
              offerten={gefunden.offerten}
              onOeffnen={(id) => {
                onAdresse({ offerte: id })
              }}
            />
          )}
          {ansicht === 'import' && (
            <PdfImport
              offerten={offerten.data ?? []}
              eingang={eingang.data ?? []}
              onOeffnen={(id) => {
                onAdresse({ offerte: id })
              }}
            />
          )}
        </Suspense>
      )}

      <Suspense>
        {offerteId && (
          <OffertAkte
            id={offerteId}
            offerte={offen ?? null}
            onSchliessen={() => {
              onAdresse({ offerte: null })
            }}
          />
        )}
        {leadId && (
          <EingangAkte
            eintrag={offenerEingang ?? null}
            onOffertOeffnen={(id, standort) => {
              onAdresse({ lead: null, offerte: id, ansicht: standort })
            }}
            onSchliessen={() => {
              onAdresse({ lead: null })
            }}
          />
        )}
      </Suspense>
    </div>
  )
}
