import { useTranslation } from 'react-i18next'
import { AkteAbschnitt, Angabe } from '@/components/shared/AkteAbschnitt'
import { formatChf, formatDatum } from '@/lib/format'
import type { Eingangsrechnung } from '../types'

/** IBAN in Vierergruppen, wie auf dem Zahlteil. */
const iban = (s: string) => s.replace(/(.{4})/g, '$1 ').trim()

/**
 * Angaben einer hochgeladenen Rechnung in der Akte: Grund, MWST, Zahlung (IBAN, Referenz), Leistungsperiode mit
 * Abgrenzung, Ablage in Compta und ob das PDF an AbaNinja ging.
 */
export function UploadAngaben({ e }: { e: Eingangsrechnung }) {
  const { t } = useTranslation()
  const a = 'rechnungen.eingang.upload'
  const ab = e.abgrenzung
  return (
    <AkteAbschnitt titel={t(`${a}.rechnung`)}>
      <dl>
        {e.grund && <Angabe label={t(`${a}.grund`)}>{e.grund}</Angabe>}
        {e.mwst_rappen != null && (
          <Angabe label={t(`${a}.mwst`)}>{formatChf(e.mwst_rappen, { mitWaehrung: true })}</Angabe>
        )}
        {(e.iban || e.referenz) && (
          <Angabe label={t(`${a}.zahlung`)}>
            <span className="zahlen">{[e.iban ? iban(e.iban) : null, e.referenz].filter(Boolean).join(' · ')}</span>
          </Angabe>
        )}
        {e.periode_von && e.periode_bis && (
          <Angabe label={t(`${a}.periode`)}>
            {formatDatum(e.periode_von)} – {formatDatum(e.periode_bis)}
            {ab?.noetig && (
              <span className="text-warn block">
                {t(`${a}.abgrenzungKurz`, { jahr: ab.buchungsjahr })}{' '}
                {ab.jahre.map((j) => `${String(j.jahr)}: ${formatChf(j.rappen, { mitWaehrung: true })}`).join(' · ')}
              </span>
            )}
          </Angabe>
        )}
        <Angabe label={t(`${a}.datei`)}>
          <span className="break-words">{e.dateiname}</span>
          <span className="text-muted-foreground block text-xs">
            {e.abgelegt && e.ablage_url ? (
              <a href={e.ablage_url} target="_blank" rel="noopener noreferrer" className="text-primary underline">
                {t(`${a}.inCompta`, { jahr: e.ablage_jahr })}
              </a>
            ) : e.ablage_fehler ? (
              <span className="text-bad">{t(`${a}.ablageFehler`)}</span>
            ) : (
              t(`${a}.ablageGleich`, { jahr: e.ablage_jahr })
            )}
          </span>
        </Angabe>
        {e.hochgeladen_von_name && <Angabe label={t(`${a}.von`)}>{e.hochgeladen_von_name}</Angabe>}
        {e.an_abaninja && <Angabe label="AbaNinja">{t(`${a}.anAbaninja`)}</Angabe>}
      </dl>
    </AkteAbschnitt>
  )
}
