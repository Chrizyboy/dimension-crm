import { Building2, Plus } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Seitenkopf } from '@/components/shared/Seitenkopf'
import { Leerzustand } from '@/components/shared/Zustaende'
import { Button } from '@/components/ui/button'
import { Reiter, ReiterInhalt, ReiterKnopf, ReiterListe } from '@/components/ui/reiter'
import { supabase } from '@/services/supabase'
import { useGrossprojekte } from '../hooks/useGrossprojekte'
import { inAnsicht } from '../lib/anzeige'
import { ANSICHTEN, type Ansicht } from '../types'
import { Annahmen } from './Annahmen'
import { EntscheidDialog } from './EntscheidDialog'
import { GrossprojektAkte, type AkteAktion } from './GrossprojektAkte'
import { GrossprojektDialog } from './GrossprojektDialog'
import { GrossprojektListe } from './GrossprojektListe'

/** Wohin die Seite springt: Reiter und offenes Grossprojekt stehen in der Adresse. */
export interface GrossprojekteZiel {
  ansicht?: Ansicht
  projekt?: string | null
}

type Fenster = AkteAktion | 'neu' | null

/**
 * Grossprojekte (Phase 8c): Gebäude und Bauvorhaben, bei denen sich PV- oder Wärme-Contracting lohnen kann, mit
 * Punkten, Schätzung und Entscheid. Alles bleibt im CRM: Liste, Karte auf «Mein Tag», Glocke. Akte als Seitenpanel
 * (#/contracting?projekt=…).
 */
export default function Grossprojekte({
  ansicht,
  projektId,
  onNavigation,
}: {
  ansicht: Ansicht
  projektId: string | null
  onNavigation: (z: GrossprojekteZiel) => void
}) {
  const { t } = useTranslation()
  const [fenster, setFenster] = useState<Fenster>(null)
  const alle = useGrossprojekte().data ?? []
  const projekt = alle.find((g) => g.id === projektId) ?? null
  const zu = () => {
    setFenster(null)
  }

  if (!supabase) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <Leerzustand icon={Building2} titel={t('grossprojekte.titel')} text={t('projekte.ohneDatenbank')} />
      </div>
    )
  }

  // Zahl auf dem Reiter: «Prüfen» ohne Ausgeschlossene, wie die Liste.
  const anzahl = (a: Ansicht) =>
    a === 'annahmen' || a === 'alle'
      ? null
      : alle.filter((g) => inAnsicht(g, a) && (a !== 'pruefen' || !g.ausschluss)).length

  return (
    <div className="mx-auto flex w-full max-w-[96rem] flex-col gap-4 px-4 py-6 sm:px-6">
      <Seitenkopf
        titel={t('grossprojekte.titel')}
        beschreibung={t('grossprojekte.beschreibung')}
        aktionen={
          <Button
            onClick={() => {
              setFenster('neu')
            }}
          >
            <Plus />
            {t('grossprojekte.erfassen')}
          </Button>
        }
      />
      <Reiter
        value={ansicht}
        onValueChange={(a) => {
          onNavigation({ ansicht: a as Ansicht, projekt: null })
        }}
      >
        <ReiterListe>
          {ANSICHTEN.map((a) => (
            <ReiterKnopf key={a} value={a}>
              {t(`grossprojekte.reiter.${a}`)}
              {anzahl(a) ? <span className="text-muted-foreground zahlen ml-1.5 text-xs">{anzahl(a)}</span> : null}
            </ReiterKnopf>
          ))}
        </ReiterListe>
        {ANSICHTEN.filter((a) => a !== 'annahmen').map((a) => (
          <ReiterInhalt key={a} value={a} className="pt-4">
            <GrossprojektListe
              ansicht={a}
              aktiveId={projektId}
              onOeffnen={(id) => {
                onNavigation({ projekt: id })
              }}
            />
          </ReiterInhalt>
        ))}
        <ReiterInhalt value="annahmen" className="pt-4">
          <Annahmen />
        </ReiterInhalt>
      </Reiter>

      {projektId && (
        <GrossprojektAkte
          key={projektId}
          id={projektId}
          onAktion={setFenster}
          onSchliessen={() => {
            onNavigation({ projekt: null })
          }}
        />
      )}
      {projektId && (fenster === 'verwerfen' || fenster === 'beobachten') && (
        <EntscheidDialog id={projektId} art={fenster} onSchliessen={zu} />
      )}
      {(fenster === 'neu' || (fenster === 'bearbeiten' && projekt)) && (
        <GrossprojektDialog
          grossprojekt={fenster === 'bearbeiten' ? projekt : null}
          onSchliessen={zu}
          onFertig={(id) => {
            zu()
            onNavigation({ projekt: id })
          }}
        />
      )}
    </div>
  )
}
