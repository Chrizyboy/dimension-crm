import { useTranslation } from 'react-i18next'
import { Leerzustand } from '@/components/shared/Zustaende'
import { Badge } from '@/components/ui/badge'
import { Karte, KarteInhalt, KarteKopf, KarteTitel } from '@/components/ui/karte'
import { Kopfzelle, Tabelle, TabelleKoerper, TabelleKopf, Zelle, Zeile } from '@/components/ui/tabelle'
import { Lock } from 'lucide-react'
import { summe } from '../lib/auswertung'
import { proMonat, rechnungenNachAlter, ueberfaellig } from '../lib/betrieb'
import { franken, kurz, tageText } from '../lib/format'
import { gruppiere, mittelTage, von } from '../lib/verkauf'
import { fachText } from '../lib/zeitraum'
import { zielFuer } from '../lib/ziele'
import { Legende, SaeulenDiagramm } from './Diagramme'
import { Kpi } from './Kpi'
import type { ReiterProps } from './reiterProps'

/**
 * Reiter «Finanzen» (nur Recht «finanzen»; Umsatz = gestellte Rechnungen exkl. MWST, K5 A): Umsatz gegen Ziel,
 * Zahlungseingang, offene und überfällige Rechnungen, Zahlungsdauer, Verlauf je Monat, Umsatz je Rechnungsart.
 */
