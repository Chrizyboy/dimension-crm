import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { useAuswahl } from '@/hooks/useAuswahl'
import { formatDatum, formatTelefon } from '@/lib/format'
import { formatKundennummer } from '@/lib/kontakt'
import type { Geschaeft } from '../types'
import type { Besichtigung } from '../lib/besichtigung'
import { mapsLink } from '../lib/karte'
import { QrCode } from './QrCode'

interface TerminblattProps {
  g: Geschaeft
  details:
    | { finanzierung: string | null; zeithorizont: string | null; notiz_intern: string | null; besichtigung: unknown }
    | undefined
  verlauf: { id: string; zeitpunkt: string; art: string; text: string | null }[]
  /** Luftbild als Daten-Adresse oder Link; ohne bleibt ein Kasten zum Skizzieren. */
  luftbild: string | null
  person: string | null
}

const RASTER = { display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: 18 } as const

function Feld({ label, wert }: { label: string; wert?: string | null | undefined }) {
  return (
    <div style={{ borderBottom: '1px solid #999', padding: '3px 0', minHeight: 30 }}>
      <div style={{ fontSize: 9, textTransform: 'uppercase', color: '#555' }}>{label}</div>
      <div style={{ fontSize: 12 }}>{wert || ' '}</div>
    </div>
  )
}

function Kreuz({ text, an = false }: { text: string; an?: boolean }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginRight: 14, fontSize: 11 }}>
      <span
        style={{
          width: 11,
          height: 11,
          border: '1px solid #000',
          display: 'inline-block',
          textAlign: 'center',
          lineHeight: '10px',
        }}
      >
        {an ? '✕' : ''}
      </span>
      {text}
    </span>
  )
}

function Abschnitt({ titel, children }: { titel: string; children: React.ReactNode }) {
  return (
    <section style={{ marginTop: 12, breakInside: 'avoid' }}>
      <h2 style={{ fontSize: 12, fontWeight: 700, borderBottom: '2px solid #000', paddingBottom: 2, marginBottom: 6 }}>
        {titel}
      </h2>
      {children}
    </section>
  )
}

/**
 * Terminblatt für den Kundenbesuch (V233 «Terminblatt drucken»): Termin, Kontakt, Adresse mit
 * Höhe über Meer, Luftbild, Interesse, die Felder der Besichtigung und die letzten Kontakte.
 * Papier ist weiss, darum sind die Farben hier fest. Als PDF speichern geht über den Druckdialog.
 */
