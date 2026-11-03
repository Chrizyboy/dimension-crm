import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { formatDatum } from '@/lib/format'
import { formatMenge } from '../lib/anzeige'
import type { RuestZeile } from '../lib/lagerTypen'

/**
 * Rüstliste auf Papier: Lager Bulle, nach Lagerplatz, mit Kästchen zum Abhaken. Papier ist weiss, darum feste
 * Farben wie bei den anderen Druckblättern.
 */
export function RuestlisteDruck({ titel, zeilen, mengen }: { titel: string; zeilen: RuestZeile[]; mengen: number[] }) {
  const { t, i18n } = useTranslation()
  const zelle = { borderBottom: '1px solid #c9ced6', padding: '6px 4px', textAlign: 'left' as const }
  return createPortal(
    <div className="druckbereich" style={{ fontFamily: 'Arial, sans-serif', fontSize: 11, color: '#10263f' }}>
      <img
        src={`./logo/logo-hell-${i18n.language === 'fr' ? 'fr' : 'de'}.png`}
        alt="Dimension Solaire"
        style={{ height: 36 }}
      />
      <hr style={{ border: 0, borderTop: '2px solid #f7931e', margin: '10px 0 14px' }} />
      <h1 style={{ fontSize: 17, fontWeight: 700 }}>{t('einkauf.ruest.titel')}</h1>
      <p style={{ color: '#5a6473', margin: '4px 0 14px' }}>
        {titel} · {formatDatum(new Date())}
      </p>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={zelle}>{t('einkauf.lager.platz')}</th>
            <th style={zelle}>{t('einkauf.lager.artikel')}</th>
            <th style={{ ...zelle, textAlign: 'right' }}>{t('einkauf.ruest.menge')}</th>
            <th style={{ ...zelle, width: 60 }}>{t('einkauf.ruest.geruestet')}</th>
          </tr>
        </thead>
        <tbody>
          {zeilen.map((z, i) => (
            <tr key={z.material_id}>
              <td style={{ ...zelle, fontFamily: 'monospace' }}>{z.lagerplatz ?? '–'}</td>
              <td style={zelle}>
                {z.bezeichnung}
                {z.artikelnummer && <span style={{ color: '#5a6473' }}> · {z.artikelnummer}</span>}
              </td>
              <td style={{ ...zelle, textAlign: 'right' }}>
                {formatMenge(mengen[i] ?? 0)} {z.einheit}
              </td>
              <td style={zelle}>☐</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p style={{ marginTop: 28 }}>{t('einkauf.ruest.visum')} ______________________</p>
    </div>,
    document.body,
  )
}
