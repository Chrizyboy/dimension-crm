import { Pencil } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { melde } from '@/services/meldungen'
import { serviceSeriennummer } from '../services/serviceHandy'

/** Seriennummer einer Komponente: lesen, und vor Ort ändern (z. B. Wechselrichter getauscht). */
export function SeriennummerFeld({
  fallId,
  nr,
  wert,
  darf,
  onGespeichert,
}: {
  fallId: string
  nr: number
  wert: string
  darf: boolean
  onGespeichert: () => void
}) {
  const { t } = useTranslation()
  const [offen, setOffen] = useState(false)
  const [neu, setNeu] = useState(wert)
  const id = `sn-${fallId}-${String(nr)}`

  if (!offen)
    return (
      <span className="text-muted-foreground flex items-center gap-2 text-xs">
        <span className="zahlen font-mono">SN {wert || '–'}</span>
        {darf && (
          <Button
            size="sm"
            variant="ghost"
            aria-label={t('baustelle.service.snAendern')}
            onClick={() => {
              setNeu(wert)
              setOffen(true)
            }}
          >
            <Pencil />
            {t(wert ? 'baustelle.service.aendern' : 'baustelle.service.erfassen')}
          </Button>
        )}
      </span>
    )

  return (
    <form
      className="flex items-center gap-1.5"
      onSubmit={(e) => {
        e.preventDefault()
        if (neu.trim() === wert) {
          setOffen(false)
          return
        }
        void serviceSeriennummer(fallId, nr, neu)
          .then(() => {
            setOffen(false)
            onGespeichert()
          })
          .catch(() => {
            melde('kritisch', { de: 'Nicht gespeichert', fr: 'Non enregistré' })
          })
      }}
    >
      <label htmlFor={id} className="sr-only">
        {t('baustelle.service.seriennummer')}
      </label>
      <Input
        id={id}
        value={neu}
        autoFocus
        autoCapitalize="characters"
        className="zahlen h-10 font-mono"
        onChange={(e) => {
          setNeu(e.target.value)
        }}
      />
      <Button type="submit" size="lg" disabled={!neu.trim()}>
        {t('baustelle.service.speichern')}
      </Button>
      <Button
        type="button"
        size="lg"
        variant="ghost"
        onClick={() => {
          setOffen(false)
        }}
      >
        {t('baustelle.service.abbrechen')}
      </Button>
    </form>
  )
}
