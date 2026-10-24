import { useTranslation } from 'react-i18next'
import { Fehlerzustand } from '@/components/shared/Zustaende'
import { Skelett } from '@/components/ui/diverses'
import { useBetrieb } from '../hooks/useKennzahlen'
import type { Bereich } from '../types'
import { Auftragsbestand } from './Auftragsbestand'
import { AuslastungTabelle } from './AuslastungTabelle'
import { Marge } from './Marge'

/** Reiter «Aufträge und Auslastung» (ERP 0009): Auftragsbestand, Auslastung Montage, Marge je Projekt. */
export function Betrieb({ von, bis, bereich }: { von: string; bis: string; bereich: Bereich }) {
  const { t } = useTranslation()
  const b = useBetrieb(von, bis)
  if (b.isError) return <Fehlerzustand onNochmal={() => void b.refetch()} />
  if (!b.data) return <Skelett className="h-64" />
  const passt = (s: string | null) => bereich === 'alle' || s === bereich
  return (
    <div className="flex flex-col gap-6">
      <Auftragsbestand auftraege={b.data.auftragsbestand.filter((a) => a.rest_rappen > 0 && passt(a.standort))} />
      <AuslastungTabelle auslastung={b.data.auslastung} />
      {b.data.marge ? (
        <Marge zeilen={b.data.marge.filter((m) => passt(m.standort))} />
      ) : (
        <p className="text-muted-foreground text-sm">{t('kz.betrieb.margeOhne')}</p>
      )}
    </div>
  )
}
