import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Trenner } from '@/components/ui/diverses'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { Label } from '@/components/ui/feld'
import { Switch } from '@/components/ui/schalter'
import { meldeFehler } from '@/services/fehler'
import { melde } from '@/services/meldungen'
import { useUi } from '@/stores/ui'
import type { ModulMeta } from '@/types/modul'
import { useBenutzerAenderung } from '../hooks/useBenutzer'
import { speichereRolle } from '../services/benutzer'
import type { Rolle } from '../types'
import { BereicheAuswahl } from './BereicheAuswahl'
import { RechteAuswahl } from './RechteAuswahl'

interface RollenDialogProps {
  rolle: Rolle | null
  onSchliessen: () => void
  module: readonly ModulMeta[]
}

/** Rechte und sichtbare Bereiche einer Rolle anpassen. Gilt sofort für alle Personen mit dieser Rolle. */
export function RollenDialog({ rolle, onSchliessen, module }: RollenDialogProps) {
  const { t } = useTranslation()
  const sprache = useUi((z) => z.sprache)
  const [entwurf, setEntwurf] = useState<Rolle | null>(rolle)
  const speichern = useBenutzerAenderung((r: Rolle) =>
    speichereRolle(r.id, { rechte: r.rechte, bereiche: r.bereiche, ansicht: r.ansicht }),
  )
  if (!entwurf) return null
  const alle = entwurf.bereiche.length === 0

  async function sichern() {
    if (!entwurf) return
    try {
      await speichern.mutateAsync(entwurf)
      melde('ok', { de: 'Rolle gespeichert', fr: 'Rôle enregistré' })
      onSchliessen()
    } catch (f) {
      meldeFehler(f, 'rolle-speichern')
      melde('kritisch', { de: 'Nicht gespeichert', fr: 'Non enregistré' })
    }
  }

  return (
    <Dialog
      open={rolle !== null}
      onOpenChange={(o) => {
        if (!o) onSchliessen()
      }}
    >
      <DialogInhalt
        art="seite"
        titel={sprache === 'fr' ? entwurf.name_fr : entwurf.name_de}
        beschreibung={(sprache === 'fr' ? entwurf.beschreibung_fr : entwurf.beschreibung_de) ?? ''}
        fuss={
          <>
            <Button variant="secondary" onClick={onSchliessen}>
              {t('allgemein.abbrechen')}
            </Button>
            <Button laedt={speichern.isPending} onClick={() => void sichern()}>
              {t('allgemein.speichern')}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-5">
          <section className="flex flex-col gap-3">
            <h3 className="text-sm font-semibold">{t('rollen.rechte')}</h3>
            <RechteAuswahl
              id="rolle-recht"
              wert={entwurf.rechte}
              onChange={(rechte) => {
                setEntwurf({ ...entwurf, rechte })
              }}
            />
          </section>
          <Trenner />
          <section className="flex items-start gap-3">
            <Switch
              id="rolle-einfach"
              checked={entwurf.ansicht === 'einfach'}
              onCheckedChange={(an) => {
                setEntwurf({ ...entwurf, ansicht: an ? 'einfach' : 'voll' })
              }}
            />
            <div className="flex flex-col gap-0.5">
              <Label htmlFor="rolle-einfach">{t('rollen.einfacheAnsicht')}</Label>
              <p className="text-muted-foreground text-xs">{t('rollen.einfacheAnsichtText')}</p>
            </div>
          </section>
          <Trenner />
          <section className="flex flex-col gap-3">
            <h3 className="text-sm font-semibold">{t('benutzer.bereiche')}</h3>
            <div className="flex items-center gap-3">
              <Switch
                id="rolle-alle"
                checked={alle}
                onCheckedChange={(an) => {
                  setEntwurf({ ...entwurf, bereiche: an ? [] : module.filter((m) => !m.immer).map((m) => m.id) })
                }}
              />
              <Label htmlFor="rolle-alle" className="font-normal">
                {t('rollen.alleBereiche')}
              </Label>
            </div>
            {!alle && (
              <BereicheAuswahl
                id="rolle-bereich"
                module={module}
                wert={entwurf.bereiche}
                onChange={(bereiche) => {
                  setEntwurf({ ...entwurf, bereiche })
                }}
              />
            )}
          </section>
        </div>
      </DialogInhalt>
    </Dialog>
  )
}
