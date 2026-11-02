import { useTranslation } from 'react-i18next'
import { formatChf, parseChf } from '@/lib/format'
import { useAktion } from '../hooks/useAktion'
import { kontoSpeichern } from '../services/ablaeufe'
import { einstellungenSpeichern } from '../services/finanzen'
import type { Finanzdaten, Konto } from '../types'
import { EintragDialog } from './EintragDialog'

/**
 * Bankkonto einer Gesellschaft anlegen oder ändern. Der Stand kommt normalerweise aus dem Kontoauszug (camt.053);
 * von Hand nur, wenn die Bank keinen Auszug liefert. Die Reserve gilt für die ganze Gesellschaft und ist die
 * Warnschwelle in Cockpit und Liquidität. Nicht mehr gebrauchte Konten werden «nicht aktiv», nie gelöscht.
 */
export function KontoDialog({
  konto: k,
  firma,
  daten,
  onSchliessen,
}: {
  konto: Konto | null
  firma: string | null
  daten: Finanzdaten
  onSchliessen: () => void
}) {
  const { t } = useTranslation()
  const { laeuft, aus } = useAktion()
  const e = daten.einstellungen
  const firmaStart = k?.firma_id ?? firma ?? daten.firmen[0]?.id ?? ''
  const reserveStart = e.reserve_je_firma?.[firmaStart]

  const speichern = async (w: Record<string, string>) => {
    const firmaId = w.firma ?? firmaStart
    const ok = await aus(
      async () => {
        await kontoSpeichern(k?.id ?? null, {
          firma_id: firmaId,
          name: w.name?.trim() ?? '',
          iban: w.iban?.replace(/\s+/g, '').toUpperCase() || null,
          stand_rappen: parseChf(w.stand ?? ''),
          stand_am: w.stand_am || null,
          aktiv: w.aktiv !== 'nein',
        })
        const reserve = parseChf(w.reserve ?? '')
        if (reserve !== (e.reserve_je_firma?.[firmaId] ?? null))
          await einstellungenSpeichern(e, {
            reserve_je_firma: { ...(e.reserve_je_firma ?? {}), [firmaId]: reserve ?? 0 },
          })
      },
      { de: 'Konto gespeichert', fr: 'Compte enregistré' },
    )
    if (ok) onSchliessen()
  }

  return (
    <EintragDialog
      titel={k ? t('finanzen.konto.bearbeiten') : t('finanzen.konto.neu')}
      beschreibung={t('finanzen.konto.beschreibung')}
      laeuft={laeuft}
      onSchliessen={onSchliessen}
      onSpeichern={(w) => void speichern(w)}
      start={{
        firma: firmaStart,
        name: k?.name ?? '',
        iban: k?.iban ?? '',
        stand: k?.stand_rappen !== null && k?.stand_rappen !== undefined ? formatChf(k.stand_rappen) : '',
        stand_am: k?.stand_am ?? '',
        reserve: reserveStart ? formatChf(reserveStart) : '',
        aktiv: k?.aktiv === false ? 'nein' : 'ja',
      }}
      felder={[
        {
          name: 'firma',
          label: t('finanzen.gesellschaft'),
          art: 'auswahl',
          pflicht: true,
          optionen: daten.firmen.map((f) => ({ wert: f.id, text: f.name })),
        },
        {
          name: 'name',
          label: t('finanzen.konto.name'),
          art: 'text',
          pflicht: true,
          hinweis: t('finanzen.konto.nameHinweis'),
        },
        { name: 'iban', label: 'IBAN', art: 'text', breit: true, hinweis: t('finanzen.konto.ibanHinweis') },
        { name: 'stand', label: t('finanzen.konto.stand'), art: 'chf' },
        { name: 'stand_am', label: t('finanzen.konto.standAm'), art: 'datum' },
        {
          name: 'reserve',
          label: t('finanzen.konto.reserve'),
          art: 'chf',
          hinweis: t('finanzen.konto.reserveHinweis'),
        },
        {
          name: 'aktiv',
          label: t('finanzen.fix.aktiv'),
          art: 'auswahl',
          optionen: [
            { wert: 'ja', text: t('finanzen.ja') },
            { wert: 'nein', text: t('finanzen.nein') },
          ],
        },
      ]}
    />
  )
}
