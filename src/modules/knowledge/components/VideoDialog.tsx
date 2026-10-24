import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Auswahl } from '@/components/ui/auswahl'
import { Button } from '@/components/ui/button'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { Feld } from '@/components/ui/feld'
import { Input } from '@/components/ui/input'
import { useAktion } from '../hooks/useHandbuch'
import { titelAusDateiname } from '../lib/handbuch'
import { videoAngaben } from '../lib/video'
import { videoSchema } from '../schema'
import { speichereEintrag } from '../services/handbuch'
import type { HandbuchEintrag } from '../types'

/**
 * Video hinzufügen oder bearbeiten (V219 vidOpen): Titel, Text (auch französisch), gesprochene Sprache,
 * Reihenfolge und die Datei (MP4/WebM, höchstens 20 MB). Dauer und Vorschaubild liest der Browser selbst aus.
 */
export function VideoDialog({ eintrag, onSchliessen }: { eintrag: HandbuchEintrag | null; onSchliessen: () => void }) {
  const { t } = useTranslation()
  const { laeuft, aus } = useAktion()
  const [titel, setTitel] = useState(eintrag?.titel_de ?? '')
  const [beschreibung, setBeschreibung] = useState(eintrag?.beschreibung_de ?? '')
  const [titelFr, setTitelFr] = useState(eintrag?.titel_fr ?? '')
  const [beschreibungFr, setBeschreibungFr] = useState(eintrag?.beschreibung_fr ?? '')
  const [sprache, setSprache] = useState<'de' | 'fr'>(eintrag?.sprache ?? 'de')
  const [reihenfolge, setReihenfolge] = useState(eintrag?.reihenfolge ? String(eintrag.reihenfolge) : '')
  const [datei, setDatei] = useState<File | null>(null)
  const [gezeigt, setGezeigt] = useState(false)

  const pruefung = videoSchema.safeParse({ neu: !eintrag, titel_de: titel, datei_de: datei })
  const fehler = (feld: string) => {
    if (pruefung.success) return undefined
    const f = pruefung.error.issues.find((i) => i.path[0] === feld)
    // Zu gross sofort zeigen, fehlende Angaben erst nach «Speichern».
    if (!f || (!gezeigt && f.message !== 'handbuch.fehler.videoGross')) return undefined
    return t(f.message)
  }

  async function speichern() {
    setGezeigt(true)
    if (!pruefung.success) return
    const ok = await aus(
      async () =>
        speichereEintrag(
          {
            id: eintrag?.id ?? null,
            art: 'video',
            titel_de: titel,
            beschreibung_de: beschreibung,
            titel_fr: titelFr,
            beschreibung_fr: beschreibungFr,
            version: '',
            datum: null,
            sprache,
            reihenfolge: Number(reihenfolge) > 0 ? Math.round(Number(reihenfolge)) : null,
            datei_de: datei,
            datei_fr: null,
          },
          datei ? await videoAngaben(datei) : undefined,
        ),
      eintrag ? { de: 'Video gespeichert', fr: 'Vidéo enregistrée' } : { de: 'Video abgelegt', fr: 'Vidéo ajoutée' },
    )
    if (ok) onSchliessen()
  }

  return (
    <Dialog
      open
      onOpenChange={(o) => {
        if (!o) onSchliessen()
      }}
    >
      <DialogInhalt
        titel={eintrag ? t('handbuch.videos.bearbeiten') : t('handbuch.videos.neu')}
        beschreibung={t('handbuch.videos.dialogText')}
        className="md:max-w-xl"
        fuss={
          <>
            <Button variant="ghost" onClick={onSchliessen}>
              {t('allgemein.abbrechen')}
            </Button>
            <Button onClick={() => void speichern()} laedt={laeuft}>
              {t('allgemein.speichern')}
            </Button>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Feld
            id="video-datei"
            label={t('handbuch.videos.datei')}
            pflicht={!eintrag}
            className="sm:col-span-2"
            fehler={fehler('datei_de')}
            hinweis={eintrag?.datei_de ? t('handbuch.aktuell', { name: eintrag.datei_de.name }) : t('handbuch.videos.dateiHinweis')}
          >
            <Input
              id="video-datei"
              type="file"
              accept="video/mp4,video/webm,.mp4,.webm"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null
                setDatei(f)
                if (f && !titel.trim()) setTitel(titelAusDateiname(f.name).replace(/[-_]+/g, ' '))
              }}
            />
          </Feld>
          <Feld id="video-titel" label={t('handbuch.titelFeld')} pflicht className="sm:col-span-2" fehler={fehler('titel_de')}>
            <Input
              id="video-titel"
              placeholder={t('handbuch.videos.titelBeispiel')}
              value={titel}
              onChange={(e) => {
                setTitel(e.target.value)
              }}
            />
          </Feld>
          <Feld id="video-beschreibung" label={t('handbuch.beschreibungFeld')} className="sm:col-span-2">
            <Input
              id="video-beschreibung"
              placeholder={t('handbuch.videos.beschreibungBeispiel')}
              value={beschreibung}
              onChange={(e) => {
                setBeschreibung(e.target.value)
              }}
            />
          </Feld>
          <Feld id="video-sprache" label={t('handbuch.videos.gesprochen')}>
            <Auswahl
              id="video-sprache"
              value={sprache}
              onValueChange={(s) => {
                setSprache(s === 'fr' ? 'fr' : 'de')
              }}
              optionen={[
                { wert: 'de', text: t('handbuch.videos.sprache.de') },
                { wert: 'fr', text: t('handbuch.videos.sprache.fr') },
              ]}
            />
          </Feld>
          <Feld id="video-reihenfolge" label={t('handbuch.videos.reihenfolge')} hinweis={t('handbuch.videos.reihenfolgeHinweis')}>
            <Input
              id="video-reihenfolge"
              type="number"
              min={1}
              step={1}
              placeholder="1"
              value={reihenfolge}
              onChange={(e) => {
                setReihenfolge(e.target.value)
              }}
            />
          </Feld>
          <Feld id="video-titel-fr" label={t('handbuch.titelFr')}>
            <Input
              id="video-titel-fr"
              value={titelFr}
              onChange={(e) => {
                setTitelFr(e.target.value)
              }}
            />
          </Feld>
          <Feld id="video-beschreibung-fr" label={t('handbuch.beschreibungFr')}>
            <Input
              id="video-beschreibung-fr"
              value={beschreibungFr}
              onChange={(e) => {
                setBeschreibungFr(e.target.value)
              }}
            />
          </Feld>
        </div>
      </DialogInhalt>
    </Dialog>
  )
}
