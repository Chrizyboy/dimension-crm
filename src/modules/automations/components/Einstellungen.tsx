import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Skelett } from '@/components/ui/diverses'
import { Feld } from '@/components/ui/feld'
import { Input } from '@/components/ui/input'
import { Karte } from '@/components/ui/karte'
import { useAktion, useAutomationsEinstellungen } from '../hooks/useAutomationen'
import { speichereEinstellungen } from '../services/automationen'
import type { AutomationsEinstellungen } from '../types'

const ZAHLEN = ['termin_gehabt_tage', 'wartung_vorlauf_tage', 'rechnung_karenz_tage'] as const
const LINKS = ['bewertung_link', 'bewertung_link_fr'] as const
const falsch = (link: string | undefined) => !!link && !/^https:\/\//.test(link)

/**
 * Einstellungen der Auslöser nach Datum und die Links für Bewertungen (Platzhalter {Bewertungslink}): einer für die
 * Deutschschweiz, einer für die Romandie. Welcher gilt, entscheidet die Sprache des Kunden (`intern.bewertung_link`).
 */
export function Einstellungen() {
  const abfrage = useAutomationsEinstellungen()
  if (!abfrage.data) return <Skelett className="h-64" />
  return <Formular start={abfrage.data} />
}

function Formular({ start }: { start: AutomationsEinstellungen }) {
  const { t } = useTranslation()
  const { laeuft, aus } = useAktion()
  const [e, setE] = useState(start)
  const linkFalsch = LINKS.some((k) => falsch(e[k]))
  return (
    <Karte className="flex max-w-2xl flex-col gap-4 p-5">
      {ZAHLEN.map((k) => (
        <Feld
          key={k}
          id={`einst-${k}`}
          label={t(`automationen.einstellungen.${k}`)}
          hinweis={t(`automationen.einstellungen.${k}_hilfe`)}
        >
          <Input
            id={`einst-${k}`}
            type="number"
            min={0}
            max={365}
            className="w-28"
            value={e[k]}
            onChange={(x) => {
              setE({ ...e, [k]: Math.max(0, Math.round(Number(x.target.value) || 0)) })
            }}
          />
        </Feld>
      ))}
      {LINKS.map((k) => (
        <Feld
          key={k}
          id={`einst-${k}`}
          label={t(`automationen.einstellungen.${k}`)}
          hinweis={t('automationen.einstellungen.bewertung_link_hilfe')}
          fehler={falsch(e[k]) ? t('automationen.einstellungen.linkFalsch') : undefined}
        >
          <Input
            id={`einst-${k}`}
            type="url"
            placeholder="https://g.page/r/…"
            value={e[k] ?? ''}
            aria-invalid={falsch(e[k])}
            onChange={(x) => {
              setE({ ...e, [k]: x.target.value.trim() })
            }}
          />
        </Feld>
      ))}
      <Button
        className="self-start"
        disabled={laeuft || linkFalsch}
        onClick={() =>
          void aus(() => speichereEinstellungen(e), { de: 'Einstellungen gespeichert', fr: 'Paramètres enregistrés' })
        }
      >
        {t('allgemein.speichern')}
      </Button>
    </Karte>
  )
}
