import { UserMinus, X } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Auswahl } from '@/components/ui/auswahl'
import { Button } from '@/components/ui/button'
import { Feld } from '@/components/ui/feld'
import { Input } from '@/components/ui/input'
import type { Person } from '../types'

interface KuendigungAbschnittProps {
  austritt: string | null
  nachfolge: string | null
  /** Wer als Nachfolge in Frage kommt (aktive Personen ohne die Person selbst). */
  kandidaten: readonly Pick<Person, 'id' | 'name'>[]
  onChange: (austritt: string | null, nachfolge: string | null) => void
}

/**
 * Kündigung im Personen-Blatt: letzter Arbeitstag und Nachfolge. Gespeichert wird mit «Speichern» des Blatts.
 * Ohne Kündigung steht nur ein Knopf da, damit das Blatt für alle anderen Personen ruhig bleibt.
 */
export function KuendigungAbschnitt({ austritt, nachfolge, kandidaten, onChange }: KuendigungAbschnittProps) {
  const { t } = useTranslation()
  const [offen, setOffen] = useState(austritt !== null)

  if (!offen) {
    return (
      <Button
        variant="secondary"
        className="self-start"
        onClick={() => {
          setOffen(true)
        }}
      >
        <UserMinus />
        {t('benutzer.kuendigung.erfassen')}
      </Button>
    )
  }

  return (
    <section className="flex flex-col gap-3" aria-labelledby="person-kuendigung-titel">
      <div className="flex flex-col gap-0.5">
        <h3 id="person-kuendigung-titel" className="text-sm font-semibold">
          {t('benutzer.kuendigung.titel')}
        </h3>
        <p className="text-muted-foreground text-xs">{t('benutzer.kuendigung.text')}</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Feld id="person-austritt" label={t('benutzer.kuendigung.austritt')}>
          <Input
            id="person-austritt"
            type="date"
            value={austritt ?? ''}
            onChange={(e) => {
              onChange(e.target.value || null, nachfolge)
            }}
          />
        </Feld>
        <Feld
          id="person-nachfolge"
          label={t('benutzer.kuendigung.nachfolge')}
          hinweis={t('benutzer.kuendigung.nachfolgeHinweis')}
        >
          <Auswahl
            id="person-nachfolge"
            value={nachfolge ?? ''}
            onValueChange={(w) => {
              onChange(austritt, w || null)
            }}
            platzhalter={t('benutzer.kuendigung.keineNachfolge')}
            optionen={kandidaten.map((p) => ({ wert: p.id, text: p.name }))}
          />
        </Feld>
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="self-start"
        onClick={() => {
          onChange(null, null)
          setOffen(false)
        }}
      >
        <X />
        {t('benutzer.kuendigung.zuruecknehmen')}
      </Button>
    </section>
  )
}
