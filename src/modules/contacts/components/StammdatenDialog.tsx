import { Save } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Auswahl } from '@/components/ui/auswahl'
import { Button } from '@/components/ui/button'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { Feld } from '@/components/ui/feld'
import { Input, Textarea } from '@/components/ui/input'
import { meldeFehler } from '@/services/fehler'
import { melde } from '@/services/meldungen'
import { useAdressbuchAenderung } from '../hooks/useAdressbuch'
import { normalisiereUid, uidGueltig } from '../lib/rollen'
import { speichereStammdaten } from '../services/adressbuch'
import type { PartnerKopf } from '../types'

type Textfeld =
  | 'firma'
  | 'vorname'
  | 'nachname'
  | 'email'
  | 'telefon'
  | 'strasse'
  | 'plz'
  | 'ort'
  | 'webseite'
  | 'uidNr'
  | 'rechtsform'

/** Name, Erreichbarkeit, Postadresse, Webseite und UID eines Partners ändern. */
export function StammdatenDialog({ kopf, onSchliessen }: { kopf: PartnerKopf; onSchliessen: () => void }) {
  const { t } = useTranslation()
  const [k, setK] = useState<PartnerKopf>(kopf)
  const speichern = useAdressbuchAenderung((e: PartnerKopf) => speichereStammdaten(e))
  const uid = k.uidNr?.trim() ?? ''
  const uidFehler = uid && !uidGueltig(normalisiereUid(uid)) ? t('adressbuch.feld.uidUngueltig') : undefined
  const ohneName = k.art === 'firma' ? !k.firma?.trim() : !k.nachname?.trim() && !k.vorname?.trim()

  async function absenden() {
    if (ohneName || uidFehler) return
    try {
      await speichern.mutateAsync({ ...k, uidNr: uid ? normalisiereUid(uid) : null })
      melde('ok', { de: 'Gespeichert', fr: 'Enregistré' })
      onSchliessen()
    } catch (f) {
      meldeFehler(f, 'adressbuch.stammdaten')
      melde('kritisch', { de: 'Nicht gespeichert', fr: 'Non enregistré' })
    }
  }

  const feld = (f: Textfeld, label: string, typ = 'text', fehler?: string) => (
    <Feld id={`stamm-${f}`} label={label} fehler={fehler}>
      <Input
        id={`stamm-${f}`}
        type={typ}
        value={k[f] ?? ''}
        onChange={(e) => {
          setK((x) => ({ ...x, [f]: e.target.value }))
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
        titel={t('adressbuch.akte.stammdaten')}
        fuss={
          <>
            <Button variant="secondary" onClick={onSchliessen}>
              {t('allgemein.abbrechen')}
            </Button>
            <Button laedt={speichern.isPending} disabled={ohneName} onClick={() => void absenden()}>
              <Save />
              {t('allgemein.speichern')}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          {k.art === 'firma' ? (
            feld('firma', t('adressbuch.feld.firma'))
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {feld('vorname', t('adressbuch.feld.vorname'))}
              {feld('nachname', t('adressbuch.feld.nachname'))}
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            {feld('telefon', t('adressbuch.feld.telefon'), 'tel')}
            {feld('email', t('adressbuch.feld.email'), 'email')}
          </div>
          {feld('strasse', t('adressbuch.feld.strasse'))}
          <div className="grid grid-cols-[6rem_minmax(0,1fr)] gap-4">
            {feld('plz', t('adressbuch.feld.plz'))}
            {feld('ort', t('adressbuch.feld.ort'))}
          </div>
          {feld('webseite', t('adressbuch.feld.webseite'), 'url')}
          <div className="grid gap-4 sm:grid-cols-2">
            {feld('uidNr', t('adressbuch.feld.uid'), 'text', uidFehler)}
            {feld('rechtsform', t('adressbuch.feld.rechtsform'))}
          </div>
          <Feld id="stamm-sprache" label={t('adressbuch.feld.sprache')}>
            <Auswahl
              id="stamm-sprache"
              value={k.sprache}
              onValueChange={(w) => {
                setK((x) => ({ ...x, sprache: w === 'fr' ? 'fr' : 'de' }))
              }}
              optionen={[
                { wert: 'de', text: 'Deutsch' },
                { wert: 'fr', text: 'Français' },
              ]}
            />
          </Feld>
          <Feld id="stamm-notiz" label={t('adressbuch.akte.notiz')}>
            <Textarea
              id="stamm-notiz"
              rows={3}
              value={k.notiz ?? ''}
              onChange={(e) => {
                setK((x) => ({ ...x, notiz: e.target.value }))
              }}
            />
          </Feld>
        </div>
      </DialogInhalt>
    </Dialog>
  )
}
