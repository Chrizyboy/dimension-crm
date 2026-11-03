import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Karte, KarteInhalt, KarteKopf, KarteTitel } from '@/components/ui/karte'
import { Kopfzelle, Tabelle, TabelleKoerper, TabelleKopf, Zelle, Zeile } from '@/components/ui/tabelle'
import { useZeilen } from '../hooks/useKennzahlen'
import { quote, summe } from '../lib/auswertung'
import { reaktionQuote, ueberfaellig } from '../lib/betrieb'
import { franken, kurz, zahl } from '../lib/format'
import { hinweise } from '../lib/hinweise'
import { kumulierteLinien, zielArtVon } from '../lib/ueberblick'
import { kwpSumme, pipelineNachStand, produktmix, von } from '../lib/verkauf'
import { montagVon } from '../lib/zeitraum'
import { erreicht, zielFuer, zielTon } from '../lib/ziele'
import type { Fakt } from '../types'
import { Legende, LinienDiagramm } from './Diagramme'
import { BalkenZeile, Kpi } from './Kpi'
import type { ReiterProps } from './reiterProps'

/** Reiter «Überblick» (Startreiter der Geschäftsleitung): acht Kernzahlen, Verlauf, Auffälliges, Firmen, Woche. */
export function Ueberblick(p: ReiterProps) {
  const { t } = useTranslation()
  const { fakten, vorher, e } = p
  const art = zielArtVon(p.bereich, p.person)
  const auftraege = von(fakten, 'angenommen')
  const wert = summe(auftraege)
  const ziel = zielFuer(e, art, p.von, p.bis)
  const zielJahr = zielFuer(e, art, `${p.bis.slice(0, 4)}-01-01`, `${p.bis.slice(0, 4)}-12-31`)
  const v = (s: string) => (vorher ? von(vorher, s) : null)
  const vgl = (zahlVorher: number | null, text: string, wenigerBesser = false) =>
    vorher ? { text: `${p.vergleichName} ${text}`, wert: zahlVorher, wenigerBesser } : null

  const kwp = kwpSumme(von(fakten, 'auftrag'))
  const kwpVorher = vorher ? kwpSumme(von(vorher, 'auftrag')) : null
  const umsatz = von(fakten, 'umsatz')
  const offen = von(fakten, 'rechnung_offen')
  const pipeline = pipelineNachStand(von(fakten, 'offen'), e, p.heute)
  const gewichtet = pipeline.reduce((s, z) => s + z.gewichtet, 0)
  const entschieden = [...auftraege, ...von(fakten, 'verloren')]
  const q = quote(entschieden)
  const qVorher = vorher ? quote([...von(vorher, 'angenommen'), ...von(vorher, 'verloren')]) : null
  const reaktion = reaktionQuote(von(fakten, 'fall_neu'))
  const projekte = von(fakten, 'projekt_stand')
  const zielProzent = erreicht(wert, ziel)
  const linien = kumulierteLinien(
    auftraege,
    v('angenommen'),
    p.zeitraum,
    p.von,
    p.bis,
    vorher ? p.vergleich : null,
    ziel,
  )

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4" data-testid="kz-ueberblick">
        <Kpi
          titel={t('kz.k.auftragseingang')}
          wert={franken(wert)}
          zahl={wert}
          vergleich={vgl(v('angenommen') ? summe(v('angenommen') ?? []) : null, franken(summe(v('angenommen') ?? [])))}
          ziel={ziel}
          zielText={zielJahr ? kurz(zielJahr) : ''}
          unter={t('kz.k.auftraegeAnzahl', { n: auftraege.length })}
          onKlick={() => {
            p.onDetail({ titel: t('kz.k.auftragseingang'), fakten: auftraege })
          }}
        />
        <Kpi
          titel={t('kz.k.kwp')}
          wert={`${zahl(kwp, 1)} kWp`}
          zahl={kwp}
          vergleich={vgl(kwpVorher, `${zahl(kwpVorher ?? 0, 1)} kWp`)}
          unter={
            auftraege.length
              ? t('kz.k.kwpSchnitt', { kwp: zahl(kwp / Math.max(von(fakten, 'auftrag').length, 1), 1) })
              : undefined
          }
          onKlick={() => {
            p.onDetail({ titel: t('kz.k.kwp'), fakten: von(fakten, 'auftrag') })
          }}
        />
        {p.finanzen ? (
          <Kpi
            titel={t('kz.k.umsatz')}
            wert={franken(summe(umsatz))}
            zahl={summe(umsatz)}
            vergleich={vgl(vorher ? summe(v('umsatz') ?? []) : null, franken(summe(v('umsatz') ?? [])))}
            ziel={p.person ? undefined : zielFuer(e, { art: 'umsatz' }, p.von, p.bis)}
            zielText={kurz(
              zielFuer(e, { art: 'umsatz' }, `${p.bis.slice(0, 4)}-01-01`, `${p.bis.slice(0, 4)}-12-31`) ?? 0,
            )}
            onKlick={() => {
              p.onDetail({ titel: t('kz.k.umsatz'), fakten: umsatz })
            }}
          />
        ) : (
          <Kpi
            titel={t('kz.k.quote')}
            wert={q === null ? '–' : `${String(q)} %`}
            zahl={q}
            vergleich={vgl(qVorher, qVorher === null ? '–' : `${String(qVorher)} %`)}
            unter={t('kz.kachel.quoteHinweis', { n: entschieden.length })}
            onKlick={() => {
              p.onDetail({ titel: t('kz.k.quote'), fakten: entschieden })
            }}
          />
        )}
        <Kpi
          titel={t('kz.k.offeneAuftraege')}
          wert={franken(summe(projekte))}
          unter={t('kz.k.projekteAnzahl', { n: projekte.length })}
          onKlick={() => {
            p.onDetail({ titel: t('kz.k.offeneAuftraege'), fakten: projekte })
          }}
        />
        <Kpi
          titel={t('kz.k.pipeline')}
          wert={franken(gewichtet)}
          unter={t('kz.k.pipelineUnter', { wert: kurz(summe(von(fakten, 'offen'))) })}
          onKlick={() => {
            p.onDetail({ titel: t('kz.k.pipeline'), fakten: von(fakten, 'offen') })
          }}
        />
        {p.finanzen ? (
          <Kpi
            titel={t('kz.k.offenKunden')}
            wert={franken(summe(offen))}
            unter={t('kz.k.ueberfaellig', { wert: franken(summe(ueberfaellig(offen))) })}
            unterTon={ueberfaellig(offen).length ? 'kritisch' : undefined}
            onKlick={() => {
              p.onDetail({ titel: t('kz.k.offenKunden'), fakten: offen })
            }}
          />
        ) : (
          <Kpi
            titel={t('kz.kachel.nachfassen')}
            wert={String(von(fakten, 'nf_faellig').length)}
            onKlick={() => {
              p.onDetail({ titel: t('kz.kachel.nachfassen'), fakten: von(fakten, 'nf_faellig') })
            }}
          />
        )}
        <Kpi
          titel={t('kz.k.reaktion')}
          wert={reaktion.prozent === null ? '–' : `${String(reaktion.prozent)} %`}
          unter={t('kz.k.reaktionUnter', {
            richtwert: e.richtwerte.reaktion_prozent,
            n: von(fakten, 'faelle_offen').length,
          })}
          unterTon={
            reaktion.prozent === null ? undefined : reaktion.prozent >= e.richtwerte.reaktion_prozent ? 'ok' : 'warnung'
          }
          onKlick={() => {
            p.onDetail({ titel: t('kz.k.reaktion'), fakten: reaktion.fakten })
          }}
        />
        <Kpi
          titel={t('kz.k.ibn')}
          wert={String(von(fakten, 'ibn').length)}
          zahl={von(fakten, 'ibn').length}
          vergleich={vgl(v('ibn')?.length ?? null, String(v('ibn')?.length ?? 0))}
          unter={t('kz.k.ibnUnter', { kwp: zahl(kwpSumme(von(fakten, 'ibn')), 1) })}
          onKlick={() => {
            p.onDetail({ titel: t('kz.k.ibn'), fakten: von(fakten, 'ibn') })
          }}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[2fr_1fr]">
        <Karte>
          <KarteKopf className="flex flex-col items-start gap-1">
            <KarteTitel>{t('kz.verlauf.titel')}</KarteTitel>
            <Legende
              eintraege={[
                { text: t('kz.verlauf.jetzt'), farbe: 'reihe-1' },
                ...(linien.vorher ? [{ text: p.vergleichName, farbe: 'reihe-2' as const }] : []),
                ...(linien.ziel ? [{ text: t('kz.verlauf.ziel'), farbe: 'ziel' as const }] : []),
              ]}
            />
          </KarteKopf>
          <KarteInhalt>
            <LinienDiagramm
              titel={t('kz.verlauf.titel')}
              faecher={linien.beschriftung}
              format={(w) => kurz(w)}
              linien={[
                ...(linien.ziel ? [{ id: 'ziel', werte: linien.ziel, farbe: 'ziel' as const }] : []),
                ...(linien.vorher ? [{ id: 'vorher', werte: linien.vorher, farbe: 'reihe-2' as const }] : []),
                { id: 'jetzt', werte: linien.jetzt, farbe: 'reihe-1' },
              ]}
            />
          </KarteInhalt>
        </Karte>
        <Auffaellig {...p} zielProzent={zielProzent} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Firmen {...p} />
        <Woche {...p} />
        <Karte>
          <KarteKopf>
            <KarteTitel>{t('kz.produkte.titel')}</KarteTitel>
          </KarteKopf>
          <KarteInhalt className="flex flex-col gap-1">
            {produktmix(von(fakten, 'auftrag')).map((m) => (
              <BalkenZeile
                key={m.produkt}
                text={t(`kz.produkte.${m.produkt}`)}
                anteil={m.anteil}
                zahl={`${String(m.anteil)} %`}
                onKlick={() => {
                  p.onDetail({ titel: t(`kz.produkte.${m.produkt}`), fakten: m.fakten })
                }}
              />
            ))}
            <p className="text-muted-foreground pt-1 text-xs">{t('kz.produkte.hinweis')}</p>
          </KarteInhalt>
        </Karte>
      </div>
      {zielTon(zielProzent) === 'neutral' && p.finanzen && (
        <p className="text-muted-foreground text-xs">{t('kz.ziele.keine')}</p>
      )}
    </div>
  )
}

