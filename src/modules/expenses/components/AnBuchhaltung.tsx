import { useTranslation } from 'react-i18next'
import { MailDialog } from '@/components/shared/MailDialog'
import { useFinanzEinstellungen } from '@/hooks/useFinanzEinstellungen'
import { useAnmeldung } from '@/stores/anmeldung'
import { useKategorieText } from '../hooks/useKategorieText'
import { useSpesenNeuLaden } from '../hooks/useSpesen'
import { mailZeilen } from '../lib/spesen'
import { mailVermerken } from '../services/spesen'
import type { Spese } from '../types'

/**
 * Spesen per Mail an die Buchhaltung (V233 «Mail an Buchhaltung»): Liste mit Total im Text, Belege als Anhang.
 * Gesendet wird aus dem eigenen Postfach über den Ausgangskorb, erst nach «Senden» (Regel 6).
 */
export function AnBuchhaltung({ spesen, onSchliessen }: { spesen: Spese[]; onSchliessen: () => void }) {
  const { t, i18n } = useTranslation()
  const ich = useAnmeldung((z) => z.ich)
  const { buchhaltung_email } = useFinanzEinstellungen()
  const kategorie = useKategorieText()
  const neuLaden = useSpesenNeuLaden()
  const sprache = i18n.language === 'fr' ? 'fr' : 'de'
  const werte = { name: ich?.name ?? '', anzahl: spesen.length, liste: mailZeilen(spesen, kategorie) }

  return (
    <MailDialog
      titel={t('spesen.mail.titel')}
      beschreibung={buchhaltung_email ? t('spesen.mail.beschreibung') : t('spesen.mail.ohneAdresse')}
      vorlage={{
        an: buchhaltung_email ?? '',
        betreff: t('spesen.mail.betreff', werte),
        text: t('spesen.mail.text', werte),
        sprache,
        art: 'spesen',
        ...(spesen[0] ? { bezug_tabelle: 'spesen', bezug_id: spesen[0].id } : {}),
      }}
      dateien={spesen
        .filter((s) => s.beleg_id)
        .map((s) => ({ id: s.beleg_id ?? '', name: s.beleg_name ?? t('spesen.spalte.beleg'), vorgewaehlt: true }))}
      onSchliessen={onSchliessen}
      onGesendet={() => {
        void mailVermerken(spesen.map((s) => s.id)).then(neuLaden)
      }}
    />
  )
}
