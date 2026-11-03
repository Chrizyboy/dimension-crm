import { Layers, PackageCheck, ShoppingCart } from 'lucide-react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Fehlerzustand, Leerzustand } from '@/components/shared/Zustaende'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skelett } from '@/components/ui/diverses'
import { Karte, KarteInhalt, KarteKopf, KarteTitel } from '@/components/ui/karte'
import { formatChf, formatDatum } from '@/lib/format'
import { melde } from '@/services/meldungen'
import { useAktion } from '../hooks/useAktion'
import { useBedarf, useBestellungen, useLieferanten } from '../hooks/useEinkauf'
import { formatMenge, inTagen } from '../lib/anzeige'
import { sammelKandidaten } from '../lib/sammel'
import { sammelbestellung } from '../services/einkauf'
import { zusammenfassen } from '../services/material'
import type { Bedarf, Lieferant } from '../types'

/**
 * Bestellen: der Bedarf aller Baustellen und des Lagers, gebündelt je Lieferant. Was im Lager frei ist, wird
 * reserviert; der Rest kommt in einen Entwurf (ans Lager eine Sammelbestellung, auf Paletten/Bund gerundet).
 */
export function Bestellen({
  lieferantId,
  onBestellung,
  onProjekt,
}: {
  lieferantId: string | null
  onBestellung: (id: string) => void
  onProjekt: (id: string) => void
}) {
  const { t } = useTranslation()
  const bedarf = useBedarf()
  const lieferanten = useLieferanten()
  const entwuerfe = useBestellungen('entwuerfe')
  const sammel = sammelKandidaten(entwuerfe.data ?? [])
  const { laeuft, aus } = useAktion()
  const heute = inTagen(new Date(), 0)
  const gruppen = useMemo(() => {
    const m = new Map<string, Bedarf[]>()
    for (const b of bedarf.data ?? []) {
      if (b.fehlt - b.aus_lager <= 0 && b.aus_lager <= 0) continue
      const k = b.lieferant_id ?? ''
      m.set(k, [...(m.get(k) ?? []), b])
    }
    return [...m.entries()].sort(
      ([a], [b]) => Number(a === '') - Number(b === '') || Number(b === lieferantId) - Number(a === lieferantId),
    )
  }, [bedarf.data, lieferantId])

  if (bedarf.error) return <Fehlerzustand details={String(bedarf.error)} onNochmal={() => void bedarf.refetch()} />
  if (bedarf.isPending) return <Skelett className="h-80" />
  // Mehrere Entwürfe eines Lieferanten ans Lager (z. B. je Projekt angelegt): zu einer Sammelbestellung zusammenfassen.
  const zusammen = sammel.length > 0 && (
    <Button
      variant="secondary"
      laedt={laeuft}
      onClick={() => {
        void aus(
          async () => {
            for (const g of sammel) await zusammenfassen(g.lieferant_id, g.lagerort_id)
          },
          { de: 'Sammelbestellungen gebildet', fr: 'Commandes groupées créées' },
        )
      }}
    >
      <Layers />
      {t('einkauf.bestellen.zusammenfassen', { liste: sammel.map((g) => g.lieferant).join(', ') })}
    </Button>
  )
  if (gruppen.length === 0)
    return (
      <div className="flex flex-col gap-4">
        {zusammen && <div>{zusammen}</div>}
        <Leerzustand icon={PackageCheck} titel={t('einkauf.bestellen.leer')} text={t('einkauf.bestellen.leerText')} />
      </div>
    )

  const anlegen = (id: string | null) =>
    void aus(async () => {
      const r = await sammelbestellung(id)
      melde('ok', {
        de: `${String(r.bestellungen.length)} Entwurf/Entwürfe, ${String(r.reserviert)} aus dem Lager reserviert`,
        fr: `${String(r.bestellungen.length)} brouillon(s), ${String(r.reserviert)} réservé(s) au stock`,
      })
      const erste = r.bestellungen[0]
      if (erste) onBestellung(erste)
    })

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-muted-foreground max-w-3xl text-sm">{t('einkauf.bestellen.hinweis')}</p>
        <div className="flex flex-wrap gap-2">
          {zusammen}
          <Button
            laedt={laeuft}
            variant="secondary"
            onClick={() => {
              anlegen(null)
            }}
          >
            <ShoppingCart />
            {t('einkauf.bestellen.alle')}
          </Button>
        </div>
      </div>
      {gruppen.map(([id, zeilen]) => (
        <Gruppe
          key={id || 'ohne'}
          zeilen={zeilen}
          lieferant={lieferanten.data?.find((l) => l.id === id) ?? null}
          heute={heute}
          laeuft={laeuft}
          onAnlegen={() => {
            anlegen(id)
          }}
          onProjekt={onProjekt}
        />
      ))}
    </div>
  )
}

