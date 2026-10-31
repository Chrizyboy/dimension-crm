import { useTranslation } from 'react-i18next'
import { Fehlerzustand } from '@/components/shared/Zustaende'
import { Karte, KarteInhalt, KarteKopf, KarteTitel } from '@/components/ui/karte'
import { useUi } from '@/stores/ui'
import { useAuswertung } from '../hooks/usePosteingang'
import { dauer } from '../lib/anzeige'

/**
 * Reaktionszeit: pro Woche die Mitte (Arbeitsminuten bis zur Antwort) und der Anteil in der Frist, dazu pro Person
 * für die letzten 7 Tage. Nur Mails, die eine Antwort brauchten.
 */
export function Auswertung() {
  const { t } = useTranslation()
  const sprache = useUi((z) => z.sprache)
  const a = useAuswertung()
  if (a.error) return <Fehlerzustand details={a.error.message} onNochmal={() => void a.refetch()} />
  const wochen = a.data?.wochen ?? []
  const groesste = Math.max(1, ...wochen.map((w) => w.mitte_min ?? 0))
  const zeit = (m: number | null) => (m == null ? '–' : dauer(m, sprache))

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Karte>
        <KarteKopf>
          <KarteTitel>{t('posteingang.auswertung.wochen')}</KarteTitel>
        </KarteKopf>
        <KarteInhalt>
          {wochen.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t('posteingang.auswertung.leer')}</p>
          ) : (
            <ul className="flex flex-col gap-2" aria-label={t('posteingang.auswertung.wochen')}>
              {wochen.map((w) => (
                <li key={w.woche} className="grid grid-cols-[5rem_1fr_9rem] items-center gap-3 text-sm">
                  <span className="text-muted-foreground zahlen">
                    {w.woche.replace(/^\d+-W/, t('posteingang.auswertung.kw'))}
                  </span>
                  <span className="bg-muted h-3 overflow-hidden rounded">
                    <span
                      className="bg-reihe-1 block h-full rounded"
                      style={{ width: `${Math.round((100 * (w.mitte_min ?? 0)) / groesste)}%` }}
                    />
                  </span>
                  <span className="zahlen text-right">
                    {zeit(w.mitte_min)} · {w.in_frist} %
                  </span>
                </li>
              ))}
            </ul>
          )}
          <p className="text-muted-foreground mt-3 text-xs">{t('posteingang.auswertung.hinweis')}</p>
        </KarteInhalt>
      </Karte>
      <Karte>
        <KarteKopf>
          <KarteTitel>{t('posteingang.auswertung.personen')}</KarteTitel>
        </KarteKopf>
        <KarteInhalt>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted-foreground text-left text-xs">
                <th className="py-1 font-medium">{t('posteingang.auswertung.person')}</th>
                <th className="py-1 text-right font-medium">{t('posteingang.auswertung.anzahl')}</th>
                <th className="py-1 text-right font-medium">{t('posteingang.auswertung.mitte')}</th>
                <th className="py-1 text-right font-medium">{t('posteingang.auswertung.inFrist')}</th>
              </tr>
            </thead>
            <tbody>
              {(a.data?.personen ?? []).map((p) => (
                <tr key={p.person_id ?? 'niemand'} className="border-t">
                  <td className="py-1.5">{p.name}</td>
                  <td className="zahlen py-1.5 text-right">{p.anzahl}</td>
                  <td className="zahlen py-1.5 text-right">{zeit(p.mitte_min)}</td>
                  <td className="zahlen py-1.5 text-right">{p.in_frist} %</td>
                </tr>
              ))}
            </tbody>
          </table>
          {(a.data?.personen ?? []).length === 0 && (
            <p className="text-muted-foreground pt-2 text-sm">{t('posteingang.auswertung.leer')}</p>
          )}
        </KarteInhalt>
      </Karte>
    </div>
  )
}
