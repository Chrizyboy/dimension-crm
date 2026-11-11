import { CalendarPlus, Clock } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Seitenkopf } from '@/components/shared/Seitenkopf'
import { Fehlerzustand, Leerzustand } from '@/components/shared/Zustaende'
import { Button } from '@/components/ui/button'
import { Skelett } from '@/components/ui/diverses'
import { Reiter, ReiterInhalt, ReiterKnopf, ReiterListe } from '@/components/ui/reiter'
import { supabase } from '@/services/supabase'
import { useZeiterfassung } from '../hooks/useZeit'
import { heute, wochenStart } from '../lib/zeit'
import { REITER, type Abwesenheit, type ZeitReiter } from '../types'
import { AbwesenheitDialog } from './AbwesenheitDialog'
import { AbwesenheitenReiter } from './AbwesenheitenReiter'
import { MeineZeit } from './MeineZeit'
import { TeamReiter } from './TeamReiter'

/** Wohin die Seite springt: Reiter und (für die Zeit-Leitung) die gezeigte Person stehen in der Adresse. */
export interface ZeitZiel {
  reiter?: ZeitReiter
  person?: string | null
}

/**
 * Zeiterfassung: «Meine Zeit» (stempeln, Woche, Saldo, Ferienkonto), «Abwesenheiten» (beantragen, bewilligen,
 * Kalender) und für die Zeit-Leitung «Team» mit allen Mitarbeitenden. Wer was sieht, entscheidet die Datenbank:
 * die Zeit-Leitung (Chris, Loris) alle, alle anderen nur sich selbst. Adresse: #/time?reiter=…&person=…
 */
export default function Zeiterfassung({
  reiter,
  personId,
  onNavigation,
}: {
  reiter: ZeitReiter
  personId: string | null
  onNavigation: (z: ZeitZiel) => void
}) {
  const { t } = useTranslation()
  const [montag, setMontag] = useState(() => wochenStart(heute()))
  const jahr = Number(montag.slice(0, 4))
  const daten = useZeiterfassung(jahr, montag)
  const [neu, setNeu] = useState<Abwesenheit | 'neu' | null>(null)

  if (!supabase) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <Leerzustand icon={Clock} titel={t('zeit.titel')} text={t('projekte.ohneDatenbank')} />
      </div>
    )
  }

  const d = daten.data
  const offen = d?.offen.length ?? 0
  const sichtbar = REITER.filter((r) => r !== 'team' || d?.leitung)
  const aktiv = sichtbar.includes(reiter) ? reiter : 'meine'
  const person = (d?.leitung && personId) || d?.ich || null

  return (
    <div className="mx-auto flex w-full max-w-[96rem] flex-col gap-4 px-4 py-6 sm:px-6">
      <Seitenkopf
        titel={t('zeit.titel')}
        beschreibung={t('zeit.beschreibung')}
        aktionen={
          <Button
            onClick={() => {
              setNeu('neu')
            }}
          >
            <CalendarPlus />
            {d?.leitung ? t('zeit.abwesenheit.erfassen') : t('zeit.abwesenheit.beantragen')}
          </Button>
        }
      />
      {daten.error ? (
        <Fehlerzustand details={String(daten.error)} onNochmal={() => void daten.refetch()} />
      ) : !d || !person ? (
        <Skelett className="h-96" />
      ) : (
        <Reiter
          value={aktiv}
          onValueChange={(r) => {
            onNavigation({ reiter: r as ZeitReiter })
          }}
        >
          <ReiterListe>
            {sichtbar.map((r) => (
              <ReiterKnopf key={r} value={r}>
                {t(`zeit.reiter.${r}`)}
                {r === 'abwesenheiten' && offen > 0 && (
                  <span className="bg-warn-soft text-warn rounded-full px-1.5 text-xs">{offen}</span>
                )}
              </ReiterKnopf>
            ))}
          </ReiterListe>
          <ReiterInhalt value="meine">
            <MeineZeit
              daten={d}
              personId={person}
              montag={montag}
              onMontag={setMontag}
              onPerson={(p) => {
                onNavigation({ person: p === d.ich ? null : p })
              }}
            />
          </ReiterInhalt>
          <ReiterInhalt value="abwesenheiten">
            <AbwesenheitenReiter daten={d} onBearbeiten={setNeu} />
          </ReiterInhalt>
          {d.leitung && (
            <ReiterInhalt value="team">
              <TeamReiter
                daten={d}
                onOeffnen={(p) => {
                  onNavigation({ reiter: 'meine', person: p })
                }}
              />
            </ReiterInhalt>
          )}
        </Reiter>
      )}
      {neu && d && (
        <AbwesenheitDialog
          daten={d}
          abwesenheit={neu === 'neu' ? null : neu}
          vorgabePerson={person ?? d.ich}
          onSchliessen={() => {
            setNeu(null)
          }}
        />
      )}
    </div>
  )
}
