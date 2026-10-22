import { Wrench } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Datentabelle } from '@/components/shared/Datentabelle'
import { Filterchips } from '@/components/shared/Filterchips'
import { Fehlerzustand, Leerzustand } from '@/components/shared/Zustaende'
import { Input } from '@/components/ui/input'
import { useAuswahl } from '@/hooks/useAuswahl'
import { useFaelle } from '../hooks/useService'
import { FALL_FILTER, type FallFilter } from '../types'
import { fallSpalten } from './fallSpalten'

/** Liste der Service-Fälle mit Filter (offen, hoch, Garantie, erledigt, alle) und Suche. */
export function FallListe({ aktiveId, onOeffnen }: { aktiveId: string | null; onOeffnen: (id: string) => void }) {
  const { t } = useTranslation()
  const [filter, setFilter] = useState<FallFilter>('offen')
  const [suche, setSuche] = useState('')
  const liste = useFaelle(filter)
  const kat = useAuswahl('servicekategorie')
  const prio = useAuswahl('prioritaet')
  const status = useAuswahl('servicestatus')
  const spalten = useMemo(() => {
    const listen = { servicekategorie: kat, prioritaet: prio, servicestatus: status } as const
    return fallSpalten(t, (l, w) => {
      const a = listen[l as keyof typeof listen]
      return { text: a.text(w), farbe: a.finde(w)?.farbe ?? null }
    })
  }, [t, kat, prio, status])
  const daten = useMemo(() => {
    const s = suche.trim().toLowerCase()
    return (liste.data ?? []).filter(
      (f) => !s || `${f.nummer} ${f.titel} ${f.kunde} ${f.ort ?? ''}`.toLowerCase().includes(s),
    )
  }, [liste.data, suche])

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Filterchips
          einzeln
          beschriftung={t('service.filter')}
          optionen={FALL_FILTER.map((f) => ({ wert: f, text: t(`service.filterwert.${f}`) }))}
          gewaehlt={[filter]}
          onChange={([f]) => {
            if (f) setFilter(f as FallFilter)
          }}
        />
        <Input
          type="search"
          className="w-full sm:w-64"
          aria-label={t('service.suche')}
          placeholder={t('service.suche')}
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
          kennung={(f) => f.id}
          aktiveId={aktiveId}
          onOeffnen={(f) => {
            onOeffnen(f.id)
          }}
          beschriftung={t('service.reiter.faelle')}
          leer={<Leerzustand icon={Wrench} titel={t('service.leer')} text={t('service.leerText')} />}
        />
      )}
    </div>
  )
}
