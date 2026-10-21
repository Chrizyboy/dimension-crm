import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { useAuswahl } from '@/hooks/useAuswahl'
import { formatDatum, formatTelefon } from '@/lib/format'
import { adresseEinzeilig, formatKundennummer } from '@/lib/kontakt'
import type { Kontaktzeile } from '@/types/kontakt'
import { terminText } from '../lib/anzeige'
import type { Kundenakte } from '../types'

/** Ein Feld mit Beschriftung und Wert; leer bleibt eine Linie zum Ausfüllen von Hand. */
function Feld({ label, wert }: { label: string; wert?: string | null | undefined }) {
  return (
    <div style={{ borderBottom: '1px solid #999', padding: '4px 0', minHeight: 34 }}>
      <div style={{ fontSize: 9, textTransform: 'uppercase', color: '#555' }}>{label}</div>
      <div style={{ fontSize: 12 }}>{wert || ' '}</div>
    </div>
  )
}

/** Ankreuzfeld wie auf dem Papierblatt der Vorlage. */
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
    <section style={{ marginTop: 14, breakInside: 'avoid' }}>
      <h2 style={{ fontSize: 12, fontWeight: 700, borderBottom: '2px solid #000', paddingBottom: 2, marginBottom: 6 }}>
        {titel}
      </h2>
      {children}
    </section>
  )
}

const RASTER = { display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: 18 } as const

/**
 * Kundenblatt zum Drucken (V233 «Kundenblatt drucken/speichern»): Kontaktdaten, Gebäude und
 * Interesse aus der Anfrage, dazu leere Felder für die Besichtigung vor Ort. Als PDF speichern
 * geht über den Druckdialog («Als PDF sichern»). Feste Farben sind hier Absicht: Papier ist weiss.
 */
export function Kundenblatt({ kopf, akte }: { kopf: Kontaktzeile; akte: Kundenakte }) {
  const { t } = useTranslation()
  const gebaeudeart = useAuswahl('gebaeudeart')
  const dachform = useAuswahl('dachform')
  const eigentum = useAuswahl('eigentum')
  const quelle = useAuswahl('quelle')
  const lead = akte.verkaufschancen.at(0)
  const objekt = akte.objekte.find((o) => o.id === lead?.objekt_id) ?? akte.objekte.at(0)
  const k = akte.kontakt

  return createPortal(
    <div className="druckbereich" style={{ fontFamily: 'Arial, sans-serif', fontSize: 12 }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <h1 style={{ fontSize: 18, fontWeight: 700 }}>
          {t('kundenblatt.titel')} – {kopf.name}
        </h1>
        <span style={{ fontSize: 10 }}>
          {formatKundennummer(kopf.kundennummer)} · {formatDatum(new Date())}
        </span>
      </header>

      <Abschnitt titel={t('akte.kontaktdaten')}>
        <div style={RASTER}>
          <Feld
            label={t('akte.feld.name')}
            wert={[k.anrede, k.vorname, k.nachname].filter(Boolean).join(' ') || k.firma}
          />
          <Feld label={t('akte.feld.adresse')} wert={adresseEinzeilig(objekt ?? kopf)} />
          <Feld label={t('akte.feld.telefon')} wert={k.telefon && formatTelefon(k.telefon)} />
          <Feld label={t('akte.feld.email')} wert={k.email} />
          <Feld label={t('kundenblatt.termin')} wert={terminText(lead?.termin_am)} />
          <Feld label={t('kundenblatt.zustaendig')} wert={lead?.zustaendig} />
        </div>
      </Abschnitt>

      <Abschnitt titel={t('kundenblatt.gebaeude')}>
        <p style={{ margin: '4px 0' }}>
          {gebaeudeart.werte.map((w) => (
            <Kreuz key={w.schluessel} text={gebaeudeart.text(w.schluessel)} an={objekt?.gebaeudeart === w.schluessel} />
          ))}
        </p>
        <p style={{ margin: '4px 0' }}>
          {dachform.werte.map((w) => (
            <Kreuz key={w.schluessel} text={dachform.text(w.schluessel)} an={objekt?.dachform === w.schluessel} />
          ))}
        </p>
        <div style={RASTER}>
          <Feld label={t('akte.feld.eigentum')} wert={eigentum.text(objekt?.eigentum)} />
          <Feld label={t('kundenblatt.finanzierung')} wert={lead?.finanzierung} />
          <Feld label={t('kundenblatt.foerderung')} wert={lead?.foerderung} />
          <Feld label={t('kundenblatt.zeitraum')} wert={lead?.zeithorizont} />
          <Feld label={t('kundenblatt.erreichbarkeit')} wert={lead?.erreichbarkeit} />
          <Feld label={t('kundenblatt.quelle')} wert={quelle.text(lead?.quelle)} />
        </div>
      </Abschnitt>

      <Abschnitt titel={t('kundenblatt.pv')}>
        <p style={{ margin: '4px 0' }}>
          <Kreuz text={t('kundenblatt.ausrichtung')} />
          <Kreuz text={t('kundenblatt.neigung')} />
          <Kreuz text={t('kundenblatt.baujahr')} />
        </p>
        <p style={{ margin: '4px 0' }}>
          <Kreuz text={t('kundenblatt.aufgesetzt')} />
          <Kreuz text={t('kundenblatt.integriert')} />
          <Kreuz text={t('kundenblatt.geruest')} />
          <Kreuz text={t('kundenblatt.blitzableiter')} />
          <Kreuz text={t('kundenblatt.zaehler')} />
        </p>
        <div style={RASTER}>
          <Feld label={t('kundenblatt.leistung')} />
          <Feld label={t('kundenblatt.modell')} />
        </div>
      </Abschnitt>

      <Abschnitt titel={t('kundenblatt.batterie')}>
        <p style={{ margin: '4px 0' }}>
          <Kreuz text={t('kundenblatt.mitBatterie')} />
          <Kreuz text={t('kundenblatt.mitLadestation')} />
          <Kreuz text={t('kundenblatt.wechselrichter')} />
        </p>
        <div style={RASTER}>
          <Feld label={t('kundenblatt.pvBestehend')} />
          <Feld label={t('kundenblatt.speicher')} />
        </div>
      </Abschnitt>

      <Abschnitt titel={t('kundenblatt.kommentar')}>
        <p style={{ whiteSpace: 'pre-wrap', border: '1px solid #999', padding: 6, minHeight: 40 }}>
          {lead?.kommentar_kunde || k.notiz || '–'}
        </p>
      </Abschnitt>
      <Abschnitt titel={t('kundenblatt.bemerkungen')}>
        <div style={{ border: '1px solid #999', minHeight: 120 }} />
      </Abschnitt>
    </div>,
    document.body,
  )
}
