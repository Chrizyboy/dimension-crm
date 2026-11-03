import { useTranslation } from 'react-i18next'
import { formatChf, parseChf } from '@/lib/format'
import { useAktion } from '../hooks/useAktion'
import { mwstErfassen } from '../services/ablaeufe'
import type { Finanzdaten, MwstZeile } from '../types'
import { EintragDialog } from './EintragDialog'

/**
 * MWST einer Periode: Die App schätzt aus Rechnungen und Lieferantenrechnungen; abgerechnet wird in AbaNinja.
 * Hier trägt die Buchhaltung den verbindlichen Betrag ein (ersetzt die Schätzung in der Liquidität) und meldet die
 * Zahlung.
 */
export function MwstDialog({
  zeile: m,
  daten,
  onSchliessen,
}: {
  zeile: MwstZeile
  daten: Finanzdaten
  onSchliessen: () => void
}) {
  const { t } = useTranslation()
  const { laeuft, aus } = useAktion()
  const firma = daten.firmen.find((f) => f.id === m.firma_id)?.name ?? ''

  const speichern = async (w: Record<string, string>) => {
    const ok = await aus(
      () =>
        mwstErfassen({
          firma_id: m.firma_id,
          periode: m.periode,
          betrag_rappen: parseChf(w.betrag ?? '') ?? 0,
          faellig_am: w.faellig || m.faellig_am,
          bezahlt_am: w.bezahlt || null,
        }),
      { de: 'MWST gespeichert', fr: 'TVA enregistrée' },
    )
    if (ok) onSchliessen()
  }

  return (
    <EintragDialog
      titel={t('finanzen.mwst.titelPeriode', { periode: m.periode, firma })}
      beschreibung={t('finanzen.mwst.dialogText', {
        umsatz: formatChf(m.umsatzsteuer_rappen, { mitWaehrung: true }),
        vorsteuer: formatChf(m.vorsteuer_rappen, { mitWaehrung: true }),
      })}
      laeuft={laeuft}
      onSchliessen={onSchliessen}
      onSpeichern={(w) => void speichern(w)}
      start={{
        betrag: formatChf(m.zahllast_rappen),
        faellig: m.faellig_am,
        bezahlt: m.bezahlt_am ?? '',
      }}
      felder={[
        {
          name: 'betrag',
          label: t('finanzen.mwst.verbindlich'),
          art: 'chf',
          pflicht: true,
          hinweis: t('finanzen.mwst.verbindlichHinweis'),
        },
        { name: 'faellig', label: t('finanzen.mwst.faellig'), art: 'datum', pflicht: true },
        { name: 'bezahlt', label: t('finanzen.mwst.bezahltAm'), art: 'datum' },
      ]}
    />
  )
}