/** Karte «Was auffällt». */
function Auffaellig(p: ReiterProps & { zielProzent: number | null }) {
  const { t } = useTranslation()
  const liste = hinweise(p.fakten, p.e, p.heute, p.zielProzent)
  const ton = { kritisch: 'kritisch', warnung: 'warnung', ok: 'ok', info: 'info' } as const
  return (
    <Karte data-testid="kz-auffaellig">
      <KarteKopf className="flex flex-col items-start gap-0.5">
        <KarteTitel>{t('kz.hinweis.titel')}</KarteTitel>
        <p className="text-muted-foreground text-xs">{t('kz.hinweis.beschreibung')}</p>
      </KarteKopf>
      <KarteInhalt className="flex flex-col divide-y">
        {liste.length === 0 && <p className="text-muted-foreground py-2 text-sm">{t('kz.hinweis.nichts')}</p>}
        {liste.map((h) => (
          <button
            key={`${h.id}-${JSON.stringify(h.werte)}`}
            type="button"
            className="hover:bg-muted focus-visible:ring-ring flex items-start gap-2 py-2 text-left text-sm outline-none focus-visible:ring-2"
            onClick={() => {
              p.onDetail({ titel: t(`kz.hinweis.${h.id}`, fuerText(h.werte, t)), fakten: h.fakten })
            }}
          >
            <Badge ton={ton[h.ton]}>{t(`kz.hinweis.ton.${h.ton}`)}</Badge>
            <span>{t(`kz.hinweis.${h.id}`, fuerText(h.werte, t))}</span>
          </button>
        ))}
      </KarteInhalt>
    </Karte>
  )
}

