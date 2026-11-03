import { FileText } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { AkteAbschnitt } from '@/components/shared/AkteAbschnitt'
import { KiAkteAbschnitt } from '@/components/shared/ki/KiAkteAbschnitt'
import { AutomatischGeplant } from '@/components/shared/automatik/AutomatischGeplant'
import { Leerzustand } from '@/components/shared/Zustaende'
import { useOffertAkte } from '../hooks/useOfferten'
import type { Offerte } from '../types'
import { ChanceBox } from './ChanceBox'
import { KundeBox } from './KundeBox'
import { NaechsterSchrittBox } from './NaechsterSchrittBox'
import { OffertAngaben } from './OffertAngaben'
import { OffertKopf } from './OffertKopf'
import { OffertSchritte } from './OffertSchritte'
import { OffertVerlauf } from './OffertVerlauf'
import { OffertVersionen } from './OffertVersionen'
import { PdfWerteAbschnitt } from './PdfWerteAbschnitt'
import { UnterlagenBox } from './UnterlagenBox'
import { VariantenBox } from './VariantenBox'
import { WirtschaftlichkeitKarte } from './WirtschaftlichkeitKarte'

/**
 * Offert-Akte als ganze Seite (wie die Fall-Akte im Service): Kopf mit Aktionen, Schritte vom Termin bis zum
 * Entscheid, links Kunde/Unterlagen/Versionen, Mitte Varianten/Werte/KI/Verlauf, rechts nächster Schritt und Chance.
 */
export default function OffertSeite({ o, onZurueck }: { o: Offerte | null; onZurueck: () => void }) {
  const { t } = useTranslation()
  const akte = useOffertAkte(o)
  if (!o) return <Leerzustand icon={FileText} titel={t('offerten.akte.nichtGefunden')} text="" />
  const versendet = o.status === 'offeriert'
  const dokumente = akte.dokumente.data ?? []

  return (
    <div className="flex flex-col gap-4">
      <OffertKopf o={o} dokumente={dokumente} onZurueck={onZurueck} />
      <OffertSchritte o={o} />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-4">
          <KundeBox o={o} />
          <UnterlagenBox o={o} />
          <OffertVersionen o={o} dokumente={dokumente} />
        </div>
        <div className="flex min-w-0 flex-col gap-4">
          <VariantenBox o={o} />
          <PdfWerteAbschnitt o={o} />
          <AutomatischGeplant tabelle="offerten" id={o.id} />
          {o.wirtschaftlichkeit && Object.keys(o.wirtschaftlichkeit).length > 0 && (
            <AkteAbschnitt titel={t('offerten.wirtschaftlichkeit.titel')}>
              <WirtschaftlichkeitKarte w={o.wirtschaftlichkeit} />
            </AkteAbschnitt>
          )}
          <KiAkteAbschnitt
            bezug={{ tabelle: 'offerten', id: o.id }}
            art={versendet ? 'nachfassen' : 'offerte'}
            mail={{
              kontakt_id: o.kontaktId,
              offerte_id: o.id,
              ...(o.verkaufschanceId ? { verkaufschance_id: o.verkaufschanceId } : {}),
            }}
          />
          <OffertVerlauf eintraege={akte.verlauf.data} laedt={akte.verlauf.isPending} />
        </div>
        {/* Am Handy zuerst: was als Nächstes zu tun ist (nachfassen, Chance). */}
        <div className="order-first flex flex-col gap-4 lg:order-none">
          <NaechsterSchrittBox o={o} />
          <ChanceBox o={o} />
          <OffertAngaben o={o} />
        </div>
      </div>
    </div>
  )
}
