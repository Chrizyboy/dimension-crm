import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { useAuswahl } from '@/hooks/useAuswahl'
import { formatChf, formatDatum } from '@/lib/format'
import { useNamen } from '../hooks/useRessourcen'
import { serviceKmStand } from '../lib/fristen'
import type { Fahrzeug } from '../types'
import { Box, Zeile } from './Box'
import { FristBadge } from './FristBadge'

const chf = (r: number | null) => (r === null ? null : formatChf(r, { mitWaehrung: true }))
const kg = (x: number | null) => (x === null ? null : `${x.toLocaleString('de-CH')} kg`)
const datum = (d: string | null) => (d ? formatDatum(d) : null)

/** Alle Fristen eines Fahrzeugs: MFK, Service (Datum oder km), Reifen, Vignette, Leasing-Ende. */
export function FristenBox({ f }: { f: Fahrzeug }) {
  const { t } = useTranslation()
  const km = serviceKmStand(f.km_stand, f.service_km)
  const anhaenger = f.art === 'anhaenger'
  return (
    <Box titel={t('fuhrpark.akte.fristen')}>
      <dl className="flex flex-col gap-1.5">
        <Zeile label={t('fuhrpark.spalte.mfk')}>
          <FristBadge datum={f.naechste_mfk} />
        </Zeile>
        {!anhaenger && (
          <Zeile label={t('fuhrpark.spalte.service')}>
            <span className="flex flex-wrap items-center gap-1.5">
              <FristBadge datum={f.naechster_service} />
              {f.service_km !== null && (
                <Badge ton={km === 'ok' ? 'neutral' : km === 'bald' ? 'warnung' : 'kritisch'} className="zahlen">
                  {t('fuhrpark.akte.beiKm', { km: f.service_km.toLocaleString('de-CH') })}
                </Badge>
              )}
            </span>
          </Zeile>
        )}
        {!anhaenger && (
          <Zeile label={t('fuhrpark.spalte.km')}>
            {f.km_stand !== null
              ? `${f.km_stand.toLocaleString('de-CH')} km${f.km_stand_am ? ` (${formatDatum(f.km_stand_am)})` : ''}`
              : null}
          </Zeile>
        )}
        <Zeile label={t('fuhrpark.feld.naechster_reifenwechsel')}>
          <FristBadge datum={f.naechster_reifenwechsel} />
        </Zeile>
        {!anhaenger && (
          <Zeile label={t('fuhrpark.feld.vignette_bis')}>
            <FristBadge datum={f.vignette_bis} />
          </Zeile>
        )}
        {f.leasing_bis && (
          <Zeile label={t('fuhrpark.feld.leasing_bis')}>
            <FristBadge datum={f.leasing_bis} vorlauf={90} />
          </Zeile>
        )}
      </dl>
    </Box>
  )
}

/** Technische und organisatorische Angaben: Art, Gewichte, nötiger Ausweis, Tankkarte, Schlüssel, Reifen. */
export function AngabenBox({ f, onBearbeiten }: { f: Fahrzeug; onBearbeiten: () => void }) {
  const { t } = useTranslation()
  const namen = useNamen()
  const art = useAuswahl('fahrzeugart')
  const ausweis = useAuswahl('qualifikation')
  return (
    <Box
      titel={t('fuhrpark.akte.angaben')}
      rechts={
        <button type="button" className="text-accent-ink underline" onClick={onBearbeiten}>
          {t('fuhrpark.akte.bearbeiten')}
        </button>
      }
    >
      <dl className="flex flex-col gap-1.5">
        <Zeile label={t('fuhrpark.feld.art')}>{art.text(f.art)}</Zeile>
        <Zeile label={t('fuhrpark.spalte.faehrt')}>{namen.person(f.person_id)}</Zeile>
        <Zeile label={t('fuhrpark.feld.standort')}>{namen.standort(f.standort_id)}</Zeile>
        <Zeile label={t('fuhrpark.feld.treibstoff')}>
          {f.treibstoff ? t(`fuhrpark.treibstoff.${f.treibstoff}`) : null}
        </Zeile>
        <Zeile label={t('fuhrpark.feld.erste_inverkehrsetzung')}>{datum(f.erste_inverkehrsetzung)}</Zeile>
        <Zeile label={t('fuhrpark.feld.stammnummer')}>{f.stammnummer}</Zeile>
        <Zeile label={t('fuhrpark.feld.fahrgestell_nr')}>{f.fahrgestell_nr}</Zeile>
        <Zeile label={t('fuhrpark.feld.gesamtgewicht_kg')}>
          {[
            kg(f.gesamtgewicht_kg),
            f.nutzlast_kg !== null ? t('fuhrpark.akte.nutzlast', { kg: kg(f.nutzlast_kg) }) : null,
          ]
            .filter(Boolean)
            .join(' · ') || null}
        </Zeile>
        <Zeile label={t('fuhrpark.feld.anhaengelast_kg')}>{kg(f.anhaengelast_kg)}</Zeile>
        <Zeile label={t('fuhrpark.feld.ausweis')}>{f.ausweis ? ausweis.text(f.ausweis) : null}</Zeile>
        <Zeile label={t('fuhrpark.feld.tankkarte')}>{f.tankkarte}</Zeile>
        <Zeile label={t('fuhrpark.feld.schluessel')}>{f.schluessel}</Zeile>
        <Zeile label={t('fuhrpark.feld.reifen')}>{f.reifen}</Zeile>
        {f.privat_anteil && <Zeile label={t('fuhrpark.feld.privat_anteil')}>{t('fuhrpark.ja')}</Zeile>}
        {f.notiz && <Zeile label={t('fuhrpark.feld.notiz')}>{f.notiz}</Zeile>}
      </dl>
    </Box>
  )
}

/** Versicherung mit Police, Deckung, Selbstbehalt und Schadennummer (für den Unfall am Handy). */
export function VersicherungBox({ f }: { f: Fahrzeug }) {
  const { t } = useTranslation()
  return (
    <Box titel={t('fuhrpark.akte.versicherung')}>
      <dl className="flex flex-col gap-1.5">
        <Zeile label={t('fuhrpark.feld.versicherung')}>{f.versicherung}</Zeile>
        <Zeile label={t('fuhrpark.feld.versicherung_police')}>{f.versicherung_police}</Zeile>
        <Zeile label={t('fuhrpark.feld.versicherung_deckung')}>{f.versicherung_deckung}</Zeile>
        <Zeile label={t('fuhrpark.feld.selbstbehalt')}>{chf(f.selbstbehalt_rappen)}</Zeile>
        <Zeile label={t('fuhrpark.feld.schaden_telefon')}>
          {f.schaden_telefon && (
            <a className="text-accent-ink underline" href={`tel:${f.schaden_telefon.replace(/\s/g, '')}`}>
              {f.schaden_telefon}
            </a>
          )}
        </Zeile>
        <Zeile label={t('fuhrpark.feld.praemie')}>{chf(f.praemie_rappen)}</Zeile>
        <Zeile label={t('fuhrpark.feld.verkehrssteuer')}>{chf(f.verkehrssteuer_rappen)}</Zeile>
      </dl>
    </Box>
  )
}
