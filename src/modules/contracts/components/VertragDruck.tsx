import { useTranslation } from 'react-i18next'
import { createPortal } from 'react-dom'
import { mitMwst, useMwst } from '@/hooks/useMwst'
import { formatChf, formatDatum } from '@/lib/format'
import { mindestBis, findePaket } from '../lib/tarif'
import type { Katalog, Vertrag } from '../types'

/** Absender je Sprache: Deutsch aus Muri, Französisch aus Bulle (wie Briefe und Signaturen). */
const FIRMA = {
  de: ['Dimension Solaire GmbH', 'Luzernerstrasse 35', '5630 Muri AG'],
  fr: ['Dimension Solaire Sàrl', 'Chemin des Crêts 4', '1630 Bulle'],
}

const GRAU = '#5a6473'
const LINIE = '1px solid #d5dbe3'

/**
 * Wartungsvertrag als A4 (Drucken oder «Als PDF sichern»), in der Sprache des Vertrags, aufgebaut wie das
 * Angebot der Website: Parteien, Anlage, Paket mit Leistungen, Jahrespreis exkl. MWST mit MWST und Total,
 * Laufzeit, Vertragsbedingungen und Unterschriften. Feste Farben, weil Papier immer weiss ist.
 */
export function VertragDruck({ vertrag: v, katalog }: { vertrag: Vertrag; katalog?: Katalog }) {
  const { i18n } = useTranslation()
  const t = i18n.getFixedT(v.sprache)
  const satz = useMwst()
  const p = findePaket(katalog, v.paket)
  const netto = v.preis_netto_rappen
  const tarif = v.tarif_netto_rappen
  const bestand = katalog?.zusatz.find((z) => z.id === 'bestandsaufnahme')
  const mindest = mindestBis(v.start_am, v.laufzeit_jahre)
  const zeile = (label: string, wert: string) => (
    <tr>
      <td style={{ width: '50mm', color: GRAU, padding: '1.2mm 0', verticalAlign: 'top' }}>{label}</td>
      <td style={{ padding: '1.2mm 0', borderBottom: LINIE }}>{wert}</td>
    </tr>
  )
  const betrag = (label: string, rappen: number, fett = false) => (
    <tr style={fett ? { fontWeight: 700 } : {}}>
      <td style={{ padding: '1mm 0', borderBottom: LINIE }}>{label}</td>
      <td style={{ padding: '1mm 0', borderBottom: LINIE, textAlign: 'right' }}>CHF {formatChf(rappen)}</td>
    </tr>
  )
  const anlage = [
    v.anlage_kwp != null ? t('wartung.druck.kwp', { kwp: v.anlage_kwp }) : null,
    v.speicher_kwh ? t('wartung.druck.kwh', { kwh: v.speicher_kwh }) : null,
    v.ibn_jahr ? t('wartung.druck.ibn', { jahr: v.ibn_jahr }) : null,
    v.wechselrichter,
  ]
    .filter(Boolean)
    .join(' · ')
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
      <h1 style={{ fontSize: 15, margin: '8mm 0 0' }}>
        {t('wartung.druck.titel', { nummer: v.nummer ?? '' })}
        {p ? ` · ${p.name}` : ''}
      </h1>
      <p style={{ color: GRAU, margin: '1mm 0 4mm' }}>
        {p ? `${p.art[v.sprache]} – ${p.satz[v.sprache]} · ` : ''}
        {formatDatum(new Date())}
      </p>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <tbody>
          {anlage && zeile(t('wartung.druck.anlage'), anlage)}
          {v.anlage_ort && zeile(t('wartung.feld.ort'), v.anlage_ort)}
          {v.projekt && zeile(t('wartung.feld.projekt'), v.projekt)}
          {zeile(t('wartung.feld.start'), v.start_am ? formatDatum(v.start_am) : '–')}
          {zeile(
            t('wartung.druck.mindest'),
            `${t('wartung.jahre', { count: v.laufzeit_jahre })}${mindest ? ` (${t('wartung.druck.bis', { datum: formatDatum(mindest) })})` : ''}`,
          )}
          {zeile(
            t('wartung.feld.rhythmus'),
            v.rhythmus_monate
              ? t('wartung.paket.inspektion', { count: v.rhythmus_monate })
              : t('wartung.paket.keineInspektion'),
          )}
        </tbody>
      </table>
      <h2 style={{ fontSize: 11, margin: '6mm 0 1.5mm' }}>{t('wartung.feld.leistungen')}</h2>
      <ul style={{ margin: 0, paddingLeft: '5mm', lineHeight: 1.6 }}>
        {(v.leistungen.length ? v.leistungen : (p?.leistungen ?? [])).map((l) => (
          <li key={l.de}>{l[v.sprache]}</li>
        ))}
      </ul>
      {netto != null && (
        <table style={{ width: '90mm', marginLeft: 'auto', marginTop: '5mm', borderCollapse: 'collapse' }}>
          <tbody>
            {tarif != null && tarif > netto && betrag(t('wartung.druck.tarif'), tarif)}
            {tarif != null && tarif > netto && betrag(t('wartung.druck.rabatt'), netto - tarif)}
            {betrag(t('wartung.druck.proJahrExkl'), netto)}
            {betrag(t('wartung.druck.mwst', { satz }), mitMwst(netto, satz) - netto)}
            {betrag(t('wartung.druck.inkl'), mitMwst(netto, satz), true)}
          </tbody>
        </table>
      )}
      {netto == null && v.preis_rappen != null && (
        <p style={{ marginTop: '4mm' }}>{`${t('wartung.feld.preis')}: CHF ${formatChf(v.preis_rappen)}`}</p>
      )}
      {(v.bestandsaufnahme === 'verrechnen' || v.bestandsaufnahme === 'verrechnet') && bestand?.rappen != null && (
        <p style={{ marginTop: '3mm' }}>{`${t('wartung.druck.bestand')}: CHF ${formatChf(bestand.rappen)}`}</p>
      )}
      <h2 style={{ fontSize: 11, margin: '6mm 0 1.5mm' }}>{t('wartung.druck.bedingungenTitel')}</h2>
      {katalog ? (
        <div style={{ columnCount: 2, columnGap: '6mm', lineHeight: 1.4, fontSize: 9 }}>
          {katalog.texte[v.sprache].map((x) => (
            <p key={x.titel} style={{ margin: '0 0 2mm', breakInside: 'avoid' }}>
              <b>{x.titel}.</b> {x.text}
            </p>
          ))}
        </div>
      ) : (
        <p style={{ lineHeight: 1.5 }}>{t('wartung.druck.bedingungen')}</p>
      )}
      <div style={{ display: 'flex', gap: '20mm', marginTop: '16mm' }}>
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
