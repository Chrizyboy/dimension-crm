import { useTranslation } from 'react-i18next'
import { Karte, KarteInhalt, KarteKopf, KarteTitel } from '@/components/ui/karte'
import { Kopfzelle, Tabelle, TabelleKoerper, TabelleKopf, Zelle, Zeile } from '@/components/ui/tabelle'
import { summe } from '../lib/auswertung'
import { proMonat } from '../lib/betrieb'
import { franken, kurz, tageText, zahl } from '../lib/format'
import { gruppiere, kwpSumme, mittelTage, von } from '../lib/verkauf'
import { fachText } from '../lib/zeitraum'
import { AbwicklungTabelle } from './AbwicklungTabelle'
import { Betrieb } from './Betrieb'
import { Legende, SaeulenDiagramm } from './Diagramme'
import { Kpi } from './Kpi'
import type { ReiterProps } from './reiterProps'

/**
 * Reiter «Abwicklung» (Projektleitung): Inbetriebnahmen mit kWp, offene Aufträge, Durchlaufzeiten ab Unterschrift
 * mit Richtwert, Projekte nach Stand, IBN je Monat; darunter Auftragsbestand, Auslastung und Marge wie bisher.
 */
export function Abwicklung(p: ReiterProps) {
  const { t } = useTranslation()
  const ibn = von(p.fakten, 'ibn')
  const bau = von(p.fakten, 'baubeginn')
  const projekte = von(p.fakten, 'projekt_stand')
  const tageIbn = mittelTage(ibn)
  const tageIbnVorher = p.vorher ? mittelTage(von(p.vorher, 'ibn')) : null
  const richtwert = p.e.richtwerte.unterschrift_ibn_tage
  const monate = proMonat(
    p.fakten,
    ['ibn'],
    p.zeitraum === 'woche' || p.zeitraum === 'monat' ? `${p.bis.slice(0, 4)}-01-01` : p.von,
    p.bis,
  )
  const nachStand = gruppiere(projekte, (f) => f.zusatz ?? '–')

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4" data-testid="kz-abwicklung">
        <Kpi
          titel={t('kz.k.ibn')}
          wert={String(ibn.length)}
          zahl={ibn.length}
          vergleich={
            p.vorher
              ? { text: `${p.vergleichName} ${String(von(p.vorher, 'ibn').length)}`, wert: von(p.vorher, 'ibn').length }
              : null
          }
          unter={t('kz.k.ibnUnter', { kwp: zahl(kwpSumme(ibn), 1) })}
          onKlick={() => {
            p.onDetail({ titel: t('kz.k.ibn'), fakten: ibn })
          }}
        />
        <Kpi
          titel={t('kz.k.offeneAuftraege')}
          wert={franken(summe(projekte))}
          unter={t('kz.k.projekteAnzahl', { n: projekte.length })}
          onKlick={() => {
            p.onDetail({ titel: t('kz.k.offeneAuftraege'), fakten: projekte })
          }}
        />
        <Kpi
          titel={t('kz.abw.bau')}
          wert={`${tageText(mittelTage(bau))} ${t('kz.abw.tage')}`}
          unter={t('kz.abw.bauUnter', { n: bau.length })}
          onKlick={() => {
            p.onDetail({ titel: t('kz.abw.bau'), fakten: bau })
          }}
        />
        <Kpi
          titel={t('kz.abw.ibnTage')}
          wert={`${tageText(tageIbn)} ${t('kz.abw.tage')}`}
          zahl={tageIbn}
          vergleich={
            p.vorher
              ? { text: `${p.vergleichName} ${tageText(tageIbnVorher)}`, wert: tageIbnVorher, wenigerBesser: true }
              : null
          }
          unter={t('kz.abw.richtwert', { tage: richtwert })}
          unterTon={tageIbn === null ? undefined : tageIbn <= richtwert ? 'ok' : 'warnung'}
          onKlick={() => {
            p.onDetail({ titel: t('kz.abw.ibnTage'), fakten: ibn })
          }}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Karte className="overflow-hidden">
          <KarteKopf className="flex flex-col items-start gap-0.5">
            <KarteTitel>{t('kz.abw.nachStand')}</KarteTitel>
            <p className="text-muted-foreground text-xs">{t('kz.abw.nachStandHinweis')}</p>
          </KarteKopf>
          <Tabelle aria-label={t('kz.abw.nachStand')}>
            <TabelleKopf>
              <tr>
                <Kopfzelle>{t('kz.abw.stand')}</Kopfzelle>
                <Kopfzelle zahl>{t('kz.spalte.muri')}</Kopfzelle>
                <Kopfzelle zahl>{t('kz.spalte.bulle')}</Kopfzelle>
                <Kopfzelle zahl>{t('kz.pipe.wert')}</Kopfzelle>
                <Kopfzelle zahl>{t('kz.abw.seit')}</Kopfzelle>
              </tr>
            </TabelleKopf>
            <TabelleKoerper>
              {nachStand.map((g) => (
                <Zeile
                  key={g.id}
                  className="cursor-pointer"
                  onClick={() => {
                    p.onDetail({ titel: t(`kz.abw.s.${g.id}`, { defaultValue: g.id }), fakten: g.fakten })
                  }}
                >
                  <Zelle>{t(`kz.abw.s.${g.id}`, { defaultValue: g.id })}</Zelle>
                  <Zelle zahl className="font-mono">
                    {g.fakten.filter((f) => f.standort === 'muri').length}
                  </Zelle>
                  <Zelle zahl className="font-mono">
                    {g.fakten.filter((f) => f.standort === 'bulle').length}
                  </Zelle>
                  <Zelle zahl className="font-mono">
                    {kurz(summe(g.fakten))}
                  </Zelle>
                  <Zelle zahl className="font-mono">
                    {tageText(mittelTage(g.fakten))}
                  </Zelle>
                </Zeile>
              ))}
            </TabelleKoerper>
          </Tabelle>
        </Karte>

        <Karte>
          <KarteKopf className="flex flex-col items-start gap-1">
            <KarteTitel>{t('kz.abw.ibnMonat')}</KarteTitel>
            <Legende eintraege={[{ text: 'kWp', farbe: 'reihe-1' }]} />
          </KarteKopf>
          <KarteInhalt>
            <SaeulenDiagramm
              titel={t('kz.abw.ibnMonat')}
              faecher={monate.map((m) => fachText('jahr', m.monat))}
              reihen={[monate.map((m) => kwpSumme(m.reihen[0] ?? []))]}
              format={(w) => zahl(w)}
              onKlick={(i) => {
                p.onDetail({
                  titel: `${t('kz.abw.ibnMonat')} · ${fachText('jahr', monate[i]?.monat ?? '')}`,
                  fakten: monate[i]?.reihen[0] ?? [],
                })
              }}
            />
          </KarteInhalt>
        </Karte>
      </div>

      <AbwicklungTabelle fakten={p.fakten} e={p.e} onDetail={p.onDetail} />
      <Betrieb von={p.von} bis={p.bis} bereich={p.bereich} />
    </div>
  )
}
