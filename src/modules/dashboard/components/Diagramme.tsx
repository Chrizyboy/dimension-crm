import { cn } from '@/lib/utils'

/** Eine Linie im Diagramm: Werte je Fach (null = noch nicht erreicht, z. B. Monate nach heute). */
export interface Linie {
  id: string
  werte: (number | null)[]
  /** Farbe nur über die Diagramm-Tokens; «ziel» ist eine gestrichelte, gedämpfte Linie. */
  farbe: 'reihe-1' | 'reihe-2' | 'ziel'
}

const B = 640
const H = 220
const LINKS = 56
const UNTEN = 22

/**
 * Liniendiagramm (z. B. Auftragseingang kumuliert gegen Vergleich und Ziel). Eine Skala für alles, Beschriftung
 * mit `format`; Text und Raster aus den Theme-Tokens, damit hell und dunkel lesbar sind.
 */
export function LinienDiagramm({
  linien,
  faecher,
  format,
  titel,
}: {
  linien: Linie[]
  faecher: string[]
  format: (wert: number) => string
  titel: string
}) {
  const max = Math.max(1, ...linien.flatMap((l) => l.werte.filter((w): w is number => w !== null))) * 1.08
  const x = (i: number) => LINKS + (i * (B - LINKS - 12)) / Math.max(faecher.length - 1, 1)
  const y = (w: number) => H - UNTEN - (w / max) * (H - UNTEN - 10)
  const raster = [0, 0.25, 0.5, 0.75, 1].map((a) => a * max)
  return (
    <svg viewBox={`0 0 ${String(B)} ${String(H)}`} className="h-auto w-full" role="img" aria-label={titel}>
      {raster.map((w) => (
        <g key={w}>
          <line x1={LINKS} x2={B - 12} y1={y(w)} y2={y(w)} className="stroke-border" />
          <text x={LINKS - 6} y={y(w) + 4} textAnchor="end" className="fill-muted-foreground text-[10px]">
            {format(w)}
          </text>
        </g>
      ))}
      {faecher.map((f, i) => (
        <text key={f} x={x(i)} y={H - 6} textAnchor="middle" className="fill-muted-foreground text-[10px]">
          {f}
        </text>
      ))}
      {linien.map((l) => {
        const punkte = l.werte
          .map((w, i) => (w === null ? null : `${String(x(i))},${String(y(w))}`))
          .filter(Boolean)
          .join(' ')
        return (
          <g key={l.id}>
            <polyline
              points={punkte}
              fill="none"
              strokeWidth={l.farbe === 'ziel' ? 1.5 : 2.2}
              strokeDasharray={l.farbe === 'ziel' ? '5 4' : undefined}
              className={cn(
                l.farbe === 'reihe-1' && 'stroke-reihe-1',
                l.farbe === 'reihe-2' && 'stroke-reihe-2',
                l.farbe === 'ziel' && 'stroke-muted-foreground',
              )}
            />
            {l.farbe !== 'ziel' &&
              l.werte.map((w, i) =>
                w === null ? null : (
                  <circle
                    key={faecher[i]}
                    cx={x(i)}
                    cy={y(w)}
                    r={2.6}
                    className={l.farbe === 'reihe-1' ? 'fill-reihe-1' : 'fill-reihe-2'}
                  />
                ),
              )}
          </g>
        )
      })}
    </svg>
  )
}

/** Säulen je Fach mit bis zu zwei Reihen nebeneinander (Umsatz und Zahlungseingang). */
export function SaeulenDiagramm({
  faecher,
  reihen,
  format,
  titel,
  onKlick,
}: {
  faecher: string[]
  reihen: [number[], number[]?]
  format: (wert: number) => string
  titel: string
  onKlick?: (fach: number) => void
}) {
  const max = Math.max(1, ...reihen.flatMap((r) => r ?? [])) * 1.1
  const breite = (B - LINKS - 12) / Math.max(faecher.length, 1)
  const y = (w: number) => H - UNTEN - (w / max) * (H - UNTEN - 10)
  const anzahl = reihen.filter(Boolean).length
  return (
    <svg viewBox={`0 0 ${String(B)} ${String(H)}`} className="h-auto w-full" role="img" aria-label={titel}>
      {[0, 0.5, 1].map((a) => (
        <g key={a}>
          <line x1={LINKS} x2={B - 12} y1={y(a * max)} y2={y(a * max)} className="stroke-border" />
          <text x={LINKS - 6} y={y(a * max) + 4} textAnchor="end" className="fill-muted-foreground text-[10px]">
            {format(a * max)}
          </text>
        </g>
      ))}
      {faecher.map((f, i) => {
        const x0 = LINKS + i * breite + breite * 0.15
        const w = (breite * 0.7) / anzahl
        return (
          <g
            key={f}
            onClick={
              onKlick
                ? () => {
                    onKlick(i)
                  }
                : undefined
            }
            className={onKlick ? 'cursor-pointer' : undefined}
          >
            {reihen.map((r, j) =>
              r ? (
                <rect
                  key={j}
                  x={x0 + j * w}
                  y={y(r[i] ?? 0)}
                  width={Math.max(w - 2, 1)}
                  height={H - UNTEN - y(r[i] ?? 0)}
                  rx={2}
                  className={j === 0 ? 'fill-reihe-1' : 'fill-reihe-2'}
                >
                  <title>{`${f}: ${format(r[i] ?? 0)}`}</title>
                </rect>
              ) : null,
            )}
            <text
              x={LINKS + i * breite + breite / 2}
              y={H - 6}
              textAnchor="middle"
              className="fill-muted-foreground text-[10px]"
            >
              {f}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

/** Legende zu den Diagrammen. */
export function Legende({ eintraege }: { eintraege: { text: string; farbe: 'reihe-1' | 'reihe-2' | 'ziel' }[] }) {
  return (
    <div className="text-muted-foreground flex flex-wrap gap-4 text-xs">
      {eintraege.map((e) => (
        <span key={e.text} className="flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className={cn(
              'inline-block h-2.5 w-2.5 rounded-sm',
              e.farbe === 'reihe-1' && 'bg-reihe-1',
              e.farbe === 'reihe-2' && 'bg-reihe-2',
              e.farbe === 'ziel' && 'border-muted-foreground border border-dashed',
            )}
          />
          {e.text}
        </span>
      ))}
    </div>
  )
}
