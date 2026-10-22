import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Auswahl } from '@/components/ui/auswahl'
import { Button } from '@/components/ui/button'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { Feld } from '@/components/ui/feld'
import { Input, Textarea } from '@/components/ui/input'
import { Switch } from '@/components/ui/schalter'
import { useAktion } from '../hooks/useAktion'
import { subunternehmerSchema } from '../schema'
import { subunternehmerSpeichern } from '../services/subunternehmer'
import type { Subunternehmer } from '../types'

type TextFeld = 'name' | 'gewerk' | 'email' | 'telefon'

/** Subunternehmer erfassen oder ändern. Entfernt wird nie, nur auf «inaktiv» gestellt. */
export function SubunternehmerDialog({ sub, onSchliessen }: { sub: Subunternehmer | null; onSchliessen: () => void }) {
  const { t } = useTranslation()
  const { laeuft, aus } = useAktion()
  const [w, setW] = useState({
    name: sub?.name ?? '',
    gewerk: sub?.gewerk ?? '',
    email: sub?.email ?? '',
    telefon: sub?.telefon ?? '',
    sprache: sub?.sprache ?? 'de',
    aktiv: sub?.aktiv ?? true,
    notiz: sub?.notiz ?? '',
  })
  const [fehler, setFehler] = useState<Partial<Record<string, string>>>({})

  async function speichern() {
    const g = subunternehmerSchema.safeParse(w)
    if (!g.success) {
      setFehler(Object.fromEntries(g.error.issues.map((i) => [String(i.path[0]), t(i.message)])))
      return
    }
    const ok = await aus(
      () =>
        subunternehmerSpeichern({
          ...(sub ? { id: sub.id } : {}),
          name: g.data.name,
          gewerk: g.data.gewerk || null,
          email: g.data.email || null,
          telefon: g.data.telefon || null,
          sprache: g.data.sprache,
          aktiv: g.data.aktiv,
          notiz: g.data.notiz || null,
        }),
      { de: 'Gespeichert', fr: 'Enregistré' },
    )
    if (ok) onSchliessen()
  }

  const text = (f: TextFeld, typ = 'text') => (
    <Feld
      id={`su-${f}`}
      label={t(`projekte.subStamm.${f}`)}
      pflicht={f === 'name'}
      {...(fehler[f] ? { fehler: fehler[f] } : {})}
    >
      <Input
        id={`su-${f}`}
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
        titel={sub ? sub.name : t('projekte.subStamm.neu')}
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
        <div className="grid gap-3 sm:grid-cols-2">
          {text('name')}
          {text('gewerk')}
          {text('email', 'email')}
          {text('telefon', 'tel')}
          <Feld id="su-sprache" label={t('projekte.feld.sprache')}>
            <Auswahl
              id="su-sprache"
              value={w.sprache}
              onValueChange={(v) => {
                setW({ ...w, sprache: v === 'fr' ? 'fr' : 'de' })
              }}
              optionen={[
                { wert: 'de', text: 'Deutsch' },
                { wert: 'fr', text: 'Français' },
              ]}
            />
          </Feld>
          <label className="flex items-center gap-2 self-end pb-1.5 text-sm">
            <Switch
              checked={w.aktiv}
              onCheckedChange={(a) => {
                setW({ ...w, aktiv: a })
              }}
            />
            {t('projekte.subStamm.aktiv')}
          </label>
          <div className="sm:col-span-2">
            <Feld id="su-notiz" label={t('projekte.feld.notiz')}>
              <Textarea
                id="su-notiz"
                rows={2}
                value={w.notiz}
                onChange={(e) => {
                  setW({ ...w, notiz: e.target.value })
                }}
              />
            </Feld>
          </div>
        </div>
      </DialogInhalt>
    </Dialog>
  )
}
