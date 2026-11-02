import { Link } from '@tanstack/react-router'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Filterchips } from '@/components/shared/Filterchips'
import { Button } from '@/components/ui/button'
import { Karte, KarteKopf, KarteTitel } from '@/components/ui/karte'
import { formatChf, formatDatum } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useAnmeldung } from '@/stores/anmeldung'
import { heuteZuTun, nachAlter } from '../lib/cockpit'
import { heuteZuerich, plusTage } from '../lib/datum'
import { vorschau } from '../lib/vorschau'
import type { Finanzdaten, Reiter, Szenario } from '../types'
import { Wochenbalken } from './Wochenbalken'

const PUNKT = { kritisch: 'bg-bad', warnung: 'bg-accent', info: 'bg-info' } as const

/**
 * Cockpit für Geschäftsleitung und Buchhaltung: fünf Zahlen (Geld auf den Konten, tiefster Stand, was Kunden uns
 * und was wir Lieferanten schulden, MWST), Kontostand der nächsten Wochen, «Heute zu tun» mit Sprung in den
 * richtigen Reiter und offene Kundenrechnungen nach Alter (gemahnt wird unter «Rechnungen»).
 */
export function Cockpit({
  daten,
  reserve,
  onReiter,
}: {
  daten: Finanzdaten
  reserve: number
  onReiter: (r: Reiter) => void
}) {
  const { t } = useTranslation()
  const ich = useAnmeldung((z) => z.ich)
  const [szenario, setSzenario] = useState<Szenario>('real')
  const heute = heuteZuerich()
  const v = vorschau(daten, heute, szenario)
  const offen = daten.zahlungen.filter((z) => z.status === 'offen')
  const betrag = (z: (typeof offen)[number]) => z.offen_rappen ?? z.betrag_rappen ?? 0
  const lieferanten = offen.filter((z) => z.kategorie !== 'Lohn')
  const debitoren = daten.rechnungen.reduce((s, r) => s + r.offen_rappen, 0)
  const ueberfaellig = daten.rechnungen
    .filter((r) => r.faellig_am && r.faellig_am < heute)
    .reduce((s, r) => s + r.offen_rappen, 0)
  const mwst = daten.mwst
    .filter((m) => !m.bezahlt_am && m.zahllast_rappen > 0 && m.faellig_am >= plusTage(heute, -30))
    .sort((a, b) => a.faellig_am.localeCompare(b.faellig_am))
  const naechsteMwst = mwst.filter((m) => m.faellig_am === mwst[0]?.faellig_am)
  const tranchen = daten.tranchen.reduce((s, x) => s + x.betrag_rappen, 0)
  const zuTun = heuteZuTun(daten, heute, ich?.id ?? null)
  const alter = nachAlter(daten.rechnungen, heute)
  const maxAlter = Math.max(1, ...alter.map((a) => a.rappen))
  const altKonto = daten.konten.filter((k) => k.aktiv && k.stand_am && k.stand_am < plusTage(heute, -4)).length

  const kacheln = [
    {
      label: t('finanzen.cockpit.geld'),
      wert: v.saldo.bekannt ? formatChf(v.saldo.rappen, { mitWaehrung: true }) : '–',
      klein: daten.konten.length
        ? t('finanzen.cockpit.konten', { count: daten.konten.length, alt: altKonto })
        : v.saldo.seit
          ? t('finanzen.kachel.eingetragen', { datum: formatDatum(v.saldo.seit), count: v.saldo.buchungen })
          : t('finanzen.kachel.fehlt'),
    },
    {
      label: t('finanzen.cockpit.tiefster', { wochen: v.wochen.length }),
      wert: v.tiefste ? formatChf(v.tiefste.ende, { mitWaehrung: true }) : '–',
      klein: v.tiefste
        ? `${t('finanzen.kw', { kw: v.tiefste.kw })}${v.tiefste.ende < reserve ? ` · ${t('finanzen.cockpit.unterReserve')}` : ''}`
        : '',
      schlecht: Boolean(v.tiefste && v.tiefste.ende < reserve),
    },
    {
      label: t('finanzen.cockpit.kunden'),
      wert: formatChf(debitoren, { mitWaehrung: true }),
      klein: t('finanzen.cockpit.ueberfaellig', { betrag: formatChf(ueberfaellig) }),
    },
    {
      label: t('finanzen.cockpit.lieferanten'),
      wert: formatChf(
        lieferanten.reduce((s, z) => s + betrag(z), 0),
        { mitWaehrung: true },
      ),
      klein: t('finanzen.cockpit.faellig7', {
        betrag: formatChf(
          lieferanten
            .filter((z) => !z.faellig_am || z.faellig_am <= plusTage(heute, 7))
            .reduce((s, z) => s + betrag(z), 0),
        ),
      }),
    },
    {
      label: naechsteMwst[0]
        ? t('finanzen.cockpit.mwst', { periode: naechsteMwst[0].periode })
        : t('finanzen.cockpit.mwstLeer'),
      wert: naechsteMwst.length
        ? formatChf(
            naechsteMwst.reduce((s, m) => s + m.zahllast_rappen, 0),
            { mitWaehrung: true },
          )
        : '–',
      klein: naechsteMwst[0]
        ? t(
            naechsteMwst.every((m) => m.verbindlich)
              ? 'finanzen.cockpit.mwstFaellig'
              : 'finanzen.cockpit.mwstGeschaetzt',
            {
              datum: formatDatum(naechsteMwst[0].faellig_am),
            },
          )
        : '',
    },
  ]

  return (
    <div className="flex flex-col gap-4">
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-5" aria-label={t('finanzen.kennzahlen')}>
        {kacheln.map((k) => (
          <div key={k.label} className="bg-surface flex flex-col gap-1 rounded-lg border p-3">
            <span className="text-muted-foreground text-xs">{k.label}</span>
            <span className={cn('zahlen font-display text-lg font-semibold', k.schlecht && 'text-bad')}>{k.wert}</span>
            <span className="text-muted-foreground text-xs">{k.klein}</span>
          </div>
        ))}
      </section>
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-2">
          <Filterchips
            einzeln
            beschriftung={t('finanzen.szenario.titel')}
            optionen={(['real', 'pess', 'opt'] as const).map((s) => ({ wert: s, text: t(`finanzen.szenario.${s}`) }))}
            gewaehlt={[szenario]}
            onChange={([s]) => {
              if (s) setSzenario(s as Szenario)
            }}
          />
          <Wochenbalken wochen={v.wochen} reserve={reserve} />
          <p className="text-muted-foreground text-xs">{t('finanzen.cockpit.grafikHinweis')}</p>
        </div>
        <Karte>
          <KarteKopf>
            <KarteTitel>{t('finanzen.cockpit.zuTun')}</KarteTitel>
          </KarteKopf>
          {zuTun.length === 0 ? (
            <p className="text-muted-foreground px-4 pb-4 text-sm">{t('finanzen.cockpit.nichtsZuTun')}</p>
          ) : (
            <ul className="divide-y px-4 pb-2">
              {zuTun.map((a) => (
                <li key={`${a.schluessel}-${JSON.stringify(a.werte)}`} className="flex items-start gap-3 py-2.5">
                  <span className={cn('mt-1.5 size-2 shrink-0 rounded-full', PUNKT[a.ton])} aria-hidden="true" />
                  <span className="min-w-0 flex-1 text-sm">
                    {t(`finanzen.zuTun.${a.schluessel}`, {
                      ...a.werte,
                      betrag:
                        typeof a.werte.betrag === 'number' ? formatChf(a.werte.betrag, { mitWaehrung: true }) : '',
                      datum: typeof a.werte.datum === 'string' && a.werte.datum ? formatDatum(a.werte.datum) : '',
                    })}
                  </span>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      onReiter(a.reiter)
                    }}
                  >
                    {t('finanzen.cockpit.oeffnen')}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Karte>
      </div>
      <div className="grid items-start gap-4 lg:grid-cols-2">
        <Karte>
          <KarteKopf className="flex items-center justify-between">
            <KarteTitel>{t('finanzen.cockpit.alter')}</KarteTitel>
            <Link to="/invoices" className="text-muted-foreground hover:text-foreground text-xs">
              {t('finanzen.cockpit.zuRechnungen')}
            </Link>
          </KarteKopf>
          <ul className="flex flex-col gap-2 px-4 pb-4 text-sm">
            {alter.map((a, i) => (
              <li key={a.schluessel} className="grid grid-cols-[8rem_3rem_7rem_minmax(0,1fr)] items-center gap-2">
                <span>{t(`finanzen.cockpit.altersstufe.${a.schluessel}`)}</span>
                <span className="zahlen text-muted-foreground text-right">{a.anzahl}</span>
                <span className="zahlen text-right">{formatChf(a.rappen)}</span>
                <span className="bg-muted h-2 overflow-hidden rounded-full">
                  <span
                    className={cn('block h-full', i === 0 ? 'bg-reihe-1' : i === 3 ? 'bg-bad' : 'bg-reihe-2')}
                    style={{ width: `${String((a.rappen / maxAlter) * 100)}%` }}
                  />
                </span>
              </li>
            ))}
          </ul>
        </Karte>
        <Karte>
          <KarteKopf>
            <KarteTitel>{t('finanzen.cockpit.bestand')}</KarteTitel>
          </KarteKopf>
          <dl className="grid grid-cols-2 gap-3 px-4 pb-4 text-sm">
            <div>
              <dt className="text-muted-foreground text-xs">
                {t('finanzen.cockpit.tranchen', { count: daten.tranchen.length })}
              </dt>
              <dd className="zahlen font-semibold">{formatChf(tranchen, { mitWaehrung: true })}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs">
                {t('finanzen.cockpit.rechnungenOffen', { count: daten.rechnungen.length })}
              </dt>
              <dd className="zahlen font-semibold">{formatChf(debitoren, { mitWaehrung: true })}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs">{t('finanzen.cockpit.zahllaeufe')}</dt>
              <dd className="zahlen font-semibold">
                {daten.zahllaeufe.filter((z) => z.status === 'zur_freigabe' || z.status === 'freigegeben').length}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs">{t('finanzen.cockpit.pruefungOffen')}</dt>
              <dd className="zahlen font-semibold">
                {offen.filter((z) => z.pruefung === 'freigabe' || z.pruefung === 'klaeren').length}
              </dd>
            </div>
          </dl>
        </Karte>
      </div>
    </div>
  )
}
