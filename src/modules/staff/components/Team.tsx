import { CalendarPlus, IdCard, UserRound } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Seitenkopf } from '@/components/shared/Seitenkopf'
import { Fehlerzustand, Leerzustand } from '@/components/shared/Zustaende'
import { Button } from '@/components/ui/button'
import { Skelett } from '@/components/ui/diverses'
import { Reiter, ReiterInhalt, ReiterKnopf, ReiterListe } from '@/components/ui/reiter'
import { useAuswahl } from '@/hooks/useAuswahl'
import { hatRecht } from '@/lib/rechte'
import { supabase } from '@/services/supabase'
import { useAnmeldung } from '@/stores/anmeldung'
import { useAusweise, useKurse, useTeam } from '../hooks/useTeam'
import { geplanteKurse } from '../lib/kurse'
import { ausweisArten, heuteZuerich, neueste } from '../lib/matrix'
import { REITER, type Kurs, type TeamReiter } from '../types'
import { AkteAktion } from './AkteAktion'
import { Anforderungen } from './Anforderungen'
import { AusweisDialog } from './AusweisDialog'
import { AusweiseReiter } from './AusweiseReiter'
import { KursDialog } from './KursDialog'
import { KursListe } from './KursListe'
import { PersonAkte, type PersonAktion } from './PersonAkte'
import { TeamListe } from './TeamListe'

/** Wohin die Seite springt: Reiter, offene Person und offener Kurs stehen in der Adresse. */
export interface TeamZiel {
  reiter?: TeamReiter
  person?: string | null
  kurs?: string | null
}

type KursFenster = { kurs: Kurs | null; vorgabe?: { art: string; personen: string[] } } | null

/**
 * Team & Ausweise: wer gehört dazu und ist heute wo (Team), wer darf was (Ausweise), Kurse mit Antrag, Bewilligung
 * und Kosten (Kurse) und welche Ausweise je Rolle Pflicht sind (Anforderungen). Person als Seitenpanel mit
 * Ausweisen, Kursen, Ausrüstung und Personal-Akte. Adresse: #/staff?reiter=…&person=…&kurs=…
 */
