import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Karte, KarteInhalt, KarteKopf, KarteTitel } from '@/components/ui/karte'
import { Kopfzelle, Tabelle, TabelleKoerper, TabelleKopf, Zeile, Zelle } from '@/components/ui/tabelle'
import { formatChf, formatDatum } from '@/lib/format'
import type { Finanzdaten } from '../types'
import type { FinanzFenster } from './Fenster'

/**
 * MWST je Gesellschaft und Periode (effektive Methode): Umsatzsteuer aus gestellten Rechnungen, Vorsteuer aus
 * Lieferantenrechnungen, Zahllast fällig 60 Tage nach Periodenende. Eine Schätzung, bis die Buchhaltung den Betrag
 * aus AbaNinja einträgt; beides fliesst in die Liquidität.
 */
export function MwstListe({ daten, onFenster }: { daten: Finanzdaten; onFenster: (f: FinanzFenster) => void }) {
  const { t } = useTranslation()
  const firma = (id: string) => daten.firmen.find((f) => f.id === id)?.name ?? ''
  const zeilen = [...daten.mwst].sort(
    (a, b) => b.bis.localeCompare(a.bis) || firma(a.firma_id).localeCompare(firma(b.firma_id)),
  )
  return (
    <Karte>
      <KarteKopf>
        <KarteTitel>{t('finanzen.mwst.titel')}</KarteTitel>
      </KarteKopf>
      <KarteInhalt>
        {zeilen.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t('finanzen.mwst.leer')}</p>
        ) : (
          <Tabelle>
            <TabelleKopf>
              <Zeile>
                <Kopfzelle>{t('finanzen.mwst.periode')}</Kopfzelle>
                <Kopfzelle className="text-right">{t('finanzen.mwst.umsatzsteuer')}</Kopfzelle>
                <Kopfzelle className="text-right">{t('finanzen.mwst.vorsteuer')}</Kopfzelle>
                <Kopfzelle className="text-right">{t('finanzen.mwst.zahllast')}</Kopfzelle>
                <Kopfzelle>{t('finanzen.mwst.faellig')}</Kopfzelle>
                <Kopfzelle>{t('finanzen.mwst.stand')}</Kopfzelle>
              </Zeile>
            </TabelleKopf>
            <TabelleKoerper>
              {zeilen.map((m) => (
                <Zeile key={`${m.firma_id}|${m.periode}`}>
                  <Zelle>
                    <button
                      type="button"
                      className="text-left hover:underline"
                      onClick={() => {
                        onFenster({ art: 'mwst', firma: m.firma_id, periode: m.periode })
                      }}
                    >
                      <span className="font-medium">{m.periode}</span>
                      <span className="text-muted-foreground ml-2 text-xs">{firma(m.firma_id)}</span>
                    </button>
                  </Zelle>
                  <Zelle className="zahlen text-right">{formatChf(m.umsatzsteuer_rappen)}</Zelle>
                  <Zelle className="zahlen text-right">{formatChf(m.vorsteuer_rappen)}</Zelle>
                  <Zelle className="zahlen text-right font-semibold">{formatChf(m.zahllast_rappen)}</Zelle>
                  <Zelle>{formatDatum(m.faellig_am)}</Zelle>
                  <Zelle>
                    <Badge ton={m.bezahlt_am ? 'ok' : m.verbindlich ? 'info' : 'neutral'}>
                      {m.bezahlt_am
                        ? t('finanzen.mwst.bezahlt', { datum: formatDatum(m.bezahlt_am) })
                        : m.verbindlich
                          ? t('finanzen.mwst.verbindlichKurz')
                          : t('finanzen.mwst.schaetzung')}
                    </Badge>
                  </Zelle>
                </Zeile>
              ))}
            </TabelleKoerper>
          </Tabelle>
        )}
        <p className="text-muted-foreground mt-3 text-xs">{t('finanzen.mwst.hinweis')}</p>
      </KarteInhalt>
    </Karte>
  )
}
