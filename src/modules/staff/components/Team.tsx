import { IdCard, UserRound } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Filterchips } from '@/components/shared/Filterchips'
import { Seitenkopf } from '@/components/shared/Seitenkopf'
import { Fehlerzustand, Leerzustand } from '@/components/shared/Zustaende'
import { Button } from '@/components/ui/button'
import { Skelett } from '@/components/ui/diverses'
import { useAuswahl } from '@/hooks/useAuswahl'
import { hatRecht } from '@/lib/rechte'
import { supabase } from '@/services/supabase'
import { useAnmeldung } from '@/stores/anmeldung'
import { useAusweise, useTeam } from '../hooks/useTeam'
import { ausweisArten, heuteZuerich, neueste, probleme } from '../lib/matrix'
import { AkteDialog } from './AkteDialog'
import { AusweisDialog } from './AusweisDialog'
import { Matrix } from './Matrix'
import { PersonAkte, type PersonAktion } from './PersonAkte'

type Filter = 'alle' | 'probleme'

/**
 * Team & Ausweise (ERP-Lückenanalyse, Phase 17): Übersicht «wer darf was» (Kurse und Ausweise je Person, Pflicht
 * je Rolle aus den Einstellungen) und die Personal-Akte. Alle sehen die Übersicht und ihre eigene Akte; ändern
 * dürfen die Person selbst und die Administration. Offene Person in der Adresse (#/staff?person=…).
 */
export default function Team({
  personId,
  onPerson,
}: {
  personId: string | null
  onPerson: (id: string | null) => void
}) {
  const { t } = useTranslation()
  const ich = useAnmeldung((z) => z.ich)
  const admin = hatRecht(ich, 'admin')
  const team = useTeam()
  const ausweise = useAusweise()
  const arten = ausweisArten(useAuswahl('qualifikation').werte)
  const [filter, setFilter] = useState<Filter>('alle')
  const [aktion, setAktion] = useState<PersonAktion | null>(null)
  const heute = heuteZuerich()

  if (!supabase || !ich) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <Leerzustand icon={IdCard} titel={t('team.titel')} text={t('projekte.ohneDatenbank')} />
      </div>
    )
  }

  const gueltig = neueste(ausweise.data ?? [])
  const personen = team.data ?? []
  const mitProblem = personen.filter((p) => probleme(p.id, p.rolle, arten, gueltig, heute) > 0)
  const liste = filter === 'probleme' ? mitProblem : personen
  const offen = personen.find((p) => p.id === personId)
  const darfAendern = admin || personId === ich.id

  return (
    <div className="mx-auto flex w-full max-w-[96rem] flex-col gap-4 px-4 py-6 sm:px-6">
      <Seitenkopf
        titel={t('team.titel')}
        beschreibung={t('team.beschreibung')}
        aktionen={
          <Button
            variant="secondary"
            onClick={() => {
              onPerson(ich.id)
            }}
          >
            <UserRound />
            {t('team.meineAkte')}
          </Button>
        }
      />
      <Filterchips
        einzeln
        beschriftung={t('team.filter')}
        optionen={[
          { wert: 'alle', text: t('team.filterwert.alle'), anzahl: personen.length },
          { wert: 'probleme', text: t('team.filterwert.probleme'), anzahl: mitProblem.length },
        ]}
        gewaehlt={[filter]}
        onChange={([f]) => {
          if (f) setFilter(f as Filter)
        }}
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
        <Matrix
          personen={liste}
          arten={arten}
          gueltig={gueltig}
          heute={heute}
          aktiveId={personId}
          onOeffnen={onPerson}
        />
      )}
      <p className="text-muted-foreground text-xs">{t('team.legende')}</p>

      {offen && (
        <PersonAkte
          key={offen.id}
          person={offen}
          ausweise={(ausweise.data ?? []).filter((q) => q.person_id === offen.id)}
          arten={arten}
          heute={heute}
          darfAendern={darfAendern}
          admin={admin}
          onAktion={setAktion}
          onSchliessen={() => {
            onPerson(null)
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
      {offen && aktion && 'akte' in aktion && (
        <AkteDialog
          personId={offen.id}
          akte={aktion.akte}
          admin={admin}
          onSchliessen={() => {
            setAktion(null)
          }}
        />
      )}
    </div>
  )
}
