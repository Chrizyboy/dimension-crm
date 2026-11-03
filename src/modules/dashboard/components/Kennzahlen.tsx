import { useIstAdmin } from '@/hooks/useIstAdmin'
import { ChartColumn, Target } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Filterchips } from '@/components/shared/Filterchips'
import { Seitenkopf } from '@/components/shared/Seitenkopf'
import { Fehlerzustand, Leerzustand } from '@/components/shared/Zustaende'
import { Auswahl } from '@/components/ui/auswahl'
import { Button } from '@/components/ui/button'
import { Skelett } from '@/components/ui/diverses'
import { Reiter, ReiterInhalt, ReiterKnopf, ReiterListe } from '@/components/ui/reiter'
import { supabase } from '@/services/supabase'
import { useAnmeldung } from '@/stores/anmeldung'
import { useKzEinstellungen, usePersonenNamen, useZeilen } from '../hooks/useKennzahlen'
import { nachBereich } from '../lib/auswertung'
import { siehtFinanzen } from '../lib/rolle'
import { von as zeilenVon } from '../lib/verkauf'
import { heuteZuerich, vergleichVon, vonBis } from '../lib/zeitraum'
import { STANDARD_EINSTELLUNGEN } from '../lib/ziele'
import {
  BEREICHE,
  KENNZAHLEN_REITER,
  VERGLEICHE,
  ZEITRAEUME,
  type Bereich,
  type Detail,
  type Fakt,
  type KennzahlenReiter,
  type Vergleich,
  type Zeitraum,
} from '../types'
import { AlleZahlen } from './AlleZahlen'
import { DetailDialog } from './DetailDialog'
import { MonatsberichtKnopf } from './MonatsberichtKnopf'
import { Abwicklung } from './ReiterAbwicklung'
import { Finanzen } from './ReiterFinanzen'
import { PipelineReiter } from './ReiterPipeline'
import type { ReiterProps } from './reiterProps'
import { Service } from './ReiterService'
import { Ueberblick } from './ReiterUeberblick'
import { Verkauf } from './ReiterVerkauf'
import { ZieleDialog } from './ZieleDialog'

/** Was die Adresse festhält: Reiter, Zeitraum, Firma, Vergleich, Person und ein Monat für den Bericht. */
export interface KennzahlenAuswahl {
  reiter: KennzahlenReiter
  zeitraum: Zeitraum
  bereich: Bereich
  vergleich: Vergleich
  person: string | null
  bericht?: string | undefined
}

const ALLE = '__alle'

/**
 * Kennzahlen (Neuentwurf 2.11.2026, Entscheid 0045): Überblick, Verkauf, Pipeline & Prognose, Abwicklung,
 * Finanzen, Service & Wartung und alle Zahlen. Jede Zahl mit Vergleich (Vorjahr oder Vorperiode) und, wo es eines
 * gibt, Ziel; jede Zahl zeigt per Klick ihre Einträge.
 */
