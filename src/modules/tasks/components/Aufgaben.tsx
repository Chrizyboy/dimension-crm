import { SquareCheck } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Filterchips } from '@/components/shared/Filterchips'
import { Seitenkopf } from '@/components/shared/Seitenkopf'
import { Suchfeld, Werkzeugleiste } from '@/components/shared/Werkzeugleiste'
import { Fehlerzustand, Leerzustand } from '@/components/shared/Zustaende'
import { Skelett } from '@/components/ui/diverses'
import { useTaste } from '@/hooks/useTaste'
import { hatRecht } from '@/lib/rechte'
import { supabase } from '@/services/supabase'
import { useAnmeldung } from '@/stores/anmeldung'
import { useAufgaben, usePersonen } from '../hooks/useAufgaben'
import type { Ansicht, Aufgabe } from '../types'
import { AufgabeAkte } from './AufgabeAkte'
import { AufgabenListe } from './AufgabenListe'
import { Schnelleingabe } from './Schnelleingabe'
import { TeamSicht } from './TeamSicht'

/** Schnellfilter innerhalb einer Ansicht. */
type Filter = 'wichtig' | 'automation' | 'mit_bezug'

/** Navigation in der Adresse (#/tasks?ansicht=…&aufgabe=…&person=…). */
export interface AufgabenNavigation {
  ansicht?: Ansicht
  aufgabe?: string | null
  person?: string | null
}

/**
 * Aufgaben: der Arbeitsvorrat jeder Person. Gruppiert nach Fälligkeit, Schnelleingabe oben («morgen @LP !»),
 * Akte als Seitenpanel. Ansichten: meine, vergeben, Vertretung (abwesende Kolleg:innen), alle, Team (Geschäftsleitung),
 * erledigt. Was jemand sehen darf, entscheidet die Datenbank.
 */
export default function Aufgaben({
  ansicht,
  aufgabeId,
  person,
  onNavigation,
}: {
  ansicht: Ansicht
  aufgabeId: string | null
  person: string | null
  onNavigation: (n: AufgabenNavigation) => void
}) {
  const { t } = useTranslation()
  const ich = useAnmeldung((z) => z.ich)
  const leitung = hatRecht(ich, 'admin') || (ich?.rechte as string[] | undefined)?.includes('gl') === true
  const aufgaben = useAufgaben(ansicht, person)
  const personen = usePersonen()
  const [suche, setSuche] = useState('')
  const [filter, setFilter] = useState<Filter[]>([])
  const [eingabe, setEingabe] = useState(0)
  useTaste(
    'n',
    () => {
      setEingabe((n) => n + 1)
    },
    true,
    t('aufgaben.kuerzelNeu'),
  )

  const daten = useMemo(() => {
    const s = suche.trim().toLowerCase()
    return (aufgaben.data ?? []).filter(
      (a: Aufgabe) =>
        (!s || [a.titel, a.text, a.bezug_name].some((x) => x?.toLowerCase().includes(s))) &&
        (!filter.includes('wichtig') || a.wichtig) &&
        (!filter.includes('automation') || a.herkunft === 'automation') &&
        (!filter.includes('mit_bezug') || a.bezug_id !== null),
    )
  }, [aufgaben.data, suche, filter])

  if (!supabase) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <Leerzustand icon={SquareCheck} titel={t('aufgaben.titel')} text={t('projekte.ohneDatenbank')} />
      </div>
    )
  }

  const ansichten: Ansicht[] = [
    'meine',
    'vergeben',
    'vertretung',
    'alle',
    ...(leitung ? (['team'] as const) : []),
    'erledigt',
  ]
  const personName = personen.data?.find((p) => p.id === person)?.name

  return (
    <div className="mx-auto flex w-full max-w-[72rem] flex-col gap-4 px-4 py-6 sm:px-6">
      <Seitenkopf
        titel={personName ? t('aufgaben.vonPerson', { name: personName }) : t('aufgaben.titel')}
        beschreibung={t('aufgaben.beschreibung')}
      />
      <Filterchips
        einzeln
        beschriftung={t('aufgaben.ansicht')}
        gewaehlt={[ansicht]}
        optionen={ansichten.map((a) => ({ wert: a, text: t(`aufgaben.ansichten.${a}`) }))}
        onChange={([a]) => {
          onNavigation({ ansicht: (a as Ansicht | undefined) ?? 'meine', person: null, aufgabe: null })
        }}
      />
      {ansicht === 'team' ? (
        <TeamSicht
          onPerson={(p) => {
            onNavigation({ ansicht: 'alle', person: p })
          }}
        />
      ) : (
        <>
          {ansicht !== 'erledigt' && (
            <Schnelleingabe
              key={eingabe}
              fokus={eingabe > 0}
              personen={personen.data ?? []}
              vorgabePerson={person ?? ich?.id ?? null}
            />
          )}
          <Werkzeugleiste
            suche={
              <Suchfeld
                beschriftung={t('aufgaben.suchen')}
                value={suche}
                onChange={(e) => {
                  setSuche(e.target.value)
                }}
              />
            }
            rechts={t('aufgaben.anzahl', { count: daten.length })}
          >
            <Filterchips
              beschriftung={t('aufgaben.filtern')}
              gewaehlt={filter}
              optionen={(['wichtig', 'automation', 'mit_bezug'] as const).map((f) => ({
                wert: f,
                text: t(`aufgaben.schnellfilter.${f}`),
              }))}
              onChange={(f) => {
                setFilter(f as Filter[])
              }}
            />
          </Werkzeugleiste>
          {aufgaben.error ? (
            <Fehlerzustand details={String(aufgaben.error)} onNochmal={() => void aufgaben.refetch()} />
          ) : aufgaben.isLoading ? (
            <div className="flex flex-col gap-2">
              {[1, 2, 3, 4].map((i) => (
                <Skelett key={i} className="h-12" />
              ))}
            </div>
          ) : daten.length === 0 ? (
            <Leerzustand
              icon={SquareCheck}
              titel={t(ansicht === 'vertretung' ? 'aufgaben.leerVertretung' : 'aufgaben.leerTitel')}
              text={t('aufgaben.leerText')}
            />
          ) : (
            <AufgabenListe
              aufgaben={daten}
              personen={personen.data ?? []}
              erledigt={ansicht === 'erledigt'}
              zeigePerson={ansicht !== 'meine'}
              aktiv={aufgabeId}
              onOeffnen={(id) => {
                onNavigation({ aufgabe: id })
              }}
            />
          )}
        </>
      )}
      {aufgabeId && (
        <AufgabeAkte
          id={aufgabeId}
          personen={personen.data ?? []}
          onSchliessen={() => {
            onNavigation({ aufgabe: null })
          }}
        />
      )}
    </div>
  )
}
