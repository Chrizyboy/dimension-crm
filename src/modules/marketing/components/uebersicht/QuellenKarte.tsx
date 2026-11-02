import { useTranslation } from 'react-i18next'
import { Skelett } from '@/components/ui/diverses'
import { Karte, KarteInhalt, KarteKopf, KarteTitel } from '@/components/ui/karte'
import { Kopfzelle, Tabelle, TabelleKoerper, TabelleKopf, Zeile, Zelle } from '@/components/ui/tabelle'
import { useAuswahl } from '@/hooks/useAuswahl'
import { formatChf } from '@/lib/format'
import type { BudgetZeile, QuellenZeile } from '../../types'

/** «Woher kommen die Aufträge?»: Leads, Aufträge, Auftragswert und (mit Recht) Kosten pro Lead je Quelle. */
export function QuellenKarte({ zeilen, jahr }: { zeilen: QuellenZeile[] | undefined; jahr: number }) {
  const { t } = useTranslation()
  const quelle = useAuswahl('quelle')
  const kosten = zeilen?.some((z) => z.kosten_rappen !== null) ?? false
  return (
    <Karte>
      <KarteKopf>
        <KarteTitel>{t('werbung.uebersicht.quellen', { jahr })}</KarteTitel>
      </KarteKopf>
      <KarteInhalt>
        {!zeilen ? (
          <Skelett className="h-40" />
        ) : (
          <Tabelle>
            <TabelleKopf>
              <Zeile>
                <Kopfzelle>{t('werbung.uebersicht.quelle')}</Kopfzelle>
                <Kopfzelle zahl>{t('werbung.ergebnis.leads')}</Kopfzelle>
                <Kopfzelle zahl>{t('werbung.ergebnis.auftraege')}</Kopfzelle>
                <Kopfzelle zahl>{t('werbung.ergebnis.auftragswert')}</Kopfzelle>
                {kosten && <Kopfzelle zahl>{t('werbung.ergebnis.proLead')}</Kopfzelle>}
              </Zeile>
            </TabelleKopf>
            <TabelleKoerper>
              {zeilen.map((z) => (
                <Zeile key={z.quelle}>
                  <Zelle>{z.quelle === 'ohne' ? t('werbung.uebersicht.ohneQuelle') : quelle.text(z.quelle)}</Zelle>
                  <Zelle zahl>{z.leads}</Zelle>
                  <Zelle zahl>
                    {z.auftraege}
                    {z.leads ? (
                      <span className="text-muted-foreground"> ({Math.round((z.auftraege / z.leads) * 100)}%)</span>
                    ) : null}
                  </Zelle>
                  <Zelle zahl>{z.auftragswert_rappen ? formatChf(z.auftragswert_rappen) : '–'}</Zelle>
                  {kosten && (
                    <Zelle zahl>{z.kosten_rappen && z.leads ? formatChf(Math.round(z.kosten_rappen / z.leads)) : '–'}</Zelle>
                  )}
                </Zeile>
              ))}
            </TabelleKoerper>
          </Tabelle>
        )}
      </KarteInhalt>
    </Karte>
  )
}

/** Budget gegen Kosten je Kanal (nur mit Recht preise/finanzen). Balken in den Diagrammfarben. */
export function BudgetKarte({ zeilen, jahr }: { zeilen: BudgetZeile[]; jahr: number }) {
  const { t } = useTranslation()
  const summe = (f: 'budget_rappen' | 'kosten_rappen') => zeilen.reduce((s, z) => s + z[f], 0)
  return (
    <Karte>
      <KarteKopf>
        <KarteTitel>{t('werbung.uebersicht.budget', { jahr })}</KarteTitel>
        <p className="text-muted-foreground zahlen text-sm">
          {t('werbung.uebersicht.budgetSumme', {
            kosten: formatChf(summe('kosten_rappen'), { mitWaehrung: true }),
            budget: formatChf(summe('budget_rappen'), { mitWaehrung: true }),
          })}
        </p>
      </KarteKopf>
      <KarteInhalt>
        <ul className="flex flex-col gap-3">
          {zeilen
            .filter((z) => z.budget_rappen || z.kosten_rappen)
            .map((z) => {
              const anteil = z.budget_rappen ? Math.min(100, (z.kosten_rappen / z.budget_rappen) * 100) : 100
              const ueber = z.kosten_rappen > z.budget_rappen
              return (
                <li key={z.kanal} className="flex flex-col gap-1 text-sm">
                  <span className="flex justify-between gap-2">
                    <span>{t(`werbung.kanal.${z.kanal}`)}</span>
                    <span className={`zahlen ${ueber ? 'text-bad' : 'text-muted-foreground'}`}>
                      {formatChf(z.kosten_rappen)} / {formatChf(z.budget_rappen)}
                    </span>
                  </span>
                  <span className="bg-muted h-2 overflow-hidden rounded-full" aria-hidden="true">
                    <span
                      className={`block h-full rounded-full ${ueber ? 'bg-bad' : 'bg-reihe-1'}`}
                      style={{ width: `${String(anteil)}%` }}
                    />
                  </span>
                </li>
              )
            })}
        </ul>
      </KarteInhalt>
    </Karte>
  )
}
