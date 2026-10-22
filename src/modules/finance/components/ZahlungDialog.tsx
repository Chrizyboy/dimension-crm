import { useTranslation } from 'react-i18next'
import { formatChf, parseChf } from '@/lib/format'
import { useAktion } from '../hooks/useAktion'
import { useProjekte } from '../hooks/useFinanzen'
import { inPapierkorb, zahlungSpeichern } from '../services/finanzen'
import { PRIORITAETEN, ZAHLUNG_KATEGORIEN, type Zahlung } from '../types'
import { EintragDialog } from './EintragDialog'

const KEIN = '-'

/**
 * Zahlung erfassen oder ändern (V233 «+ Zahlung»): Firma, Betrag, fällig, geplant, Dringlichkeit bis
 * «Betreibung droht», Projekt (für die Nachkalkulation). Speichern gilt als geprüft (Daten aus Excel).
 */
export function ZahlungDialog({ zahlung: z, onSchliessen }: { zahlung: Zahlung | null; onSchliessen: () => void }) {
  const { t } = useTranslation()
  const { laeuft, aus } = useAktion()
  const projekte = useProjekte()
  const speichern = async (w: Record<string, string>) => {
    const betrag = parseChf(w.betrag ?? '') ?? 0
    const ok = await aus(
      () =>
        zahlungSpeichern(z?.id ?? null, {
          firma: w.firma?.trim() ?? '',
          text: w.text?.trim() || null,
          kategorie: w.kategorie || null,
          rechnung_nr: w.rechnung_nr?.trim() || null,
          betrag_rappen: betrag,
          // Teilzahlungen aus AbaNinja behalten ihren offenen Betrag; sonst ist offen = Betrag.
          offen_rappen: z?.abaninja_uuid ? z.offen_rappen : betrag,
          faellig_am: w.faellig_am || null,
          geplant_am: w.geplant_am || null,
          prioritaet: w.prioritaet || 'normal',
          projekt_id: w.projekt && w.projekt !== KEIN ? w.projekt : null,
          notiz: w.notiz?.trim() || null,
          geprueft: true,
        }),
      { de: 'Gespeichert', fr: 'Enregistré' },
    )
    if (ok) onSchliessen()
  }
  return (
    <EintragDialog
      titel={z ? t('finanzen.zahlungBearbeiten') : t('finanzen.zahlungNeu')}
      {...(z?.abaninja_uuid ? { beschreibung: t('finanzen.ausAbaninja') } : {})}
      laeuft={laeuft}
      onSchliessen={onSchliessen}
      onSpeichern={(w) => void speichern(w)}
      {...(z
        ? {
            onPapierkorb: () =>
              void aus(() => inPapierkorb('zahlung', z.id), { de: 'Im Papierkorb', fr: 'Dans la corbeille' }).then(
                (ok) => {
                  if (ok) onSchliessen()
                },
              ),
          }
        : {})}
      start={{
        firma: z?.firma ?? '',
        text: z?.text ?? '',
        kategorie: z?.kategorie ?? 'Lieferant',
        rechnung_nr: z?.rechnung_nr ?? '',
        betrag: z?.betrag_rappen ? formatChf(z.betrag_rappen) : '',
        faellig_am: z?.faellig_am ?? '',
        geplant_am: z?.geplant_am ?? '',
        prioritaet: z?.prioritaet ?? 'normal',
        projekt: z?.projekt_id ?? KEIN,
        notiz: z?.notiz ?? '',
      }}
      felder={[
        { name: 'firma', label: t('finanzen.firma'), art: 'text', pflicht: true },
        { name: 'betrag', label: t('finanzen.betrag'), art: 'chf', pflicht: true },
        { name: 'text', label: t('finanzen.text'), art: 'text', breit: true },
        {
          name: 'kategorie',
          label: t('finanzen.kategorie'),
          art: 'auswahl',
          optionen: [...new Set([...ZAHLUNG_KATEGORIEN, z?.kategorie ?? 'Lieferant'])].map((k) => ({
            wert: k,
            text: k,
          })),
        },
        { name: 'rechnung_nr', label: t('finanzen.rechnungNr'), art: 'text' },
        { name: 'faellig_am', label: t('finanzen.faelligAm'), art: 'datum' },
        { name: 'geplant_am', label: t('finanzen.geplantAm'), art: 'datum', hinweis: t('finanzen.geplantHinweis') },
        {
          name: 'prioritaet',
          label: t('finanzen.dringlichkeit'),
          art: 'auswahl',
          optionen: PRIORITAETEN.map((p) => ({ wert: p, text: t(`finanzen.prio.${p}`) })),
        },
        {
          name: 'projekt',
          label: t('finanzen.projekt'),
          art: 'auswahl',
          optionen: [
            { wert: KEIN, text: t('finanzen.keinProjekt') },
            ...(projekte.data ?? []).map((p) => ({
              wert: p.id,
              text: [p.nummer, p.kunde].filter(Boolean).join(' · '),
            })),
          ],
        },
        { name: 'notiz', label: t('finanzen.notiz'), art: 'notiz' },
      ]}
    />
  )
}
