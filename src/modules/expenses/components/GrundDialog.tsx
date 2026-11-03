import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { Feld } from '@/components/ui/feld'
import { Textarea } from '@/components/ui/input'
import { formatChf, formatDatum } from '@/lib/format'
import { useAktion } from '../hooks/useAktion'
import { speseAblehnen, speseRueckfrage, speseStornieren } from '../services/spesen'
import type { Spese } from '../types'

export type GrundArt = 'storno' | 'rueckfrage' | 'ablehnen'

const ABLAUF: Record<GrundArt, (id: string, text: string) => Promise<void>> = {
  storno: speseStornieren,
  rueckfrage: speseRueckfrage,
  ablehnen: speseAblehnen,
}

const ERFOLG: Record<GrundArt, { de: string; fr: string }> = {
  storno: { de: 'Spese zurückgezogen', fr: 'Frais retirés' },
  rueckfrage: { de: 'Rückfrage gesendet', fr: 'Question envoyée' },
  ablehnen: { de: 'Spese abgelehnt', fr: 'Frais refusés' },
}

/**
 * Ein Schritt mit Text: Zurückziehen durch die Person (V233 «Storno statt Löschen»), Rückfrage oder Ablehnen
 * durch die Buchhaltung (die Person bekommt eine Glocke). Die Spese bleibt immer sichtbar.
 */
export function GrundDialog({
  art,
  spese: s,
  onSchliessen,
  onFertig,
}: {
  art: GrundArt
  spese: Spese
  onSchliessen: () => void
  onFertig?: () => void
}) {
  const { t } = useTranslation()
  const { laeuft, aus } = useAktion()
  const [text, setText] = useState('')

  async function los() {
    const ok = await aus(() => ABLAUF[art](s.id, text.trim()), ERFOLG[art])
    if (ok) (onFertig ?? onSchliessen)()
  }

  return (
    <Dialog
      open
      onOpenChange={(o) => {
        if (!o) onSchliessen()
      }}
    >
      <DialogInhalt
        titel={t(`spesen.grund.${art}.titel`)}
        beschreibung={`${s.person ? `${s.person} · ` : ''}${formatDatum(s.datum)} · ${s.zweck ?? ''} · ${formatChf(s.betrag_rappen, { mitWaehrung: true })}`}
        fuss={
          <>
            <Button variant="ghost" onClick={onSchliessen}>
              {t('allgemein.abbrechen')}
            </Button>
            <Button
              variant={art === 'rueckfrage' ? 'primary' : 'danger'}
              onClick={() => void los()}
              laedt={laeuft}
              disabled={!text.trim()}
            >
              {t(`spesen.grund.${art}.knopf`)}
            </Button>
          </>
        }
      >
        <Feld id="spese-grund" label={t(`spesen.grund.${art}.feld`)} hinweis={t(`spesen.grund.${art}.hinweis`)} pflicht>
          <Textarea
            id="spese-grund"
            rows={3}
            value={text}
            onChange={(e) => {
              setText(e.target.value)
            }}
          />
        </Feld>
      </DialogInhalt>
    </Dialog>
  )
}
