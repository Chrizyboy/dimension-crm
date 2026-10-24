import { useTranslation } from 'react-i18next'
import { Karte, KarteKopf, KarteTitel } from '@/components/ui/karte'
import { Kopfzelle, Tabelle, TabelleKoerper, TabelleKopf, Zelle, Zeile } from '@/components/ui/tabelle'
import { cn } from '@/lib/utils'
import type { Auslastung } from '../types'

/** Ton einer Zelle: frei, gut gebucht, voll oder überbucht. */
function ton(gebucht: number, verfuegbar: number): string {
  if (gebucht > verfuegbar) return 'bg-bad-soft text-bad font-semibold'
  if (verfuegbar > 0 && gebucht >= verfuegbar) return 'bg-warn-soft text-warn font-medium'
  if (gebucht > 0) return 'bg-ok-soft text-ok'
  return 'text-muted-foreground'
}

/**
 * Auslastung Montage (ERP 0009): 8 Wochen ab heute, pro Person gebuchte Einsatztage von verfügbaren. Mehr als
 * verfügbar ist rot; die Zahl steht immer dabei, Farbe allein trägt nichts.
 */
export function AuslastungTabelle({ auslastung }: { auslastung: Auslastung }) {
  const { t } = useTranslation()
  const ohne = auslastung.wochen.some((w) => w.ohne_personen > 0)
  return (
    <Karte className="overflow-hidden" data-testid="kz-auslastung">
      <KarteKopf className="flex flex-col gap-0.5">
        <KarteTitel>{t('kz.betrieb.auslastung')}</KarteTitel>
        <span className="text-muted-foreground text-xs">{t('kz.betrieb.auslastungText')}</span>
      </KarteKopf>
      <Tabelle aria-label={t('kz.betrieb.auslastung')}>
        <TabelleKopf>
          <tr>
            <Kopfzelle>{t('kz.betrieb.person')}</Kopfzelle>
            {auslastung.wochen.map((w) => (
              <Kopfzelle key={w.von} zahl>
                {t('kz.betrieb.kw', { kw: w.kw })}
              </Kopfzelle>
            ))}
          </tr>
        </TabelleKopf>
        <TabelleKoerper>
          {auslastung.personen.map((p) => (
            <Zeile key={p.id}>
              <Zelle className="font-medium whitespace-nowrap">{p.name}</Zelle>
              {auslastung.wochen.map((w) => {
                const z = w.zellen.find((x) => x.person === p.id)
                const gebucht = z?.gebucht ?? 0
                const verfuegbar = z?.verfuegbar ?? 5
                return (
                  <Zelle key={w.von} zahl className="p-1">
                    <span
                      className={cn('zahlen block rounded px-1.5 py-1 text-center font-mono', ton(gebucht, verfuegbar))}
                      title={t('kz.betrieb.tage', { gebucht, verfuegbar })}
                    >
                      {String(gebucht)}/{String(verfuegbar)}
                    </span>
                  </Zelle>
                )
              })}
            </Zeile>
          ))}
          {ohne && (
            <Zeile>
              <Zelle className="text-muted-foreground text-xs">{t('kz.betrieb.ohnePersonen')}</Zelle>
              {auslastung.wochen.map((w) => (
                <Zelle key={w.von} zahl className="text-muted-foreground font-mono">
                  {w.ohne_personen || ''}
                </Zelle>
              ))}
            </Zeile>
          )}
        </TabelleKoerper>
      </Tabelle>
    </Karte>
  )
}
