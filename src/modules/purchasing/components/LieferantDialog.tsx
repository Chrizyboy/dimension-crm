import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Auswahl } from '@/components/ui/auswahl'
import { Button } from '@/components/ui/button'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { Feld } from '@/components/ui/feld'
import { Input, Textarea } from '@/components/ui/input'
import { Switch } from '@/components/ui/schalter'
import { useAktion } from '../hooks/useAktion'
import { lieferantSpeichern } from '../services/lager'
import { lieferantSchema } from '../schema'
import type { Lieferant } from '../types'

/** Lieferant anlegen oder ändern. Inaktive Lieferanten bekommen keine Bestellvorschläge mehr. */
export function LieferantDialog({
  lieferant: l,
  onSchliessen,
}: {
  lieferant: Lieferant | null
  onSchliessen: () => void
}) {
  const { t } = useTranslation()
  const { laeuft, aus } = useAktion()
  const [w, setW] = useState({
    name: l?.name ?? '',
    email_bestellung: l?.email_bestellung ?? '',
    kundennummer_bei_lieferant: l?.kundennummer_bei_lieferant ?? '',
    telefon: l?.telefon ?? '',
    sprache: l?.sprache ?? 'de',
    aktiv: l?.aktiv ?? true,
    notiz: l?.notiz ?? '',
  })
  const pruefung = lieferantSchema.safeParse(w)
  const fehler = (feld: string) => {
    const f = pruefung.error?.issues.find((i) => i.path[0] === feld)
    return f ? t(f.message) : undefined
  }
  const feld = (k: 'name' | 'email_bestellung' | 'kundennummer_bei_lieferant' | 'telefon') => ({
    id: `lf-${k}`,
    value: w[k],
    onChange: (e: { target: { value: string } }) => {
      setW((x) => ({ ...x, [k]: e.target.value }))
    },
  })

  async function speichern() {
    if (!pruefung.success) return
    const d = pruefung.data
    const ok = await aus(() =>
      lieferantSpeichern({
        ...(l ? { id: l.id } : {}),
        name: d.name,
        email_bestellung: d.email_bestellung || null,
        kundennummer_bei_lieferant: d.kundennummer_bei_lieferant || null,
        telefon: d.telefon || null,
        sprache: d.sprache,
        aktiv: d.aktiv,
        notiz: d.notiz || null,
      }),
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
        titel={l ? l.name : t('einkauf.lieferant.neu')}
        beschreibung={t('einkauf.lieferant.text')}
        fuss={
          <>
            <Button variant="ghost" onClick={onSchliessen}>
              {t('allgemein.abbrechen')}
            </Button>
            <Button onClick={() => void speichern()} laedt={laeuft} disabled={!pruefung.success}>
              {t('allgemein.speichern')}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <Feld id="lf-name" label={t('einkauf.lieferant.name')} pflicht>
            <Input {...feld('name')} />
          </Feld>
          <Feld id="lf-email_bestellung" label={t('einkauf.lieferant.mail')} fehler={fehler('email_bestellung')}>
            <Input type="email" {...feld('email_bestellung')} />
          </Feld>
          <div className="grid grid-cols-2 gap-3">
            <Feld id="lf-kundennummer_bei_lieferant" label={t('einkauf.lieferant.kundennummer')}>
              <Input {...feld('kundennummer_bei_lieferant')} />
            </Feld>
            <Feld id="lf-telefon" label={t('einkauf.lieferant.telefon')}>
              <Input type="tel" {...feld('telefon')} />
            </Feld>
          </div>
          <Feld id="lf-sprache" label={t('einkauf.lieferant.sprache')}>
            <Auswahl
              id="lf-sprache"
              value={w.sprache}
              onValueChange={(s) => {
                setW((x) => ({ ...x, sprache: s === 'fr' ? 'fr' : 'de' }))
              }}
              optionen={(['de', 'fr'] as const).map((s) => ({ wert: s, text: t(`wartung.sprache.${s}`) }))}
            />
          </Feld>
          <Feld id="lf-notiz" label={t('einkauf.feld.notiz')}>
            <Textarea
              id="lf-notiz"
              rows={2}
              value={w.notiz}
              onChange={(e) => {
                setW((x) => ({ ...x, notiz: e.target.value }))
              }}
            />
          </Feld>
          <label className="flex items-center gap-2 text-sm">
            <Switch
              checked={w.aktiv}
              onCheckedChange={(a) => {
                setW((x) => ({ ...x, aktiv: a }))
              }}
            />
            {t('einkauf.lieferant.aktiv')}
          </label>
        </div>
      </DialogInhalt>
    </Dialog>
  )
}
