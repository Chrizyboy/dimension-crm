import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { mitMwst } from '@/hooks/useMwst'
import { formatChf, formatDatum } from '@/lib/format'
import { useUi } from '@/stores/ui'
import type { Artikel } from '../types'

/**
 * Preisliste als PDF für Kunden (V96): Logo, je Kategorie ein Balken, Zebra-Zeilen, Fusszeile mit Datum
 * und MWST-Hinweis. Ohne Einkauf und Marge, auch wenn die Person sie sehen darf.
 */
export function PreislisteDruck({
  artikel,
  inkl,
  satz,
  kategorieText,
  reihenfolge,
}: {
  artikel: Artikel[]
  inkl: boolean
  satz: number
  kategorieText: (k: string) => string
  reihenfolge: string[]
}) {
  const { t } = useTranslation()
  const sprache = useUi((z) => z.sprache)
  const gruppen = [...new Set(artikel.map((a) => a.kategorie))].sort(
    (a, b) => reihenfolge.indexOf(a) - reihenfolge.indexOf(b),
  )
  const zelle = { padding: '3px 6px', fontSize: 9.5 } as const
  return createPortal(
    <div className="druckbereich" style={{ fontFamily: 'Arial, sans-serif', fontSize: 10 }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 14 }}>
        <img src={`./logo/logo-hell-${sprache}.png`} alt="Dimension Solaire" style={{ height: 42 }} />
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 16, fontWeight: 700 }}>{t('preise.druck.titel')}</div>
          <div style={{ fontSize: 9 }}>{formatDatum(new Date())}</div>
        </div>
      </header>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '1.5px solid #000', textAlign: 'left' }}>
            <th style={zelle}>{t('preise.kunden.produkt')}</th>
            <th style={zelle}>{t('preise.kunden.leistung')}</th>
            <th style={zelle}>{t('preise.kunden.masse')}</th>
            <th style={{ ...zelle, textAlign: 'right' }}>
              {t(inkl ? 'preise.kunden.preisInkl' : 'preise.kunden.preisExkl')}
            </th>
          </tr>
        </thead>
        {gruppen.map((g) => (
          <tbody key={g} style={{ breakInside: 'avoid' }}>
            <tr>
              <td
                colSpan={4}
                style={{ background: '#0b2545', color: '#fff', fontWeight: 700, padding: '4px 6px', fontSize: 10 }}
              >
                {kategorieText(g)}
              </td>
            </tr>
            {artikel
              .filter((a) => a.kategorie === g)
              .map((a, i) => {
                const p = a.vkRappen ? (inkl ? mitMwst(a.vkRappen, satz) : a.vkRappen) : null
                return (
                  <tr key={a.id} style={{ background: i % 2 ? '#f1f4f8' : '#fff' }}>
                    <td style={zelle}>
                      <b>{a.name}</b>
                      {a.gruppe && <span style={{ color: '#555' }}> · {a.gruppe}</span>}
                    </td>
                    <td style={zelle}>{a.leistungW ? `${a.leistungW} Wp` : ''}</td>
                    <td style={zelle}>
                      {[a.masse, a.gewichtKg ? `${a.gewichtKg} kg` : null].filter(Boolean).join(' · ')}
                    </td>
                    <td style={{ ...zelle, textAlign: 'right', whiteSpace: 'nowrap' }}>
                      {p ? `CHF ${formatChf(p)}` : t('preise.kunden.aufAnfrage')}
                    </td>
                  </tr>
                )
              })}
          </tbody>
        ))}
      </table>
      <footer style={{ marginTop: 14, fontSize: 8.5, color: '#555', borderTop: '1px solid #999', paddingTop: 4 }}>
        {t(inkl ? 'preise.druck.fussInkl' : 'preise.druck.fussExkl', { satz })}
      </footer>
    </div>,
    document.body,
  )
}
