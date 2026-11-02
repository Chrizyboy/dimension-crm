import { TriangleAlert } from 'lucide-react'
import { useLayoutEffect, useRef, useState, type PointerEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { formatDatum } from '@/lib/format'
import { cn } from '@/lib/utils'
import { balken as lage } from '../lib/zeitplan'
import { konfliktText, type BalkenArt, type PlanBalken } from '../lib/zeitplanAnsicht'

/** Höhe einer Spur in Pixel (Balken 28 px + Abstand), gilt auch für die Zeilenhöhe im Raster. */
export const SPUR = 34

/** Farben je Art: intern dunkelblau, extern orange, voraussichtlich gestrichelt, abwesend schraffiert, Service blau umrandet. */
const FARBE: Record<BalkenArt, string> = {
  intern: 'bg-primary text-primary-foreground',
  extern: 'bg-accent text-accent-foreground',
  geplant: 'border-primary text-foreground border border-dashed bg-surface',
  abwesend: 'bg-muted text-muted-foreground schraffur',
  service: 'bg-info-soft text-info border border-info',
}

/**
 * Ein Balken im Zeitplan. Klick öffnet die Planung der Baustelle. Am PC lässt er sich ziehen: in der Mitte
 * verschiebt es den ganzen Einsatz, am rechten Rand ändert es das Ende (tagesgenau, mit «Rückgängig»).
 */
export function ZeitplanBalken({
  b,
  start,
  tage,
  ziehbar,
  platz = true,
  onOeffnen,
  onZiehen,
}: {
  b: PlanBalken
  start: string
  tage: number
  ziehbar: boolean
  /** Rechts daneben ist frei: ein zu schmaler Balken darf seinen Text dort zeigen. */
  platz?: boolean
  onOeffnen: (b: PlanBalken) => void
  onZiehen: (b: PlanBalken, tage: number, nurEnde: boolean) => void
}) {
  const { t } = useTranslation()
  const ref = useRef<HTMLButtonElement>(null)
  const [zug, setZug] = useState<{ x: number; tagBreite: number; nurEnde: boolean; dx: number } | null>(null)
  const textRef = useRef<HTMLSpanElement>(null)
  // Ist der Balken zu schmal für seinen Text (z. B. ein Tag Gerüst), steht der Text rechts daneben.
  const [aussen, setAussen] = useState(false)
  const l = lage(b.von, b.bis, start, tage)
  useLayoutEffect(() => {
    const x = textRef.current
    const knopf = ref.current
    // Service-Termine liegen oft an Folgetagen: ihr Text steht nur daneben, wenn dort frei ist (ganz im Titel).
    if (x && knopf)
      setAussen((b.art === 'service' ? platz : knopf.clientWidth < 44) && x.scrollWidth > x.clientWidth + 1)
  }, [b.text, b.art, platz, l?.breite])
  if (!l) return null

  const runter = (e: PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return
    const flaeche = ref.current?.parentElement?.getBoundingClientRect()
    const rand = ref.current?.getBoundingClientRect()
    if (!flaeche || !rand) return
    setZug({ x: e.clientX, tagBreite: flaeche.width / tage, nurEnde: rand.right - e.clientX < 10, dx: 0 })
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const bewegen = (e: PointerEvent<HTMLButtonElement>) => {
    if (zug && ziehbar) setZug({ ...zug, dx: e.clientX - zug.x })
  }
  const los = () => {
    if (!zug) return
    setZug(null)
    const n = Math.round(zug.dx / zug.tagBreite)
    if (n !== 0) onZiehen(b, n, zug.nurEnde)
    else if (Math.abs(zug.dx) < 4) onOeffnen(b)
  }

  const n = zug ? Math.round(zug.dx / zug.tagBreite) : 0
  const ende = zug?.nurEnde ?? false
  const tagProzent = 100 / tage
  const konflikt = b.konflikt.length > 0
  const artText = b.art === 'abwesend' ? b.text : t(`projekte.einsatz.${b.art}`)
  const titel = [
    `${artText}: ${formatDatum(b.von)} – ${formatDatum(b.bis)}`,
    b.projekt ? `${b.projekt.nummer} · ${b.projekt.kunde}` : null,
    b.art !== 'abwesend' && b.text ? b.text : null,
    konflikt ? t('projekte.zeitplan.konfliktMit', { namen: konfliktText(b.konflikt, t) }) : null,
  ]
    .filter(Boolean)
    .join('\n')

  if (b.art === 'abwesend')
    return (
      <span
        title={titel}
        className={cn('absolute flex h-7 items-center overflow-hidden rounded-md px-2 text-xs', FARBE.abwesend)}
        style={{ left: `${l.links}%`, width: `max(${l.breite}%, 6px)`, top: 3 + b.spur * SPUR }}
      >
        <span className="truncate">{b.text}</span>
      </span>
    )

  const text = b.text || artText
  return (
    <>
      <button
        ref={ref}
        type="button"
        title={titel}
        aria-label={titel.replaceAll('\n', ' · ')}
        onPointerDown={runter}
        onPointerMove={bewegen}
        onPointerUp={los}
        onPointerCancel={() => {
          setZug(null)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onOeffnen(b)
          }
        }}
        className={cn(
          'focus-visible:ring-ring absolute flex h-7 touch-none items-center gap-1 overflow-hidden rounded-md px-2 text-left text-xs font-medium whitespace-nowrap shadow-xs outline-none select-none focus-visible:ring-2 focus-visible:ring-offset-1',
          FARBE[b.art],
          ziehbar && 'cursor-grab active:cursor-grabbing',
          konflikt && 'ring-bad ring-2 ring-offset-1',
          n !== 0 && 'z-10 opacity-90 shadow-md',
        )}
        style={{
          left: `${l.links + (ende ? 0 : n * tagProzent)}%`,
          width: `max(${l.breite + (ende ? n * tagProzent : 0)}%, 6px)`,
          top: 3 + b.spur * SPUR,
        }}
      >
        {konflikt && <TriangleAlert className="text-bad bg-surface size-3.5 shrink-0 rounded-full p-px" aria-hidden />}
        <span ref={textRef} className={cn('truncate', aussen && 'invisible')}>
          {text}
        </span>
        {ziehbar && (
          <span aria-hidden className="absolute inset-y-0 right-0 w-2 cursor-ew-resize hover:bg-current/20" />
        )}
        {n !== 0 && (
          <span className="bg-foreground text-background absolute -top-0 right-1 rounded px-1 text-[0.75rem]">
            {n > 0 ? '+' : ''}
            {n} {t('projekte.zeitplan.tageKurz')}
          </span>
        )}
      </button>
      {aussen && n === 0 && (
        <span
          aria-hidden
          className="text-foreground pointer-events-none absolute flex h-7 items-center pl-1 text-xs font-medium whitespace-nowrap"
          style={{ left: `${l.links + l.breite}%`, top: 3 + b.spur * SPUR }}
        >
          {text}
        </span>
      )}
    </>
  )
}
