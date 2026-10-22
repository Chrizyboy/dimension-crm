import { useTranslation } from 'react-i18next'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { formatDatum, formatTelefon } from '@/lib/format'
import { ortZeile } from '../lib/anzeige'
import type { Gesuch, Projekt } from '../types'

/** Absender je Sprache: Deutsch aus Muri, Französisch aus Bulle (wie Briefe und Signaturen). */
const FIRMA = {
  de: ['Dimension Solaire GmbH', 'Luzernerstrasse 35', '5630 Muri AG'],
  fr: ['Dimension Solaire Sàrl', 'Chemin des Crêts 4', '1630 Bulle'],
}

/**
 * Vorausgefülltes Datenblatt für ein Gesuch (ERP-Erweiterung): technisches Anschlussgesuch an den
 * Netzbetreiber, Meldung an die Gemeinde (Solaranlage nach Art. 18a RPG) oder Förderung (Pronovo).
 * Es ist ein eigenes Blatt mit allen Angaben zum Abschreiben oder Beilegen, kein Nachbau der amtlichen
 * Formulare. Sprache wie der Vertrag des Kunden.
 */
export function GesuchDruck({ projekt: p, gesuch }: { projekt: Projekt; gesuch: Gesuch }) {
  const { i18n } = useTranslation()
  const t = i18n.getFixedT(p.sprache)
  const zeile = (label: string, wert: string | number | null | undefined) => (
    <tr>
      <td style={{ width: '45mm', color: '#5a6473', padding: '1.2mm 0', verticalAlign: 'top' }}>{label}</td>
      <td style={{ padding: '1.2mm 0', borderBottom: '1px solid #d5dbe3' }}>{wert ?? ''}</td>
    </tr>
  )
  const abschnitt = (titel: string, inhalt: ReactNode) => (
    <section style={{ marginTop: '6mm' }}>
      <h2 style={{ fontSize: 11, margin: '0 0 1.5mm', color: '#10263f' }}>{titel}</h2>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <tbody>{inhalt}</tbody>
      </table>
    </section>
  )
  return createPortal(
    <div className="druckbereich" style={{ fontFamily: 'Arial, sans-serif', fontSize: 10, color: '#10263f' }}>
      <img src={`./logo/logo-hell-${p.sprache}.png`} alt="Dimension Solaire" style={{ height: 36 }} />
      <hr style={{ border: 0, borderTop: '2px solid #f7931e', margin: '8px 0 4mm' }} />
      <h1 style={{ fontSize: 15, margin: 0 }}>{t(`projekte.gesuch.${gesuch}.titel`)}</h1>
      <p style={{ color: '#5a6473', margin: '1mm 0 0' }}>
        {t(`projekte.gesuch.${gesuch}.zweck`)} · {p.nummer} · {formatDatum(new Date())}
      </p>
      {abschnitt(
        t('projekte.gesuch.bauherrschaft'),
        <>
          {zeile(t('projekte.gesuch.name'), p.kunde)}
          {zeile(t('projekte.gesuch.adresse'), [p.strasse, ortZeile(p)].filter(Boolean).join(', '))}
          {zeile(t('projekte.feld.telefon'), p.telefon ? formatTelefon(p.telefon) : '')}
          {zeile(t('projekte.feld.email'), p.email)}
        </>,
      )}
      {abschnitt(
        t('projekte.gesuch.standort'),
        <>
          {zeile(t('projekte.gesuch.adresse'), [p.strasse, ortZeile(p)].filter(Boolean).join(', '))}
          {zeile(t('projekte.gesuch.parzelle'), '')}
          {gesuch === 'tag' && zeile(t('projekte.gesuch.zaehler'), '')}
        </>,
      )}
      {abschnitt(
        t('projekte.gesuch.anlage'),
        <>
          {zeile(t('projekte.gesuch.leistung'), p.leistung_kwp ? `${String(p.leistung_kwp)} kWp` : '')}
          {zeile(t('projekte.gesuch.module'), p.anzahl_module)}
          {zeile(t('projekte.gesuch.wechselrichter'), p.wechselrichter)}
          {zeile(t('projekte.gesuch.batterie'), p.batterie ?? t('projekte.gesuch.keine'))}
          {gesuch === 'meldung' && zeile(t('projekte.gesuch.art'), t('projekte.gesuch.aufDach'))}
          {zeile(t('projekte.gesuch.baubeginn'), p.baubeginn ? formatDatum(p.baubeginn) : '')}
        </>,
      )}
      {abschnitt(
        t('projekte.gesuch.installateur'),
        <>
          {zeile(t('projekte.gesuch.firma'), FIRMA[p.sprache].join(', '))}
          {gesuch !== 'meldung' && zeile(t('projekte.gesuch.elektriker'), p.elektriker)}
        </>,
      )}
      <p style={{ marginTop: '6mm', lineHeight: 1.5 }}>{t(`projekte.gesuch.${gesuch}.hinweis`)}</p>
      <div style={{ display: 'flex', gap: '20mm', marginTop: '18mm' }}>
        <p style={{ flex: 1, borderTop: '1px solid #10263f', paddingTop: '1mm' }}>
          {t('projekte.gesuch.unterschriftKunde')}
        </p>
        <p style={{ flex: 1, borderTop: '1px solid #10263f', paddingTop: '1mm' }}>
          {t('projekte.gesuch.unterschriftFirma')}
        </p>
      </div>
    </div>,
    document.body,
  )
}
