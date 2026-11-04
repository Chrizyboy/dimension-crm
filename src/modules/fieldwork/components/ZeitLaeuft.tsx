import { useQueryClient } from '@tanstack/react-query'
import { Square, Timer } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Filterchips } from '@/components/shared/Filterchips'
import { Button } from '@/components/ui/button'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/schalter'
import { useAnmeldung } from '@/stores/anmeldung'
import { useTagesfotoOffen } from '../hooks/useBaustelle'
import { dauerText, heute, minuten, zuerich } from '../lib/zeit'
import { tagesfotoAblegen, teamZeitStoppen, zeitStoppen } from '../services/monteur'
import type { LaufendeZeit, TeamHeute } from '../types'
import { TagesfotoAbschnitt } from './TagesfotoAbschnitt'

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

/**
 * Die laufende Zeit oben im Tagesplan: seit wann, wie lange, und «Stopp» (mit Pause). Mit `andere` (Team heute)
 * stoppt derselbe Knopf auf Wunsch auch die Zeit der Kollegen, mit derselben Pause.
 */
export function ZeitLaeuft({
  laufend,
  andere = [],
  onRapport,
}: {
  laufend: LaufendeZeit
  andere?: TeamHeute[]
  onRapport?: (id: string) => void
}) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const ich = useAnmeldung((z) => z.ich)
  const jetzt = useJetzt()
  const [stopp, setStopp] = useState(false)
  const [pause, setPause] = useState('0')
  const [fuerTeam, setFuerTeam] = useState(true)
  // Foto des Tages: Baustellen von heute ohne Foto verlangen vor dem Stopp eines (einer im Team genügt).
  const offen = useTagesfotoOffen().data ?? []
  const [fotos, setFotos] = useState<Record<string, Blob>>({})
  const fotoFehlt = offen.some((o) => !fotos[o.projekt_id])
  const [laeuft, setLaeuft] = useState(false)

  async function stoppen() {
    setLaeuft(true)
    try {
      for (const o of offen) {
        const f = fotos[o.projekt_id]
        if (f) await tagesfotoAblegen(o, f, heute())
      }
      await stoppenOhneFoto()
    } finally {
      setLaeuft(false)
    }
  }

  async function stoppenOhneFoto() {
    if (fuerTeam && andere.length > 0 && ich) await teamZeitStoppen([ich.id, ...andere.map((p) => p.id)], Number(pause))
    else await zeitStoppen(laufend.id, Number(pause))
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
              <Button variant="danger" laedt={laeuft} disabled={fotoFehlt} onClick={() => void stoppen()}>
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
            {andere.length > 0 && (
              <label className="mt-3 flex items-center gap-2 text-sm">
                <Checkbox
                  checked={fuerTeam}
                  onCheckedChange={(c) => {
                    setFuerTeam(c === true)
                  }}
                />
                {t('baustelle.zeit.stoppTeam', { namen: andere.map((p) => p.name).join(', ') })}
              </label>
            )}
            <TagesfotoAbschnitt
              offen={offen}
              fotos={fotos}
              onFoto={(id, f) => {
                setFotos((alt) => ({ ...alt, [id]: f }))
              }}
            />
          </DialogInhalt>
        </Dialog>
      )}
    </div>
  )
}
