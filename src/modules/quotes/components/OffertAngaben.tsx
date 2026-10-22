import { useTranslation } from 'react-i18next'
import { AkteAbschnitt, Angabe } from '@/components/shared/AkteAbschnitt'
import { Auswahl } from '@/components/ui/auswahl'
import { mitMwst, useMwst } from '@/hooks/useMwst'
import { formatChf, formatDatum } from '@/lib/format'
import { meldeFehler } from '@/services/fehler'
import { melde } from '@/services/meldungen'
import { useOffertAenderung, usePersonen } from '../hooks/useOfferten'
import { setzeVerantwortlich } from '../services/offerten'
import type { Offerte } from '../types'

const NIEMAND = '-'

/** Werte der Offerte: Betrag exkl./inkl. MWST, Anlage, Datum, frühere Daten und Zuständigkeit (V193). */
export function OffertAngaben({ o }: { o: Offerte }) {
  const { t } = useTranslation()
  const mwst = useMwst()
  const personen = usePersonen()
  const zuweisen = useOffertAenderung((p: string | null) => setzeVerantwortlich(o.id, p))

  return (
    <AkteAbschnitt titel={t('offerten.akte.angaben')}>
      <dl>
        <Angabe label={t('offerten.akte.betrag')}>
          {o.betragRappen ? (
            <span className="zahlen font-mono">
              {formatChf(o.betragRappen, { mitWaehrung: true })}{' '}
              <span className="text-muted-foreground text-xs">
                {t('offerten.akte.exkl')} · {formatChf(mitMwst(o.betragRappen, mwst), { mitWaehrung: true })}{' '}
                {t('offerten.akte.inkl', { satz: mwst })}
              </span>
            </span>
          ) : (
            '–'
          )}
        </Angabe>
        <Angabe label={t('offerten.akte.anlage')}>
          {[o.kwp ? `${o.kwp} kWp` : null, o.anzahlModule ? t('offerten.akte.module', { count: o.anzahlModule }) : null]
            .filter(Boolean)
            .join(' · ') || '–'}
        </Angabe>
        <Angabe label={t('offerten.akte.wechselrichter')}>{o.wechselrichter ?? '–'}</Angabe>
        <Angabe label={t('offerten.akte.batterie')}>{o.batterie ?? '–'}</Angabe>
        <Angabe label={t('offerten.akte.angebotAm')}>
          {o.angebotAm ? formatDatum(o.angebotAm) : '–'}
          {o.angebotAmFrueher.length > 0 && (
            <span className="text-muted-foreground block text-xs">
              {t('offerten.akte.frueher')}: {o.angebotAmFrueher.map((d) => formatDatum(d)).join(', ')}
            </span>
          )}
        </Angabe>
        {o.entscheid === 'vertagt' && o.vertagtGrund && (
          <Angabe label={t('offerten.akte.vertagtGrund')}>{o.vertagtGrund}</Angabe>
        )}
        {o.verlustgrund && <Angabe label={t('offerten.akte.verlustgrund')}>{o.verlustgrund}</Angabe>}
        <Angabe label={t('offerten.akte.zustaendig')}>
          <Auswahl
            aria-label={t('offerten.akte.zustaendig')}
            value={o.verantwortlichId ?? NIEMAND}
            onValueChange={(v) => {
              zuweisen.mutate(v === NIEMAND ? null : v, {
                onSuccess: () => {
                  melde('ok', { de: 'Zuständigkeit gespeichert', fr: 'Responsable enregistré' })
                },
                onError: (f) => {
                  meldeFehler(f, 'offerten.zustaendig')
                  melde('kritisch', { de: 'Nicht gespeichert', fr: 'Non enregistré' })
                },
              })
            }}
            optionen={[
              { wert: NIEMAND, text: t('offerten.akte.niemand') },
              ...(personen.data ?? []).map((p) => ({ wert: p.id, text: p.name })),
            ]}
          />
        </Angabe>
        {o.eturnityId && <Angabe label="Eturnity">{o.eturnityId}</Angabe>}
      </dl>
    </AkteAbschnitt>
  )
}
