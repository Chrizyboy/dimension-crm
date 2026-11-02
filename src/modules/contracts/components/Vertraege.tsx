import { FileSignature, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Datentabelle } from '@/components/shared/Datentabelle'
import { Filterchips } from '@/components/shared/Filterchips'
import { Seitenkopf } from '@/components/shared/Seitenkopf'
import { Fehlerzustand, Leerzustand } from '@/components/shared/Zustaende'
import { Button } from '@/components/ui/button'
import { Reiter, ReiterInhalt, ReiterKnopf, ReiterListe } from '@/components/ui/reiter'
import { useAuswahl } from '@/hooks/useAuswahl'
import { supabase } from '@/services/supabase'
import { useKatalog, useVertraege } from '../hooks/useVertraege'
import { inTagen } from '../lib/anzeige'
import { filtere, kennzahlen } from '../lib/liste'
import { FILTER, WARTUNG_REITER, type Filter, type WartungReiter } from '../types'
import { inspektionZahlen } from '../lib/inspektionen'
import { Inspektionen } from './Inspektionen'
import { OhneVertrag } from './OhneVertrag'
import { KopfZahlen } from './KopfZahlen'
import { VertragAkte } from './VertragAkte'
import { VertragDialog } from './VertragDialog'
import { vertragSpalten } from './vertragSpalten'
import { Suchfeld, Werkzeugleiste } from '@/components/shared/Werkzeugleiste'

/**
 * Wartungsverträge (V233 «Verträge»): Reiter Verträge, Inspektionen (planen und ankündigen) und Ohne Vertrag
 * (eigene Anlagen mit Angebot). Reiter und offener Vertrag in der Adresse (#/contracts?reiter=…&vertrag=…).
 */
export default function Vertraege({
  vertragId,
  onOeffnen,
  reiter = 'vertraege',
  onReiter,
}: {
  vertragId: string | null
  onOeffnen: (id: string | null) => void
  reiter?: WartungReiter
  onReiter?: (r: WartungReiter) => void
}) {
  const { t } = useTranslation()
  const [heute] = useState(() => new Date())
  const [filter, setFilter] = useState<Filter>('aktiv')
  const [suche, setSuche] = useState('')
  const [neu, setNeu] = useState(false)
  // Alle Verträge einmal laden (wenige hundert), Filter und Kopfzahlen rechnet die Liste.
  const liste = useVertraege('alle', inTagen(heute, 30), inTagen(heute, 30))
  const katalog = useKatalog().data ?? undefined
  const status = useAuswahl('wartungsstatus')
  const iso = inTagen(heute, 0)
  const b = katalog?.bedingungen
  const spalten = useMemo(
    () => vertragSpalten(t, (w) => ({ text: status.text(w), farbe: status.finde(w)?.farbe ?? null }), heute, katalog),
    [t, status, heute, katalog],
  )
  const offeneInspektionen = useMemo(() => inspektionZahlen(liste.data ?? [], heute).offen, [liste.data, heute])
  const zahlen = useMemo(() => kennzahlen(liste.data ?? [], iso, b?.rechnung_vorlauf_tage), [liste.data, iso, b])
  const daten = useMemo(() => {
    const s = suche.trim().toLowerCase()
    return filtere(liste.data ?? [], filter, iso, {
      vorlauf: b?.rechnung_vorlauf_tage ?? 30,
      kuendigung: b?.kuendigung_monate ?? 3,
    }).filter(
      (v) =>
        !s ||
        `${v.nummer ?? ''} ${v.kunde} ${v.ort ?? ''} ${v.projekt ?? ''} ${v.wechselrichter ?? ''} ${v.paket ?? ''}`
          .toLowerCase()
          .includes(s),
    )
  }, [liste.data, suche, filter, iso, b])

  if (!supabase) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <Leerzustand icon={FileSignature} titel={t('wartung.titel')} text={t('projekte.ohneDatenbank')} />
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-[96rem] flex-col gap-4 px-4 py-6 sm:px-6">
      <Seitenkopf
        titel={t('wartung.titel')}
        beschreibung={t('wartung.beschreibung')}
        aktionen={
          <Button
            onClick={() => {
              setNeu(true)
            }}
          >
            <Plus />
            {t('wartung.neu')}
          </Button>
        }
      />
      <Reiter
        value={reiter}
        onValueChange={(r) => {
          onReiter?.(r as WartungReiter)
        }}
      >
        <ReiterListe>
          {WARTUNG_REITER.map((r) => (
            <ReiterKnopf key={r} value={r}>
              {t(`wartung.reiter.${r}`)}
              {r === 'inspektionen' && offeneInspektionen > 0 && (
                <span className="bg-warn-soft text-warn rounded-full px-1.5 text-xs">{offeneInspektionen}</span>
              )}
            </ReiterKnopf>
          ))}
        </ReiterListe>
        <ReiterInhalt value="vertraege" className="flex flex-col gap-4">
          {liste.data && <KopfZahlen zahlen={zahlen} onFilter={setFilter} />}
          <Werkzeugleiste
            suche={
              <Suchfeld
                beschriftung={t('wartung.suche')}
                value={suche}
                onChange={(e) => {
                  setSuche(e.target.value)
                }}
              />
            }
          >
            <Filterchips
              einzeln
              beschriftung={t('wartung.filter')}
              optionen={FILTER.map((f) => ({ wert: f, text: t(`wartung.filterwert.${f}`) }))}
              gewaehlt={[filter]}
              onChange={([f]) => {
                if (f) setFilter(f as Filter)
              }}
            />
          </Werkzeugleiste>
          {liste.error ? (
            <Fehlerzustand details={String(liste.error)} onNochmal={() => void liste.refetch()} />
          ) : (
            <Datentabelle
              daten={daten}
              spalten={spalten}
              laedt={liste.isPending}
              kennung={(v) => v.id}
              aktiveId={vertragId}
              onOeffnen={(v) => {
                onOeffnen(v.id)
              }}
              beschriftung={t('wartung.titel')}
              leer={<Leerzustand icon={FileSignature} titel={t('wartung.leer')} text={t('wartung.leerText')} />}
            />
          )}
        </ReiterInhalt>
        <ReiterInhalt value="inspektionen">
          <Inspektionen
            liste={liste.data ?? []}
            laedt={liste.isPending}
            fehler={liste.error}
            onNochmal={() => void liste.refetch()}
            katalog={katalog}
            onOeffnen={onOeffnen}
          />
        </ReiterInhalt>
        <ReiterInhalt value="ohne">
          <OhneVertrag
            katalog={katalog}
            onNeuerVertrag={() => {
              setNeu(true)
            }}
          />
        </ReiterInhalt>
      </Reiter>
      {vertragId && (
        <VertragAkte
          key={vertragId}
          id={vertragId}
          onSchliessen={() => {
            onOeffnen(null)
          }}
        />
      )}
      {neu && (
        <VertragDialog
          onSchliessen={() => {
            setNeu(false)
          }}
          onGespeichert={(id) => {
            setNeu(false)
            onOeffnen(id)
          }}
        />
      )}
    </div>
  )
}
