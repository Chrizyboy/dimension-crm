import { Plus } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Kbd } from '@/components/ui/diverses'
import { Input } from '@/components/ui/input'
import { formatDatum } from '@/lib/format'
import { meldeFehler } from '@/services/fehler'
import { melde } from '@/services/meldungen'
import { useNeuLaden } from '../hooks/useAufgaben'
import { heuteZuerich } from '../lib/faelligkeit'
import { findePerson, leseSchnelleingabe } from '../lib/schnelleingabe'
import { legeAufgabeAn } from '../services/aufgaben'
import type { Person } from '../types'
import { NeueAufgabe } from './NeueAufgabe'

/**
 * Eine Zeile oben in der Liste: «Offerte Baumann nachfassen morgen @AM !» + Enter legt die Aufgabe an.
 * Erkanntes (Datum, Person, wichtig) erscheint sofort als Abzeichen; «Mehr» öffnet das ganze Formular.
 */
export function Schnelleingabe({
  personen,
  vorgabePerson,
  fokus,
}: {
  personen: Person[]
  vorgabePerson: string | null
  fokus: boolean
}) {
  const { t } = useTranslation()
  const neuLaden = useNeuLaden()
  const feld = useRef<HTMLInputElement>(null)
  const [text, setText] = useState('')
  const [laeuft, setLaeuft] = useState(false)
  const [formular, setFormular] = useState(false)
  useEffect(() => {
    if (fokus) feld.current?.focus()
  }, [fokus])

  const r = leseSchnelleingabe(text, heuteZuerich())
  const person = r.person ? findePerson(r.person, personen) : null
  const personFehlt = r.person !== null && !person
  const fuer = person?.id ?? vorgabePerson

  async function anlegen() {
    if (!r.titel || personFehlt || !fuer) return
    setLaeuft(true)
    try {
      await legeAufgabeAn({ titel: r.titel, faellig_am: r.faellig_am ?? '', person_id: fuer, wichtig: r.wichtig })
      melde('ok', { de: 'Aufgabe angelegt', fr: 'Tâche créée' })
      setText('')
      neuLaden()
    } catch (f) {
      meldeFehler(f, 'aufgaben')
    } finally {
      setLaeuft(false)
    }
  }

  return (
    <div className="bg-surface flex flex-col gap-2 rounded-lg border px-3 py-2.5">
      <div className="flex items-center gap-2">
        <Plus className="text-accent size-4 shrink-0" aria-hidden="true" />
        <Input
          ref={feld}
          aria-label={t('aufgaben.schnell.beschriftung')}
          placeholder={t('aufgaben.schnell.platzhalter')}
          value={text}
          disabled={laeuft}
          className="border-0 px-1 shadow-none focus-visible:ring-0"
          onChange={(e) => {
            setText(e.target.value)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void anlegen()
            if (e.key === 'Escape') setText('')
          }}
        />
        <Kbd className="hidden sm:inline-flex">N</Kbd>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            setFormular(true)
          }}
        >
          {t('aufgaben.schnell.mehr')}
        </Button>
      </div>
      {text.trim() && (
        <div className="flex flex-wrap items-center gap-1.5 pl-6 text-xs" aria-live="polite">
          {r.faellig_am && <Badge ton="marke">{formatDatum(r.faellig_am)}</Badge>}
          {person && <Badge ton="info">{person.name}</Badge>}
          {personFehlt && <Badge ton="kritisch">{t('aufgaben.schnell.personUnbekannt', { wer: r.person })}</Badge>}
          {r.wichtig && <Badge ton="kritisch">{t('aufgaben.wichtig')}</Badge>}
          <span className="text-muted-foreground">{t('aufgaben.schnell.enter')}</span>
        </div>
      )}
      {formular && (
        <NeueAufgabe
          personen={personen}
          ichId={vorgabePerson}
          vorlage={{ titel: r.titel, faellig_am: r.faellig_am ?? '', person_id: fuer ?? '', wichtig: r.wichtig }}
          onSchliessen={() => {
            setFormular(false)
            setText('')
          }}
        />
      )}
    </div>
  )
}
