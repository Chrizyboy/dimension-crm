import { FileUp, Save } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { Feld } from '@/components/ui/feld'
import { Textarea } from '@/components/ui/input'
import { meldeFehler } from '@/services/fehler'
import { melde } from '@/services/meldungen'
import { useVerkaufAenderung } from '../hooks/useVerkauf'
import { leseKalender, type Kalendertermin } from '../lib/kalenderdatei'
import { ersetzeKalender } from '../services/planung'

/**
 * Kalender einer Person laden (V233 CAL): eine .ics-Datei aus Outlook/Google, eine .csv oder eine aus
 * Outlook kopierte Liste. Ersetzt die bisher geladenen Termine im selben Zeitraum. Ab Phase 8 kommt
 * der Kalender direkt aus Microsoft 365.
 */
export default function KalenderLaden({ personId, onSchliessen }: { personId: string; onSchliessen: () => void }) {
  const { t } = useTranslation()
  const [termine, setTermine] = useState<Kalendertermin[] | null>(null)
  const [quelle, setQuelle] = useState<'datei' | 'einfuegen'>('datei')
  const [text, setText] = useState('')
  const speichern = useVerkaufAenderung(() => ersetzeKalender(personId, quelle, termine ?? []))

  function lies(inhalt: string, q: 'datei' | 'einfuegen') {
    setQuelle(q)
    setTermine(leseKalender(inhalt))
  }

  async function sichern() {
    try {
      const n = await speichern.mutateAsync(undefined)
      melde('ok', { de: `${n} Termine geladen`, fr: `${n} rendez-vous chargés` })
      onSchliessen()
    } catch (f) {
      meldeFehler(f, 'kalender')
      melde('kritisch', { de: 'Kalender nicht geladen', fr: 'Calendrier non chargé' })
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(offen) => {
        if (!offen) onSchliessen()
      }}
    >
      <DialogInhalt
        titel={t('verkauf.kalender.laden')}
        beschreibung={t('verkauf.kalender.ladenText')}
        fuss={
          <>
            <Button variant="secondary" onClick={onSchliessen}>
              {t('allgemein.abbrechen')}
            </Button>
            <Button laedt={speichern.isPending} disabled={!termine?.length} onClick={() => void sichern()}>
              <Save />
              {t('verkauf.kalender.uebernehmen', { count: termine?.length ?? 0 })}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <label className="hover:bg-muted/60 focus-within:ring-ring flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed p-6 text-center text-sm focus-within:ring-2">
            <FileUp className="text-muted-foreground size-6" aria-hidden="true" />
            {t('verkauf.kalender.datei')}
            <input
              type="file"
              accept=".ics,.csv,.txt,text/calendar,text/csv"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f)
                  void f.text().then((x) => {
                    lies(x, 'datei')
                  })
              }}
            />
          </label>
          <Feld
            id="kalender-text"
            label={t('verkauf.kalender.einfuegen')}
            hinweis={t('verkauf.kalender.einfuegenHinweis')}
          >
            <Textarea
              id="kalender-text"
              rows={4}
              value={text}
              onChange={(e) => {
                setText(e.target.value)
                lies(e.target.value, 'einfuegen')
              }}
            />
          </Feld>
          {termine && (
            <p className={termine.length ? 'text-ok text-sm' : 'text-warn text-sm'} role="status">
              {termine.length
                ? t('verkauf.kalender.erkannt', { count: termine.length, mitOrt: termine.filter((x) => x.plz).length })
                : t('verkauf.kalender.nichtsErkannt')}
            </p>
          )}
        </div>
      </DialogInhalt>
    </Dialog>
  )
}
