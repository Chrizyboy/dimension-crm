import { UserPlus } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Fehlerzustand } from '@/components/shared/Zustaende'
import { Button } from '@/components/ui/button'
import { Skelett } from '@/components/ui/diverses'
import { Karte } from '@/components/ui/karte'
import type { EinstellungsInhaltProps } from '@/types/einstellungen'
import { useBenutzerDaten } from '../hooks/useBenutzer'
import { statusVon } from '../services/benutzer'
import type { Person } from '../types'
import { BenutzerTabelle } from './BenutzerTabelle'
import { EinladungDialog } from './EinladungDialog'
import { PersonDialog } from './PersonDialog'

/**
 * Einstellungen › Personen: wer Zugang hat, mit Rolle, Standort und Stand. Wer hier fehlt, kann sich nicht
 * anmelden: Ein Login entsteht nur für erfasste, aktive Personen.
 */
export default function Personen({ module }: EinstellungsInhaltProps) {
  const { t } = useTranslation()
  const { personen, rollen, standorte, einladungen } = useBenutzerDaten()
  const [einladen, setEinladen] = useState(false)
  const [person, setPerson] = useState<Person | null>(null)
  const status = (p: Person) => statusVon(p, einladungen.data ?? [])
  const liste = personen.data ?? []
  const fehler = personen.error ?? rollen.error

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end">
        <Button
          onClick={() => {
            setEinladen(true)
          }}
          disabled={!rollen.data}
        >
          <UserPlus />
          {t('benutzer.einladen')}
        </Button>
      </div>
      <Karte className="overflow-hidden">
        {fehler ? (
          <Fehlerzustand details={fehler.message} onNochmal={() => void personen.refetch()} />
        ) : personen.isPending || rollen.isPending ? (
          <div className="flex flex-col gap-2 p-4">
            {[1, 2, 3].map((i) => (
              <Skelett key={i} className="h-10" />
            ))}
          </div>
        ) : (
          <BenutzerTabelle
            personen={liste}
            status={status}
            rollen={rollen.data ?? []}
            standorte={standorte.data ?? []}
            onWaehle={setPerson}
          />
        )}
      </Karte>
      <EinladungDialog
        offen={einladen}
        onOffen={setEinladen}
        rollen={rollen.data ?? []}
        standorte={standorte.data ?? []}
      />
      <PersonDialog
        key={person?.id ?? 'keine-person'}
        person={person}
        status={person ? status(person) : null}
        onSchliessen={() => {
          setPerson(null)
        }}
        rollen={rollen.data ?? []}
        standorte={standorte.data ?? []}
        module={module}
        vergeben={liste.flatMap((p) => (p.id !== person?.id && p.kurzzeichen ? [p.kurzzeichen] : []))}
      />
    </div>
  )
}
