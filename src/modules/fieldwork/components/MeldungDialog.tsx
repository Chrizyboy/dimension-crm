import { useQueryClient } from '@tanstack/react-query'
import { Camera, Mic, Send } from 'lucide-react'
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Filterchips } from '@/components/shared/Filterchips'
import { Button } from '@/components/ui/button'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { Feld } from '@/components/ui/feld'
import { Textarea } from '@/components/ui/input'
import { Switch } from '@/components/ui/schalter'
import { useDiktat } from '@/hooks/useDiktat'
import { verkleinern } from '@/lib/bild'
import { melde } from '@/services/meldungen'
import { meldungErfassen } from '../services/monteur'
import { MELDUNG_ARTEN, type MeldungArt } from '../types'

/**
 * «Problem melden» von der Baustelle: Art, Text (auch diktiert), Fotos und ob die Arbeit weitergehen kann.
 * Die Projektleitung bekommt sofort Aufgabe und Glocke; ohne Netz geht die Meldung raus, sobald Netz da ist.
 */
export function MeldungDialog({
  projektId,
  rapportId,
  onSchliessen,
}: {
  projektId: string | null
  rapportId: string | null
  onSchliessen: () => void
}) {
  const { t, i18n } = useTranslation()
  const qc = useQueryClient()
  const [art, setArt] = useState<MeldungArt>('material')
  const [text, setText] = useState('')
  const [weiter, setWeiter] = useState(true)
  const [fotos, setFotos] = useState<Blob[]>([])
  const [laeuft, setLaeuft] = useState(false)
  const eingabe = useRef<HTMLInputElement>(null)
  const diktat = useDiktat(i18n.language.startsWith('fr') ? 'fr' : 'de', (satz) => {
    setText((alt) => (alt ? `${alt} ${satz}` : satz))
  })

  async function senden() {
    setLaeuft(true)
    try {
      await meldungErfassen(
        { id: crypto.randomUUID(), art, text: text.trim(), weiter, projekt_id: projektId, rapport_id: rapportId },
        fotos,
      )
      await qc.invalidateQueries({ queryKey: ['baustelle'] })
      melde('ok', { de: 'Meldung an die Projektleitung', fr: 'Signalement envoyé au chef de projet' })
      onSchliessen()
    } catch {
      melde('kritisch', { de: 'Meldung nicht gespeichert', fr: 'Signalement non enregistré' })
    } finally {
      setLaeuft(false)
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
        titel={t('baustelle.meldung.titel')}
        beschreibung={t('baustelle.meldung.text')}
        fuss={
          <Button size="lg" variant="accent" laedt={laeuft} disabled={!text.trim()} onClick={() => void senden()}>
            <Send />
            {t('baustelle.meldung.senden')}
          </Button>
        }
      >
        <div className="flex flex-col gap-4">
          <Filterchips
            einzeln
            beschriftung={t('baustelle.meldung.art')}
            optionen={MELDUNG_ARTEN.map((a) => ({ wert: a, text: t(`baustelle.meldung.arten.${a}`) }))}
            gewaehlt={[art]}
            onChange={(w) => {
              if (w[0]) setArt(w[0] as MeldungArt)
            }}
          />
          <Feld id="meldung-text" label={t('baustelle.meldung.was')} pflicht>
            <Textarea
              id="meldung-text"
              rows={4}
              value={text}
              placeholder={t('baustelle.meldung.platzhalter')}
              onChange={(e) => {
                setText(e.target.value)
              }}
            />
          </Feld>
          <div className="flex flex-wrap gap-2">
            {diktat.verfuegbar && (
              <Button variant={diktat.laeuft ? 'danger' : 'secondary'} onClick={diktat.umschalten}>
                <Mic />
                {t(diktat.laeuft ? 'baustelle.diktat.stopp' : 'baustelle.diktat.start')}
              </Button>
            )}
            <Button variant="secondary" onClick={() => eingabe.current?.click()}>
              <Camera />
              {t('baustelle.meldung.foto', { count: fotos.length })}
            </Button>
            <input
              ref={eingabe}
              type="file"
              accept="image/*"
              capture="environment"
              multiple
              className="sr-only"
              aria-label={t('baustelle.meldung.foto', { count: fotos.length })}
              onChange={(e) => {
                const d = Array.from(e.target.files ?? [])
                void Promise.all(d.map((f) => verkleinern(f))).then((b) => {
                  setFotos((alt) => [...alt, ...b])
                })
              }}
            />
          </div>
          <label className="flex items-center justify-between gap-3 text-sm">
            {t('baustelle.meldung.weiter')}
            <Switch checked={weiter} onCheckedChange={setWeiter} />
          </label>
          {!weiter && <p className="text-warn text-sm">{t('baustelle.meldung.steht')}</p>}
        </div>
      </DialogInhalt>
    </Dialog>
  )
}
