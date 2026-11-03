import { useTranslation } from 'react-i18next'
import { formatTelefon } from '@/lib/format'
import type { Offerte } from '../types'
import { Box, Zeile } from './Box'

/** Kunde und Objekt der Offerte: wer, wie erreichbar, wo, Sprache, Termin und wer verkauft. */
export function KundeBox({ o }: { o: Offerte }) {
  const { t } = useTranslation()
  return (
    <Box titel={t('offerten.seite.kunde')}>
      <dl className="flex flex-col gap-1.5">
        <Zeile label={t('offerten.seite.name')}>{o.name}</Zeile>
        <Zeile label={t('offerten.seite.telefon')}>
          {o.telefon ? (
            <a className="underline-offset-2 hover:underline" href={`tel:${o.telefon.replace(/\s/g, '')}`}>
              {formatTelefon(o.telefon)}
            </a>
          ) : null}
        </Zeile>
        <Zeile label={t('offerten.seite.mail')}>{o.email}</Zeile>
        <Zeile label={t('offerten.seite.objekt')}>
          {[o.strasse, [o.plz, o.ort].filter(Boolean).join(' ')].filter(Boolean).join(', ') || null}
        </Zeile>
        <Zeile label={t('offerten.seite.sprache')}>{t(`offerten.seite.sprache_${o.sprache}`)}</Zeile>
        <Zeile label={t('offerten.seite.termin')}>
          {o.terminAm
            ? [o.terminAm.slice(0, 10).split('-').reverse().join('.'), o.verkaufPersonName].filter(Boolean).join(' · ')
            : null}
        </Zeile>
      </dl>
    </Box>
  )
}
