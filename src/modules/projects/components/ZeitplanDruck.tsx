import { useTranslation } from 'react-i18next'
import { createPortal } from 'react-dom'
import { formatDatum } from '@/lib/format'
import { balken, type Woche } from '../lib/zeitplan'
import type { PlanGruppe } from '../lib/zeitplanAnsicht'

/** Papier ist weiss, darum feste Farben wie im Firmen-Logo (dunkelblau, orange). */
const FARBE = {
  intern: { background: '#10263f', color: '#fff' },
  extern: { background: '#f7931e', color: '#10263f' },
  geplant: { background: '#fff', color: '#10263f', border: '1px dashed #10263f' },
  abwesend: { background: '#e3e7ed', color: '#4a5568' },
}

/**
 * Zeitplan zum Drucken oder als PDF (V233 «PDF exportieren»): A4 quer, Wochen als Spalten, Einsätze als
 * tagesgenaue Balken, je Standort ein Block.
 */
export function ZeitplanDruck({
  wochen,
  gruppen,
  spalte,
}: {
  wochen: Woche[]
  gruppen: PlanGruppe[]
  /** Überschrift der ersten Spalte (Baustelle oder Person). */
  spalte: string
}) {
  const { t } = useTranslation()
  const start = wochen[0]?.montag ?? ''
  const tage = wochen.length * 7
  const zelle = { borderLeft: '1px solid #d5dbe3', padding: '1px 2px', textAlign: 'center' as const }
  return createPortal(
    <div className="druckbereich" style={{ fontFamily: 'Arial, sans-serif', fontSize: 8, color: '#10263f' }}>
      <style>{'@page { size: A4 landscape; margin: 10mm; }'}</style>
      <h1 style={{ fontSize: 13, margin: '0 0 4mm' }}>
        {t('projekte.zeitplan.druckTitel', {
          von: wochen[0]?.kw ?? '',
          bis: wochen.at(-1)?.kw ?? '',
          datum: formatDatum(new Date()),
        })}
      </h1>
      <div style={{ display: 'grid', gridTemplateColumns: '42mm 1fr', borderBottom: '1px solid #10263f' }}>
        <span style={{ fontWeight: 700 }}>{spalte}</span>
        <span style={{ display: 'flex' }}>
          {wochen.map((w) => (
            <span key={w.montag} style={{ ...zelle, flex: 1, fontWeight: 700 }}>
              {t('projekte.zeitplan.kw', { kw: w.kw })}
            </span>
          ))}
        </span>
      </div>
      {gruppen.map((g) => (
        <section key={g.id} style={{ breakInside: 'avoid' }}>
          <p style={{ fontWeight: 700, background: '#eef1f5', padding: '1mm 2mm', margin: '2mm 0 0' }}>{g.titel}</p>
          {g.zeilen.map((z) => (
            <div
              key={z.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '42mm 1fr',
                borderBottom: '1px solid #d5dbe3',
                minHeight: `${String(z.spuren * 5)}mm`,
              }}
            >
              <span style={{ overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', paddingRight: '2mm' }}>
                {z.titel}
                {z.unter ? ` · ${z.unter}` : ''}
              </span>
              <span style={{ position: 'relative' }}>
                {z.balken.map((e) => {
                  const l = balken(e.von, e.bis, start, tage)
                  return (
                    l && (
                      <span
                        key={e.id}
                        style={{
                          ...FARBE[e.art],
                          position: 'absolute',
                          top: `${String(0.8 + e.spur * 5)}mm`,
                          height: '3.4mm',
                          left: `${l.links}%`,
                          width: `${l.breite}%`,
                          borderRadius: 2,
                          overflow: 'hidden',
                          whiteSpace: 'nowrap',
                          padding: '0 1mm',
                          printColorAdjust: 'exact',
                          WebkitPrintColorAdjust: 'exact',
                        }}
                      >
                        {e.text}
                      </span>
                    )
                  )
                })}
              </span>
            </div>
          ))}
        </section>
      ))}
    </div>,
    document.body,
  )
}
