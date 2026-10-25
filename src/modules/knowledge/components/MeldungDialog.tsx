import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Auswahl } from '@/components/ui/auswahl'
import { Button } from '@/components/ui/button'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { Feld } from '@/components/ui/feld'
import { Input, Textarea } from '@/components/ui/input'
import { useSichtbareModule } from '@/hooks/useSichtbareModule'
import { melde } from '@/services/meldungen'
import { useUi } from '@/stores/ui'
import { useAktion } from '../hooks/useHandbuch'
import { meldungNummer } from '../lib/handbuch'
import { meldungSchema } from '../schema'
import { melden } from '../services/meldungen'
import { PRIOS, type Prio } from '../types'

/**
 * «Fehler melden» (V233 openHelpdesk): worum es geht, was passiert ist, was man erwartet hätte, Bereich,
 * Dringlichkeit und Bildschirmfotos. Browser, Fenstergrösse und Sprache gehen automatisch mit.
 */
export function MeldungDialog({ bereich, onSchliessen }: { bereich: string | null; onSchliessen: () => void }) {
  const { t } = useTranslation()
  const sprache = useUi((z) => z.sprache)
  const module = useSichtbareModule()
  const { laeuft, aus } = useAktion()
  const [titel, setTitel] = useState('')
  const [text, setText] = useState('')
  const [erwartet, setErwartet] = useState('')
  const [wo, setWo] = useState(module.some((m) => m.id === bereich) ? (bereich ?? 'anderes') : 'anderes')
  const [prio, setPrio] = useState<Prio>('normal')
  const [dateien, setDateien] = useState<File[]>([])
  const [gezeigt, setGezeigt] = useState(false)

  const pruefung = meldungSchema.safeParse({ titel, text })
  const fehler = (feld: string) => {
    if (!gezeigt || pruefung.success) return undefined
    const f = pruefung.error.issues.find((i) => i.path[0] === feld)
    return f ? t(f.message) : undefined
  }

  async function senden() {
    setGezeigt(true)
    if (!pruefung.success) return
    let nummer = ''
    const ok = await aus(async () => {
      const r = await melden({ titel, text, erwartet, bereich: wo, prio, dateien }, sprache)
      nummer = meldungNummer(r)
    })
    if (ok) {
      melde('ok', {
        de: `Danke! Meldung ${nummer} ist bei der Administration.`,
        fr: `Merci ! Le signalement ${nummer} est transmis à l’administration.`,
      })
      onSchliessen()
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(o) => {
        if (!o) onSchliessen()
      }}
    >
      <DialogInhalt
        titel={t('handbuch.meldungen.melden')}
        beschreibung={t('handbuch.meldungen.meldenText')}
        className="md:max-w-xl"
        fuss={
          <>
            <Button variant="ghost" onClick={onSchliessen}>
              {t('allgemein.abbrechen')}
            </Button>
            <Button onClick={() => void senden()} laedt={laeuft}>
              {t('handbuch.meldungen.senden')}
            </Button>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Feld
            id="meldung-titel"
            label={t('handbuch.meldungen.titel')}
            pflicht
            className="sm:col-span-2"
            fehler={fehler('titel')}
          >
            <Input
              id="meldung-titel"
              placeholder={t('handbuch.meldungen.titelBeispiel')}
              value={titel}
              onChange={(e) => {
                setTitel(e.target.value)
              }}
            />
          </Feld>
          <Feld
            id="meldung-text"
            label={t('handbuch.meldungen.was')}
            pflicht
            className="sm:col-span-2"
            fehler={fehler('text')}
          >
            <Textarea
              id="meldung-text"
              rows={4}
              placeholder={t('handbuch.meldungen.wasBeispiel')}
              value={text}
              onChange={(e) => {
                setText(e.target.value)
              }}
            />
          </Feld>
          <Feld id="meldung-erwartet" label={t('handbuch.meldungen.erwartet')} className="sm:col-span-2">
            <Textarea
              id="meldung-erwartet"
              rows={2}
              value={erwartet}
              onChange={(e) => {
                setErwartet(e.target.value)
              }}
            />
          </Feld>
          <Feld id="meldung-bereich" label={t('handbuch.meldungen.bereich')}>
            <Auswahl
              id="meldung-bereich"
              value={wo}
              onValueChange={setWo}
              optionen={[
                ...module.map((m) => ({ wert: m.id, text: m.titel[sprache] })),
                { wert: 'anderes', text: t('handbuch.meldungen.anderes') },
              ]}
            />
          </Feld>
          <Feld id="meldung-prio" label={t('handbuch.meldungen.prio')}>
            <Auswahl
              id="meldung-prio"
              value={prio}
              onValueChange={(p) => {
                setPrio(PRIOS.find((x) => x === p) ?? 'normal')
              }}
              optionen={PRIOS.map((p) => ({ wert: p, text: t(`handbuch.meldungen.prioWert.${p}`) }))}
            />
          </Feld>
          <Feld
            id="meldung-dateien"
            label={t('handbuch.meldungen.dateien')}
            hinweis={dateien.length ? dateien.map((d) => d.name).join(', ') : t('handbuch.meldungen.dateienHinweis')}
            className="sm:col-span-2"
          >
            <Input
              id="meldung-dateien"
              type="file"
              multiple
              accept="image/*,application/pdf"
              onChange={(e) => {
                setDateien([...(e.target.files ?? [])])
              }}
            />
          </Feld>
        </div>
      </DialogInhalt>
    </Dialog>
  )
}
