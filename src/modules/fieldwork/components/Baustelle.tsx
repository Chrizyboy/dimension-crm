import { ClipboardCheck } from 'lucide-react'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Seitenkopf } from '@/components/shared/Seitenkopf'
import { Leerzustand } from '@/components/shared/Zustaende'
import { Reiter, ReiterInhalt, ReiterKnopf, ReiterListe } from '@/components/ui/reiter'
import { supabase } from '@/services/supabase'
import { useNachSenden } from '../hooks/useBaustelle'
import { warteschlangeStarten } from '../services/warteschlange'
import { hatRecht } from '@/lib/rechte'
import { useAnmeldung } from '@/stores/anmeldung'
import { REITER, REITER_LEITUNG, type Reiter as ReiterTyp } from '../types'
import { AuswertungAnsicht } from './AuswertungAnsicht'
import { BaustellenAkteAnsicht } from './BaustellenAkteAnsicht'
import { BaustellenListe } from './BaustellenListe'
import { LeitstandHeute } from './LeitstandHeute'
import { MeldungenListe } from './MeldungenListe'
import { MeinTag } from './MeinTag'
import { Nachtraege } from './Nachtraege'
import { Netzstand } from './Netzstand'
import { RapportAkte } from './RapportAkte'
import { RapportListe } from './RapportListe'
import { Zeiten } from './Zeiten'

/** Navigation der Seite: Reiter und offener Rapport stehen in der Adresse. */
export interface BaustelleNavigation {
  reiter?: ReiterTyp
  rapport?: string | null
  baustelle?: string | null
}

/**
 * Baustelle & Rapporte: «Mein Tag» für Monteure am Handy (Einsätze, Start/Stopp, Rapport mit Fotos und
 * Unterschrift, auch ohne Netz), dazu fürs Büro Rapporte, Zeiten (prüfen, Lohn-Export) und Nachträge.
 * #/fieldwork?reiter=…&rapport=…
 */
export default function Baustelle({
  reiter,
  rapportId,
  baustelleId,
  onNavigation,
}: {
  reiter: ReiterTyp
  rapportId: string | null
  baustelleId: string | null
  onNavigation: (z: BaustelleNavigation) => void
}) {
  const { t } = useTranslation()
  const ich = useAnmeldung((z) => z.ich)
  const leitung = hatRecht(ich, 'preise')
  // Monteure sehen nur ihre Reiter; Leitstand, Baustellen, Meldungen und Auswertung sind für Leitung und GL.
  const reiterListe = REITER.filter((r) => leitung || !REITER_LEITUNG.includes(r))
  useNachSenden()
  useEffect(() => {
    warteschlangeStarten()
  }, [])

  if (!supabase) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <Leerzustand icon={ClipboardCheck} titel={t('baustelle.titel')} text={t('projekte.ohneDatenbank')} />
      </div>
    )
  }

  const oeffnen = (id: string | null) => {
    onNavigation({ rapport: id })
  }
  const baustelleOeffnen = (id: string | null) => {
    onNavigation({ baustelle: id })
  }

  return (
    <div className="mx-auto flex w-full max-w-[96rem] flex-col gap-4 px-3 py-4 sm:px-6 sm:py-6">
      <Seitenkopf titel={t('baustelle.titel')} beschreibung={t('baustelle.beschreibung')} aktionen={<Netzstand />} />
      <Reiter
        value={reiter}
        onValueChange={(r) => {
          onNavigation({ reiter: r as ReiterTyp, rapport: null, baustelle: null })
        }}
      >
        <ReiterListe>
          {reiterListe.map((r) => (
            <ReiterKnopf key={r} value={r}>
              {t(`baustelle.reiter.${r}`)}
            </ReiterKnopf>
          ))}
        </ReiterListe>
        {leitung && (
          <>
            <ReiterInhalt value="heute" className="pt-4">
              <LeitstandHeute onBaustelle={baustelleOeffnen} onRapport={oeffnen} />
            </ReiterInhalt>
            <ReiterInhalt value="baustellen" className="pt-4">
              <BaustellenListe aktiveId={baustelleId} onOeffnen={baustelleOeffnen} />
            </ReiterInhalt>
            <ReiterInhalt value="meldungen" className="pt-4">
              <MeldungenListe />
            </ReiterInhalt>
            <ReiterInhalt value="auswertung" className="pt-4">
              <AuswertungAnsicht onBaustelle={baustelleOeffnen} />
            </ReiterInhalt>
          </>
        )}
        <ReiterInhalt value="tag" className="pt-4">
          <MeinTag onRapport={oeffnen} />
        </ReiterInhalt>
        <ReiterInhalt value="rapporte" className="pt-4">
          <RapportListe aktiveId={rapportId} onOeffnen={oeffnen} />
        </ReiterInhalt>
        <ReiterInhalt value="zeiten" className="pt-4">
          <Zeiten />
        </ReiterInhalt>
        <ReiterInhalt value="nachtraege" className="pt-4">
          <Nachtraege onRapport={oeffnen} />
        </ReiterInhalt>
      </Reiter>
      {baustelleId && (
        <BaustellenAkteAnsicht
          key={baustelleId}
          projektId={baustelleId}
          onSchliessen={() => {
            baustelleOeffnen(null)
          }}
          onRapport={oeffnen}
        />
      )}
      {rapportId && (
        <RapportAkte
          key={rapportId}
          id={rapportId}
          onSchliessen={() => {
            oeffnen(null)
          }}
        />
      )}
    </div>
  )
}
