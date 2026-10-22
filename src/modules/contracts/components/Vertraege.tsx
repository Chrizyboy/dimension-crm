import { FileSignature, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Datentabelle } from '@/components/shared/Datentabelle'
import { Filterchips } from '@/components/shared/Filterchips'
import { Seitenkopf } from '@/components/shared/Seitenkopf'
import { Fehlerzustand, Leerzustand } from '@/components/shared/Zustaende'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuswahl } from '@/hooks/useAuswahl'
import { supabase } from '@/services/supabase'
import { useVertraege } from '../hooks/useVertraege'
import { inTagen } from '../lib/anzeige'
import { FILTER, type Filter } from '../types'
import { VertragAkte } from './VertragAkte'
import { VertragDialog } from './VertragDialog'
import { vertragSpalten } from './vertragSpalten'

/**
 * Wartungsverträge (V233 «Verträge»): W001 … mit Leistungskatalog, Rhythmus, nächster Wartung und PDF.
 * Offener Vertrag in der Adresse (#/contracts?vertrag=…).
 */
export default function Vertraege({
  vertragId,
  onOeffnen,
}: {
  vertragId: string | null
  onOeffnen: (id: string | null) => void
}) {
  const { t } = useTranslation()
  const [heute] = useState(() => new Date())
  const [filter, setFilter] = useState<Filter>('aktiv')
  const [suche, setSuche] = useState('')
  const [neu, setNeu] = useState(false)
  const liste = useVertraege(filter, inTagen(heute, 30))
  const status = useAuswahl('wartungsstatus')
  const spalten = useMemo(
    () => vertragSpalten(t, (w) => ({ text: status.text(w), farbe: status.finde(w)?.farbe ?? null }), heute),
    [t, status, heute],
  )
  const daten = useMemo(() => {
    const s = suche.trim().toLowerCase()
    return (liste.data ?? []).filter(
      (v) => !s || `${v.nummer ?? ''} ${v.kunde} ${v.ort ?? ''} ${v.projekt ?? ''}`.toLowerCase().includes(s),
    )
  }, [liste.data, suche])

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
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Filterchips
          einzeln
          beschriftung={t('wartung.filter')}
          optionen={FILTER.map((f) => ({ wert: f, text: t(`wartung.filterwert.${f}`) }))}
          gewaehlt={[filter]}
          onChange={([f]) => {
            if (f) setFilter(f as Filter)
          }}
        />
        <Input
          type="search"
          className="w-full sm:w-64"
          aria-label={t('wartung.suche')}
          placeholder={t('wartung.suche')}
          value={suche}
          onChange={(e) => {
            setSuche(e.target.value)
          }}
        />
      </div>
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
