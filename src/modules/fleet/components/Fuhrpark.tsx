import { Plus, Truck } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Seitenkopf } from '@/components/shared/Seitenkopf'
import { Leerzustand } from '@/components/shared/Zustaende'
import { Button } from '@/components/ui/button'
import { Reiter, ReiterInhalt, ReiterKnopf, ReiterListe } from '@/components/ui/reiter'
import { hatRecht } from '@/lib/rechte'
import { supabase } from '@/services/supabase'
import { useAnmeldung } from '@/stores/anmeldung'
import { useFahrzeuge, useGeraete } from '../hooks/useRessourcen'
import { ANSICHTEN, type Ansicht, type Belegung, type Schaden } from '../types'
import { Belegungsplan } from './Belegungsplan'
import { EintragDialog } from './EintragDialog'
import { Erledigen } from './Erledigen'
import { FahrzeugDialog } from './FahrzeugDialog'
import { FahrzeugListe } from './FahrzeugListe'
import { FahrzeugSeite, type AkteAktion } from './FahrzeugSeite'
import { FristenListe } from './FristenListe'
import { GeraetAkte } from './GeraetAkte'
import { GeraetDialog } from './GeraetDialog'
import { GeraeteListe } from './GeraeteListe'
import { KostenAnsicht } from './KostenAnsicht'
import { ReservierenDialog } from './ReservierenDialog'
import { SchadenDialog } from './SchadenDialog'
import { UebergebenDialog } from './UebergebenDialog'

/** Wohin die Seite springt: Reiter und offene Akte stehen in der Adresse. */
export interface FuhrparkZiel {
  ansicht?: Ansicht
  fahrzeug?: string | null
  geraet?: string | null
  km?: boolean
}

type Fenster =
  | { art: AkteAktion | 'neu' }
  | { art: 'schadenBearbeiten'; schaden: Schaden }
  | { art: 'einsatz'; belegung: Belegung }
  | { art: 'planReservieren'; bezug: { fahrzeug?: string; geraet?: string }; tag: string }
  | null

/**
 * Fahrzeuge & Geräte: «Zu erledigen» (alles, was ansteht), Fahrzeuge, Geräte, Belegung, Fristen und Kosten.
 * Ein Fahrzeug öffnet als ganze Seite (#/fleet?fahrzeug=…), ein Gerät als Seitenpanel (?ansicht=geraete&geraet=…).
 * `km` (aus der Glocke am Monatsanfang) öffnet gleich «Kilometerstand eintragen».
 */
