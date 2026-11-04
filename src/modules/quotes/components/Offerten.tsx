import { FileText } from 'lucide-react'
import { Suspense, lazy, useDeferredValue, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Suchfeld } from '@/components/shared/Werkzeugleiste'
import { Seitenkopf } from '@/components/shared/Seitenkopf'
import { Fehlerzustand, Leerzustand } from '@/components/shared/Zustaende'
import { Skelett } from '@/components/ui/diverses'
import { ReiterMehr, reiterKnopfKlasse, reiterListeKlasse, teileReiter } from '@/components/ui/reiter'
import { supabase } from '@/services/supabase'
import { useEingang, useOfferten } from '../hooks/useOfferten'
import { treffer, zaehleTreffer } from '../lib/suche'
import { OFFERT_ANSICHTEN, type OffertAnsicht } from '../types'

const EingangListe = lazy(() => import('./EingangListe'))
const OffertListe = lazy(() => import('./OffertListe'))
const Nachfassen = lazy(() => import('./Nachfassen'))
const PdfImport = lazy(() => import('./PdfImport'))
const OffertSeite = lazy(() => import('./OffertSeite'))
const Arbeitsvorrat = lazy(() => import('./Arbeitsvorrat'))
const Auswertung = lazy(() => import('./Auswertung'))
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
 * «Offerten» (Arbeitsvorrat als Board; V233: Neue Offerten, Offerten Muri, Offerten Bulle, Nachfassen) mit einer Suche über alle
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

  if (offerteId) {
    return (
      <div className="mx-auto flex w-full max-w-[96rem] flex-col gap-4 px-4 py-6 sm:px-6">
        {laedt ? (
          <Skelett className="h-96" />
        ) : (
          <Suspense fallback={<Skelett className="h-96" />}>
            <OffertSeite
              o={offen ?? null}
              onZurueck={() => {
                onAdresse({ offerte: null })
              }}
            />
          </Suspense>
        )}
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-[96rem] flex-col gap-4 px-4 py-6 sm:px-6">
      <Seitenkopf titel={t('offerten.titel')} beschreibung={t('offerten.beschreibung')} />

      <nav aria-label={t('offerten.ansichten')} className={reiterListeKlasse}>
        {teileReiter(OFFERT_ANSICHTEN, ansicht).sichtbar.map((a) => (
          <button
            key={a}
            type="button"
            aria-current={a === ansicht ? 'page' : undefined}
            onClick={() => {
              onAdresse({ ansicht: a })
            }}
            className={reiterKnopfKlasse}
          >
            {t(`offerten.ansicht.${a}`)}
            {a !== 'import' && a !== 'vorrat' && a !== 'auswertung' && !laedt && (
              <span className="zahlen text-muted-foreground font-mono text-xs">{zahlen[a]}</span>
            )}
          </button>
        ))}
        <ReiterMehr
          eintraege={teileReiter(OFFERT_ANSICHTEN, ansicht).mehr.map((a) => ({
            wert: a,
            inhalt: t(`offerten.ansicht.${a}`),
            onWahl: () => {
              onAdresse({ ansicht: a })
            },
          }))}
        />
      </nav>
      <Suchfeld
        beschriftung={t('offerten.suche')}
        placeholder={t('offerten.sucheHinweis')}
        value={suche}
        onChange={(e) => {
          setSuche(e.target.value)
        }}
      />

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
          {ansicht === 'vorrat' && (
            <Arbeitsvorrat
              offerten={gefunden.offerten}
              eingang={gefunden.eingang}
              onOeffnen={(ziel) => {
                onAdresse(ziel)
              }}
            />
          )}
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
          {ansicht === 'auswertung' && <Auswertung offerten={gefunden.offerten} />}
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
