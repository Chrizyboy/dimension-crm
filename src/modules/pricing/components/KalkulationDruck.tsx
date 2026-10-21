import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { formatChf, formatDatum } from '@/lib/format'
import { zeile, type summe } from '../lib/kalkulation'
import { prozentText } from '../lib/prozent'
import type { Kalkulation } from '../types'

/** «PDF intern» (V233 Kalkulation): alle Positionen mit EK, Marge und Preis, dazu DB und Summen. Nicht für Kunden. */
export function KalkulationDruck({
  k,
  s,
  satz,
  offerte,
}: {
  k: Kalkulation
  s: ReturnType<typeof summe>
  satz: number
  offerte: { nummer: string; name: string } | null
}) {
  const { t } = useTranslation()
  const z = { padding: '3px 5px', fontSize: 9.5, borderBottom: '1px solid #ddd' } as const
  const r = { ...z, textAlign: 'right' as const, whiteSpace: 'nowrap' as const }
  const zeilen: [string, string][] = [
    [t('preise.kalk.anlage'), s.kwp ? `${s.kwp} kWp · ${t('preise.kalk.module', { count: s.module })}` : '–'],
    [t('preise.kalk.einkauf'), `CHF ${formatChf(s.ek)}`],
    [t('preise.kalk.verkauf', { reserve: formatChf(s.skonto) }), `CHF ${formatChf(s.brutto)}`],
    ...(k.rabattProzent
      ? [[`${t('preise.kalk.rabatt')} ${k.rabattProzent} %`, `− CHF ${formatChf(s.rabattBetrag)}`] as [string, string]]
      : []),
    [t('preise.kalk.totalExkl'), `CHF ${formatChf(s.netto)}`],
    [t('preise.kalk.db'), `CHF ${formatChf(s.db)} · ${Math.round(s.dbProzent * 10) / 10} %`],
    [t('preise.kalk.mwst', { satz }), `CHF ${formatChf(s.mwst)}`],
    [t('preise.kalk.totalInkl'), `CHF ${formatChf(s.total)}`],
  ]
  return createPortal(
    <div className="druckbereich" style={{ fontFamily: 'Arial, sans-serif', fontSize: 10 }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
        <h1 style={{ fontSize: 16, fontWeight: 700 }}>
          {t('preise.kalk.druckTitel')} – {k.titel || '–'}
        </h1>
        <span style={{ fontSize: 9 }}>
          {[offerte ? `${offerte.nummer} ${offerte.name}` : null, formatDatum(new Date()), t('preise.kalk.intern')]
            .filter(Boolean)
            .join(' · ')}
        </span>
      </header>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ textAlign: 'left', borderBottom: '1.5px solid #000' }}>
            <th style={z}>{t('preise.kalk.position')}</th>
            <th style={r}>{t('preise.kalk.menge')}</th>
            <th style={r}>{t('preise.spalte.ek')}</th>
            <th style={r}>{t('preise.spalte.marge')}</th>
            <th style={r}>{t('preise.kalk.preis')}</th>
            <th style={r}>{t('preise.kalk.total')}</th>
          </tr>
        </thead>
        <tbody>
          {k.positionen.map((p) => {
            const w = zeile(p)
            return (
              <tr key={p.key}>
                <td style={z}>
                  {p.name}
                  {p.gruppe && <span style={{ color: '#555' }}> · {p.gruppe}</span>}
                </td>
                <td style={r}>
                  {p.menge} {p.einheit}
                </td>
                <td style={r}>{formatChf(p.ekRappen)}</td>
                <td style={r}>{prozentText(p.marge)} %</td>
                <td style={r}>{formatChf(w.preis)}</td>
                <td style={r}>{formatChf(w.total)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <table style={{ marginTop: 12, marginLeft: 'auto', borderCollapse: 'collapse', minWidth: 280 }}>
        <tbody>
          {zeilen.map(([a, b]) => (
            <tr key={a}>
              <td style={{ padding: '2px 8px 2px 0', fontSize: 10 }}>{a}</td>
              <td style={{ padding: '2px 0', fontSize: 10, textAlign: 'right', fontWeight: 600 }}>{b}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {k.notiz && <p style={{ marginTop: 12, whiteSpace: 'pre-line' }}>{k.notiz}</p>}
    </div>,
    document.body,
  )
}
