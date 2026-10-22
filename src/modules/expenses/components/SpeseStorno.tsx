import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { Feld } from '@/components/ui/feld'
import { Textarea } from '@/components/ui/input'
import { formatChf, formatDatum } from '@/lib/format'
import { useAktion } from '../hooks/useAktion'
import { speseStornieren } from '../services/spesen'
import type { Spese } from '../types'

/** Spese stornieren mit Grund (V233 «Storno statt Löschen»): sie bleibt durchgestrichen sichtbar. */
export function SpeseStorno({ spese: s, onSchliessen }: { spese: Spese; onSchliessen: () => void }) {
  const { t } = useTranslation()
  const { laeuft, aus } = useAktion()
  const [grund, setGrund] = useState('')

  async function los() {
    const ok = await aus(() => speseStornieren(s.id, grund.trim()), { de: 'Spese storniert', fr: 'Frais annulés' })
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
        titel={t('spesen.storno.titel')}
        beschreibung={`${formatDatum(s.datum)} · ${s.zweck ?? ''} · ${formatChf(s.betrag_rappen, { mitWaehrung: true })}`}
        fuss={
          <>
            <Button variant="ghost" onClick={onSchliessen}>
              {t('allgemein.abbrechen')}
            </Button>
            <Button variant="danger" onClick={() => void los()} laedt={laeuft} disabled={!grund.trim()}>
              {t('spesen.stornieren')}
            </Button>
          </>
        }
      >
        <Feld id="spese-storno-grund" label={t('spesen.storno.grund')} pflicht>
          <Textarea
            id="spese-storno-grund"
            rows={2}
            value={grund}
            onChange={(e) => {
              setGrund(e.target.value)
            }}
          />
        </Feld>
      </DialogInhalt>
    </Dialog>
  )
}
