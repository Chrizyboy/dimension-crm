import { CalendarClock } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Filterchips } from '@/components/shared/Filterchips'
import { Fehlerzustand, Leerzustand } from '@/components/shared/Zustaende'
import { Skelett } from '@/components/ui/diverses'
import { Kopfzelle, Tabelle, TabelleKoerper, TabelleKopf, Zelle, Zeile } from '@/components/ui/tabelle'
import { useAuswahl } from '@/hooks/useAuswahl'
import { useFristen, useNamen } from '../hooks/useRessourcen'
import { anstehend, heuteZuerich } from '../lib/fristen'
import type { Frist } from '../types'
import { FristBadge } from './FristBadge'

const ZEITRAUM = { '30': [30, 60], '90': [90, 90], alle: [100_000, 100_000] } as const
type Zeitraum = keyof typeof ZEITRAUM

/**
 * Alle Fristen an einem Ort, früheste zuerst: MFK, Service, Geräteprüfung und ablaufende Ausweise (V233 kannte
 * nur Termine im Kalender). Fahrzeug und Gerät öffnen ihre Akte, ein Ausweis die Person unter «Team & Ausweise».
 */
export function FristenListe({ onOeffnen }: { onOeffnen: (f: Frist) => void }) {
  const { t } = useTranslation()
  const daten = useFristen()
  const namen = useNamen()
  const quali = useAuswahl('qualifikation')
  const [zeitraum, setZeitraum] = useState<Zeitraum>('30')
  const heute = heuteZuerich()
  const alle = daten.data ?? []
  const auswahl = (z: Zeitraum) => anstehend(alle, heute, ZEITRAUM[z][0], ZEITRAUM[z][1])
  const liste = auswahl(zeitraum)

  return (
    <div className="flex flex-col gap-3">
      <Filterchips
        einzeln
        beschriftung={t('fuhrpark.fristen.zeitraum')}
        optionen={(Object.keys(ZEITRAUM) as Zeitraum[]).map((z) => ({
          wert: z,
          text: t(`fuhrpark.fristen.bis.${z}`),
          anzahl: auswahl(z).length,
        }))}
        gewaehlt={[zeitraum]}
        onChange={([z]) => {
          if (z) setZeitraum(z as Zeitraum)
        }}
      />
      {daten.error ? (
        <Fehlerzustand details={String(daten.error)} onNochmal={() => void daten.refetch()} />
      ) : !daten.data ? (
        <Skelett className="h-48" />
      ) : liste.length === 0 ? (
        <Leerzustand icon={CalendarClock} titel={t('fuhrpark.fristen.leer')} text={t('fuhrpark.fristen.leerText')} />
      ) : (
        <Tabelle aria-label={t('fuhrpark.reiter.fristen')}>
          <TabelleKopf>
            <tr>
              <Kopfzelle>{t('fuhrpark.spalte.faellig')}</Kopfzelle>
              <Kopfzelle>{t('fuhrpark.spalte.was')}</Kopfzelle>
              <Kopfzelle className="hidden md:table-cell">{t('fuhrpark.spalte.person')}</Kopfzelle>
            </tr>
          </TabelleKopf>
          <TabelleKoerper>
            {liste.map((f) => (
              <Zeile
                key={`${f.art}-${f.bezug_id}`}
                tabIndex={0}
                className="cursor-pointer"
                onClick={() => {
                  onOeffnen(f)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') onOeffnen(f)
                }}
              >
                <Zelle className="whitespace-nowrap">
                  <FristBadge datum={f.faellig_am} vorlauf={f.art === 'ausweis' ? 60 : 30} />
                </Zelle>
                <Zelle>
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate font-medium">{f.art === 'ausweis' ? quali.text(f.titel) : f.titel}</span>
                    <span className="text-muted-foreground text-xs">{t(`fuhrpark.fristen.art.${f.art}`)}</span>
                  </span>
                </Zelle>
                <Zelle className="hidden md:table-cell">{namen.person(f.person_id)}</Zelle>
              </Zeile>
            ))}
          </TabelleKoerper>
        </Tabelle>
      )}
    </div>
  )
}
