import { useTranslation } from 'react-i18next'
import { Karte, KarteKopf, KarteTitel } from '@/components/ui/karte'
import { Kopfzelle, Tabelle, TabelleKoerper, TabelleKopf, Zelle, Zeile } from '@/components/ui/tabelle'
import { cn } from '@/lib/utils'
import { useZiele } from '../hooks/useKennzahlen'
import { ABWICKLUNG, nachStandort, zelle, zielErreicht } from '../lib/auswertung'
import type { Detail, Fakt } from '../types'

/**
 * Reiter «Abwicklung» (Modul-Prüfung 27A): wie schnell und sauber Aufträge laufen, nach Standort, mit Zielen aus
 * den Einstellungen. Grün = Ziel erreicht, rot = darüber. Jede Zahl zeigt per Klick die Projekte oder Fälle.
 */
export function Abwicklung({ fakten, onDetail }: { fakten: Fakt[]; onDetail: (d: Detail) => void }) {
  const { t } = useTranslation()
  const ziele = useZiele().data ?? {}
  const spalten = nachStandort(fakten).map((s) => ({ ...s, titel: t(`kz.spalte.${s.id}`) }))
  const einheit = (mass: string, wert: number) =>
    mass === 'schnitt' ? t('kz.abwicklung.tage', { count: wert }) : String(wert)

  return (
    <Karte className="overflow-hidden" data-testid="kz-abwicklung">
      <KarteKopf>
        <KarteTitel>{t('kz.reiter.abwicklung')}</KarteTitel>
        <p className="text-muted-foreground text-sm">{t('kz.abwicklung.hinweis')}</p>
      </KarteKopf>
      <Tabelle aria-label={t('kz.reiter.abwicklung')}>
        <TabelleKopf>
          <tr>
            <Kopfzelle>{t('kz.spalte.kennzahl')}</Kopfzelle>
            {spalten.map((s) => (
              <Kopfzelle key={s.id} zahl>
                {s.titel}
              </Kopfzelle>
            ))}
            <Kopfzelle zahl>{t('kz.abwicklung.ziel')}</Kopfzelle>
          </tr>
        </TabelleKopf>
        <TabelleKoerper>
          {ABWICKLUNG.map((z) => {
            const ziel = z.ziel ? ziele[z.ziel] : undefined
            return (
              <Zeile key={z.id}>
                <th scope="row" className="px-3 py-1.5 text-left text-sm font-normal">
                  {t(`kz.abwicklung.zeile.${z.id}`)}
                </th>
                {spalten.map((s) => {
                  const c = zelle(s.fakten, z)
                  const ok = zielErreicht(c.wert, ziel)
                  return (
                    <Zelle key={s.id} zahl className="py-1 whitespace-nowrap">
                      <button
                        type="button"
                        disabled={c.fakten.length === 0}
                        onClick={() => {
                          onDetail({ titel: `${t(`kz.abwicklung.zeile.${z.id}`)} · ${s.titel}`, fakten: c.fakten })
                        }}
                        className={cn(
                          'zahlen hover:bg-muted focus-visible:ring-ring rounded px-1.5 py-0.5 font-mono outline-none focus-visible:ring-2 disabled:cursor-default disabled:hover:bg-transparent',
                          ok === true && 'text-ok',
                          ok === false && 'text-bad font-semibold',
                        )}
                      >
                        {c.wert === null ? '–' : einheit(z.mass, c.wert)}
                      </button>
                    </Zelle>
                  )
                })}
                <Zelle zahl className="text-muted-foreground py-1 whitespace-nowrap">
                  {ziel === undefined ? '' : `≤ ${einheit(z.mass, ziel)}`}
                </Zelle>
              </Zeile>
            )
          })}
        </TabelleKoerper>
      </Tabelle>
    </Karte>
  )
}
