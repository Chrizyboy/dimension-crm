import { Pencil } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { AkteAbschnitt, Angabe } from '@/components/shared/AkteAbschnitt'
import { Button } from '@/components/ui/button'
import { useAuswahl } from '@/hooks/useAuswahl'
import { formatDatum, formatTelefon } from '@/lib/format'
import { formatIban } from '../lib/akte'
import type { AkteDaten } from '../types'
import type { PersonAktion } from './PersonAkte'

/**
 * Persönliches, Notfallkontakt, Arbeitskleider und Ausrüstung. Vorgesetzte sehen nur den Notfallkontakt; ändern
 * dürfen die Person selbst und das Recht «personal». Ausrüstung kommt aus «Fahrzeuge & Geräte» (zugeteilt).
 */
export function AktePersoenlich({ daten, onAktion }: { daten: AkteDaten; onAktion: (a: PersonAktion) => void }) {
  const { t } = useTranslation()
  const bewilligung = useAuswahl('personal_bewilligung')
  const zivilstand = useAuswahl('personal_zivilstand')
  const a = daten.akte
  const privat = daten.sicht !== 'vorgesetzt'
  const bearbeiten = privat && (
    <Button
      variant="ghost"
      size="sm"
      className="mt-1"
      onClick={() => {
        onAktion({ akte: 'persoenlich' })
      }}
    >
      <Pencil />
      {t('allgemein.bearbeiten')}
    </Button>
  )
  const notfall = (
    <Angabe label={t('team.akte.notfall')}>
      {a.notfall_name
        ? [
            [a.notfall_name, a.notfall_beziehung].filter(Boolean).join(', '),
            a.notfall_telefon ? formatTelefon(a.notfall_telefon) : null,
          ]
            .filter(Boolean)
            .join(' · ')
        : null}
    </Angabe>
  )

  if (!privat) {
    return (
      <AkteAbschnitt titel={t('team.akte.notfall')}>
        <dl>{notfall}</dl>
      </AkteAbschnitt>
    )
  }

  return (
    <>
      <AkteAbschnitt titel={t('team.akte.persoenlich')}>
        <dl>
          <Angabe label={t('team.akte.geburtsdatum')}>{a.geburtsdatum ? formatDatum(a.geburtsdatum) : null}</Angabe>
          <Angabe label={t('team.akte.adresse')}>
            {[a.strasse, [a.plz, a.ort].filter(Boolean).join(' ')].filter(Boolean).join(', ') || null}
          </Angabe>
          <Angabe label={t('team.akte.telefon_privat')}>
            {a.telefon_privat ? formatTelefon(a.telefon_privat) : null}
          </Angabe>
          <Angabe label={t('team.akte.mail_privat')}>{a.mail_privat}</Angabe>
          {notfall}
          <Angabe label={t('team.akte.nationalitaet')}>{a.nationalitaet}</Angabe>
          <Angabe label={t('team.akte.bewilligung')}>
            {a.bewilligung
              ? [
                  bewilligung.text(a.bewilligung),
                  a.bewilligung_bis ? t('team.akte.gueltigBis', { datum: formatDatum(a.bewilligung_bis) }) : null,
                ]
                  .filter(Boolean)
                  .join(', ')
              : null}
          </Angabe>
          <Angabe label={t('team.akte.zivilstand')}>{a.zivilstand ? zivilstand.text(a.zivilstand) : null}</Angabe>
          <Angabe label={t('team.akte.ahv_nr')}>
            {a.ahv_nr ? <span className="tabular-nums">{a.ahv_nr}</span> : null}
          </Angabe>
          <Angabe label={t('team.akte.iban')}>
            {a.iban ? <span className="tabular-nums">{formatIban(a.iban)}</span> : null}
          </Angabe>
        </dl>
        {bearbeiten}
      </AkteAbschnitt>
      <AkteAbschnitt titel={t('team.akte.kleider')}>
        <dl>
          <Angabe label={t('team.akte.groessen')}>
            {[
              a.kleidergroesse ? t('team.akte.oberteil', { groesse: a.kleidergroesse }) : null,
              a.hosengroesse ? t('team.akte.hose', { groesse: a.hosengroesse }) : null,
              a.schuhgroesse ? t('team.akte.schuh', { groesse: a.schuhgroesse }) : null,
            ]
              .filter(Boolean)
              .join(' · ') || null}
          </Angabe>
        </dl>
      </AkteAbschnitt>
    </>
  )
}
