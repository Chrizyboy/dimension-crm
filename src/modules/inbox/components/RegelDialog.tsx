import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Auswahl } from '@/components/ui/auswahl'
import { Button } from '@/components/ui/button'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { Feld } from '@/components/ui/feld'
import { useAktion } from '../hooks/useAktion'
import { useBetrachter, useNeuLaden, usePersonen } from '../hooks/usePosteingang'
import { regelSpeichern } from '../services/arbeit'
import { ARTEN, type AbsenderRegel, type Art, type Mail } from '../types'

/**
 * Regel für den Absender dieser Mail: «immer ablegen», «immer an …» oder «immer Art …», für diese Adresse oder die
 * ganze Firma (@domain). Gilt im eigenen Postfach; für info@ nur, wer verteilt.
 */
export function RegelDialog({ mail, onSchliessen }: { mail: Mail; onSchliessen: () => void }) {
  const { t } = useTranslation()
  const b = useBetrachter()
  const personen = usePersonen().data ?? []
  const neuLaden = useNeuLaden()
  const { laeuft, aus } = useAktion()
  const adresse = (mail.von_email ?? '').toLowerCase()
  const domain = `@${adresse.split('@')[1] ?? ''}`
  const [absender, setAbsender] = useState(adresse)
  const [aktion, setAktion] = useState<AbsenderRegel['aktion']>(mail.art === 'werbung' ? 'ablegen' : 'zuweisen')
  const [person, setPerson] = useState(mail.zustaendig_id ?? '')
  const [art, setArt] = useState<Art>(mail.art ?? 'sonstiges')
  const team = mail.postfach_person_id === null
  const darf = !team || b.verteile
  return (
    <Dialog
      open
      onOpenChange={(o) => {
        if (!o) onSchliessen()
      }}
    >
      <DialogInhalt
        titel={t('posteingang.regel.titel')}
        beschreibung={t(team ? 'posteingang.regel.team' : 'posteingang.regel.eigen')}
        fuss={
          <>
            <Button variant="ghost" onClick={onSchliessen}>
              {t('allgemein.abbrechen')}
            </Button>
            <Button
              laedt={laeuft}
              disabled={!darf || (aktion === 'zuweisen' && !person)}
              onClick={() =>
                void aus(
                  () =>
                    regelSpeichern({
                      absender,
                      aktion,
                      person_id: aktion === 'zuweisen' ? person : null,
                      art: aktion === 'art' ? art : null,
                      team,
                    }),
                  { de: 'Regel gespeichert', fr: 'Règle enregistrée' },
                ).then((ok) => {
                  if (ok) {
                    void neuLaden()
                    onSchliessen()
                  }
                })
              }
            >
              {t('allgemein.speichern')}
            </Button>
          </>
        }
      >
        {!darf ? (
          <p className="text-sm">{t('posteingang.regel.nurVerteiler')}</p>
        ) : (
          <div className="flex flex-col gap-3">
            <Feld label={t('posteingang.regel.absender')} id="pe-regel-abs">
              <Auswahl
                id="pe-regel-abs"
                value={absender}
                onValueChange={setAbsender}
                optionen={[
                  { wert: adresse, text: adresse },
                  { wert: domain, text: t('posteingang.regel.ganzeFirma', { domain }) },
                ]}
              />
            </Feld>
            <Feld label={t('posteingang.regel.was')} id="pe-regel-aktion">
              <Auswahl
                id="pe-regel-aktion"
                value={aktion}
                onValueChange={(w) => {
                  setAktion(w as AbsenderRegel['aktion'])
                }}
                optionen={(['zuweisen', 'art', 'ablegen'] as const)
                  .filter((a) => a !== 'zuweisen' || team)
                  .map((a) => ({ wert: a, text: t(`posteingang.regel.aktion.${a}`) }))}
              />
            </Feld>
            {aktion === 'zuweisen' && (
              <Feld label={t('posteingang.feld.zustaendig')} id="pe-regel-wer">
                <Auswahl
                  id="pe-regel-wer"
                  value={person}
                  onValueChange={setPerson}
                  platzhalter={t('posteingang.weitergeben.wer')}
                  optionen={personen.map((p) => ({ wert: p.id, text: p.name }))}
                />
              </Feld>
            )}
            {aktion === 'art' && (
              <Feld label={t('posteingang.feld.art')} id="pe-regel-art">
                <Auswahl
                  id="pe-regel-art"
                  value={art}
                  onValueChange={(w) => {
                    setArt(w as Art)
                  }}
                  optionen={ARTEN.map((a) => ({ wert: a, text: t(`posteingang.art.${a}`) }))}
                />
              </Feld>
            )}
            <p className="text-muted-foreground text-xs">{t('posteingang.regel.hinweis')}</p>
          </div>
        )}
      </DialogInhalt>
    </Dialog>
  )
}
