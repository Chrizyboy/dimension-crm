import { ExternalLink } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AkteAbschnitt, Angabe } from '@/components/shared/AkteAbschnitt'
import { KiAkteAbschnitt } from '@/components/shared/ki/KiAkteAbschnitt'
import { Auswahl } from '@/components/ui/auswahl'
import { Input } from '@/components/ui/input'
import { formatChf, formatDatum, formatTelefon } from '@/lib/format'
import { useAktion } from '../hooks/useAktion'
import { useStandorte } from '../hooks/useProjekte'
import { anlageKurz, ortZeile } from '../lib/anzeige'
import { projektAendern } from '../services/projekte'
import type { Projekt } from '../types'
import { FahrplanBalken } from './FahrplanBalken'

type TextFeld = 'elektriker' | 'architekt'

/**
 * Übersicht der Akte: Kunde und Baustelle, Anlage aus der Offerte, Vertrag, Fahrplan-Stand und die
 * Angaben, die die Bauplanung pflegt (Standort, Elektriker, Architekt, Werktage). Gespeichert wird beim
 * Verlassen des Felds.
 */
export function AkteUebersicht({ projekt: p }: { projekt: Projekt }) {
  const { t } = useTranslation()
  const { aus } = useAktion()
  const standorte = useStandorte()
  const [w, setW] = useState({
    elektriker: p.elektriker ?? '',
    architekt: p.architekt ?? '',
    werktage: p.werktage != null ? String(p.werktage) : '',
  })

  const sichern = (f: TextFeld) => {
    const v = w[f].trim()
    if (v === (p[f] ?? '')) return
    void aus(() => projektAendern(p.id, { [f]: v || null }))
  }
  const text = (f: TextFeld) => (
    <Input
      aria-label={t(`projekte.feld.${f}`)}
      value={w[f]}
      onChange={(e) => {
        setW({ ...w, [f]: e.target.value })
      }}
      onBlur={() => {
        sichern(f)
      }}
    />
  )

  return (
    <div className="flex flex-col">
      <div className="pb-3">
        <FahrplanBalken stand={p.stand} gross />
      </div>
      <KiAkteAbschnitt
        bezug={{ tabelle: 'projekte', id: p.id }}
        art="auftrag"
        mail={{ kontakt_id: p.kontakt_id, projekt_id: p.id }}
      />
      <AkteAbschnitt titel={t('projekte.akte.kunde')}>
        <dl>
          <Angabe label={t('projekte.spalte.kunde')}>
            <a
              href={`#/customers?kunde=${p.kontakt_id}`}
              className="text-accent-ink inline-flex items-center gap-1 underline"
            >
              {p.kunde}
              <ExternalLink className="size-3.5" aria-hidden="true" />
            </a>
          </Angabe>
          <Angabe label={t('projekte.feld.baustelle')}>
            {[p.strasse, ortZeile(p)].filter(Boolean).join(', ') || '–'}
          </Angabe>
          {p.telefon && (
            <Angabe label={t('projekte.feld.telefon')}>
              <a href={`tel:${p.telefon}`} className="underline">
                {formatTelefon(p.telefon)}
              </a>
            </Angabe>
          )}
          {p.email && (
            <Angabe label={t('projekte.feld.email')}>
              <a href={`mailto:${p.email}`} className="underline">
                {p.email}
              </a>
            </Angabe>
          )}
          <Angabe label={t('projekte.feld.sprache')}>{p.sprache.toUpperCase()}</Angabe>
        </dl>
      </AkteAbschnitt>
      <AkteAbschnitt titel={t('projekte.akte.anlage')}>
        <dl>
          <Angabe label={t('projekte.feld.anlage')}>{anlageKurz(p, t) || '–'}</Angabe>
          {p.batterie && <Angabe label={t('projekte.feld.batterie')}>{p.batterie}</Angabe>}
          <Angabe label={t('projekte.feld.unterzeichnet')}>
            {p.unterzeichnet_am ? formatDatum(p.unterzeichnet_am) : '–'}
          </Angabe>
          <Angabe label={t('projekte.spalte.wert')}>
            {p.vertragswert_rappen ? formatChf(p.vertragswert_rappen, { mitWaehrung: true }) : '–'}
          </Angabe>
          <Angabe label={t('projekte.feld.baubeginn')}>{p.baubeginn ? formatDatum(p.baubeginn) : '–'}</Angabe>
          {p.verantwortlich && <Angabe label={t('projekte.feld.verantwortlich')}>{p.verantwortlich}</Angabe>}
        </dl>
      </AkteAbschnitt>
      <AkteAbschnitt titel={t('projekte.akte.planung')}>
        <dl>
          <Angabe label={t('projekte.feld.standort')}>
            <Auswahl
              aria-label={t('projekte.feld.standort')}
              value={p.standort_id ?? ''}
              onValueChange={(v) => {
                void aus(() => projektAendern(p.id, { standort_id: v }))
              }}
              optionen={(standorte.data ?? []).map((s) => ({ wert: s.id, text: s.name }))}
            />
          </Angabe>
          <Angabe label={t('projekte.feld.elektriker')}>{text('elektriker')}</Angabe>
          <Angabe label={t('projekte.feld.architekt')}>{text('architekt')}</Angabe>
          <Angabe label={t('projekte.feld.werktage')}>
            <Input
              aria-label={t('projekte.feld.werktage')}
              type="number"
              min={1}
              step={0.5}
              value={w.werktage}
              onChange={(e) => {
                setW({ ...w, werktage: e.target.value })
              }}
              onBlur={() => {
                const n = w.werktage === '' ? null : Number(w.werktage)
                if (n !== p.werktage && (n === null || n > 0)) void aus(() => projektAendern(p.id, { werktage: n }))
              }}
            />
          </Angabe>
        </dl>
      </AkteAbschnitt>
    </div>
  )
}
