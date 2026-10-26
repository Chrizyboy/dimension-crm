import { Plus, Truck } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Seitenkopf } from '@/components/shared/Seitenkopf'
import { Leerzustand } from '@/components/shared/Zustaende'
import { Button } from '@/components/ui/button'
import { Reiter, ReiterInhalt, ReiterKnopf, ReiterListe } from '@/components/ui/reiter'
import { supabase } from '@/services/supabase'
import { useFahrzeuge, useGeraete } from '../hooks/useRessourcen'
import { ANSICHTEN, type Ansicht } from '../types'
import { EintragDialog } from './EintragDialog'
import { FahrzeugAkte, type AkteAktion } from './FahrzeugAkte'
import { FahrzeugDialog } from './FahrzeugDialog'
import { FahrzeugListe } from './FahrzeugListe'
import { FristenListe } from './FristenListe'
import { GeraetAkte } from './GeraetAkte'
import { GeraetDialog } from './GeraetDialog'
import { GeraeteListe } from './GeraeteListe'
import { UebergebenDialog } from './UebergebenDialog'

/** Wohin die Seite springt: Reiter und offene Akte stehen in der Adresse. */
export interface FuhrparkZiel {
  ansicht?: Ansicht
  fahrzeug?: string | null
  geraet?: string | null
}

type Fenster = AkteAktion | 'neu' | null

/**
 * Fahrzeuge & Geräte (ERP-Lückenanalyse, Phase 17): Fahrzeuge mit MFK, Service und Kilometern, Geräte mit
 * Prüftermin und wer sie hat, alle Fristen an einem Ort. Akte als Seitenpanel (#/fleet?fahrzeug=… oder
 * ?ansicht=geraete&geraet=…). Am Handy: Eintrag erfassen und Übergeben direkt aus der Akte.
 */
export default function Fuhrpark({
  ansicht,
  fahrzeugId,
  geraetId,
  onNavigation,
}: {
  ansicht: Ansicht
  fahrzeugId: string | null
  geraetId: string | null
  onNavigation: (z: FuhrparkZiel) => void
}) {
  const { t } = useTranslation()
  const [fenster, setFenster] = useState<Fenster>(null)
  const fahrzeug = useFahrzeuge().data?.find((f) => f.id === fahrzeugId) ?? null
  const geraet = useGeraete().data?.find((g) => g.id === geraetId) ?? null
  const zu = () => {
    setFenster(null)
  }

  if (!supabase) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <Leerzustand icon={Truck} titel={t('fuhrpark.titel')} text={t('projekte.ohneDatenbank')} />
      </div>
    )
  }

  const bezug = fahrzeugId ? { fahrzeug: fahrzeugId } : geraetId ? { geraet: geraetId } : null
  // «Neu» legt an, was der Reiter zeigt; auf «Fristen» ein Fahrzeug.
  const neuGeraet = ansicht === 'geraete'

  return (
    <div className="mx-auto flex w-full max-w-[96rem] flex-col gap-4 px-4 py-6 sm:px-6">
      <Seitenkopf
        titel={t('fuhrpark.titel')}
        beschreibung={t('fuhrpark.beschreibung')}
        aktionen={
          <Button
            onClick={() => {
              setFenster('neu')
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
          {ANSICHTEN.map((a) => (
            <ReiterKnopf key={a} value={a}>
              {t(`fuhrpark.reiter.${a}`)}
            </ReiterKnopf>
          ))}
        </ReiterListe>
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
        <ReiterInhalt value="fristen" className="pt-4">
          <FristenListe
            onOeffnen={(f) => {
              if (f.bezug_tabelle === 'qualifikationen') window.location.hash = `#/staff?person=${f.person_id ?? ''}`
              else if (f.bezug_tabelle === 'fahrzeuge') onNavigation({ fahrzeug: f.bezug_id })
              else onNavigation({ geraet: f.bezug_id })
            }}
          />
        </ReiterInhalt>
      </Reiter>

      {fahrzeugId && (
        <FahrzeugAkte
          key={fahrzeugId}
          id={fahrzeugId}
          onAktion={setFenster}
          onSchliessen={() => {
            onNavigation({ fahrzeug: null })
          }}
        />
      )}
      {geraetId && (
        <GeraetAkte
          key={geraetId}
          id={geraetId}
          onAktion={setFenster}
          onSchliessen={() => {
            onNavigation({ geraet: null })
          }}
        />
      )}
      {fenster === 'eintrag' && bezug && (
        <EintragDialog bezug={bezug} kmStand={fahrzeug?.km_stand ?? null} onSchliessen={zu} />
      )}
      {fenster === 'uebergeben' && bezug && <UebergebenDialog bezug={bezug} onSchliessen={zu} />}
      {((fenster === 'neu' && !neuGeraet) || (fenster === 'bearbeiten' && fahrzeug)) && (
        <FahrzeugDialog
          fahrzeug={fenster === 'bearbeiten' ? fahrzeug : null}
          onSchliessen={zu}
          onFertig={(id) => {
            zu()
            onNavigation({ ansicht: 'fahrzeuge', fahrzeug: id, geraet: null })
          }}
        />
      )}
      {((fenster === 'neu' && neuGeraet) || (fenster === 'bearbeiten' && geraet)) && (
        <GeraetDialog
          geraet={fenster === 'bearbeiten' ? geraet : null}
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
