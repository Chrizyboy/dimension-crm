import { Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Auswahl } from '@/components/ui/auswahl'
import { Button } from '@/components/ui/button'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { Feld } from '@/components/ui/feld'
import { Input, Textarea } from '@/components/ui/input'
import { useUi } from '@/stores/ui'
import { useAktion } from '../hooks/useAktion'
import { heute, zeitpunkt, zuerich } from '../lib/zeit'
import { zeitSchema } from '../schema'
import { zeitEntfernen, zeitSpeichern } from '../services/zeit'
import type { Posten, Zeit } from '../types'

/**
 * Zeit nachtragen oder korrigieren (vergessen zu stempeln): Tag, von–bis, Pause und Posten. Zeiten auf Projekte
 * und Service-Fälle korrigiert man in «Baustelle & Rapporte», wo Rapport und Team dazugehören.
 */
export function ZeitDialog({
  personId,
  zeit,
  posten,
  onSchliessen,
}: {
  personId: string
  zeit: Zeit | null
  posten: readonly Posten[]
  onSchliessen: () => void
}) {
  const { t } = useTranslation()
  const sprache = useUi((z) => z.sprache)
  const { laeuft, aus } = useAktion()
  const [w, setW] = useState({
    tag: zeit ? zuerich(zeit.start).datum : heute(),
    von: zeit ? zuerich(zeit.start).zeit : '07:30',
    bis: zeit?.stopp ? zuerich(zeit.stopp).zeit : '17:00',
    pause_min: zeit?.pause_min ?? 60,
    intern: zeit?.intern ?? (posten.some((p) => p.schluessel === 'buero') ? 'buero' : (posten[0]?.schluessel ?? '')),
    notiz: zeit?.notiz ?? '',
  })
  const pruefung = zeitSchema.safeParse(w)
  const fehler = pruefung.success
    ? {}
    : Object.fromEntries(pruefung.error.issues.map((i) => [String(i.path[0]), t(i.message)]))

  async function speichern() {
    if (!pruefung.success) return
    const ok = await aus(
      () =>
        zeitSpeichern({
          ...(zeit ? { id: zeit.id } : {}),
          person_id: personId,
          start: zeitpunkt(w.tag, w.von),
          stopp: zeitpunkt(w.tag, w.bis),
          pause_min: w.pause_min,
          intern: w.intern,
          notiz: w.notiz.trim() || null,
        }),
      { de: 'Zeit gespeichert', fr: 'Temps enregistré' },
    )
    if (ok) onSchliessen()
  }

  async function entfernen() {
    if (!zeit) return
    const ok = await aus(() => zeitEntfernen(zeit.id), { de: 'In den Papierkorb gelegt', fr: 'Mis à la corbeille' })
    if (ok) onSchliessen()
  }

  const feld = (f: 'tag' | 'von' | 'bis', typ: 'date' | 'time') => (
    <Feld id={`zd-${f}`} label={t(`zeit.feld.${f}`)} pflicht {...(fehler[f] ? { fehler: fehler[f] } : {})}>
      <Input
        id={`zd-${f}`}
        type={typ}
        value={w[f]}
        onChange={(e) => {
          setW({ ...w, [f]: e.target.value })
        }}
      />
    </Feld>
  )

  return (
    <Dialog
      open
      onOpenChange={(o) => {
        if (!o) onSchliessen()
      }}
    >
      <DialogInhalt
        titel={t(zeit ? 'zeit.dialog.bearbeiten' : 'zeit.dialog.neu')}
        beschreibung={t('zeit.dialog.text')}
        fuss={
          <>
            {zeit && (
              <Button variant="ghost" className="mr-auto" onClick={() => void entfernen()} disabled={laeuft}>
                <Trash2 />
                {t('zeit.entfernen')}
              </Button>
            )}
            <Button variant="ghost" onClick={onSchliessen}>
              {t('allgemein.abbrechen')}
            </Button>
            <Button onClick={() => void speichern()} laedt={laeuft} disabled={!pruefung.success}>
              {t('allgemein.speichern')}
            </Button>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-3">
          {feld('tag', 'date')}
          {feld('von', 'time')}
          {feld('bis', 'time')}
          <Feld id="zd-pause" label={t('zeit.feld.pause')} {...(fehler.pause_min ? { fehler: fehler.pause_min } : {})}>
            <Input
              id="zd-pause"
              type="number"
              inputMode="numeric"
              min={0}
              step={5}
              value={w.pause_min}
              onChange={(e) => {
                setW({ ...w, pause_min: Number(e.target.value) })
              }}
            />
          </Feld>
          <Feld id="zd-posten" label={t('zeit.feld.posten')} pflicht className="sm:col-span-2">
            <Auswahl
              id="zd-posten"
              value={w.intern}
              onValueChange={(v) => {
                setW({ ...w, intern: v })
              }}
              optionen={posten.map((p) => ({ wert: p.schluessel, text: p[sprache] }))}
            />
          </Feld>
          <Feld id="zd-notiz" label={t('zeit.feld.notiz')} className="sm:col-span-3">
            <Textarea
              id="zd-notiz"
              rows={2}
              value={w.notiz}
              onChange={(e) => {
                setW({ ...w, notiz: e.target.value })
              }}
            />
          </Feld>
        </div>
      </DialogInhalt>
    </Dialog>
  )
}
