import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'

/** Ein Punkt auf der Karte: Lead, Termin, Standort oder Kalendertermin. */
export interface KartenPunkt {
  id: string
  breite: number
  laenge: number
  titel: string
  /** Token der Farbe, z. B. 'info', 'ok', 'warn', 'bad', 'accent', 'primary'. */
  ton: 'info' | 'ok' | 'warn' | 'bad' | 'accent' | 'primary' | 'muted-foreground'
  /** Nummer im Kreis (Reihenfolge der Route). */
  nummer?: number
  gross?: boolean
}

interface KarteProps {
  punkte: readonly KartenPunkt[]
  /** Linie der Route in Reihenfolge. */
  linie?: readonly [number, number][]
  onKlick?: (id: string) => void
  className?: string
  beschriftung: string
}

/** Farbe eines Tokens zur Laufzeit lesen, damit die Karte Hell und Dunkel mitmacht. */
function farbe(ton: KartenPunkt['ton']): string {
  return getComputedStyle(document.documentElement).getPropertyValue(`--${ton}`).trim() || '#0b6bcb'
}

/**
 * Karte der Schweiz mit den Kartenkacheln von swisstopo (frei nutzbar, Rechenzentrum in der Schweiz).
 * Punkte werden auf eine Zeichenfläche gemalt, damit auch 600 Leads flüssig bleiben.
 */
export function Karte({ punkte, linie, onKlick, className, beschriftung }: KarteProps) {
  const { t } = useTranslation()
  const huelle = useRef<HTMLDivElement>(null)
  const karte = useRef<L.Map | null>(null)
  const ebene = useRef<L.LayerGroup | null>(null)
  const klick = useRef(onKlick)
  useEffect(() => {
    klick.current = onKlick
  })

  useEffect(() => {
    if (!huelle.current) return
    const m = L.map(huelle.current, { preferCanvas: true, zoomControl: true, attributionControl: true }).setView(
      [46.9, 7.9],
      8,
    )
    L.tileLayer('https://wmts.geo.admin.ch/1.0.0/ch.swisstopo.pixelkarte-grau/default/current/3857/{z}/{x}/{y}.jpeg', {
      maxZoom: 18,
      attribution: '© swisstopo',
    }).addTo(m)
    karte.current = m
    ebene.current = L.layerGroup().addTo(m)
    return () => {
      m.remove()
      karte.current = null
    }
  }, [])

  useEffect(() => {
    const m = karte.current
    const e = ebene.current
    if (!m || !e) return
    e.clearLayers()
    if (linie && linie.length > 1)
      L.polyline(linie as unknown as L.LatLngExpression[], { color: farbe('primary'), weight: 3, opacity: 0.7 }).addTo(
        e,
      )
    for (const p of punkte) {
      const c = farbe(p.ton)
      const marke =
        p.nummer !== undefined
          ? L.marker([p.breite, p.laenge], {
              icon: L.divIcon({
                className: '',
                html: `<span style="display:flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:9999px;background:${c};color:#fff;font:600 12px system-ui;border:2px solid #fff;box-shadow:0 1px 3px rgb(0 0 0/.3)">${p.nummer}</span>`,
                iconSize: [24, 24],
                iconAnchor: [12, 12],
              }),
              title: p.titel,
              keyboard: true,
            })
          : L.circleMarker([p.breite, p.laenge], {
              radius: p.gross ? 8 : 6,
              color: '#fff',
              weight: 1.5,
              fillColor: c,
              fillOpacity: 0.9,
            })
      marke.bindTooltip(p.titel)
      marke.on('click', () => klick.current?.(p.id))
      marke.addTo(e)
    }
    const alle: [number, number][] = [...punkte.map((p): [number, number] => [p.breite, p.laenge]), ...(linie ?? [])]
    if (alle.length) m.fitBounds(L.latLngBounds(alle), { padding: [24, 24], maxZoom: 13 })
  }, [punkte, linie])

  return (
    <div className={className}>
      <div
        ref={huelle}
        role="region"
        aria-label={beschriftung}
        className="bg-muted size-full min-h-64 overflow-hidden rounded-xl border"
      />
      <p className="sr-only">{t('verkauf.karte.hinweis', { count: punkte.length })}</p>
    </div>
  )
}
