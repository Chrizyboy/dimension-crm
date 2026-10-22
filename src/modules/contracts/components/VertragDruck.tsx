import { useTranslation } from 'react-i18next'
import { createPortal } from 'react-dom'
import { formatChf, formatDatum } from '@/lib/format'
import { vertragsende } from '../lib/anzeige'
import type { Vertrag } from '../types'

/** Absender je Sprache: Deutsch aus Muri, Französisch aus Bulle (wie Briefe und Signaturen). */
const FIRMA = {
  de: ['Dimension Solaire GmbH', 'Luzernerstrasse 35', '5630 Muri AG'],
  fr: ['Dimension Solaire Sàrl', 'Chemin des Crêts 4', '1630 Bulle'],
}

/**
 * Wartungsvertrag als A4 (Drucken oder «Als PDF sichern»), in der Sprache des Vertrags: Parteien, Anlage,
 * Leistungen, Rhythmus, Laufzeit, Preis und Unterschriften. Feste Farben, weil Papier immer weiss ist.
 */
export function VertragDruck({ vertrag: v }: { vertrag: Vertrag }) {
  const { i18n } = useTranslation()
  const t = i18n.getFixedT(v.sprache)
  const ende = vertragsende(v.start_am, v.laufzeit_jahre)
  const zeile = (label: string, wert: string) => (
    <tr>
      <td style={{ width: '50mm', color: '#5a6473', padding: '1.2mm 0', verticalAlign: 'top' }}>{label}</td>
      <td style={{ padding: '1.2mm 0', borderBottom: '1px solid #d5dbe3' }}>{wert}</td>
    </tr>
  )
  return createPortal(
    <div className="druckbereich" style={{ fontFamily: 'Arial, sans-serif', fontSize: 10, color: '#10263f' }}>
      <img src={`./logo/logo-hell-${v.sprache}.png`} alt="Dimension Solaire" style={{ height: 36 }} />
      <hr style={{ border: 0, borderTop: '2px solid #f7931e', margin: '8px 0 4mm' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10mm' }}>
        <p style={{ margin: 0, lineHeight: 1.4 }}>
          {FIRMA[v.sprache].map((z) => (
            <span key={z} style={{ display: 'block' }}>
              {z}
            </span>
          ))}
        </p>
        <p style={{ margin: 0, lineHeight: 1.4, textAlign: 'right' }}>
          {v.adresse.map((z) => (
            <span key={z} style={{ display: 'block' }}>
              {z}
            </span>
          ))}
        </p>
      </div>
      <h1 style={{ fontSize: 15, margin: '8mm 0 0' }}>{t('wartung.druck.titel', { nummer: v.nummer ?? '' })}</h1>
      <p style={{ color: '#5a6473', margin: '1mm 0 4mm' }}>{formatDatum(new Date())}</p>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <tbody>
          {zeile(t('wartung.feld.projekt'), v.projekt ?? '–')}
          {zeile(t('wartung.feld.start'), v.start_am ? formatDatum(v.start_am) : '–')}
          {zeile(
            t('wartung.feld.laufzeit'),
            `${t('wartung.jahre', { count: v.laufzeit_jahre })}${ende ? ` (${t('wartung.druck.bis', { datum: formatDatum(ende) })})` : ''}`,
          )}
          {zeile(t('wartung.feld.rhythmus'), t('wartung.rhythmus', { count: v.rhythmus_monate ?? 12 }))}
          {zeile(
            t('wartung.feld.preis'),
            v.preis_rappen ? `${formatChf(v.preis_rappen, { mitWaehrung: true })} ${t('wartung.druck.proJahr')}` : '–',
          )}
          {v.naechste_wartung && zeile(t('wartung.feld.naechste'), formatDatum(v.naechste_wartung))}
        </tbody>
      </table>
      <h2 style={{ fontSize: 11, margin: '6mm 0 1.5mm' }}>{t('wartung.feld.leistungen')}</h2>
      <ul style={{ margin: 0, paddingLeft: '5mm', lineHeight: 1.6 }}>
        {v.leistungen.map((l) => (
          <li key={l.de}>{l[v.sprache]}</li>
        ))}
      </ul>
      <p style={{ marginTop: '6mm', lineHeight: 1.5 }}>{t('wartung.druck.bedingungen')}</p>
      <div style={{ display: 'flex', gap: '20mm', marginTop: '18mm' }}>
        {[t('wartung.druck.unterschriftKunde'), t('wartung.druck.unterschriftFirma')].map((u) => (
          <p key={u} style={{ flex: 1, borderTop: '1px solid #10263f', paddingTop: '1.5mm', margin: 0 }}>
            {u}
          </p>
        ))}
      </div>
    </div>,
    document.body,
  )
}
