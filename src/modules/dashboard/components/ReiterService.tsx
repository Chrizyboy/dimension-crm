import { useTranslation } from 'react-i18next'
import { Karte, KarteKopf, KarteTitel } from '@/components/ui/karte'
import { Kopfzelle, Tabelle, TabelleKoerper, TabelleKopf, Zelle, Zeile } from '@/components/ui/tabelle'
import { summe } from '../lib/auswertung'
import { faelleNachKomponente, reaktionQuote, wartungNachPaket } from '../lib/betrieb'
import { franken, tageText, zahl } from '../lib/format'
import { mittelTage, von } from '../lib/verkauf'
import { Kpi } from './Kpi'
import type { ReiterProps } from './reiterProps'

/**
 * Reiter «Service & Wartung»: offene Fälle, Reaktionszeit eingehalten (Richtwert), neue Fälle mit Garantie,
 * Lösungszeit, Fälle je Komponente (welches Produkt macht Ärger) und Wartungsverträge je Paket mit Jahreswert.
 */
export function Service(p: ReiterProps) {
  const { t } = useTranslation()
  const neu = von(p.fakten, 'faelle_neu')
  const garantie = von(p.fakten, 'faelle_garantie')
  const offen = von(p.fakten, 'faelle_offen')
  const reaktion = reaktionQuote(von(p.fakten, 'fall_neu'))
  const geloest = von(p.fakten, 'fall_geloest')
  const loesung = mittelTage(geloest)
  const loesungVorher = p.vorher ? mittelTage(von(p.vorher, 'fall_geloest')) : null
  const komponenten = faelleNachKomponente(p.fakten)
  const pakete = wartungNachPaket(p.fakten)
  const aktiv = von(p.fakten, 'wartung_aktiv')

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4" data-testid="kz-service">
        <Kpi
          titel={t('kz.srv.offen')}
          wert={String(offen.length)}
          onKlick={() => {
            p.onDetail({ titel: t('kz.srv.offen'), fakten: offen })
          }}
        />
        <Kpi
          titel={t('kz.k.reaktion')}
          wert={reaktion.prozent === null ? '–' : `${String(reaktion.prozent)} %`}
          unter={t('kz.srv.reaktionUnter', { richtwert: p.e.richtwerte.reaktion_prozent })}
          unterTon={
            reaktion.prozent === null
              ? undefined
              : reaktion.prozent >= p.e.richtwerte.reaktion_prozent
                ? 'ok'
                : 'warnung'
          }
          onKlick={() => {
            p.onDetail({ titel: t('kz.k.reaktion'), fakten: reaktion.fakten })
          }}
        />
        <Kpi
          titel={t('kz.srv.neu')}
          wert={String(neu.length)}
          zahl={neu.length}
          vergleich={
            p.vorher
              ? {
                  text: `${p.vergleichName} ${String(von(p.vorher, 'faelle_neu').length)}`,
                  wert: von(p.vorher, 'faelle_neu').length,
                  wenigerBesser: true,
                }
              : null
          }
          unter={t('kz.srv.garantie', {
            n: garantie.length,
            prozent: neu.length ? Math.round((garantie.length / neu.length) * 100) : 0,
          })}
          onKlick={() => {
            p.onDetail({ titel: t('kz.srv.neu'), fakten: neu })
          }}
        />
        <Kpi
          titel={t('kz.srv.loesung')}
          wert={`${tageText(loesung)} ${t('kz.abw.tage')}`}
          zahl={loesung}
          vergleich={
            p.vorher
              ? { text: `${p.vergleichName} ${tageText(loesungVorher)}`, wert: loesungVorher, wenigerBesser: true }
              : null
          }
          unter={t('kz.srv.geloest', { n: geloest.length })}
          onKlick={() => {
            p.onDetail({ titel: t('kz.srv.loesung'), fakten: geloest })
          }}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Karte className="overflow-hidden">
          <KarteKopf className="flex flex-col items-start gap-0.5">
            <KarteTitel>{t('kz.srv.komponenten')}</KarteTitel>
            <p className="text-muted-foreground text-xs">{t('kz.srv.komponentenHinweis')}</p>
          </KarteKopf>
          <Tabelle aria-label={t('kz.srv.komponenten')}>
            <TabelleKopf>
              <tr>
                <Kopfzelle>{t('kz.srv.komponente')}</Kopfzelle>
                <Kopfzelle zahl>{t('kz.srv.faelle')}</Kopfzelle>
                <Kopfzelle zahl>{t('kz.srv.davonGarantie')}</Kopfzelle>
              </tr>
            </TabelleKopf>
            <TabelleKoerper>
              {komponenten.length === 0 && (
                <Zeile>
                  <Zelle colSpan={3} className="text-muted-foreground text-sm">
                    {t('kz.detail.leer')}
                  </Zelle>
                </Zeile>
              )}
              {komponenten.map((k) => (
                <Zeile
                  key={k.id}
                  className="cursor-pointer"
                  onClick={() => {
                    p.onDetail({ titel: `${t('kz.srv.komponente')} · ${k.id}`, fakten: k.fakten })
                  }}
                >
                  <Zelle>
                    {k.id === 'ohne' ? t('kz.srv.ohneKomponente') : t(`kz.srv.k.${k.id}`, { defaultValue: k.id })}
                  </Zelle>
                  <Zelle zahl className="font-mono">
                    {k.fakten.length}
                  </Zelle>
                  <Zelle zahl className="font-mono">
                    {k.garantie.length}
                  </Zelle>
                </Zeile>
              ))}
            </TabelleKoerper>
          </Tabelle>
        </Karte>

        <Karte className="overflow-hidden">
          <KarteKopf className="flex flex-col items-start gap-0.5">
            <KarteTitel>{t('kz.srv.wartung')}</KarteTitel>
            <p className="text-muted-foreground text-xs">
              {t('kz.srv.wartungHinweis', { n: aktiv.length, wert: franken(summe(aktiv)) })}
            </p>
          </KarteKopf>
          <Tabelle aria-label={t('kz.srv.wartung')}>
            <TabelleKopf>
              <tr>
                <Kopfzelle>{t('kz.srv.paket')}</Kopfzelle>
                <Kopfzelle zahl>{t('kz.srv.aktiv')}</Kopfzelle>
                <Kopfzelle zahl>{t('kz.srv.neuVertraege')}</Kopfzelle>
                <Kopfzelle zahl>{t('kz.srv.gekuendigt')}</Kopfzelle>
                <Kopfzelle zahl>{t('kz.srv.jahreswert')}</Kopfzelle>
              </tr>
            </TabelleKopf>
            <TabelleKoerper>
              {pakete.map((w) => (
                <Zeile
                  key={w.paket}
                  className="cursor-pointer"
                  onClick={() => {
                    p.onDetail({
                      titel: `${t('kz.srv.wartung')} · ${w.paket}`,
                      fakten: [...w.aktiv, ...w.neu, ...w.gekuendigt],
                    })
                  }}
                >
                  <Zelle className="capitalize">{w.paket === 'ohne' ? t('kz.srv.ohnePaket') : w.paket}</Zelle>
                  <Zelle zahl className="font-mono">
                    {w.aktiv.length}
                  </Zelle>
                  <Zelle zahl className="font-mono">
                    {w.neu.length}
                  </Zelle>
                  <Zelle zahl className="font-mono">
                    {w.gekuendigt.length}
                  </Zelle>
                  <Zelle zahl className="font-mono">
                    {zahl(Math.round(w.jahreswert / 100))}
                  </Zelle>
                </Zeile>
              ))}
            </TabelleKoerper>
          </Tabelle>
        </Karte>
      </div>
    </div>
  )
}
