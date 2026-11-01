import { useRef, useState, type PointerEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { leinwandAlsPng, UNTERSCHRIFT_BREITE, UNTERSCHRIFT_HOEHE } from '@/services/unterschrift'

/**
 * Unterschrift mit Maus, Finger oder Stift zeichnen. Die Leinwand hat die Grösse der abgelegten Unterschrift
 * und wird nur angezeigt kleiner; so passt die Strichdicke zum Kasten im Vertrag.
 */
export function UnterschriftZeichnen({
  onFertig,
  onSchliessen,
}: {
  onFertig: (png: Blob) => void
  onSchliessen: () => void
}) {
  const { t } = useTranslation()
  const leinwand = useRef<HTMLCanvasElement>(null)
  const letzter = useRef<{ x: number; y: number } | null>(null)
  const [leer, setLeer] = useState(true)

  const punkt = (e: PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    return {
      x: ((e.clientX - r.left) / r.width) * UNTERSCHRIFT_BREITE,
      y: ((e.clientY - r.top) / r.height) * UNTERSCHRIFT_HOEHE,
    }
  }
  const strich = (von: { x: number; y: number }, bis: { x: number; y: number }) => {
    const ctx = leinwand.current?.getContext('2d')
    if (!ctx) return
    // Tinte bewusst fest (dunkelblau wie ein Kugelschreiber): sie landet im PDF, nicht in der Oberfläche.
    ctx.strokeStyle = '#1a2a5e'
    ctx.lineWidth = 5
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()
    ctx.moveTo(von.x, von.y)
    ctx.lineTo(bis.x, bis.y)
    ctx.stroke()
  }

  return (
    <Dialog
      open
      onOpenChange={(offen) => {
        if (!offen) onSchliessen()
      }}
    >
      <DialogInhalt
        titel={t('konto.unterschrift.zeichnenTitel')}
        beschreibung={t('konto.unterschrift.zeichnenText')}
        fuss={
          <>
            <Button
              variant="secondary"
              disabled={leer}
              onClick={() => {
                const c = leinwand.current
                c?.getContext('2d')?.clearRect(0, 0, c.width, c.height)
                setLeer(true)
              }}
            >
              {t('konto.unterschrift.neu')}
            </Button>
            <Button
              disabled={leer}
              onClick={() => {
                if (leinwand.current) void leinwandAlsPng(leinwand.current).then(onFertig)
              }}
            >
              {t('konto.unterschrift.uebernehmen')}
            </Button>
          </>
        }
      >
        <canvas
          ref={leinwand}
          width={UNTERSCHRIFT_BREITE}
          height={UNTERSCHRIFT_HOEHE}
          aria-label={t('konto.unterschrift.flaeche')}
          className="border-border w-full touch-none rounded-md border bg-white"
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId)
            const p = punkt(e)
            letzter.current = p
            strich(p, { x: p.x + 0.1, y: p.y })
            setLeer(false)
          }}
          onPointerMove={(e) => {
            if (!letzter.current) return
            const p = punkt(e)
            strich(letzter.current, p)
            letzter.current = p
          }}
          onPointerUp={() => {
            letzter.current = null
          }}
          onPointerCancel={() => {
            letzter.current = null
          }}
        />
      </DialogInhalt>
    </Dialog>
  )
}
