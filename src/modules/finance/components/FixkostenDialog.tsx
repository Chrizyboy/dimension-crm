import { useTranslation } from 'react-i18next'
import { formatChf, parseChf } from '@/lib/format'
import { useAktion } from '../hooks/useAktion'
import { fixkostenSpeichern, inPapierkorb } from '../services/finanzen'
import { FIX_GRUPPEN, type Fixkosten } from '../types'
import { EintragDialog } from './EintragDialog'

/** Fixkosten anlegen oder ändern; «nicht mehr aktiv» statt löschen, wenn sie aufhören (oder «bis»). */
export function FixkostenDialog({ fix: f, onSchliessen }: { fix: Fixkosten | null; onSchliessen: () => void }) {
  const { t } = useTranslation()
  const { laeuft, aus } = useAktion()
  const speichern = async (w: Record<string, string>) => {
    const ok = await aus(
      () =>
        fixkostenSpeichern(f?.id ?? null, {
          bezeichnung: w.bezeichnung?.trim() ?? '',
          gruppe: w.gruppe || null,
          detail: w.detail?.trim() || null,
          betrag_rappen: parseChf(w.betrag ?? '') ?? 0,
          rhythmus: w.rhythmus || 'monat',
          tag: Math.min(28, Math.max(1, Number(w.tag) || 25)),
          start_monat: w.rhythmus === 'monat' ? null : w.start_monat || null,
          ab: w.ab || null,
          bis: w.bis || null,
          standort: w.standort?.trim() || null,
          aktiv: w.aktiv !== 'nein',
          notiz: w.notiz?.trim() || null,
        }),
      { de: 'Gespeichert', fr: 'Enregistré' },
    )
    if (ok) onSchliessen()
  }
  return (
    <EintragDialog
      titel={f ? t('finanzen.fix.bearbeiten') : t('finanzen.fix.neu')}
      laeuft={laeuft}
      onSchliessen={onSchliessen}
      onSpeichern={(w) => void speichern(w)}
      {...(f
        ? {
            onPapierkorb: () =>
              void aus(() => inPapierkorb('fix', f.id), { de: 'Im Papierkorb', fr: 'Dans la corbeille' }).then((ok) => {
                if (ok) onSchliessen()
              }),
          }
        : {})}
      start={{
        bezeichnung: f?.bezeichnung ?? '',
        gruppe: f?.gruppe ?? 'Sonstiges',
        detail: f?.detail ?? '',
        betrag: f?.betrag_rappen ? formatChf(f.betrag_rappen) : '',
        rhythmus: f?.rhythmus ?? 'monat',
        tag: String(f?.tag ?? 25),
        start_monat: f?.start_monat ?? '1',
        ab: f?.ab ?? '',
        bis: f?.bis ?? '',
        standort: f?.standort ?? '',
        aktiv: f?.aktiv === false ? 'nein' : 'ja',
        notiz: f?.notiz ?? '',
      }}
      felder={[
        { name: 'bezeichnung', label: t('finanzen.fix.bezeichnung'), art: 'text', pflicht: true },
        {
          name: 'gruppe',
          label: t('finanzen.fix.gruppe'),
          art: 'auswahl',
          optionen: FIX_GRUPPEN.map((g) => ({ wert: g, text: g })),
        },
        { name: 'betrag', label: t('finanzen.betrag'), art: 'chf', pflicht: true },
        {
          name: 'rhythmus',
          label: t('finanzen.fix.rhythmusFeld'),
          art: 'auswahl',
          optionen: ['monat', 'quartal', 'jahr'].map((r) => ({ wert: r, text: t(`finanzen.fix.rhythmus.${r}`) })),
        },
        { name: 'tag', label: t('finanzen.fix.tagFeld'), art: 'zahl', hinweis: t('finanzen.fix.tagHinweis') },
        {
          name: 'start_monat',
          label: t('finanzen.fix.startMonat'),
          art: 'zahl',
          hinweis: t('finanzen.fix.startMonatHinweis'),
        },
        { name: 'ab', label: t('finanzen.fix.ab'), art: 'datum' },
        { name: 'bis', label: t('finanzen.fix.bisFeld'), art: 'datum' },
        { name: 'detail', label: t('finanzen.fix.detail'), art: 'text' },
        { name: 'standort', label: t('finanzen.fix.standort'), art: 'text' },
        {
          name: 'aktiv',
          label: t('finanzen.fix.aktiv'),
          art: 'auswahl',
          optionen: [
            { wert: 'ja', text: t('finanzen.ja') },
            { wert: 'nein', text: t('finanzen.nein') },
          ],
        },
        { name: 'notiz', label: t('finanzen.notiz'), art: 'notiz' },
      ]}
    />
  )
}
