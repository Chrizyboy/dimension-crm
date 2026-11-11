import { useTranslation } from 'react-i18next'
import { Fehlerzustand } from '@/components/shared/Zustaende'
import { Badge } from '@/components/ui/badge'
import { Skelett } from '@/components/ui/diverses'
import { Kopfzelle, Tabelle, TabelleKoerper, TabelleKopf, Zelle, Zeile } from '@/components/ui/tabelle'
import { useAuswahl } from '@/hooks/useAuswahl'
import { formatDatum } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useTage } from '../hooks/useZeit'
import { heute, plusTage, stundenText } from '../lib/zeit'

/**
 * Die Woche Tag für Tag: Soll, gearbeitet, Abwesenheit oder Feiertag und die Differenz. Abwesenheiten, die als
 * Arbeitszeit zählen (Ferien, Krank …), füllen das Soll; Kompensation nicht, sie braucht den Saldo.
 */
export function WocheTabelle({ personId, montag }: { personId: string; montag: string }) {
  const { t } = useTranslation()
  const arten = useAuswahl('abwesenheit')
  const tage = useTage(personId, montag, plusTage(montag, 6))
  const jetzt = heute()

  if (tage.error) return <Fehlerzustand details={String(tage.error)} onNochmal={() => void tage.refetch()} />
  if (!tage.data) return <Skelett className="h-64" />

  const summe = tage.data.reduce((s, d) => ({ soll: s.soll + d.soll_h, ist: s.ist + d.ist_h + d.gutschrift_h }), {
    soll: 0,
    ist: 0,
  })
  return (
    <div className="overflow-x-auto rounded-lg border">
      <Tabelle aria-label={t('zeit.woche.titel')}>
        <TabelleKopf>
          <Zeile>
            <Kopfzelle>{t('zeit.woche.tag')}</Kopfzelle>
            <Kopfzelle className="text-right">{t('zeit.woche.soll')}</Kopfzelle>
            <Kopfzelle className="text-right">{t('zeit.woche.ist')}</Kopfzelle>
            <Kopfzelle>{t('zeit.woche.vermerk')}</Kopfzelle>
            <Kopfzelle className="text-right">{t('zeit.woche.differenz')}</Kopfzelle>
          </Zeile>
        </TabelleKopf>
        <TabelleKoerper>
          {tage.data.map((d) => {
            const ist = d.ist_h + d.gutschrift_h
            const diff = ist - d.soll_h
            const zukunft = d.tag > jetzt
            return (
              <Zeile key={d.tag} className={cn(d.tag === jetzt && 'bg-accent-soft/40')}>
                <Zelle className="whitespace-nowrap">
                  {t(`zeit.wochentag.${String(new Date(`${d.tag}T12:00:00Z`).getUTCDay())}`)} {formatDatum(d.tag)}
                </Zelle>
                <Zelle className="zahlen text-right">{d.soll_h ? stundenText(d.soll_h) : '–'}</Zelle>
                <Zelle className="zahlen text-right">{d.ist_h ? stundenText(d.ist_h) : '–'}</Zelle>
                <Zelle>
                  {d.feiertag ? (
                    <Badge ton="info">{d.feiertag}</Badge>
                  ) : d.art ? (
                    <Badge ton={d.art === 'krank' || d.art === 'unfall' ? 'warnung' : 'marke'}>
                      {arten.text(d.art)}
                    </Badge>
                  ) : null}
                </Zelle>
                <Zelle
                  className={cn(
                    'zahlen text-right',
                    !zukunft && diff < -0.01 && 'text-warn',
                    !zukunft && diff > 0.01 && 'text-ok',
                  )}
                >
                  {zukunft || (!d.soll_h && !ist) ? '' : stundenText(diff, true)}
                </Zelle>
              </Zeile>
            )
          })}
          <Zeile className="font-semibold">
            <Zelle>{t('zeit.woche.summe')}</Zelle>
            <Zelle className="zahlen text-right">{stundenText(summe.soll)}</Zelle>
            <Zelle className="zahlen text-right">{stundenText(summe.ist)}</Zelle>
            <Zelle />
            <Zelle className="zahlen text-right">{stundenText(summe.ist - summe.soll, true)}</Zelle>
          </Zeile>
        </TabelleKoerper>
      </Tabelle>
    </div>
  )
}
