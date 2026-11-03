import { ListChecks } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Leerzustand } from '@/components/shared/Zustaende'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Karte, KarteKopf, KarteTitel } from '@/components/ui/karte'
import { formatChf, formatDatum } from '@/lib/format'
import { useAnmeldung } from '@/stores/anmeldung'
import { useAktion } from '../hooks/useAktion'
import { zahllaufSchritt } from '../services/ablaeufe'
import type { Finanzdaten, Zahllauf as ZahllaufTyp } from '../types'

const TON = { zur_freigabe: 'warnung', freigegeben: 'info', erledigt: 'ok', verworfen: 'neutral' } as const

/**
 * Zahlläufe je Gesellschaft: vorbereitet (wartet auf die zweite Person), freigegeben (jetzt in AbaNinja oder im
 * E-Banking zahlen, dann «ausgeführt»), erledigt. Wer vorbereitet hat, kann nicht freigeben (prüft die Datenbank).
 */
export function Zahllauf({ daten, onNeu }: { daten: Finanzdaten; onNeu: () => void }) {
  const { t } = useTranslation()
  const ich = useAnmeldung((z) => z.ich)
  const { laeuft, aus } = useAktion()
  const offen = daten.zahllaeufe.filter((z) => z.status === 'zur_freigabe' || z.status === 'freigegeben')
  const alt = daten.zahllaeufe.filter((z) => z.status === 'erledigt').slice(0, 8)
  const schritt = (z: ZahllaufTyp, s: 'freigeben' | 'verwerfen' | 'erledigt') =>
    void aus(() => zahllaufSchritt(z.id, s), {
      de: { freigeben: 'Freigegeben', verwerfen: 'Verworfen', erledigt: 'Als bezahlt gebucht' }[s],
      fr: { freigeben: 'Validé', verwerfen: 'Abandonné', erledigt: 'Comptabilisé comme payé' }[s],
    })

  const karte = (z: ZahllaufTyp) => {
    const posten = daten.zahlungen.filter((x) => x.zahllauf_id === z.id)
    const summe = posten.reduce(
      (s, x) =>
        s +
        (x.offen_rappen ?? x.betrag_rappen ?? 0) -
        (x.skonto_bis && x.skonto_bis >= z.ausfuehren_am ? (x.skonto_rappen ?? 0) : 0),
      0,
    )
    const firma = daten.firmen.find((f) => f.id === z.firma_id)?.name ?? ''
    const konto = daten.konten.find((k) => k.id === z.konto_id)?.name
    return (
      <Karte key={z.id}>
        <KarteKopf className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex flex-col gap-1">
            <KarteTitel>{t('finanzen.zl.titel', { firma, datum: formatDatum(z.ausfuehren_am) })}</KarteTitel>
            <span className="text-muted-foreground text-xs">
              {[
                konto,
                t('finanzen.zl.vorbereitet', {
                  person: z.vorbereitet_von ? (daten.personen[z.vorbereitet_von] ?? '–') : '–',
                }),
                z.freigegeben_von
                  ? t('finanzen.zl.freigegebenVon', { person: daten.personen[z.freigegeben_von] ?? '–' })
                  : null,
              ]
                .filter(Boolean)
                .join(' · ')}
            </span>
          </div>
          <Badge ton={TON[z.status]}>{t(`finanzen.zl.status.${z.status}`)}</Badge>
        </KarteKopf>
        <ul className="divide-y px-4 text-sm">
          {posten.map((x) => (
            <li key={x.id} className="flex justify-between gap-3 py-1.5">
              <span className="min-w-0">
                {x.firma}
                <span className="text-muted-foreground ml-2 text-xs">{x.rechnung_nr}</span>
              </span>
              <span className="zahlen">{formatChf(x.offen_rappen ?? x.betrag_rappen ?? 0)}</span>
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t px-4 py-3">
          <span className="zahlen font-semibold">
            {t('finanzen.zl.summe', { count: posten.length })}: {formatChf(summe, { mitWaehrung: true })}
          </span>
          <div className="flex flex-wrap gap-2">
            {z.status === 'zur_freigabe' && (
              <Button
                laedt={laeuft}
                disabled={z.vorbereitet_von === ich?.id}
                title={z.vorbereitet_von === ich?.id ? t('finanzen.zl.vierAugen') : undefined}
                onClick={() => {
                  schritt(z, 'freigeben')
                }}
              >
                {t('finanzen.zl.freigeben')}
              </Button>
            )}
            {z.status === 'freigegeben' && (
              <Button
                laedt={laeuft}
                onClick={() => {
                  schritt(z, 'erledigt')
                }}
              >
                {t('finanzen.zl.ausgefuehrt')}
              </Button>
            )}
            <Button
              variant="secondary"
              laedt={laeuft}
              onClick={() => {
                schritt(z, 'verwerfen')
              }}
            >
              {t('finanzen.zl.verwerfen')}
            </Button>
          </div>
        </div>
        {z.status === 'freigegeben' && (
          <p className="text-muted-foreground px-4 pb-3 text-xs">{t('finanzen.zl.jetztZahlen')}</p>
        )}
      </Karte>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-muted-foreground max-w-2xl text-sm">{t('finanzen.zl.erklaerung')}</p>
        <Button onClick={onNeu}>
          <ListChecks />
          {t('finanzen.zl.neu')}
        </Button>
      </div>
      {offen.length === 0 ? (
        <Leerzustand icon={ListChecks} titel={t('finanzen.zl.leerTitel')} text={t('finanzen.zl.leerText')} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">{offen.map(karte)}</div>
      )}
      {alt.length > 0 && (
        <details className="bg-surface rounded-lg border px-4 py-2">
          <summary className="cursor-pointer text-sm font-medium">
            {t('finanzen.zl.erledigte', { count: alt.length })}
          </summary>
          <ul className="divide-y text-sm">
            {alt.map((z) => (
              <li key={z.id} className="flex justify-between gap-2 py-1.5">
                <span>{daten.firmen.find((f) => f.id === z.firma_id)?.name}</span>
                <span className="text-muted-foreground">{formatDatum(z.ausfuehren_am)}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  )
}
