import { useTranslation } from 'react-i18next'
import { formatChf, parseChf } from '@/lib/format'
import { useAktion } from '../hooks/useAktion'
import { eingangSpeichern, inPapierkorb } from '../services/finanzen'
import { WAHRSCHEINLICHKEITEN, type Eingang } from '../types'
import { EintragDialog } from './EintragDialog'

/** Erwarteten Eingang von Hand erfassen oder ändern (z. B. Förderbeitrag, Rückerstattung). */
export function EingangDialog({ eingang: e, onSchliessen }: { eingang: Eingang | null; onSchliessen: () => void }) {
  const { t } = useTranslation()
  const { laeuft, aus } = useAktion()
  const speichern = async (w: Record<string, string>) => {
    const ok = await aus(
      () =>
        eingangSpeichern(e?.id ?? null, {
          kunde: w.kunde?.trim() ?? '',
          text: w.text?.trim() || null,
          betrag_rappen: parseChf(w.betrag ?? '') ?? 0,
          erwartet_am: w.erwartet_am || null,
          wahrscheinlichkeit: w.wahrscheinlichkeit || 'wahrscheinlich',
          geprueft: true,
        }),
      { de: 'Gespeichert', fr: 'Enregistré' },
    )
    if (ok) onSchliessen()
  }
  return (
    <EintragDialog
      titel={e ? t('finanzen.eingang.bearbeiten') : t('finanzen.eingang.neu')}
      laeuft={laeuft}
      onSchliessen={onSchliessen}
      onSpeichern={(w) => void speichern(w)}
      {...(e
        ? {
            onPapierkorb: () =>
              void aus(() => inPapierkorb('eingang', e.id), { de: 'Im Papierkorb', fr: 'Dans la corbeille' }).then(
                (ok) => {
                  if (ok) onSchliessen()
                },
              ),
          }
        : {})}
      start={{
        kunde: e?.kunde ?? '',
        text: e?.text ?? '',
        betrag: e?.betrag_rappen ? formatChf(e.betrag_rappen) : '',
        erwartet_am: e?.erwartet_am ?? '',
        wahrscheinlichkeit: e?.wahrscheinlichkeit ?? 'wahrscheinlich',
      }}
      felder={[
        { name: 'kunde', label: t('finanzen.eingang.von'), art: 'text', pflicht: true },
        { name: 'betrag', label: t('finanzen.betrag'), art: 'chf', pflicht: true },
        { name: 'text', label: t('finanzen.text'), art: 'text', breit: true },
        { name: 'erwartet_am', label: t('finanzen.eingang.erwartetAm'), art: 'datum' },
        {
          name: 'wahrscheinlichkeit',
          label: t('finanzen.prob.titel'),
          art: 'auswahl',
          optionen: WAHRSCHEINLICHKEITEN.map((p) => ({ wert: p, text: t(`finanzen.prob.${p}`) })),
        },
      ]}
    />
  )
}