export default function Fuhrpark({
  ansicht,
  fahrzeugId,
  geraetId,
  km,
  onNavigation,
}: {
  ansicht: Ansicht
  fahrzeugId: string | null
  geraetId: string | null
  km: boolean
  onNavigation: (z: FuhrparkZiel) => void
}) {
  const { t } = useTranslation()
  const ich = useAnmeldung((z) => z.ich)
  const [fenster, setFenster] = useState<Fenster>(null)
  const fahrzeug = useFahrzeuge().data?.find((f) => f.id === fahrzeugId) ?? null
  const geraet = useGeraete().data?.find((g) => g.id === geraetId) ?? null
  const zu = () => {
    setFenster(null)
    if (km) onNavigation({ km: false })
  }
  const aktion = (a: AkteAktion) => {
    setFenster({ art: a })
  }
  const schaden = (s: Schaden) => {
    setFenster({ art: 'schadenBearbeiten', schaden: s })
  }

  if (!supabase) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <Leerzustand icon={Truck} titel={t('fuhrpark.titel')} text={t('projekte.ohneDatenbank')} />
      </div>
    )
  }

  const bezug = fahrzeugId ? { fahrzeug: fahrzeugId } : geraetId ? { geraet: geraetId } : null
  const neuGeraet = ansicht === 'geraete'
  const art = fenster?.art ?? (km && fahrzeugId ? 'eintrag' : null)
  const reiter = ANSICHTEN.filter((a) => a !== 'kosten' || hatRecht(ich, 'finanzen'))

  return (
    <div className="mx-auto flex w-full max-w-[96rem] flex-col gap-4 px-4 py-6 sm:px-6">
      {fahrzeugId ? (
        <FahrzeugSeite
          key={fahrzeugId}
          id={fahrzeugId}
          onAktion={aktion}
          onSchaden={schaden}
          onZurueck={() => {
            onNavigation({ ansicht: 'fahrzeuge', fahrzeug: null })
          }}
        />
      ) : (
        <>
          <Seitenkopf
            titel={t('fuhrpark.titel')}
            beschreibung={t('fuhrpark.beschreibung')}
            aktionen={
              <Button
                onClick={() => {
                  setFenster({ art: 'neu' })
                }}
              >
                <Plus />
                {t(neuGeraet ? 'fuhrpark.geraet.neu' : 'fuhrpark.fahrzeug.neu')}
              </Button>
            }
          />
          <Reiter
            value={ansicht}
            onValueChange={(a) => {
              onNavigation({ ansicht: a as Ansicht, fahrzeug: null, geraet: null })
            }}
          >
            <ReiterListe>
              {reiter.map((a) => (
                <ReiterKnopf key={a} value={a}>
                  {t(`fuhrpark.reiter.${a}`)}
                </ReiterKnopf>
              ))}
            </ReiterListe>
            <ReiterInhalt value="erledigen" className="pt-4">
              <Erledigen onOeffnen={onNavigation} />
            </ReiterInhalt>
            <ReiterInhalt value="fahrzeuge" className="pt-4">
              <FahrzeugListe
                aktiveId={fahrzeugId}
                onOeffnen={(id) => {
                  onNavigation({ fahrzeug: id })
                }}
              />
            </ReiterInhalt>
            <ReiterInhalt value="geraete" className="pt-4">
              <GeraeteListe
                aktiveId={geraetId}
                onOeffnen={(id) => {
                  onNavigation({ geraet: id })
                }}
              />
            </ReiterInhalt>
            <ReiterInhalt value="belegung" className="pt-4">
              <Belegungsplan
                onEinsatz={(b) => {
                  setFenster({ art: 'einsatz', belegung: b })
                }}
                onReservieren={(bz, tag) => {
                  setFenster({ art: 'planReservieren', bezug: bz, tag })
                }}
              />
            </ReiterInhalt>
            <ReiterInhalt value="fristen" className="pt-4">
              <FristenListe
                onOeffnen={(f) => {
                  if (f.bezug_tabelle === 'qualifikationen')
                    window.location.hash = `#/staff?person=${f.person_id ?? ''}`
                  else if (f.bezug_tabelle === 'fahrzeuge') onNavigation({ fahrzeug: f.bezug_id })
                  else onNavigation({ geraet: f.bezug_id })
                }}
              />
            </ReiterInhalt>
            <ReiterInhalt value="kosten" className="pt-4">
              <KostenAnsicht />
            </ReiterInhalt>
          </Reiter>
        </>
      )}

      {geraetId && (
        <GeraetAkte
          key={geraetId}
          id={geraetId}
          onAktion={aktion}
          onSchaden={schaden}
          onSchliessen={() => {
            onNavigation({ geraet: null })
          }}
        />
      )}
      {(art === 'eintrag' || art === 'schaden') && bezug && (
        <EintragDialog
          bezug={bezug}
          kmStand={fahrzeug?.km_stand ?? null}
          {...(art === 'schaden' ? { startArt: 'schaden' } : {})}
          onSchliessen={zu}
        />
      )}
      {art === 'uebergeben' && bezug && <UebergebenDialog bezug={bezug} onSchliessen={zu} />}
      {art === 'reservieren' && bezug && <ReservierenDialog bezug={bezug} onSchliessen={zu} />}
      {fenster?.art === 'planReservieren' && (
        <ReservierenDialog bezug={fenster.bezug} tag={fenster.tag} onSchliessen={zu} />
      )}
      {fenster?.art === 'einsatz' && <ReservierenDialog einsatz={fenster.belegung} onSchliessen={zu} />}
      {fenster?.art === 'schadenBearbeiten' && <SchadenDialog schaden={fenster.schaden} onSchliessen={zu} />}
      {((art === 'neu' && !neuGeraet) || (art === 'bearbeiten' && fahrzeug)) && (
        <FahrzeugDialog
          fahrzeug={art === 'bearbeiten' ? fahrzeug : null}
          onSchliessen={zu}
          onFertig={(id) => {
            zu()
            onNavigation({ ansicht: 'fahrzeuge', fahrzeug: id, geraet: null })
          }}
        />
      )}
      {((art === 'neu' && neuGeraet) || (art === 'bearbeiten' && geraet && !fahrzeugId)) && (
        <GeraetDialog
          geraet={art === 'bearbeiten' ? geraet : null}
          onSchliessen={zu}
          onFertig={(id) => {
            zu()
            onNavigation({ ansicht: 'geraete', geraet: id, fahrzeug: null })
          }}
        />
      )}
    </div>
  )
}