export default function Team({
  reiter,
  personId,
  kursId,
  onNavigation,
}: {
  reiter: TeamReiter
  personId: string | null
  kursId: string | null
  onNavigation: (z: TeamZiel) => void
}) {
  const { t } = useTranslation()
  const ich = useAnmeldung((z) => z.ich)
  const admin = hatRecht(ich, 'admin')
  const heute = heuteZuerich()
  const team = useTeam()
  const ausweise = useAusweise()
  const kurse = useKurse(Number(heute.slice(0, 4)))
  const arten = ausweisArten(useAuswahl('qualifikation').werte)
  const [aktion, setAktion] = useState<PersonAktion | null>(null)
  const [kursFenster, setKursFenster] = useState<KursFenster>(null)

  if (!supabase || !ich) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <Leerzustand icon={IdCard} titel={t('team.titel')} text={t('projekte.ohneDatenbank')} />
      </div>
    )
  }

  const personen = team.data ?? []
  const gueltig = neueste(ausweise.data ?? [])
  const alleKurse = kurse.data?.kurse ?? []
  const geplant = geplanteKurse(alleKurse)
  const offen = personen.find((p) => p.id === personId)
  const darfAendern = admin || personId === ich.id || offen?.vorgesetzt_id === ich.id
  const planbar = (id: string) => admin || personen.find((p) => p.id === id)?.vorgesetzt_id === ich.id
  // Ein Kurs aus der Adresse (Glocke) öffnet sich, sobald die Kurse geladen sind.
  const kursAusAdresse = kursId ? alleKurse.find((k) => k.id === kursId) : undefined
  const kursOffen = kursFenster ?? (kursAusAdresse ? { kurs: kursAusAdresse } : null)
  const oeffnen = (id: string | null) => {
    onNavigation({ person: id })
  }

  return (
    <div className="mx-auto flex w-full max-w-[96rem] flex-col gap-4 px-4 py-6 sm:px-6">
      <Seitenkopf
        titel={t('team.titel')}
        beschreibung={t('team.beschreibung')}
        aktionen={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                oeffnen(ich.id)
              }}
            >
              <UserRound />
              {t('team.meineAkte')}
            </Button>
            <Button
              onClick={() => {
                setKursFenster({ kurs: null })
              }}
            >
              <CalendarPlus />
              {admin ? t('team.kurs.neu') : t('team.kurs.beantragen')}
            </Button>
          </>
        }
      />
      {team.error || ausweise.error ? (
        <Fehlerzustand
          details={String(team.error ?? ausweise.error)}
          onNochmal={() => {
            void team.refetch()
            void ausweise.refetch()
          }}
        />
      ) : !team.data || !ausweise.data ? (
        <Skelett className="h-80" />
      ) : (
        <Reiter
          value={reiter}
          onValueChange={(r) => {
            onNavigation({ reiter: r as TeamReiter, person: null, kurs: null })
          }}
        >
          <ReiterListe>
            {REITER.map((r) => (
              <ReiterKnopf key={r} value={r}>
                {t(`team.reiter.${r}`)}
                {r === 'kurse' && alleKurse.some((k) => k.darf_bewilligen) && (
                  <span className="bg-warn-soft text-warn rounded-full px-1.5 text-xs">
                    {alleKurse.filter((k) => k.darf_bewilligen).length}
                  </span>
                )}
              </ReiterKnopf>
            ))}
          </ReiterListe>
          <ReiterInhalt value="team">
            <TeamListe
              personen={personen}
              arten={arten}
              gueltig={gueltig}
              geplant={geplant}
              heute={heute}
              aktiveId={personId}
              onOeffnen={oeffnen}
            />
          </ReiterInhalt>
          <ReiterInhalt value="ausweise">
            <AusweiseReiter
              personen={personen}
              arten={arten}
              gueltig={gueltig}
              geplant={geplant}
              heute={heute}
              ichId={ich.id}
              allePlanen={admin}
              aktiveId={personId}
              onOeffnen={oeffnen}
              onKursPlanen={(art, wer) => {
                setKursFenster({ kurs: null, vorgabe: { art, personen: wer } })
              }}
            />
          </ReiterInhalt>
          <ReiterInhalt value="kurse">
            <KursListe
              personen={personen}
              ichId={ich.id}
              heute={heute}
              aktiveId={kursId}
              onOeffnen={(k) => {
                setKursFenster({ kurs: k })
              }}
            />
          </ReiterInhalt>
          <ReiterInhalt value="anforderungen">
            <Anforderungen darfAendern={admin} />
          </ReiterInhalt>
        </Reiter>
      )}

      {offen && (
        <PersonAkte
          key={offen.id}
          person={offen}
          ausweise={(ausweise.data ?? []).filter((q) => q.person_id === offen.id)}
          arten={arten}
          kurse={alleKurse.filter((k) => k.personen.includes(offen.id))}
          heute={heute}
          darfAendern={darfAendern}
          darfPlanen={planbar(offen.id)}
          eigene={offen.id === ich.id}
          onAktion={setAktion}
          onKurs={(k) => {
            setKursFenster({ kurs: k })
          }}
          onNeuKurs={() => {
            setKursFenster({ kurs: null, vorgabe: { art: '', personen: [offen.id] } })
          }}
          onSchliessen={() => {
            oeffnen(null)
          }}
        />
      )}
      {offen && aktion && 'ausweis' in aktion && (
        <AusweisDialog
          personId={offen.id}
          ausweis={aktion.ausweis}
          {...(aktion.art ? { vorgabeArt: aktion.art } : {})}
          onSchliessen={() => {
            setAktion(null)
          }}
        />
      )}
      {offen && aktion && !('ausweis' in aktion) && (
        <AkteAktion
          personId={offen.id}
          aktion={aktion}
          onSchliessen={() => {
            setAktion(null)
          }}
        />
      )}
      {kursOffen && (
        <KursDialog
          key={kursOffen.kurs?.id ?? 'neu'}
          kurs={kursOffen.kurs}
          {...(kursOffen.vorgabe ? { vorgabe: kursOffen.vorgabe } : {})}
          personen={personen}
          ichId={ich.id}
          allePlanen={admin}
          vereinbarungAb={kurse.data?.vereinbarung_ab_rappen ?? 100000}
          heute={heute}
          onSchliessen={() => {
            setKursFenster(null)
            if (kursId) onNavigation({ kurs: null })
          }}
        />
      )}
    </div>
  )
}
