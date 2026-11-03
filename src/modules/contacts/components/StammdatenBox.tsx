import { useTranslation } from 'react-i18next'
import { formatTelefon } from '@/lib/format'
import type { PartnerKopf } from '../types'
import { Box, Zeile } from './Box'

/** Wie erreichen wir den Partner: Telefon, Mail, Postadresse, Webseite, UID, Sprache, Notiz. */
export function StammdatenBox({ kopf: k }: { kopf: PartnerKopf }) {
  const { t } = useTranslation()
  const adresse = [k.strasse, [k.plz, k.ort].filter(Boolean).join(' ')].filter(Boolean).join('\n')
  return (
    <Box titel={t('adressbuch.akte.stammdaten')}>
      <dl className="flex flex-col gap-1.5">
        <Zeile label={t('adressbuch.feld.telefon')}>
          {k.telefon ? (
            <a href={`tel:${k.telefon}`} className="zahlen hover:underline">
              {formatTelefon(k.telefon)}
            </a>
          ) : (
            '–'
          )}
        </Zeile>
        <Zeile label={t('adressbuch.feld.email')}>
          {k.email ? (
            <a href={`mailto:${k.email}`} className="break-all hover:underline">
              {k.email}
            </a>
          ) : (
            '–'
          )}
        </Zeile>
        <Zeile label={t('adressbuch.feld.adresse')}>{adresse || '–'}</Zeile>
        <Zeile label={t('adressbuch.feld.webseite')}>
          {k.webseite ? (
            <a
              href={k.webseite}
              target="_blank"
              rel="noreferrer noopener"
              className="text-accent-ink break-all hover:underline"
            >
              {k.webseite.replace(/^https?:\/\//, '')}
            </a>
          ) : (
            '–'
          )}
        </Zeile>
        <Zeile label={t('adressbuch.feld.uid')}>
          <span className="zahlen">{[k.uidNr, k.rechtsform].filter(Boolean).join(' · ') || '–'}</span>
        </Zeile>
        <Zeile label={t('adressbuch.feld.sprache')}>{k.sprache === 'fr' ? 'Français' : 'Deutsch'}</Zeile>
        {k.notiz && <Zeile label={t('adressbuch.akte.notiz')}>{k.notiz}</Zeile>}
      </dl>
    </Box>
  )
}
