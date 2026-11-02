import { useTranslation } from 'react-i18next'
import { KiAkteAbschnitt } from '@/components/shared/ki/KiAkteAbschnitt'
import { Fehlerzustand } from '@/components/shared/Zustaende'
import { Karte } from '@/components/ui/karte'
import { Skelett } from '@/components/ui/diverses'
import { useAkte } from '../hooks/useAkte'
import { useFall } from '../hooks/useService'
import { schritte } from '../lib/schritte'
import { AnhaengeBox } from './AnhaengeBox'
import { AnlageBox } from './AnlageBox'
import { ChecklisteBox } from './ChecklisteBox'
import { EinsatzBox } from './EinsatzBox'
import { FallKopf } from './FallKopf'
import { FallSchritte } from './FallSchritte'
import { GarantieAbschnitt } from './GarantieAbschnitt'
import { GarantieCheck } from './GarantieCheck'
import { KostenBox } from './KostenBox'
import { KundeBox } from './KundeBox'
import { PlanungBox } from './PlanungBox'
import { VerlaufBox } from './VerlaufBox'

/**
 * Fall-Akte als ganze Seite, gebaut für den ganzen Tag: links wer und was (Kunde, Einsatzort, Anlage, frühere
 * Fälle), in der Mitte was passiert ist (Verlauf, Anhänge, Vorschläge), rechts was zu tun ist (Reaktionszeit,
 * Termin, Garantie, Checkliste, Verrechnung, Hersteller). Oben die Arbeitsschritte.
 */
export function FallSeite({ id, onZurueck }: { id: string; onZurueck: () => void }) {
  const { t } = useTranslation()
  const { fall, anhaenge } = useFall(id)
  const akte = useAkte(id)
  const f = fall.data
  if (fall.error) return <Fehlerzustand details={String(fall.error)} onNochmal={() => void fall.refetch()} />
  if (!f) return <Skelett className="h-[32rem]" />
  const a = akte.data
  return (
    <div className="flex flex-col gap-4">
      <FallKopf f={f} akte={a} onZurueck={onZurueck} />
      <FallSchritte schritte={schritte(f, a)} />
      <div className="grid items-start gap-4 lg:grid-cols-2 2xl:grid-cols-[20rem_minmax(0,1fr)_22rem]">
        <div className="flex min-w-0 flex-col gap-4">
          <KundeBox f={f} akte={a} />
          <AnlageBox f={f} akte={a} />
        </div>
        <div className="flex min-w-0 flex-col gap-4 lg:order-last lg:col-span-2 2xl:order-none 2xl:col-span-1">
          {f.beschreibung && (
            <Karte className="bg-muted/40 p-3 text-sm whitespace-pre-wrap" aria-label={t('service.feld.beschreibung')}>
              {f.beschreibung}
            </Karte>
          )}
          <VerlaufBox f={f} akte={a} />
          <AnhaengeBox id={f.id} anhaenge={anhaenge.data ?? []} />
          <Karte className="px-3">
            <KiAkteAbschnitt
              bezug={{ tabelle: 'service_faelle', id: f.id }}
              art="service"
              mail={{
                ...(f.kontakt_id ? { kontakt_id: f.kontakt_id } : {}),
                bezug_tabelle: 'service_faelle',
                bezug_id: f.id,
              }}
            />
          </Karte>
        </div>
        <div className="flex min-w-0 flex-col gap-4">
          <PlanungBox f={f} />
          <EinsatzBox f={f} />
          <GarantieCheck f={f} akte={a} />
          <ChecklisteBox f={f} />
          <KostenBox akte={a} />
          <Karte className="px-3">
            <GarantieAbschnitt fall={f} />
          </Karte>
        </div>
      </div>
    </div>
  )
}
