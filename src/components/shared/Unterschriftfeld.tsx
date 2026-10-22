import { Eraser } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'

/**
 * Unterschrift mit Finger oder Stift (Rapport, IBN-Protokoll, später Werkvertrag vor Ort). Das Bild ist immer
 * schwarz auf weiss, damit es im PDF auch dann lesbar ist, wenn das Handy im dunklen Modus läuft.
 * Meldet nach jedem Strich ein PNG, nach «Löschen» null.
 */
export function Unterschriftfeld({ beschriftung, onBild }: { beschriftung: string; onBild: (b: Blob | null) => void }) {
  const { t } = useTranslation()
  const leinwand = useRef<HTMLCanvasElement>(null)
  const zeichnet = useRef(false)
  const [leer, setLeer] = useState(true)

  const kontext = () => leinwand.current?.getContext('2d') ?? null

  function vorbereiten() {
    const c = leinwand.current
    const k = kontext()
    if (!c || !k) return
    const faktor = window.devicePixelRatio || 1
    c.width = c.clientWidth * faktor
    c.height = c.clientHeight * faktor
    k.setTransform(faktor, 0, 0, faktor, 0, 0)
    k.fillStyle = '#ffffff'
    k.fillRect(0, 0, c.clientWidth, c.clientHeight)
    k.lineWidth = 2.2
    k.lineCap = 'round'
    k.lineJoin = 'round'
    k.strokeStyle = '#111111'
  }

  useEffect(vorbereiten, [])

  const punkt = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    return { x: e.clientX - r.left, y: e.clientY - r.top }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <canvas
        ref={leinwand}
        role="img"
        aria-label={beschriftung}
        className="border-border-strong h-40 w-full touch-none rounded-md border"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId)
          zeichnet.current = true
          const p = punkt(e)
          kontext()?.beginPath()
          kontext()?.moveTo(p.x, p.y)
        }}
        onPointerMove={(e) => {
          if (!zeichnet.current) return
          const p = punkt(e)
          kontext()?.lineTo(p.x, p.y)
          kontext()?.stroke()
        }}
        onPointerUp={() => {
          if (!zeichnet.current) return
          zeichnet.current = false
          setLeer(false)
          leinwand.current?.toBlob((b) => {
            onBild(b)
          }, 'image/png')
        }}
      />
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground text-xs">{leer ? t('unterschrift.hinweis') : ''}</span>
        <Button
          size="sm"
          variant="ghost"
          disabled={leer}
          onClick={() => {
            vorbereiten()
            setLeer(true)
            onBild(null)
          }}
        >
          <Eraser />
          {t('unterschrift.loeschen')}
        </Button>
      </div>
    </div>
  )
}
