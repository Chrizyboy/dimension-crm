import { Fragment } from 'react'
import { useTranslation } from 'react-i18next'
import { Karte, KarteKopf, KarteTitel } from '@/components/ui/karte'
import { Kopfzelle, Tabelle, TabelleKoerper, TabelleKopf, Zelle, Zeile } from '@/components/ui/tabelle'
import { GRUPPEN, zelle } from '../lib/auswertung'
import { wertText } from '../lib/format'
import type { Detail, Fakt } from '../types'

/**
 * Die grosse Tabelle aus V233: Zeilen = Kennzahlen in Gruppen, Spalten = Standorte oder Personen. Jede Zahl ist ein
 * Knopf, der die Einträge dahinter zeigt.
 */
export function KennzahlTabelle({
  titel,
  spalten,
  onDetail,
  testId,
}: {
  titel: string
  spalten: { id: string; titel: string; fakten: Fakt[] }[]
  onDetail: (d: Detail) => void
  testId?: string
}) {
  const { t } = useTranslation()
  return (
    <Karte className="overflow-hidden" data-testid={testId}>
      <KarteKopf>
        <KarteTitel>{titel}</KarteTitel>
      </KarteKopf>
      <Tabelle aria-label={titel}>
        <TabelleKopf>
          <tr>
            <Kopfzelle className="sticky left-0 bg-inherit">{t('kz.spalte.kennzahl')}</Kopfzelle>
            {spalten.map((s) => (
              <Kopfzelle key={s.id} zahl>
                {s.titel}
              </Kopfzelle>
            ))}
          </tr>
        </TabelleKopf>
        <TabelleKoerper>
          {GRUPPEN.map((g) => (
            <Fragment key={g.id}>
              <tr className="bg-surface-2">
                <th
                  colSpan={spalten.length + 1}
                  scope="colgroup"
                  className="text-muted-foreground px-3 py-1.5 text-left text-xs font-semibold"
                >
                  {t(`kz.gruppe.${g.id}`)}
                </th>
              </tr>
              {g.zeilen.map((z) => (
                <Zeile key={z.id}>
                  <th
                    scope="row"
                    className="bg-surface sticky left-0 px-3 py-1.5 text-left text-sm font-normal whitespace-nowrap"
                  >
                    {t(`kz.zeile.${z.id}`)}
                  </th>
                  {spalten.map((s) => {
                    const c = zelle(s.fakten, z)
                    const leer = c.fakten.length === 0
                    return (
                      <Zelle key={s.id} zahl className="py-1">
                        <button
                          type="button"
                          disabled={leer}
                          onClick={() => {
                            onDetail({ titel: `${t(`kz.zeile.${z.id}`)} · ${s.titel}`, fakten: c.fakten })
                          }}
                          className="zahlen hover:bg-muted focus-visible:ring-ring rounded px-1.5 py-0.5 font-mono outline-none focus-visible:ring-2 disabled:cursor-default disabled:hover:bg-transparent"
                        >
                          {leer && z.mass !== 'anzahl' ? '–' : wertText(c.wert, z.mass)}
                        </button>
                      </Zelle>
                    )
                  })}
                </Zeile>
              ))}
            </Fragment>
          ))}
        </TabelleKoerper>
      </Tabelle>
    </Karte>
  )
}
