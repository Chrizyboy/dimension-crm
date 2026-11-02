import { Pencil, Plus } from 'lucide-react'
import type { TFunction } from 'i18next'
import { useTranslation } from 'react-i18next'
import { AkteAbschnitt, Angabe } from '@/components/shared/AkteAbschnitt'
import { Button } from '@/components/ui/button'
import { useAuswahl } from '@/hooks/useAuswahl'
import { formatChf, formatDatum } from '@/lib/format'
import type { AkteDaten, Lohn } from '../types'
import type { PersonAktion } from './PersonAkte'

const zahl = (n: number) => n.toLocaleString('de-CH', { maximumFractionDigits: 1 })

/**
 * Anstellung (Vorgesetzt, Vertrag, Probezeit, Pensum, Ferien, Kündigungsfrist) und Lohn zur Info.
 * Sehen: Recht «personal», die Person selbst und Vorgesetzte; ändern nur Recht «personal».
 * Der Lohn erscheint nur mit Recht «personal» (die Datenbank liefert ihn sonst gar nicht).
 */
export function AkteAnstellung({ daten, onAktion }: { daten: AkteDaten; onAktion: (a: PersonAktion) => void }) {
  const { t } = useTranslation()
  const vertragsart = useAuswahl('personal_vertragsart')
  const a = daten.akte
  const darf = daten.sicht === 'personal'
  const datum = (d: string | null) => (d ? formatDatum(d) : null)

  return (
    <>
      <AkteAbschnitt titel={t('team.akte.anstellung')}>
        <dl>
          <Angabe label={t('team.akte.vorgesetzt')}>{daten.vorgesetztName}</Angabe>
          <Angabe label={t('team.akte.funktion')}>{a.funktion}</Angabe>
          <Angabe label={t('team.akte.vertragsart')}>
            {a.vertragsart
              ? [
                  vertragsart.text(a.vertragsart),
                  a.befristet_bis ? t('team.akte.bis', { datum: formatDatum(a.befristet_bis) }) : null,
                ]
                  .filter(Boolean)
                  .join(' ')
              : null}
          </Angabe>
          <Angabe label={t('team.akte.eintritt')}>{datum(a.eintritt)}</Angabe>
          <Angabe label={t('team.akte.probezeit_bis')}>{datum(a.probezeit_bis)}</Angabe>
          <Angabe label={t('team.akte.pensum')}>
            {a.pensum
              ? [
                  `${String(a.pensum)} %`,
                  a.wochenstunden ? t('team.akte.stundenProWoche', { stunden: zahl(a.wochenstunden) }) : null,
                ]
                  .filter(Boolean)
                  .join(' · ')
              : null}
          </Angabe>
          <Angabe label={t('team.akte.ferientage')}>
            {a.ferientage != null ? t('team.akte.tageProJahr', { tage: zahl(a.ferientage) }) : null}
          </Angabe>
          <Angabe label={t('team.akte.kuendigungsfrist')}>
            {a.kuendigungsfrist_monate != null ? t('team.akte.monate', { count: a.kuendigungsfrist_monate }) : null}
          </Angabe>
          <Angabe label={t('team.akte.vertrag_unterschrieben_am')}>{datum(a.vertrag_unterschrieben_am)}</Angabe>
          {a.austritt && (
            <Angabe label={t('team.akte.austritt')}>
              {[formatDatum(a.austritt), a.austrittsgrund].filter(Boolean).join(' · ')}
            </Angabe>
          )}
        </dl>
        {darf && (
          <Button
            variant="ghost"
            size="sm"
            className="mt-1"
            onClick={() => {
              onAktion({ akte: 'anstellung' })
            }}
          >
            <Pencil />
            {t('team.akte.anstellungBearbeiten')}
          </Button>
        )}
      </AkteAbschnitt>

      {daten.loehne && (
        <AkteAbschnitt titel={t('team.lohn.titel')} zusatz={t('team.lohn.nurInfo')} offen={false}>
          <ul className="flex flex-col divide-y text-sm">
            {daten.loehne.map((l, i) => (
              <li key={l.id} className="flex items-center justify-between gap-2 py-2">
                <span className="flex min-w-0 flex-col">
                  <span className={i === 0 ? 'font-medium tabular-nums' : 'text-muted-foreground tabular-nums'}>
                    {lohnText(l, t)}
                  </span>
                  <span className="text-muted-foreground text-xs">
                    {[t('team.lohn.ab', { datum: formatDatum(l.gueltig_ab) }), l.notiz].filter(Boolean).join(' · ')}
                  </span>
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={t('team.lohn.bearbeiten')}
                  onClick={() => {
                    onAktion({ lohn: l })
                  }}
                >
                  <Pencil />
                </Button>
              </li>
            ))}
            {daten.loehne.length === 0 && <li className="text-muted-foreground py-2">{t('team.lohn.leer')}</li>}
          </ul>
          <Button
            variant="ghost"
            size="sm"
            className="mt-1"
            onClick={() => {
              onAktion({ lohn: null })
            }}
          >
            <Plus />
            {t('team.lohn.neu')}
          </Button>
        </AkteAbschnitt>
      )}
    </>
  )
}

/** «CHF 6'200.00 × 13» oder «CHF 38.50 pro Stunde». */
function lohnText(l: Lohn, t: TFunction): string {
  const betrag = formatChf(l.betrag_rappen, { mitWaehrung: true })
  if (l.lohnart === 'stunde') return t('team.lohn.proStunde', { betrag })
  return l.anzahl_loehne
    ? t('team.lohn.proMonatMal', { betrag, anzahl: l.anzahl_loehne })
    : t('team.lohn.proMonat', { betrag })
}
