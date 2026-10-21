import { Send } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Auswahl } from '@/components/ui/auswahl'
import { Button } from '@/components/ui/button'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { Feld } from '@/components/ui/feld'
import { Input } from '@/components/ui/input'
import { meldeFehler } from '@/services/fehler'
import { melde } from '@/services/meldungen'
import { useUi } from '@/stores/ui'
import { useBenutzerAenderung } from '../hooks/useBenutzer'
import { feldFehler } from '@/lib/formular'
import { einladungSchema, type EinladungEingabe } from '../schema'
import { ladeEin } from '../services/benutzer'
import type { Rolle, Standort } from '../types'

interface EinladungDialogProps {
  offen: boolean
  onOffen: (offen: boolean) => void
  rollen: Rolle[]
  standorte: Standort[]
}

const LEER: EinladungEingabe = { name: '', email: '', rolle: 'verkauf', standort_id: null, sprache: 'de' }

/**
 * Neue Person einladen. Der Knopf sendet sofort eine Mail an die Person; das steht ausdrücklich
 * über dem Knopf, weil alles, was nach aussen geht, eine bewusste Freigabe braucht (CLAUDE.md Regel 6).
 */
export function EinladungDialog({ offen, onOffen, rollen, standorte }: EinladungDialogProps) {
  const { t } = useTranslation()
  const sprache = useUi((z) => z.sprache)
  const [werte, setWerte] = useState<EinladungEingabe>(LEER)
  const [fehler, setFehler] = useState<Partial<Record<keyof EinladungEingabe, string>>>({})
  const senden = useBenutzerAenderung(ladeEin)

  function setze<K extends keyof EinladungEingabe>(feld: K, wert: EinladungEingabe[K]) {
    setWerte((w) => ({ ...w, [feld]: wert }))
  }

  async function absenden() {
    const geprueft = einladungSchema.safeParse(werte)
    if (!geprueft.success) {
      setFehler(feldFehler(geprueft.error.issues, t))
      return
    }
    setFehler({})
    try {
      const ergebnis = await senden.mutateAsync(geprueft.data)
      if (ergebnis.status === 'hat_konto') {
        melde('info', { de: 'Person hat schon ein Login', fr: 'La personne a déjà un accès' })
      } else if (!ergebnis.ok) {
        melde('kritisch', { de: 'Einladung nicht gesendet', fr: 'Invitation non envoyée' })
        return
      } else {
        melde('ok', {
          de: `Einladung an ${geprueft.data.email} gesendet`,
          fr: `Invitation envoyée à ${geprueft.data.email}`,
        })
      }
      setWerte(LEER)
      onOffen(false)
    } catch (f) {
      meldeFehler(f, 'einladen')
      melde('kritisch', { de: 'Einladung nicht gesendet', fr: 'Invitation non envoyée' })
    }
  }

  return (
    <Dialog open={offen} onOpenChange={onOffen}>
      <DialogInhalt
        titel={t('benutzer.einladenTitel')}
        beschreibung={t('benutzer.einladenText')}
        fuss={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                onOffen(false)
              }}
            >
              {t('allgemein.abbrechen')}
            </Button>
            <Button laedt={senden.isPending} onClick={() => void absenden()}>
              <Send />
              {t('benutzer.einladungSenden')}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Feld id="einladung-name" label={t('benutzer.name')} pflicht fehler={fehler.name}>
            <Input
              id="einladung-name"
              value={werte.name}
              autoComplete="off"
              onChange={(e) => {
                setze('name', e.target.value)
              }}
            />
          </Feld>
          <Feld id="einladung-email" label={t('benutzer.email')} pflicht fehler={fehler.email}>
            <Input
              id="einladung-email"
              type="email"
              value={werte.email}
              autoComplete="off"
              onChange={(e) => {
                setze('email', e.target.value)
              }}
            />
          </Feld>
          <div className="grid gap-4 sm:grid-cols-2">
            <Feld id="einladung-rolle" label={t('benutzer.rolle')} pflicht fehler={fehler.rolle}>
              <Auswahl
                id="einladung-rolle"
                value={werte.rolle}
                onValueChange={(w) => {
                  setze('rolle', w)
                }}
                optionen={rollen.map((r) => ({ wert: r.schluessel, text: sprache === 'fr' ? r.name_fr : r.name_de }))}
              />
            </Feld>
            <Feld id="einladung-standort" label={t('benutzer.standort')}>
              <Auswahl
                id="einladung-standort"
                value={werte.standort_id ?? ''}
                onValueChange={(w) => {
                  setze('standort_id', w || null)
                }}
                platzhalter={t('benutzer.keinStandort')}
                optionen={standorte.map((s) => ({ wert: s.id, text: s.name }))}
              />
            </Feld>
          </div>
          <Feld id="einladung-sprache" label={t('einstellungen.sprache')}>
            <Auswahl
              id="einladung-sprache"
              value={werte.sprache}
              onValueChange={(w) => {
                setze('sprache', w === 'fr' ? 'fr' : 'de')
              }}
              optionen={[
                { wert: 'de', text: 'Deutsch' },
                { wert: 'fr', text: 'Français' },
              ]}
            />
          </Feld>
          <p className="bg-info-soft text-info rounded-md px-3 py-2 text-xs">
            {werte.email.includes('@')
              ? t('benutzer.einladenHinweis', { email: werte.email })
              : t('benutzer.einladenHinweisLeer')}
          </p>
        </div>
      </DialogInhalt>
    </Dialog>
  )
}
