import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Filterchips } from '@/components/shared/Filterchips'
import { Button } from '@/components/ui/button'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { Feld } from '@/components/ui/feld'
import { Input } from '@/components/ui/input'
import { useAktion } from '../hooks/useAktion'
import { heute, zuerich } from '../lib/zeit'
import { zeitSpeichern } from '../services/baustelle'
import { zeitSchema } from '../schema'
import type { Zeit, ZeitArt } from '../types'

/** Datum und Uhrzeit vom Gerät (in der Schweiz eingestellt) als Zeitpunkt. */
const zeitpunkt = (datum: string, uhr: string) => new Date(`${datum}T${uhr}`).toISOString()

/** Zeit von Hand erfassen oder korrigieren. Geprüfte Zeiten ändert nur, wer prüfen darf; exportierte gar nicht. */
export function ZeitDialog({ zeit, onSchliessen }: { zeit: Zeit | null; onSchliessen: () => void }) {
  const { t } = useTranslation()
  const { laeuft, aus } = useAktion()
  const s = zeit ? zuerich(zeit.start) : null
  const [datum, setDatum] = useState(s?.datum ?? heute())
  const [start, setStart] = useState(s?.zeit ?? '07:00')
  const [stopp, setStopp] = useState(zeit?.stopp ? zuerich(zeit.stopp).zeit : '17:00')
  const [pause, setPause] = useState(String(zeit?.pause_min ?? 60))
  const [art, setArt] = useState<ZeitArt>(zeit?.art ?? 'arbeit')
  const [notiz, setNotiz] = useState(zeit?.notiz ?? '')

  const pruefung = zeitSchema.safeParse({ datum, start, stopp, pause_min: Number(pause) || 0 })
  const fehler = pruefung.success ? null : (pruefung.error.issues[0]?.message ?? null)

  async function speichern() {
    const ok = await aus(
      () =>
        zeitSpeichern({
          ...(zeit
            ? { id: zeit.id, person_id: zeit.person_id, projekt_id: zeit.projekt_id, rapport_id: zeit.rapport_id }
            : {}),
          start: zeitpunkt(datum, start),
          stopp: zeitpunkt(datum, stopp),
          pause_min: Number(pause) || 0,
          art,
          notiz: notiz.trim() || null,
        }),
      { de: 'Zeit gespeichert', fr: 'Temps enregistré' },
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
        titel={t(zeit ? 'baustelle.zeiten.korrigieren' : 'baustelle.zeiten.erfassen')}
        {...(zeit
          ? { beschreibung: [zeit.person, zeit.projekt_nummer, zeit.rapport_nummer].filter(Boolean).join(' · ') }
          : {})}
        fuss={
          <Button laedt={laeuft} disabled={Boolean(fehler)} onClick={() => void speichern()}>
            {t('allgemein.speichern')}
          </Button>
        }
      >
        <div className="grid grid-cols-2 gap-3">
          <Feld id="z-datum" label={t('baustelle.spalte.datum')} className="col-span-2">
            <Input
              id="z-datum"
              type="date"
              value={datum}
              onChange={(e) => {
                setDatum(e.target.value)
              }}
            />
          </Feld>
          <Feld id="z-start" label={t('baustelle.zeiten.start')}>
            <Input
              id="z-start"
              type="time"
              value={start}
              onChange={(e) => {
                setStart(e.target.value)
              }}
            />
          </Feld>
          <Feld id="z-stopp" label={t('baustelle.zeiten.stopp')} fehler={fehler ? t(fehler) : undefined}>
            <Input
              id="z-stopp"
              type="time"
              value={stopp}
              onChange={(e) => {
                setStopp(e.target.value)
              }}
            />
          </Feld>
          <Feld id="z-pause" label={t('baustelle.zeiten.pauseMin')}>
            <Input
              id="z-pause"
              inputMode="numeric"
              value={pause}
              onChange={(e) => {
                setPause(e.target.value.replace(/\D/g, ''))
              }}
            />
          </Feld>
          <div className="flex flex-col justify-end">
            <Filterchips
              einzeln
              beschriftung={t('baustelle.spalte.art')}
              optionen={(['arbeit', 'reise'] as const).map((a) => ({ wert: a, text: t(`baustelle.zeitart.${a}`) }))}
              gewaehlt={[art]}
              onChange={([a]) => {
                if (a) setArt(a as ZeitArt)
              }}
            />
          </div>
          <Feld id="z-notiz" label={t('baustelle.zeiten.notiz')} className="col-span-2">
            <Input
              id="z-notiz"
              value={notiz}
              onChange={(e) => {
                setNotiz(e.target.value)
              }}
            />
          </Feld>
        </div>
      </DialogInhalt>
    </Dialog>
  )
}
