import { Save } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Auswahl } from '@/components/ui/auswahl'
import { Button } from '@/components/ui/button'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { Feld } from '@/components/ui/feld'
import { Input } from '@/components/ui/input'
import { useAuswahl } from '@/hooks/useAuswahl'
import { feldFehler } from '@/lib/formular'
import { meldeFehler } from '@/services/fehler'
import { melde } from '@/services/meldungen'
import { useKontaktAenderung } from '../hooks/useKunden'
import { objektSchema, type ObjektEingabe } from '../schema'
import { speichereObjekt } from '../services/kundenakte'
import type { Objekt } from '../types'

interface ObjektDialogProps {
  kontaktId: string
  /** Bestehendes Gebäude; `null` legt ein neues an. */
  objekt: Objekt | null
  onSchliessen: () => void
}

const KEINE = '–'

function ausObjekt(o: Objekt | null): ObjektEingabe {
  return {
    strasse: o?.strasse ?? '',
    plz: o?.plz ?? '',
    ort: o?.ort ?? '',
    gebaeudeart: o?.gebaeudeart ?? null,
    dachform: o?.dachform ?? null,
    eigentum: o?.eigentum ?? null,
    verbrauch_kwh: o?.verbrauch_kwh ?? null,
    netzbetreiber: o?.netzbetreiber ?? '',
    gemeinde: o?.gemeinde ?? '',
  }
}

/** Gebäude (Objekt) erfassen oder ändern: Adresse und die Angaben für die Offerte. */
export function ObjektDialog({ kontaktId, objekt, onSchliessen }: ObjektDialogProps) {
  const { t } = useTranslation()
  const gebaeudeart = useAuswahl('gebaeudeart')
  const dachform = useAuswahl('dachform')
  const eigentum = useAuswahl('eigentum')
  const [werte, setWerte] = useState<ObjektEingabe>(() => ausObjekt(objekt))
  const [fehler, setFehler] = useState<Partial<Record<keyof ObjektEingabe, string>>>({})
  const speichern = useKontaktAenderung((e: ObjektEingabe) => speichereObjekt(kontaktId, objekt?.id ?? null, e))

  function setze<K extends keyof ObjektEingabe>(feld: K, wert: ObjektEingabe[K]) {
    setWerte((w) => ({ ...w, [feld]: wert }))
  }

  async function absenden() {
    const geprueft = objektSchema.safeParse(werte)
    if (!geprueft.success) {
      setFehler(feldFehler(geprueft.error.issues, t))
      return
    }
    try {
      await speichern.mutateAsync(geprueft.data)
      melde('ok', { de: 'Gebäude gespeichert', fr: 'Bâtiment enregistré' })
      onSchliessen()
    } catch (f) {
      meldeFehler(f, 'objekt')
      melde('kritisch', { de: 'Nicht gespeichert', fr: 'Non enregistré' })
    }
  }

  const text = (feld: 'strasse' | 'plz' | 'ort' | 'gemeinde' | 'netzbetreiber', pflicht = false) => (
    <Feld id={`objekt-${feld}`} label={t(`kontakt.feld.${feld}`)} fehler={fehler[feld]} pflicht={pflicht}>
      <Input
        id={`objekt-${feld}`}
        value={werte[feld]}
        aria-invalid={fehler[feld] ? true : undefined}
        onChange={(e) => {
          setze(feld, e.target.value)
        }}
      />
    </Feld>
  )

  const liste = (feld: 'gebaeudeart' | 'dachform' | 'eigentum', a: ReturnType<typeof useAuswahl>) => (
    <Feld id={`objekt-${feld}`} label={t(`akte.feld.${feld}`)}>
      <Auswahl
        id={`objekt-${feld}`}
        value={werte[feld] ?? KEINE}
        onValueChange={(w) => {
          setze(feld, w === KEINE ? null : w)
        }}
        optionen={[
          { wert: KEINE, text: KEINE },
          ...a.werte.map((w) => ({ wert: w.schluessel, text: a.text(w.schluessel) })),
        ]}
      />
    </Feld>
  )

  return (
    <Dialog
      open
      onOpenChange={(offen) => {
        if (!offen) onSchliessen()
      }}
    >
      <DialogInhalt
        titel={objekt ? t('akte.gebaeudeBearbeiten') : t('akte.gebaeudeNeu')}
        fuss={
          <>
            <Button variant="secondary" onClick={onSchliessen}>
              {t('allgemein.abbrechen')}
            </Button>
            <Button laedt={speichern.isPending} onClick={() => void absenden()}>
              <Save />
              {t('allgemein.speichern')}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          {text('strasse')}
          <div className="grid gap-4 sm:grid-cols-[6rem_1fr]">
            {text('plz')}
            {text('ort', true)}
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {liste('gebaeudeart', gebaeudeart)}
            {liste('dachform', dachform)}
            {liste('eigentum', eigentum)}
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Feld id="objekt-verbrauch" label={t('akte.feld.verbrauch')} hinweis="kWh / Jahr">
              <Input
                id="objekt-verbrauch"
                inputMode="numeric"
                value={werte.verbrauch_kwh ?? ''}
                onChange={(e) => {
                  const ziffern = e.target.value.replace(/\D/g, '')
                  setze('verbrauch_kwh', ziffern ? Number(ziffern) : null)
                }}
              />
            </Feld>
            {text('gemeinde')}
            {text('netzbetreiber')}
          </div>
        </div>
      </DialogInhalt>
    </Dialog>
  )
}
