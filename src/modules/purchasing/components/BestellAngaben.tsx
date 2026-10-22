import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AkteAbschnitt, Angabe } from '@/components/shared/AkteAbschnitt'
import { Input, Textarea } from '@/components/ui/input'
import { formatDatum, formatDatumZeit } from '@/lib/format'
import { useAktion } from '../hooks/useAktion'
import { bestellungAendern } from '../services/bestellungen'
import type { Bestellung } from '../types'

/**
 * Angaben einer Bestellung. Liefertermin lässt sich bis zur Lieferung ändern (Bestätigung des Lieferanten),
 * die Notiz bis zum Bestellen (sie steht im PDF).
 */
export function BestellAngaben({ bestellung: b }: { bestellung: Bestellung }) {
  const { t } = useTranslation()
  const { aus } = useAktion()
  const [notiz, setNotiz] = useState(b.notiz ?? '')
  const terminOffen = !['geliefert', 'storniert'].includes(b.status)
  const notizOffen = b.status === 'entwurf' || b.status === 'freigegeben'
  const ziel = b.lagerort_id
    ? [b.lagerort, b.lagerort_adresse].filter(Boolean).join(', ')
    : [t('einkauf.baustelle'), b.objekt_strasse, [b.objekt_plz, b.objekt_ort].filter(Boolean).join(' ')]
        .filter(Boolean)
        .join(', ')

  return (
    <AkteAbschnitt titel={t('einkauf.akte.angaben')}>
      <dl>
        <Angabe label={t('einkauf.feld.lieferant')}>
          {b.lieferant}
          {b.email_bestellung && <span className="text-muted-foreground block text-xs">{b.email_bestellung}</span>}
        </Angabe>
        <Angabe label={t('einkauf.feld.ziel')}>{ziel}</Angabe>
        {b.projekt_id && (
          <Angabe label={t('einkauf.feld.projekt')}>
            <a href={`#/projects?projekt=${b.projekt_id}`} className="text-accent-ink underline">
              {b.projekt_nummer}
            </a>
            {b.kunde && <span className="text-muted-foreground"> · {b.kunde}</span>}
          </Angabe>
        )}
        <Angabe label={t('einkauf.feld.liefertermin')}>
          {terminOffen ? (
            <Input
              type="date"
              aria-label={t('einkauf.feld.liefertermin')}
              className="w-44"
              defaultValue={b.liefertermin ?? ''}
              onBlur={(e) => {
                const wert = e.target.value || null
                if (wert !== b.liefertermin) void aus(() => bestellungAendern(b.id, { liefertermin: wert }))
              }}
            />
          ) : b.liefertermin ? (
            formatDatum(b.liefertermin)
          ) : (
            '–'
          )}
        </Angabe>
        {b.freigegeben_am && (
          <Angabe label={t('einkauf.feld.freigegeben')}>
            {[formatDatumZeit(b.freigegeben_am), b.freigegeben_von].filter(Boolean).join(' · ')}
          </Angabe>
        )}
        {b.bestellt_am && <Angabe label={t('einkauf.feld.bestelltAm')}>{formatDatum(b.bestellt_am)}</Angabe>}
        {b.geliefert_am && <Angabe label={t('einkauf.feld.geliefertAm')}>{formatDatum(b.geliefert_am)}</Angabe>}
        {b.storniert_grund && <Angabe label={t('einkauf.feld.stornoGrund')}>{b.storniert_grund}</Angabe>}
      </dl>
      {notizOffen ? (
        <Textarea
          className="mt-2"
          rows={2}
          aria-label={t('einkauf.feld.notiz')}
          placeholder={t('einkauf.feld.notizPlatzhalter')}
          value={notiz}
          onChange={(e) => {
            setNotiz(e.target.value)
          }}
          onBlur={() => {
            if (notiz.trim() !== (b.notiz ?? ''))
              void aus(() => bestellungAendern(b.id, { notiz: notiz.trim() || null }))
          }}
        />
      ) : (
        b.notiz && <p className="bg-muted/60 mt-2 rounded-md p-3 text-sm whitespace-pre-wrap">{b.notiz}</p>
      )}
    </AkteAbschnitt>
  )
}
