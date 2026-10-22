import { Inbox, Paperclip, Send } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { Feld } from '@/components/ui/feld'
import { Input, Textarea } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/schalter'
import { mailVorbereiten, type MailEntwurf } from '@/services/ausgang'
import { fachFehlerSchluessel, zweisprachig } from '@/services/fachfehler'
import { meldeFehler } from '@/services/fehler'
import { ausgangJetztSenden } from '@/services/integrationen'
import { melde } from '@/services/meldungen'

/**
 * Mail an einen Kunden schreiben (Offerte, Werkvertrag, Monatsbericht …). Alles ist vorausgefüllt und
 * lässt sich ändern. «Senden» geht über den Ausgangskorb aus dem eigenen Postfach; «In den Ausgangskorb»
 * legt sie zum späteren Prüfen ab. Anhänge sind Dateien aus dem CRM oder aus SharePoint.
 */
export function MailDialog({
  vorlage,
  dateien,
  titel,
  beschreibung,
  onSchliessen,
  onGesendet,
}: {
  vorlage: Omit<MailEntwurf, 'anhaenge'>
  /** Dateien zur Auswahl; die ersten `vorgewaehlt` sind angekreuzt. */
  dateien: { id: string; name: string; vorgewaehlt?: boolean }[]
  titel: string
  /** Hinweis unter dem Titel; ohne Angabe der allgemeine Text für Mails an Kunden. */
  beschreibung?: string
  onSchliessen: () => void
  onGesendet?: () => void
}) {
  const { t } = useTranslation()
  const [w, setW] = useState(vorlage)
  const [gewaehlt, setGewaehlt] = useState(() => new Set(dateien.filter((d) => d.vorgewaehlt).map((d) => d.id)))
  const [laeuft, setLaeuft] = useState<'senden' | 'ablegen' | null>(null)

  async function weiter(sofort: boolean) {
    setLaeuft(sofort ? 'senden' : 'ablegen')
    try {
      const anhaenge = dateien.filter((d) => gewaehlt.has(d.id)).map((d) => ({ dokument_id: d.id, name: d.name }))
      await mailVorbereiten({ ...w, anhaenge }, sofort)
      if (sofort) {
        const r = await ausgangJetztSenden().catch(() => null)
        melde(r && r.fehler === 0 ? 'ok' : 'info', {
          de: r && r.fehler === 0 ? 'Mail gesendet' : 'Mail freigegeben, wird in Kürze gesendet',
          fr: r && r.fehler === 0 ? 'E-mail envoyé' : 'E-mail approuvé, envoi sous peu',
        })
        onGesendet?.()
      } else {
        melde('ok', { de: 'Im Ausgangskorb abgelegt', fr: "Déposé dans la boîte d'envoi" })
      }
      onSchliessen()
    } catch (f) {
      const s = fachFehlerSchluessel(f)
      if (s) melde('kritisch', zweisprachig(s))
      else {
        meldeFehler(f, 'mail')
        melde('kritisch', { de: 'Nicht gespeichert', fr: 'Non enregistré' })
      }
    } finally {
      setLaeuft(null)
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
        titel={titel}
        beschreibung={beschreibung ?? t('mail.beschreibung')}
        className="max-w-2xl"
        fuss={
          <>
            <Button
              variant="secondary"
              laedt={laeuft === 'ablegen'}
              disabled={laeuft !== null}
              onClick={() => void weiter(false)}
            >
              <Inbox />
              {t('mail.ablegen')}
            </Button>
            <Button laedt={laeuft === 'senden'} disabled={laeuft !== null} onClick={() => void weiter(true)}>
              <Send />
              {t('mail.senden')}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <Feld id="mail-an" label={t('ausgang.an')} pflicht>
            <Input
              id="mail-an"
              type="email"
              multiple
              value={w.an}
              onChange={(e) => {
                setW({ ...w, an: e.target.value })
              }}
            />
          </Feld>
          <Feld id="mail-cc" label={t('ausgang.cc')}>
            <Input
              id="mail-cc"
              value={w.cc ?? ''}
              onChange={(e) => {
                setW({ ...w, cc: e.target.value })
              }}
            />
          </Feld>
          <Feld id="mail-betreff" label={t('ausgang.betreff')} pflicht>
            <Input
              id="mail-betreff"
              value={w.betreff}
              onChange={(e) => {
                setW({ ...w, betreff: e.target.value })
              }}
            />
          </Feld>
          <Feld id="mail-text" label={t('ausgang.text')} pflicht>
            <Textarea
              id="mail-text"
              rows={10}
              value={w.text}
              onChange={(e) => {
                setW({ ...w, text: e.target.value })
              }}
            />
          </Feld>
          {dateien.length > 0 && (
            <fieldset className="flex flex-col gap-1.5">
              <legend className="mb-1 text-sm font-medium">{t('ausgang.anhaenge')}</legend>
              {dateien.map((d) => (
                <label key={d.id} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={gewaehlt.has(d.id)}
                    onCheckedChange={(an) => {
                      const neu = new Set(gewaehlt)
                      if (an === true) neu.add(d.id)
                      else neu.delete(d.id)
                      setGewaehlt(neu)
                    }}
                  />
                  <Paperclip className="text-muted-foreground size-3.5" aria-hidden="true" />
                  <span className="truncate">{d.name}</span>
                </label>
              ))}
            </fieldset>
          )}
        </div>
      </DialogInhalt>
    </Dialog>
  )
}
