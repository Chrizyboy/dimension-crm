import { useQueryClient } from '@tanstack/react-query'
import { Square, Timer } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Filterchips } from '@/components/shared/Filterchips'
import { Button } from '@/components/ui/button'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { dauerText, minuten, zuerich } from '../lib/zeit'
import { zeitStoppen } from '../services/monteur'
import type { LaufendeZeit } from '../types'

const PAUSEN = ['0', '15', '30', '45', '60']

/** Uhr, die alle 30 Sekunden weiterzählt. */
function useJetzt(): Date {
  const [jetzt, setJetzt] = useState(() => new Date())
  useEffect(() => {
    const id = window.setInterval(() => {
      setJetzt(new Date())
    }, 30_000)
    return () => {
      window.clearInterval(id)
    }
  }, [])
  return jetzt
}

/** Die laufende Zeit oben im Tagesplan: seit wann, wie lange, und «Stopp» (mit Pause). */
export function ZeitLaeuft({ laufend, onRapport }: { laufend: LaufendeZeit; onRapport?: (id: string) => void }) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const jetzt = useJetzt()
  const [stopp, setStopp] = useState(false)
  const [pause, setPause] = useState('0')

  async function stoppen() {
    await zeitStoppen(laufend.id, Number(pause))
    setStopp(false)
    await qc.invalidateQueries({ queryKey: ['baustelle'] })
  }

  return (
    <div className="bg-ok-soft flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
      <div className="flex items-center gap-2 text-sm">
        <Timer className="text-ok size-5" aria-hidden="true" />
        <span>
          <span className="font-semibold">{t('baustelle.zeit.laeuft', { start: zuerich(laufend.start).zeit })}</span>
          <span className="zahlen ml-2">{dauerText(minuten({ start: laufend.start, stopp: null }, jetzt))}</span>
        </span>
        {laufend.rapport_id && onRapport && (
          <Button
            size="sm"
            variant="link"
            onClick={() => {
              if (laufend.rapport_id) onRapport(laufend.rapport_id)
            }}
          >
            {t('baustelle.zeit.zumRapport')}
          </Button>
        )}
      </div>
      <Button
        size="lg"
        variant="danger"
        onClick={() => {
          setStopp(true)
        }}
      >
        <Square />
        {t('baustelle.zeit.stopp')}
      </Button>
      {stopp && (
        <Dialog open onOpenChange={setStopp}>
          <DialogInhalt
            titel={t('baustelle.zeit.stoppTitel')}
            beschreibung={t('baustelle.zeit.stoppText')}
            fuss={
              <Button variant="danger" onClick={() => void stoppen()}>
                <Square />
                {t('baustelle.zeit.stopp')}
              </Button>
            }
          >
            <Filterchips
              einzeln
              beschriftung={t('baustelle.zeit.pause')}
              optionen={PAUSEN.map((p) => ({ wert: p, text: p === '0' ? t('baustelle.zeit.keinePause') : `${p} min` }))}
              gewaehlt={[pause]}
              onChange={([p]) => {
                if (p) setPause(p)
              }}
            />
          </DialogInhalt>
        </Dialog>
      )}
    </div>
  )
}
