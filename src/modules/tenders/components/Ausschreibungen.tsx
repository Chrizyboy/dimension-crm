import { Gavel, Plus } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Seitenkopf } from '@/components/shared/Seitenkopf'
import { Leerzustand } from '@/components/shared/Zustaende'
import { Button } from '@/components/ui/button'
import { Reiter, ReiterInhalt, ReiterKnopf, ReiterListe } from '@/components/ui/reiter'
import { hatRecht } from '@/lib/rechte'
import { supabase } from '@/services/supabase'
import { useAnmeldung } from '@/stores/anmeldung'
import { useTagesbericht } from '../hooks/useAusschreibungen'
import { REITER, type Reiter as ReiterTyp, type Tagesbericht } from '../types'
import { DossierSeite } from './akte/DossierSeite'
import { Auswertung } from './Auswertung'
import { ErfassenDialog } from './ErfassenDialog'
import { Freigabeliste } from './Freigabeliste'
import { Fristen } from './Fristen'
import { Leitstand } from './Leitstand'
import { Nachweise } from './Nachweise'
import { Quellen } from './Quellen'

/** Zahl am Reiter: was dort auf jemanden wartet. */
const ZAHL: Partial<Record<ReiterTyp, (b: Tagesbericht) => number>> = {
  leitstand: (b) => b.pruefen + b.kontakt_fehlt + b.antworten + (b.darf_pruefen ? b.pruefung : 0),
  bewilligen: (b) => b.bewilligen,
  senden: (b) => b.senden,
  fristen: (b) => b.fristen,
  nachweise: (b) => b.nachweise_ablauf,
  quellen: (b) => b.quellen_still,
}

/**
 * Ausschreibungs-Monitor: findet öffentliche Ausschreibungen und Baugesuche (simap, Amtsblatt, von Hand)
 * und führt sie durch drei Spuren: selbst offerieren (Submission bis Zuschlag), die richtige Firma anschreiben,
 * oder abwarten. Reiter und offenes Dossier stehen in der Adresse (#/tenders?reiter=fristen&dossier=…);
 * ein offenes Dossier ist eine ganze Seite (Akte), «Zurück» führt zum Reiter.
 */
export default function Ausschreibungen({
  dossierId,
  reiter,
  onNavigation,
}: {
  dossierId: string | null
  reiter: ReiterTyp
  onNavigation: (z: { dossier?: string | null; reiter?: ReiterTyp }) => void
}) {
  const { t } = useTranslation()
  const ich = useAnmeldung((z) => z.ich)
  const admin = hatRecht(ich, 'admin')
  const bericht = useTagesbericht()
  const [erfassen, setErfassen] = useState(false)

  if (!supabase) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <Leerzustand icon={Gavel} titel={t('ausschreibungen.titel')} text={t('ausschreibungen.ohneDatenbank')} />
      </div>
    )
  }

  const oeffnen = (id: string | null) => {
    onNavigation({ dossier: id, reiter })
    window.scrollTo({ top: 0 })
  }

  return (
    <div className="mx-auto flex w-full max-w-[96rem] flex-col gap-4 px-4 py-6 sm:px-6">
      <Seitenkopf
        titel={t('ausschreibungen.titel')}
        beschreibung={t('ausschreibungen.beschreibung')}
        aktionen={
          <Button
            variant="secondary"
            onClick={() => {
              setErfassen(true)
            }}
          >
            <Plus />
            {t('ausschreibungen.erfassen.knopf')}
          </Button>
        }
      />
      {dossierId ? (
        <DossierSeite
          key={dossierId}
          id={dossierId}
          onZurueck={() => {
            oeffnen(null)
          }}
        />
      ) : (
        <Reiter
          value={reiter}
          onValueChange={(r) => {
            onNavigation({ dossier: null, reiter: r as ReiterTyp })
          }}
        >
          <ReiterListe>
            {REITER.map((r) => {
              const n = bericht.data && ZAHL[r]?.(bericht.data)
              return (
                <ReiterKnopf key={r} value={r}>
                  {t(`ausschreibungen.reiter.${r}`)}
                  {n ? <span className="text-muted-foreground zahlen ml-1.5 text-xs">{n}</span> : null}
                </ReiterKnopf>
              )
            })}
          </ReiterListe>
          <ReiterInhalt value="leitstand" className="pt-4">
            <Leitstand
              onOeffnen={oeffnen}
              onReiter={(r) => {
                onNavigation({ dossier: null, reiter: r })
              }}
            />
          </ReiterInhalt>
          <ReiterInhalt value="bewilligen" className="pt-4">
            <Freigabeliste modus="bewilligen" darf={bericht.data?.darf_bewilligen ?? false} onDossier={oeffnen} />
          </ReiterInhalt>
          <ReiterInhalt value="senden" className="pt-4">
            <Freigabeliste modus="senden" darf={bericht.data?.darf_senden ?? false} onDossier={oeffnen} />
          </ReiterInhalt>
          <ReiterInhalt value="fristen" className="pt-4">
            <Fristen onOeffnen={oeffnen} />
          </ReiterInhalt>
          <ReiterInhalt value="nachweise" className="pt-4">
            <Nachweise />
          </ReiterInhalt>
          <ReiterInhalt value="auswertung" className="pt-4">
            <Auswertung />
          </ReiterInhalt>
          <ReiterInhalt value="quellen" className="pt-4">
            <Quellen admin={admin} />
          </ReiterInhalt>
        </Reiter>
      )}
      {erfassen && (
        <ErfassenDialog
          onSchliessen={() => {
            setErfassen(false)
          }}
          onErfasst={(id) => {
            setErfassen(false)
            onNavigation({ dossier: id, reiter })
          }}
        />
      )}
    </div>
  )
}
