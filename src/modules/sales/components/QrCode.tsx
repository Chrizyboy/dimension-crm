import qrcode from 'qrcode-generator'
import { useMemo } from 'react'

/**
 * QR-Code als SVG (für Druck scharf). Fürs Terminblatt: Handy drauf halten, Google Maps öffnet die Adresse.
 * Die Kästchen werden als Rechtecke gezeichnet statt als fertiges HTML eingefügt.
 */
export function QrCode({ text, groesse = 64, titel }: { text: string; groesse?: number; titel: string }) {
  const felder = useMemo(() => {
    const q = qrcode(0, 'M')
    q.addData(text)
    q.make()
    const n = q.getModuleCount()
    const dunkel: [number, number][] = []
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) dunkel.push([c, r])
    return { n, dunkel }
  }, [text])
  return (
    <svg
      width={groesse}
      height={groesse}
      viewBox={`-1 -1 ${String(felder.n + 2)} ${String(felder.n + 2)}`}
      role="img"
      aria-label={titel}
      shapeRendering="crispEdges"
    >
      <rect x={-1} y={-1} width={felder.n + 2} height={felder.n + 2} fill="#fff" />
      {felder.dunkel.map(([x, y]) => (
        <rect key={`${String(x)}-${String(y)}`} x={x} y={y} width={1} height={1} fill="#0b1f3a" />
      ))}
    </svg>
  )
}
