import { Trash2 } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Auswahl } from '@/components/ui/auswahl'
import { Button } from '@/components/ui/button'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { Feld } from '@/components/ui/feld'
import { Input, Textarea } from '@/components/ui/input'
import { cn } from '@/lib/utils'

/** Ein Feld im Formular. Werte sind Texte; der Aufrufer wandelt sie beim Speichern um (CHF → Rappen …). */
export interface FeldSpec {
  name: string
  label: string
  art: 'text' | 'chf' | 'datum' | 'zahl' | 'notiz' | 'auswahl'
  optionen?: { wert: string; text: string }[]
  pflicht?: boolean
  breit?: boolean
  hinweis?: string
}

/**
 * Formular-Dialog der Finanzen für Zahlungen, Fixkosten, Eingänge und Material: dieselben Felder, dieselbe
 * Bedienung. «In den Papierkorb» erscheint nur bei bestehenden Einträgen.
 */
export function EintragDialog({
  titel,
  beschreibung,
  felder,
  start,
  laeuft,
  onSpeichern,
  onPapierkorb,
  onSchliessen,
  zusatz,
}: {
  titel: string
  beschreibung?: string
  felder: FeldSpec[]
  start: Record<string, string>
  laeuft: boolean
  onSpeichern: (w: Record<string, string>) => void
  onPapierkorb?: () => void
  onSchliessen: () => void
  zusatz?: ReactNode
}) {
  const { t } = useTranslation()
  const [w, setW] = useState(start)
  const fehlt = felder.some((f) => f.pflicht && !(w[f.name] ?? '').trim())
  const setze = (name: string, wert: string) => {
    setW((alt) => ({ ...alt, [name]: wert }))
  }

  return (
    <Dialog
      open
      onOpenChange={(o) => {
        if (!o) onSchliessen()
      }}
    >
      <DialogInhalt
        titel={titel}
        {...(beschreibung ? { beschreibung } : {})}
        fuss={
          <>
            {onPapierkorb && (
              <Button variant="ghost" onClick={onPapierkorb} className="mr-auto">
                <Trash2 />
                {t('finanzen.papierkorb')}
              </Button>
            )}
            <Button variant="ghost" onClick={onSchliessen}>
              {t('allgemein.abbrechen')}
            </Button>
            <Button
              laedt={laeuft}
              disabled={fehlt}
              onClick={() => {
                onSpeichern(w)
              }}
            >
              {t('allgemein.speichern')}
            </Button>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          {felder.map((f) => {
            const id = `fin-${f.name}`
            const wert = w[f.name] ?? ''
            return (
              <Feld
                key={f.name}
                id={id}
                label={f.label}
                pflicht={f.pflicht ?? false}
                {...(f.hinweis ? { hinweis: f.hinweis } : {})}
                className={cn((f.breit || f.art === 'notiz') && 'sm:col-span-2')}
              >
                {f.art === 'auswahl' ? (
                  <Auswahl
                    id={id}
                    value={wert}
                    onValueChange={(v) => {
                      setze(f.name, v)
                    }}
                    optionen={f.optionen ?? []}
                  />
                ) : f.art === 'notiz' ? (
                  <Textarea
                    id={id}
                    rows={2}
                    value={wert}
                    onChange={(e) => {
                      setze(f.name, e.target.value)
                    }}
                  />
                ) : (
                  <Input
                    id={id}
                    type={f.art === 'datum' ? 'date' : 'text'}
                    inputMode={f.art === 'chf' ? 'decimal' : f.art === 'zahl' ? 'numeric' : undefined}
                    value={wert}
                    onChange={(e) => {
                      setze(f.name, e.target.value)
                    }}
                  />
                )}
              </Feld>
            )
          })}
        </div>
        {zusatz}
      </DialogInhalt>
    </Dialog>
  )
}