export default function Kennzahlen({
  auswahl,
  onAuswahl,
}: {
  auswahl: KennzahlenAuswahl
  onAuswahl: (a: Partial<KennzahlenAuswahl>) => void
}) {
  const { t } = useTranslation()
  const ich = useAnmeldung((z) => z.ich)
  const [detail, setDetail] = useState<Detail | null>(null)
  const [zieleOffen, setZieleOffen] = useState(false)
  const admin = useIstAdmin()
  const heute = heuteZuerich()
  const { von, bis } = vonBis(auswahl.zeitraum, heute)
  const vergleich = vergleichVon(auswahl.zeitraum, auswahl.vergleich, von, bis)
  const jetzt = useZeilen(von, bis)
  const vorher = useZeilen(vergleich?.von ?? von, vergleich?.bis ?? bis, vergleich !== null)
  const personen = usePersonenNamen()
  const einst = useKzEinstellungen()
  const finanzen = siehtFinanzen(ich, !supabase)

  if (!supabase) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <Leerzustand icon={ChartColumn} titel={t('kz.titel')} text={t('projekte.ohneDatenbank')} />
      </div>
    )
  }

  const filtern = (f: Fakt[]) => {
    const b = nachBereich(f, auswahl.bereich)
    return auswahl.person ? b.filter((x) => x.person_id === auswahl.person) : b
  }
  const alleFakten = nachBereich(jetzt.data ?? [], auswahl.bereich)
  // Personen, die verkaufen (Offerten im Zeitraum), für Filter und Ziele.
  const verkaeufer = (personen.data ?? []).filter((p) =>
    (jetzt.data ?? []).some((f) => f.person_id === p.id && ['gesendet', 'angenommen', 'offen'].includes(f.schluessel)),
  )
  const props: ReiterProps = {
    fakten: filtern(jetzt.data ?? []),
    alleFakten,
    vorher: vergleich && vorher.data ? filtern(vorher.data) : null,
    vergleichName: t(`kz.vergleich.${auswahl.vergleich}`),
    vergleich,
    zeitraum: auswahl.zeitraum,
    von,
    bis,
    heute,
    bereich: auswahl.bereich,
    person: auswahl.person,
    e: einst.data ?? STANDARD_EINSTELLUNGEN,
    personen: personen.data ?? [],
    ich,
    finanzen,
    onDetail: setDetail,
    filtern,
  }
  const inhalt = (r: KennzahlenReiter) => {
    if (jetzt.isError) return <Fehlerzustand onNochmal={jetzt.refetch} />
    if (!jetzt.data) return <Skelett className="h-64" />
    if (r === 'ueberblick') return <Ueberblick {...props} />
    if (r === 'verkauf') return <Verkauf {...props} />
    if (r === 'pipeline') return <PipelineReiter {...props} />
    if (r === 'abwicklung') return <Abwicklung {...props} />
    if (r === 'finanzen') return <Finanzen {...props} />
    if (r === 'service') return <Service {...props} />
    return <AlleZahlen {...props} />
  }

  return (
    <div className="mx-auto flex w-full max-w-[96rem] flex-col gap-4 px-4 py-6 sm:px-6">
      <Seitenkopf
        titel={t('kz.titel')}
        beschreibung={t('kz.beschreibung')}
        aktionen={
          finanzen ? (
            <div className="flex flex-wrap gap-2">
              {/* Ziele sind eine Firmen-Einstellung: ändern nur die Administration (Entscheid 0048). */}
              {admin && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setZieleOffen(true)
                  }}
                  data-testid="kz-ziele"
                >
                  <Target aria-hidden="true" />
                  {t('kz.ziele.knopf')}
                </Button>
              )}
              <MonatsberichtKnopf
                e={props.e}
                heute={heute}
                finanzen={finanzen}
                monatAusAdresse={auswahl.bericht}
                onErledigt={() => {
                  if (auswahl.bericht) onAuswahl({ bericht: undefined })
                }}
              />
            </div>
          ) : undefined
        }
      />
      <div className="flex flex-wrap items-end gap-x-6 gap-y-2">
        <Filterchips
          einzeln
          beschriftung={t('kz.zeitraum.titel')}
          gewaehlt={[auswahl.zeitraum]}
          optionen={ZEITRAEUME.map((z) => ({ wert: z, text: t(`kz.zeitraum.${z}`) }))}
          onChange={([z]) => {
            onAuswahl({ zeitraum: (z ?? 'jahr') as Zeitraum })
          }}
        />
        {auswahl.zeitraum !== 'alle' && (
          <Filterchips
            einzeln
            beschriftung={t('kz.vergleich.titel')}
            gewaehlt={[auswahl.vergleich]}
            optionen={VERGLEICHE.map((v) => ({ wert: v, text: t(`kz.vergleich.${v}`) }))}
            onChange={([v]) => {
              onAuswahl({ vergleich: (v ?? 'vorjahr') as Vergleich })
            }}
          />
        )}
        <Filterchips
          einzeln
          beschriftung={t('kz.bereich.titel')}
          gewaehlt={[auswahl.bereich]}
          optionen={BEREICHE.map((b) => ({ wert: b, text: t(`kz.bereich.${b}`) }))}
          onChange={([b]) => {
            onAuswahl({ bereich: (b ?? 'alle') as Bereich })
          }}
        />
        <div className="w-48">
          <Auswahl
            aria-label={t('kz.person.titel')}
            value={auswahl.person ?? ALLE}
            optionen={[
              { wert: ALLE, text: t('kz.person.alle') },
              ...(ich ? [{ wert: ich.id, text: t('kz.person.ich') }] : []),
              ...verkaeufer.filter((p) => p.id !== ich?.id).map((p) => ({ wert: p.id, text: p.name })),
            ]}
            onValueChange={(w) => {
              onAuswahl({ person: w === ALLE ? null : w })
            }}
          />
        </div>
      </div>

      <Reiter
        value={auswahl.reiter}
        onValueChange={(r) => {
          onAuswahl({ reiter: r as KennzahlenReiter })
        }}
      >
        <ReiterListe className="overflow-x-auto">
          {KENNZAHLEN_REITER.filter((r) => r !== 'finanzen' || finanzen).map((r) => (
            <ReiterKnopf key={r} value={r}>
              {t(`kz.reiter.${r}`)}
            </ReiterKnopf>
          ))}
        </ReiterListe>
        {KENNZAHLEN_REITER.map((r) => (
          <ReiterInhalt key={r} value={r} className="pt-4">
            {auswahl.reiter === r && inhalt(r)}
          </ReiterInhalt>
        ))}
      </Reiter>

      {vorher.isLoading && vergleich && (
        <p className="text-muted-foreground text-xs" aria-live="polite">
          {t('kz.vergleich.laedt')}
        </p>
      )}
      {zeilenVon(props.fakten, 'leads_neu').length === 0 && jetzt.data && auswahl.person && (
        <p className="text-muted-foreground text-xs">{t('kz.person.hinweis')}</p>
      )}

      {detail && (
        <DetailDialog
          detail={detail}
          onSchliessen={() => {
            setDetail(null)
          }}
        />
      )}
      {zieleOffen && (
        <ZieleDialog
          e={props.e}
          jahr={heute.slice(0, 4)}
          personen={(personen.data ?? []).filter(
            (p) =>
              verkaeufer.some((v) => v.id === p.id) || props.e.ziele[heute.slice(0, 4)]?.personen?.[p.id] !== undefined,
          )}
          onSchliessen={() => {
            setZieleOffen(false)
          }}
        />
      )}
    </div>
  )
}
