import { HardHat } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Seitenkopf } from '@/components/shared/Seitenkopf'
import { Leerzustand } from '@/components/shared/Zustaende'
import { Reiter, ReiterInhalt, ReiterKnopf, ReiterListe } from '@/components/ui/reiter'
import { supabase } from '@/services/supabase'
import { useProjekte } from '../hooks/useProjekte'
import { REITER, type AkteReiter, type Reiter as ReiterTyp } from '../types'
import { Abwesenheiten } from './Abwesenheiten'
import { Baustellen } from './Baustellen'
import { Bewilligungen } from './Bewilligungen'
import { ProjektAkte } from './ProjektAkte'
import { ProjektListe } from './ProjektListe'
import { SubunternehmerListe } from './SubunternehmerListe'
import { Zeitplan } from './Zeitplan'

/** Navigation der Seite: Reiter, offenes Projekt und Reiter der Akte stehen in der Adresse. */
export interface ProjekteNavigation {
  reiter?: ReiterTyp
  projekt?: string | null
  akte?: AkteReiter
}

/**
 * Projekte & Montage (V233 «Bauplanung»): Baustellen-Board je Standort, Zeitplan, Bewilligungen, alle
 * Projekte, Subunternehmer und Abwesenheiten. Ein Projekt öffnet sich als Akte rechts
 * (#/projects?reiter=zeitplan&projekt=…&akte=fahrplan).
 */
export default function Projekte({
  reiter,
  projektId,
  akte,
  onNavigation,
}: {
  reiter: ReiterTyp
  projektId: string | null
  akte: AkteReiter
  onNavigation: (z: ProjekteNavigation) => void
}) {
  const { t } = useTranslation()
  const imBau = useProjekte(['im_bau'])

  if (!supabase) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <Leerzustand icon={HardHat} titel={t('projekte.titel')} text={t('projekte.ohneDatenbank')} />
      </div>
    )
  }

  const oeffnen = (id: string | null) => {
    onNavigation({ projekt: id })
  }

  return (
    <div className="mx-auto flex w-full max-w-[96rem] flex-col gap-4 px-4 py-6 sm:px-6">
      <Seitenkopf titel={t('projekte.titel')} beschreibung={t('projekte.beschreibung')} />
      <Reiter
        value={reiter}
        onValueChange={(r) => {
          onNavigation({ reiter: r as ReiterTyp, projekt: null })
        }}
      >
        <ReiterListe className="max-w-full overflow-x-auto">
          {REITER.map((r) => (
            <ReiterKnopf key={r} value={r}>
              {t(`projekte.reiter.${r}`)}
              {r === 'baustellen' && imBau.data ? (
                <span className="text-muted-foreground zahlen ml-1.5 text-xs">{imBau.data.length}</span>
              ) : null}
            </ReiterKnopf>
          ))}
        </ReiterListe>
        <ReiterInhalt value="baustellen" className="pt-4">
          <Baustellen aktiveId={projektId} onOeffnen={oeffnen} />
        </ReiterInhalt>
        <ReiterInhalt value="zeitplan" className="pt-4">
          <Zeitplan />
        </ReiterInhalt>
        <ReiterInhalt value="bewilligungen" className="pt-4">
          <Bewilligungen onOeffnen={oeffnen} />
        </ReiterInhalt>
        <ReiterInhalt value="alle" className="pt-4">
          <ProjektListe aktiveId={projektId} onOeffnen={oeffnen} />
        </ReiterInhalt>
        <ReiterInhalt value="subunternehmer" className="pt-4">
          <SubunternehmerListe />
        </ReiterInhalt>
        <ReiterInhalt value="abwesenheiten" className="pt-4">
          <Abwesenheiten />
        </ReiterInhalt>
      </Reiter>
      {projektId && (
        <ProjektAkte
          key={projektId}
          id={projektId}
          reiter={akte}
          onReiter={(a) => {
            onNavigation({ akte: a })
          }}
          onSchliessen={() => {
            oeffnen(null)
          }}
        />
      )}
    </div>
  )
}