function Gruppe({
  zeilen,
  lieferant: l,
  heute,
  laeuft,
  onAnlegen,
  onProjekt,
}: {
  zeilen: Bedarf[]
  lieferant: Lieferant | null
  heute: string
  laeuft: boolean
  onAnlegen: () => void
  onProjekt: (id: string) => void
}) {
  const { t } = useTranslation()
  const total = zeilen.reduce((s, z) => s + Math.round(Math.max(z.fehlt - z.aus_lager, 0) * (z.ek_rappen ?? 0)), 0)
  const bis =
    zeilen
      .map((z) => z.bestellen_bis)
      .filter(Boolean)
      .sort()[0] ?? null
  const ohne = !zeilen[0]?.lieferant_id
  return (
    <Karte>
      <KarteKopf>
        <KarteTitel className="flex flex-wrap items-center gap-2">
          {ohne ? t('einkauf.bestellen.ohneLieferant') : zeilen[0]?.lieferant}
          {bis && (
            <Badge ton={bis <= heute ? 'kritisch' : 'warnung'}>
              {t('einkauf.ls.bis', { datum: formatDatum(bis) })}
            </Badge>
          )}
          {l?.fracht_frei_ab_rappen != null &&
            (total >= l.fracht_frei_ab_rappen ? (
              <Badge ton="ok">{t('einkauf.bestellen.frachtFrei')}</Badge>
            ) : (
              <Badge ton="neutral">
                {t('einkauf.bestellen.frachtAb', { betrag: formatChf(l.fracht_frei_ab_rappen) })}
              </Badge>
            ))}
          {l?.mindestbestellwert_rappen != null && total < l.mindestbestellwert_rappen && (
            <Badge ton="warnung">
              {t('einkauf.bestellen.unterMindest', { betrag: formatChf(l.mindestbestellwert_rappen) })}
            </Badge>
          )}
        </KarteTitel>
        {!ohne && (
          <Button size="sm" laedt={laeuft} onClick={onAnlegen}>
            {t('einkauf.bestellen.anlegen')}
          </Button>
        )}
      </KarteKopf>
      <KarteInhalt className="overflow-x-auto p-0">
        <table className="w-full min-w-[44rem] text-sm">
          <thead className="text-muted-foreground bg-muted/40 text-left text-xs">
            <tr>
              <th className="px-3 py-2 font-medium">{t('einkauf.bestellen.artikel')}</th>
              <th className="px-3 py-2 font-medium">{t('einkauf.bestellen.fuer')}</th>
              <th className="px-3 py-2 text-right font-medium">{t('einkauf.bestellen.fehlt')}</th>
              <th className="px-3 py-2 text-right font-medium">{t('einkauf.bestellen.lager')}</th>
              <th className="px-3 py-2 text-right font-medium">{t('einkauf.bestellen.bestellen')}</th>
              <th className="px-3 py-2 text-right font-medium">{t('einkauf.bestellen.ek')}</th>
              <th className="px-3 py-2 font-medium">{t('einkauf.bestellen.bis')}</th>
            </tr>
          </thead>
          <tbody>
            {zeilen.map((z, i) => (
              <tr key={`${z.material_id ?? z.artikel_id ?? ''}-${String(i)}`} className="border-t">
                <td className="px-3 py-2">
                  <span className="font-medium">{z.bezeichnung}</span>
                  <span className="text-muted-foreground block text-xs">
                    {[
                      z.artikelnummer,
                      z.verpackungseinheit && z.verpackungseinheit > 1
                        ? t('einkauf.bestellen.ve', { ve: formatMenge(z.verpackungseinheit) })
                        : null,
                      !z.artikel_id ? t('einkauf.bestellen.ohneArtikel') : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                </td>
                <td className="px-3 py-2">
                  {z.projekt_id ? (
                    <button
                      type="button"
                      className="text-accent-ink text-left underline"
                      onClick={() => {
                        if (z.projekt_id) onProjekt(z.projekt_id)
                      }}
                    >
                      {z.projekt_nummer}
                    </button>
                  ) : (
                    t('einkauf.bestellen.lagerMindest')
                  )}
                  {z.kunde && <span className="text-muted-foreground block text-xs">{z.kunde}</span>}
                </td>
                <td className="zahlen px-3 py-2 text-right">
                  {formatMenge(z.fehlt)} {z.einheit}
                </td>
                <td className="zahlen px-3 py-2 text-right">{z.aus_lager > 0 ? formatMenge(z.aus_lager) : '–'}</td>
                <td className="zahlen px-3 py-2 text-right font-semibold">
                  {formatMenge(Math.max(z.fehlt - z.aus_lager, 0))}
                </td>
                <td className="zahlen px-3 py-2 text-right">{z.ek_rappen != null ? formatChf(z.ek_rappen) : '–'}</td>
                <td className="px-3 py-2">{z.bestellen_bis ? formatDatum(z.bestellen_bis) : '–'}</td>
              </tr>
            ))}
          </tbody>
          {total > 0 && (
            <tfoot>
              <tr className="border-t font-semibold">
                <td className="px-3 py-2" colSpan={5}>
                  {t('einkauf.bestellen.total')}
                </td>
                <td className="zahlen px-3 py-2 text-right" colSpan={2}>
                  CHF {formatChf(total)}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </KarteInhalt>
    </Karte>
  )
}
