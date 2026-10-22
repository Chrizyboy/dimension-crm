import { useTranslation } from 'react-i18next'
import { formatChf } from '@/lib/format'
import { useAktion } from '../hooks/useAktion'
import { einstellungenSpeichern } from '../services/finanzen'
import { WAHRSCHEINLICHKEITEN, type Bewegung, type LiquiditaetEinstellungen, type Wahrscheinlichkeit } from '../types'
import { EintragDialog } from './EintragDialog'

/**
 * Eingang aus dem CRM anpassen (V233 «Anpassen»): Wahrscheinlichkeit und erwartetes Datum nur für die
 * Vorschau; die Rechnung oder Tranche selbst bleibt unverändert. Leeres Datum = Fälligkeit.
 */
export function AnpassenDialog({
  bewegung: b,
  einstellungen,
  onSchliessen,
}: {
  bewegung: Bewegung
  einstellungen: LiquiditaetEinstellungen
  onSchliessen: () => void
}) {
  const { t } = useTranslation()
  const { laeuft, aus } = useAktion()
  const schluessel = `${b.quelle}:${b.id}`
  const alt = einstellungen.ov?.[schluessel] ?? {}
  const speichern = async (w: Record<string, string>) => {
    const neu = {
      ...(w.prob ? { prob: w.prob as Wahrscheinlichkeit } : {}),
      ...(w.datum ? { date: w.datum } : {}),
    }
    const ov = { ...(einstellungen.ov ?? {}), [schluessel]: neu }
    const ok = await aus(() => einstellungenSpeichern(einstellungen, { ov }), { de: 'Angepasst', fr: 'Adapté' })
    if (ok) onSchliessen()
  }
  return (
    <EintragDialog
      titel={t('finanzen.anpassen.titel')}
      beschreibung={`${b.titel} · ${b.zusatz} · ${formatChf(b.rappen, { mitWaehrung: true })}`}
      laeuft={laeuft}
      onSchliessen={onSchliessen}
      onSpeichern={(w) => void speichern(w)}
      start={{ prob: alt.prob ?? b.wahrscheinlichkeit, datum: alt.date ?? '' }}
      felder={[
        {
          name: 'prob',
          label: t('finanzen.prob.titel'),
          art: 'auswahl',
          optionen: WAHRSCHEINLICHKEITEN.map((p) => ({ wert: p, text: t(`finanzen.prob.${p}`) })),
        },
        { name: 'datum', label: t('finanzen.anpassen.datum'), art: 'datum', hinweis: t('finanzen.anpassen.hinweis') },
      ]}
    />
  )
}
