import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Auswahl } from '@/components/ui/auswahl'
import { Button } from '@/components/ui/button'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { Feld } from '@/components/ui/feld'
import { useAktion } from '../hooks/useAktion'
import { usePersonen } from '../hooks/usePosteingang'
import { zuweisen } from '../services/posteingang'
import type { Mail } from '../types'

/** Mail einer anderen Person geben; sie bekommt die Glocke, die Frist bleibt. */
export function WeitergebenDialog({ mail, onSchliessen }: { mail: Mail; onSchliessen: () => void }) {
  const { t } = useTranslation()
  const personen = usePersonen().data ?? []
  const { laeuft, aus } = useAktion()
  const [wer, setWer] = useState(mail.zustaendig_id ?? '')
  return (
    <Dialog
      open
      onOpenChange={(o) => {
        if (!o) onSchliessen()
      }}
    >
      <DialogInhalt
        titel={t('posteingang.weitergeben.titel')}
        beschreibung={t('posteingang.weitergeben.text')}
        fuss={
          <>
            <Button variant="ghost" onClick={onSchliessen}>
              {t('allgemein.abbrechen')}
            </Button>
            <Button
              laedt={laeuft}
              disabled={!wer || wer === mail.zustaendig_id}
              onClick={() =>
                void aus(() => zuweisen(mail.id, wer), { de: 'Weitergegeben', fr: 'Transmis' }).then((ok) => {
                  if (ok) onSchliessen()
                })
              }
            >
              {t('posteingang.weitergeben.knopf')}
            </Button>
          </>
        }
      >
        <Feld label={t('posteingang.feld.zustaendig')} id="pe-wer">
          <Auswahl
            id="pe-wer"
            value={wer}
            onValueChange={setWer}
            platzhalter={t('posteingang.weitergeben.wer')}
            optionen={personen.map((p) => ({ wert: p.id, text: p.name }))}
          />
        </Feld>
      </DialogInhalt>
    </Dialog>
  )
}