export function Terminblatt({ g, details, verlauf, luftbild, person }: TerminblattProps) {
  const { t } = useTranslation()
  const interessen = useAuswahl('interesse')
  // Gespeichert sind Schlüssel («ueber_6»); aufs Blatt gehört der Text in der Sprache der Oberfläche.
  const finanzierung = useAuswahl('finanzierung')
  const zeithorizont = useAuswahl('zeithorizont')
  const erreichbarkeit = useAuswahl('erreichbarkeit')
  const b = (details?.besichtigung ?? {}) as Besichtigung
  const termin = g.terminAm ? new Date(g.terminAm) : null
  const adresse = [g.strasse, [g.plz, g.ort].filter(Boolean).join(' ')].filter(Boolean).join(', ')
  const notizen = [
    g.kommentarKunde ? `${t('verkauf.akte.kommentarKunde')}: ${g.kommentarKunde}` : null,
    details?.notiz_intern ? `${t('verkauf.akte.notizIntern')}: ${details.notiz_intern}` : null,
    b.notiz ? `${t('verkauf.akte.besichtigung')}: ${b.notiz}` : null,
  ].filter(Boolean)

  return createPortal(
    <div className="druckbereich" style={{ fontFamily: 'Arial, sans-serif', fontSize: 12 }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <h1 style={{ fontSize: 18, fontWeight: 700 }}>
          {t('verkauf.terminblatt.titel')} – {g.name}
        </h1>
        <span style={{ fontSize: 10 }}>
          {[g.nummer, formatKundennummer(g.kundennummer), formatDatum(new Date())].filter(Boolean).join(' · ')}
        </span>
      </header>

      <Abschnitt titel={t('verkauf.akte.termin')}>
        <div style={RASTER}>
          <Feld
            label={t('verkauf.akte.terminAm')}
            wert={
              termin
                ? `${formatDatum(termin)} ${termin.toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' })} (${g.terminDauerMin ?? 60} Min)`
                : null
            }
          />
          <Feld label={t('verkauf.terminBei')} wert={person} />
        </div>
      </Abschnitt>

      <Abschnitt titel={t('verkauf.akte.kontakt')}>
        <div style={RASTER}>
          <Feld label={t('verkauf.spalteListe.name')} wert={g.name} />
          <Feld label={t('verkauf.akte.telefon')} wert={g.telefon ? formatTelefon(g.telefon) : null} />
          <Feld label={t('verkauf.akte.adresse')} wert={adresse} />
          <Feld label={t('verkauf.akte.email')} wert={g.email} />
          <Feld label={t('verkauf.akte.hoehe')} wert={g.hoehe ? `${g.hoehe} m ü. M.` : null} />
          <Feld
            label={t('verkauf.akte.erreichbarkeit')}
            wert={g.erreichbarkeit ? erreichbarkeit.text(g.erreichbarkeit) : null}
          />
        </div>
      </Abschnitt>

      <Abschnitt titel={t('verkauf.terminblatt.luftbild')}>
        <div style={{ position: 'relative' }}>
          {luftbild ? (
            <img
              src={luftbild}
              alt={t('verkauf.terminblatt.luftbild')}
              style={{ width: '100%', maxHeight: 260, objectFit: 'cover', border: '1px solid #999' }}
            />
          ) : (
            <div style={{ border: '1px solid #999', height: 200 }} />
          )}
          {/* V233: QR-Code unten rechts im Luftbild, führt in Google Maps zur Adresse. */}
          <div style={{ position: 'absolute', right: 6, bottom: 6, background: '#fff', padding: 2, lineHeight: 0 }}>
            <QrCode text={mapsLink(g)} groesse={72} titel={t('verkauf.terminblatt.qr')} />
          </div>
        </div>
        <p style={{ fontSize: 9, color: '#555', marginTop: 2 }}>
          {adresse} · {t('verkauf.terminblatt.qr')}
        </p>
      </Abschnitt>

      <Abschnitt titel={t('verkauf.akte.interesse')}>
        <p style={{ margin: '4px 0' }}>
          {interessen.werte.map((w) => (
            <Kreuz key={w.schluessel} text={interessen.text(w.schluessel)} an={g.interesse.includes(w.schluessel)} />
          ))}
        </p>
        <div style={RASTER}>
          <Feld
            label={t('verkauf.akte.finanzierung')}
            wert={details?.finanzierung ? finanzierung.text(details.finanzierung) : null}
          />
          <Feld
            label={t('verkauf.akte.zeithorizont')}
            wert={details?.zeithorizont ? zeithorizont.text(details.zeithorizont) : null}
          />
        </div>
      </Abschnitt>

      <Abschnitt titel={t('verkauf.akte.besichtigung')}>
        <div style={RASTER}>
          <Feld label={`${t('verkauf.besichtigung.flaeche')} (m²)`} wert={b.flaeche} />
          <Feld
            label={t('verkauf.besichtigung.ausrichtung')}
            wert={b.ausrichtung ? t(`verkauf.besichtigung.richtung.${b.ausrichtung}`) : null}
          />
          <Feld label={`${t('verkauf.besichtigung.neigung')} (°)`} wert={b.neigung} />
          <Feld
            label={t('verkauf.besichtigung.material')}
            wert={b.material ? t(`verkauf.besichtigung.materialien.${b.material}`) : null}
          />
          <Feld label={`${t('verkauf.besichtigung.anschluss')} (A)`} wert={b.anschluss} />
          <Feld label={`${t('verkauf.besichtigung.verbrauch')} (kWh)`} wert={b.verbrauch} />
        </div>
      </Abschnitt>

      <Abschnitt titel={t('verkauf.terminblatt.notizen')}>
        <div style={{ border: '1px solid #999', padding: 6, minHeight: 90, whiteSpace: 'pre-wrap' }}>
          {notizen.join('\n')}
          {verlauf.length > 0 && (
            <div style={{ marginTop: 6, fontSize: 10, color: '#333' }}>
              {verlauf.slice(0, 5).map((v) => (
                <div key={v.id}>
                  {formatDatum(v.zeitpunkt)} · {v.art}: {(v.text ?? '').replace(/\s+/g, ' ').slice(0, 160)}
                </div>
              ))}
            </div>
          )}
        </div>
      </Abschnitt>
      <Abschnitt titel={t('verkauf.terminblatt.naechste')}>
        <div style={RASTER}>
          <Feld label={t('verkauf.terminblatt.entscheidBis')} />
          <Feld label={t('verkauf.terminblatt.nachfassenAm')} />
        </div>
      </Abschnitt>
    </div>,
    document.body,
  )
}
