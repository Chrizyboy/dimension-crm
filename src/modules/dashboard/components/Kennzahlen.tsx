import { useNavigate } from '@tanstack/react-router'
import { ChartColumn } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Filterchips } from '@/components/shared/Filterchips'
import { Seitenkopf } from '@/components/shared/Seitenkopf'
import { Fehlerzustand, Leerzustand } from '@/components/shared/Zustaende'
import { Skelett } from '@/components/ui/diverses'
import { Reiter, ReiterInhalt, ReiterKnopf, ReiterListe } from '@/components/ui/reiter'
import { supabase } from '@/services/supabase'
import { useFakten, usePersonenNamen } from '../hooks/useKennzahlen'
import { nachBereich, nachPerson, nachStandort } from '../lib/auswertung'
import { heuteZuerich, vonBis } from '../lib/zeitraum'
import {
  BEREICHE,
  KENNZAHLEN_REITER,
  ZEITRAEUME,
  type Bereich,
  type Detail,
  type KennzahlenReiter,
  type Zeitraum,
} from '../types'
import { Betrieb } from './Betrieb'
import { DetailDialog } from './DetailDialog'
import { Kacheln } from './Kacheln'
import { KennzahlTabelle } from './KennzahlTabelle'
import { OffertenBalken } from './OffertenBalken'
import { Pipeline } from './Pipeline'
import { Quellen } from './Quellen'

/** Was die Adresse festhält: Reiter, Zeitraum, Firma. */
export interface KennzahlenAuswahl {
  reiter: KennzahlenReiter
  zeitraum: Zeitraum
  bereich: Bereich
}

/**
 * Kennzahlen (V233 Dashboard, ERP 0009): Verkauf mit Kacheln, Tabellen nach Standort und Person, Diagramm und
 * Lead-Quellen; Pipeline pro Region; Auftragsbestand, Auslastung und Marge. Jede Zahl zeigt per Klick ihre Einträge.
 */
export default function Kennzahlen({
  auswahl,
  onAuswahl,
}: {
  auswahl: KennzahlenAuswahl
  onAuswahl: (a: Partial<KennzahlenAuswahl>) => void
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [detail, setDetail] = useState<Detail | null>(null)
  const { von, bis } = vonBis(auswahl.zeitraum, heuteZuerich())
  const fakten = useFakten(von, bis)
  const personen = usePersonenNamen()

  if (!supabase) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <Leerzustand icon={ChartColumn} titel={t('kz.titel')} text={t('projekte.ohneDatenbank')} />
      </div>
    )
  }

  const gefiltert = nachBereich(fakten.data ?? [], auswahl.bereich)
  const spaltenPerson = nachPerson(gefiltert, personen.data ?? []).map((s) => ({
    ...s,
    titel: s.id === 'uebrige' ? t('kz.spalte.uebrige') : (personen.data?.find((p) => p.id === s.id)?.name ?? s.id),
  }))

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-6 sm:px-6">
      <Seitenkopf titel={t('kz.titel')} beschreibung={t('kz.beschreibung')} />
      <div className="flex flex-wrap gap-x-6 gap-y-2">
        <Filterchips
          einzeln
          beschriftung={t('kz.zeitraum.titel')}
          gewaehlt={[auswahl.zeitraum]}
          optionen={ZEITRAEUME.map((z) => ({ wert: z, text: t(`kz.zeitraum.${z}`) }))}
          onChange={([z]) => {
            onAuswahl({ zeitraum: (z ?? 'jahr') as Zeitraum })
          }}
        />
        <Filterchips
          einzeln
          beschriftung={t('kz.bereich.titel')}
          gewaehlt={[auswahl.bereich]}
          optionen={BEREICHE.map((b) => ({ wert: b, text: t(`kz.bereich.${b}`) }))}
          onChange={([b]) => {
            onAuswahl({ bereich: (b ?? 'alle') as Bereich })
          }}
        />
      </div>

      <Reiter
        value={auswahl.reiter}
        onValueChange={(r) => {
          onAuswahl({ reiter: r as KennzahlenReiter })
        }}
      >
        <ReiterListe>
          {KENNZAHLEN_REITER.map((r) => (
            <ReiterKnopf key={r} value={r}>
              {t(`kz.reiter.${r}`)}
            </ReiterKnopf>
          ))}
        </ReiterListe>

        <ReiterInhalt value="verkauf" className="flex flex-col gap-4 pt-4">
          {fakten.isError && <Fehlerzustand onNochmal={() => void fakten.refetch()} />}
          {fakten.isLoading && <Skelett className="h-64" />}
          {fakten.data && (
            <>
              <Kacheln
                fakten={gefiltert}
                onDetail={setDetail}
                onNachfassen={() => void navigate({ to: '/quotes', search: { ansicht: 'nachfassen' } })}
              />
              <div className="grid items-start gap-4 xl:grid-cols-2">
                <KennzahlTabelle
                  titel={t('kz.nachStandort')}
                  spalten={nachStandort(gefiltert).map((s) => ({ ...s, titel: t(`kz.spalte.${s.id}`) }))}
                  onDetail={setDetail}
                  testId="kz-standort"
                />
                <OffertenBalken
                  fakten={gefiltert}
                  zeitraum={auswahl.zeitraum}
                  von={von}
                  bis={bis}
                  onDetail={setDetail}
                />
              </div>
              <Quellen fakten={gefiltert} onDetail={setDetail} />
              <KennzahlTabelle
                titel={t('kz.nachPerson')}
                spalten={spaltenPerson}
                onDetail={setDetail}
                testId="kz-person"
              />
            </>
          )}
        </ReiterInhalt>
        <ReiterInhalt value="pipeline" className="pt-4">
          <Pipeline bereich={auswahl.bereich} />
        </ReiterInhalt>
        <ReiterInhalt value="betrieb" className="pt-4">
          <Betrieb von={von} bis={bis} bereich={auswahl.bereich} />
        </ReiterInhalt>
      </Reiter>

      {detail && (
        <DetailDialog
          detail={detail}
          onSchliessen={() => {
            setDetail(null)
          }}
        />
      )}
    </div>
  )
}