/** Werte eines Hinweises lesbar machen (Beträge, Standortnamen). */
function fuerText(w: Record<string, string | number>, t: (k: string) => string) {
  return {
    ...w,
    ...(typeof w.wert === 'number' ? { wert: franken(w.wert) } : {}),
    ...(typeof w.standort === 'string' ? { standort: t(`kz.spalte.${w.standort}`) } : {}),
  }
}

/** Karte «Muri und Bulle»: die wichtigsten Zahlen beider Firmen nebeneinander. */
function Firmen(p: ReiterProps) {
  const { t } = useTranslation()
  const zeilen = (['muri', 'bulle'] as const).map((s) => {
    const f = p.fakten.filter((x) => x.standort === s)
    const a = von(f, 'angenommen')
    return {
      s,
      auftrag: summe(a),
      ziel: erreicht(summe(a), zielFuer(p.e, { art: 'bereich', bereich: s }, p.von, p.bis)),
      quote: quote([...a, ...von(f, 'verloren')]),
      offen: summe(von(f, 'offen')),
      umsatz: summe(von(f, 'umsatz')),
    }
  })
  const reihe = (titel: string, wert: (z: (typeof zeilen)[number]) => string) => (
    <Zeile>
      <Zelle>{titel}</Zelle>
      {zeilen.map((z) => (
        <Zelle key={z.s} zahl className="font-mono">
          {wert(z)}
        </Zelle>
      ))}
    </Zeile>
  )
  return (
    <Karte>
      <KarteKopf>
        <KarteTitel>{t('kz.firmen.titel')}</KarteTitel>
      </KarteKopf>
      <Tabelle aria-label={t('kz.firmen.titel')}>
        <TabelleKopf>
          <tr>
            <Kopfzelle />
            <Kopfzelle zahl>{t('kz.spalte.muri')}</Kopfzelle>
            <Kopfzelle zahl>{t('kz.spalte.bulle')}</Kopfzelle>
          </tr>
        </TabelleKopf>
        <TabelleKoerper>
          {reihe(t('kz.k.auftragseingang'), (z) => kurz(z.auftrag))}
          {reihe(t('kz.firmen.ziel'), (z) => (z.ziel === null ? '–' : `${String(z.ziel)} %`))}
          {reihe(t('kz.k.quote'), (z) => (z.quote === null ? '–' : `${String(z.quote)} %`))}
          {reihe(t('kz.firmen.offen'), (z) => kurz(z.offen))}
          {p.finanzen && reihe(t('kz.k.umsatz'), (z) => kurz(z.umsatz))}
        </TabelleKoerper>
      </Tabelle>
    </Karte>
  )
}

