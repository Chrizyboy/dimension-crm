import { useTranslation } from 'react-i18next'
import { AutomatischGeplant } from '@/components/shared/automatik/AutomatischGeplant'
import { KiAkteAbschnitt } from '@/components/shared/ki/KiAkteAbschnitt'
import { Fehlerzustand } from '@/components/shared/Zustaende'
import { Karte } from '@/components/ui/karte'
import { Skelett } from '@/components/ui/diverses'
import { Reiter, ReiterInhalt, ReiterKnopf, ReiterListe } from '@/components/ui/reiter'
import { useAkte, useLieferfrist, useProjekt, useSignale } from '../hooks/useProjekte'
import { heuteIso, hinweise } from '../lib/leitstand'
import { AKTE_REITER, type AkteReiter } from '../types'
import { AkteBeteiligte } from './AkteBeteiligte'
import { AkteFahrplan } from './AkteFahrplan'
import { AkteMaengel } from './AkteMaengel'
import { AkteSubunternehmer } from './AkteSubunternehmer'
import { AkteUebersicht } from './AkteUebersicht'
import { AkteZeitplan } from './AkteZeitplan'
import { Phasen } from './AktePhasen'
import { Geld, Kalkulation, Material, Termine } from './AkteRechts'
import { SeiteKopf } from './AkteKopf'
import { Verlauf } from './AkteVerlauf'
import { ZuTun } from './AkteZuTun'

/**
 * Projekt-Akte als ganze Seite, gebaut für die Projektleitung: oben Kopf und Phasen, links wer und was (Kunde,
 * Baustelle, Anlage, Bauplanung), in der Mitte was zu tun ist und was passiert ist (oder Fahrplan, Zeitplan,
 * Subunternehmer), rechts Termine, Material, Geld und Nachkalkulation.
 */
export function ProjektSeite({
  id,
  reiter,
  onReiter,
  onZurueck,
}: {
  id: string
  reiter: AkteReiter
  onReiter: (r: AkteReiter) => void
  onZurueck: () => void
}) {
  const { t } = useTranslation()
  const { projekt, fahrplan } = useProjekt(id)
  const akte = useAkte(id)
  const signale = useSignale()
  const lieferfrist = useLieferfrist().data
  const p = projekt.data
  if (projekt.error) return <Fehlerzustand details={String(projekt.error)} onNochmal={() => void projekt.refetch()} />
  if (!p) return <Skelett className="h-[32rem]" />
  const a = akte.data
  const h = hinweise(p, signale.data?.get(p.id), heuteIso(), lieferfrist)

  return (
    <div className="flex flex-col gap-4">
      <SeiteKopf p={p} akte={a} hinweise={h} onZurueck={onZurueck} />
      <Phasen p={p} />
      <div className="grid items-start gap-4 lg:grid-cols-2 2xl:grid-cols-[23rem_minmax(0,1fr)_23rem]">
        <div className="flex min-w-0 flex-col gap-4">
          <AkteUebersicht key={p.id + String(p.werktage) + (p.elektriker ?? '')} projekt={p} />
          {a && <AkteBeteiligte projektId={p.id} beteiligte={a.beteiligte} />}
        </div>
        <div className="order-first flex min-w-0 flex-col gap-4 lg:order-last lg:col-span-2 2xl:order-none 2xl:col-span-1">
          <Reiter
            value={reiter}
            onValueChange={(r) => {
              onReiter(r as AkteReiter)
            }}
          >
            <ReiterListe>
              {AKTE_REITER.map((r) => (
                <ReiterKnopf key={r} value={r}>
                  {t(`projekte.akteReiter.${r}`)}
                </ReiterKnopf>
              ))}
            </ReiterListe>
            <ReiterInhalt value="uebersicht" className="flex flex-col gap-4 pt-3">
              {fahrplan.data ? (
                <ZuTun
                  projekt={p}
                  schritte={fahrplan.data}
                  onAlle={() => {
                    onReiter('fahrplan')
                  }}
                />
              ) : (
                <Skelett className="h-40" />
              )}
              {a && <AkteMaengel projektId={p.id} maengel={a.maengel} />}
              <Verlauf projektId={p.id} akte={a} />
              <Karte className="px-3">
                <KiAkteAbschnitt
                  bezug={{ tabelle: 'projekte', id: p.id }}
                  art="auftrag"
                  mail={{ kontakt_id: p.kontakt_id, projekt_id: p.id }}
                />
                <AutomatischGeplant tabelle="projekte" id={p.id} />
              </Karte>
            </ReiterInhalt>
            <ReiterInhalt value="fahrplan" className="pt-3">
              {fahrplan.data ? <AkteFahrplan projekt={p} schritte={fahrplan.data} /> : <Skelett className="h-64" />}
            </ReiterInhalt>
            <ReiterInhalt value="zeitplan">
              <AkteZeitplan projekt={p} />
            </ReiterInhalt>
            <ReiterInhalt value="subunternehmer">
              <AkteSubunternehmer projekt={p} />
            </ReiterInhalt>
          </Reiter>
        </div>
        <div className="flex min-w-0 flex-col gap-4">
          {akte.error ? (
            <Fehlerzustand details={String(akte.error)} onNochmal={() => void akte.refetch()} />
          ) : !a ? (
            <Skelett className="h-80" />
          ) : (
            <>
              <Termine
                akte={a}
                onPlanen={() => {
                  onReiter('zeitplan')
                }}
              />
              <Material akte={a} projektId={p.id} />
              <Geld p={p} akte={a} />
              <Kalkulation p={p} akte={a} />
            </>
          )}
        </div>
      </div>
    </div>
  )
}