export function Finanzen(p: ReiterProps) {
  const { t } = useTranslation()
  if (!p.finanzen) return <Leerzustand icon={Lock} titel={t('kz.fin.keinZugriff')} text={t('kz.fin.keinZugriffText')} />

  const umsatz = von(p.fakten, 'umsatz')
  const bezahlt = von(p.fakten, 'bezahlt')
  const offen = von(p.fakten, 'rechnung_offen')
  const ueber = ueberfaellig(offen)
  const jahr = p.bis.slice(0, 4)
  const zielJahr = zielFuer(p.e, { art: 'umsatz' }, `${jahr}-01-01`, `${jahr}-12-31`)
  const vgl = (s: string) =>
    p.vorher ? { text: `${p.vergleichName} ${franken(summe(von(p.vorher, s)))}`, wert: summe(von(p.vorher, s)) } : null
  const start = p.zeitraum === 'woche' || p.zeitraum === 'monat' || p.zeitraum === 'quartal' ? `${jahr}-01-01` : p.von
  const monate = proMonat(p.fakten, ['umsatz', 'bezahlt'], start, p.bis)
  const arten = gruppiere(umsatz, (f) => f.zusatz ?? 'frei')

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4" data-testid="kz-finanzen">
        <Kpi
          titel={t('kz.k.umsatz')}
          wert={franken(summe(umsatz))}
          zahl={summe(umsatz)}
          vergleich={vgl('umsatz')}
          ziel={zielFuer(p.e, { art: 'umsatz' }, p.von, p.bis)}
          zielText={zielJahr ? kurz(zielJahr) : ''}
          unter={t('kz.fin.rechnungen', { n: umsatz.length })}
          onKlick={() => {
            p.onDetail({ titel: t('kz.k.umsatz'), fakten: umsatz })
          }}
        />
        <Kpi
          titel={t('kz.fin.eingang')}
          wert={franken(summe(bezahlt))}
          zahl={summe(bezahlt)}
          vergleich={vgl('bezahlt')}
          unter={t('kz.fin.inkl')}
          onKlick={() => {
            p.onDetail({ titel: t('kz.fin.eingang'), fakten: bezahlt })
          }}
        />
        <Kpi
          titel={t('kz.k.offenKunden')}
          wert={franken(summe(offen))}
          unter={t('kz.fin.ueberfaellig', { n: ueber.length, wert: franken(summe(ueber)) })}
          unterTon={ueber.length ? 'kritisch' : undefined}
          onKlick={() => {
            p.onDetail({ titel: t('kz.k.offenKunden'), fakten: offen })
          }}
        />
        <Kpi
          titel={t('kz.fin.dauer')}
          wert={`${tageText(mittelTage(bezahlt))} ${t('kz.abw.tage')}`}
          zahl={mittelTage(bezahlt)}
          vergleich={
            p.vorher
              ? {
                  text: `${p.vergleichName} ${tageText(mittelTage(von(p.vorher, 'bezahlt')))}`,
                  wert: mittelTage(von(p.vorher, 'bezahlt')),
                  wenigerBesser: true,
                }
              : null
          }
          unter={t('kz.fin.dauerUnter')}
          onKlick={() => {
            p.onDetail({ titel: t('kz.fin.dauer'), fakten: bezahlt })
          }}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Karte>
          <KarteKopf className="flex flex-col items-start gap-1">
            <KarteTitel>{t('kz.fin.verlauf')}</KarteTitel>
            <Legende
              eintraege={[
                { text: t('kz.fin.verrechnet'), farbe: 'reihe-1' },
                { text: t('kz.fin.bezahlt'), farbe: 'reihe-2' },
              ]}
            />
          </KarteKopf>
          <KarteInhalt>
            <SaeulenDiagramm
              titel={t('kz.fin.verlauf')}
              faecher={monate.map((m) => fachText('jahr', m.monat))}
              reihen={[monate.map((m) => summe(m.reihen[0] ?? [])), monate.map((m) => summe(m.reihen[1] ?? []))]}
              format={kurz}
              onKlick={(i) => {
                const m = monate[i]
                if (m)
                  p.onDetail({
                    titel: `${t('kz.fin.verlauf')} · ${fachText('jahr', m.monat)}`,
                    fakten: m.reihen.flat(),
                  })
              }}
            />
          </KarteInhalt>
        </Karte>

        <Karte className="overflow-hidden">
          <KarteKopf className="flex flex-col items-start gap-0.5">
            <KarteTitel>{t('kz.fin.alter')}</KarteTitel>
            <p className="text-muted-foreground text-xs">{t('kz.fin.alterHinweis')}</p>
          </KarteKopf>
          <Tabelle aria-label={t('kz.fin.alter')}>
            <TabelleKopf>
              <tr>
                <Kopfzelle>{t('kz.fin.faelligkeit')}</Kopfzelle>
                <Kopfzelle zahl>{t('kz.pipe.anzahl')}</Kopfzelle>
                <Kopfzelle zahl>{t('kz.detail.betrag')}</Kopfzelle>
                <Kopfzelle zahl>{t('kz.fin.gemahnt')}</Kopfzelle>
              </tr>
            </TabelleKopf>
            <TabelleKoerper>
              {rechnungenNachAlter(offen).map((k) => {
                const gemahnt = k.fakten.filter((f) => Number(f.zusatz ?? 0) > 0).length
                return (
                  <Zeile
                    key={k.id}
                    className="cursor-pointer"
                    onClick={() => {
                      p.onDetail({ titel: t(`kz.fin.k.${k.id}`), fakten: k.fakten })
                    }}
                  >
                    <Zelle>{t(`kz.fin.k.${k.id}`)}</Zelle>
                    <Zelle zahl className="font-mono">
                      {k.fakten.length}
                    </Zelle>
                    <Zelle zahl className="font-mono">
                      {franken(k.betrag)}
                    </Zelle>
                    <Zelle zahl>
                      {gemahnt ? <Badge ton={k.id === 'mehr60' ? 'kritisch' : 'warnung'}>{gemahnt}</Badge> : '–'}
                    </Zelle>
                  </Zeile>
                )
              })}
            </TabelleKoerper>
          </Tabelle>
        </Karte>
      </div>

      <Karte className="overflow-hidden">
        <KarteKopf>
          <KarteTitel>{t('kz.fin.arten')}</KarteTitel>
        </KarteKopf>
        <Tabelle aria-label={t('kz.fin.arten')}>
          <TabelleKopf>
            <tr>
              <Kopfzelle>{t('kz.fin.art')}</Kopfzelle>
              <Kopfzelle zahl>{t('kz.pipe.anzahl')}</Kopfzelle>
              <Kopfzelle zahl>{t('kz.k.umsatz')}</Kopfzelle>
              <Kopfzelle zahl>{t('kz.fin.anteil')}</Kopfzelle>
            </tr>
          </TabelleKopf>
          <TabelleKoerper>
            {arten.map((a) => (
              <Zeile
                key={a.id}
                className="cursor-pointer"
                onClick={() => {
                  p.onDetail({ titel: t(`kz.fin.a.${a.id}`, { defaultValue: a.id }), fakten: a.fakten })
                }}
              >
                <Zelle>{t(`kz.fin.a.${a.id}`, { defaultValue: a.id })}</Zelle>
                <Zelle zahl className="font-mono">
                  {a.fakten.length}
                </Zelle>
                <Zelle zahl className="font-mono">
                  {franken(summe(a.fakten))}
                </Zelle>
                <Zelle zahl className="font-mono">
                  {summe(umsatz) ? `${String(Math.round((summe(a.fakten) / summe(umsatz)) * 100))} %` : '–'}
                </Zelle>
              </Zeile>
            ))}
          </TabelleKoerper>
        </Tabelle>
      </Karte>
    </div>
  )
}