/** Karte «Woche in Zahlen»: laufende Woche, unabhängig vom gewählten Zeitraum. */
function Woche(p: ReiterProps) {
  const { t } = useTranslation()
  const w = useZeilen(montagVon(p.heute), p.heute)
  const f: Fakt[] = p.filtern(w.data ?? [])
  const zeilen: [string, Fakt[], string][] = [
    ['leads', von(f, 'leads_neu'), String(von(f, 'leads_neu').length)],
    ['gesendet', von(f, 'gesendet'), String(von(f, 'gesendet').length)],
    [
      'angenommen',
      von(f, 'angenommen'),
      `${String(von(f, 'angenommen').length)} · ${kurz(summe(von(f, 'angenommen')))}`,
    ],
    ['ibn', von(f, 'ibn'), `${String(von(f, 'ibn').length)} · ${zahl(kwpSumme(von(f, 'ibn')), 1)} kWp`],
    ['faelle', von(f, 'faelle_neu'), String(von(f, 'faelle_neu').length)],
  ]
  return (
    <Karte>
      <KarteKopf>
        <KarteTitel>{t('kz.woche.titel')}</KarteTitel>
      </KarteKopf>
      <Tabelle aria-label={t('kz.woche.titel')}>
        <TabelleKoerper>
          {zeilen.map(([id, fakten, text]) => (
            <Zeile
              key={id}
              className="cursor-pointer"
              onClick={() => {
                p.onDetail({ titel: t(`kz.woche.${id}`), fakten })
              }}
            >
              <Zelle>{t(`kz.woche.${id}`)}</Zelle>
              <Zelle zahl className="font-mono">
                {w.isLoading ? '…' : text}
              </Zelle>
            </Zeile>
          ))}
        </TabelleKoerper>
      </Tabelle>
    </Karte>
  )
}
