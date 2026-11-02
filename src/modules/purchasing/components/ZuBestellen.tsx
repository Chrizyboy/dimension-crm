import { ClipboardList, Layers, Wand2 } from 'lucide-react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Datentabelle } from '@/components/shared/Datentabelle'
import { Werkzeugleiste } from '@/components/shared/Werkzeugleiste'
import { DatumZelle, NummerZelle } from '@/components/shared/Zellen'
import { Fehlerzustand, Leerzustand } from '@/components/shared/Zustaende'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatDatum } from '@/lib/format'
import { spaltenHelfer } from '@/lib/tabelle'
import { useAktion } from '../hooks/useAktion'
import { useBestellungen, useZuBestellen } from '../hooks/useEinkauf'
import { dringlichkeit, sammelKandidaten } from '../lib/sammel'
import { bestellvorschlag, zusammenfassen, type ZuBestellen as Zeile } from '../services/material'

const spalte = spaltenHelfer<Zeile>()

/**
 * Reiter «Zu bestellen»: alle Baustellen mit fehlendem Material, früheste «bestellen bis» zuerst. Ein Klick legt
 * für alle die Entwürfe an (Lager zuerst), ein zweiter fasst Entwürfe desselben Lieferanten ans Lager zusammen.
 * Hinaus geht nichts ohne Freigabe der einzelnen Bestellung.
 */
export function ZuBestellen({ onProjekt }: { onProjekt: (id: string) => void }) {
  const { t } = useTranslation()
  const liste = useZuBestellen()
  const entwuerfe = useBestellungen('entwuerfe')
  const { laeuft, aus } = useAktion()
  const heute = new Date().toISOString().slice(0, 10)
  const sammel = sammelKandidaten(entwuerfe.data ?? [])

  const spalten = useMemo(
    () =>
      spalte.columns([
        spalte.accessor('nummer', {
          header: t('einkauf.zu.projekt'),
          cell: (c) => <NummerZelle>{c.getValue()}</NummerZelle>,
          meta: { breite: 'w-24' },
        }),
        spalte.accessor((z) => [z.kunde, z.ort].filter(Boolean).join(' · '), {
          id: 'kunde',
          header: t('einkauf.zu.kunde'),
        }),
        spalte.accessor((z) => z.baubeginn ?? '', {
          id: 'baubeginn',
          header: t('einkauf.zu.baubeginn'),
          cell: (c) => <DatumZelle wert={c.getValue()} />,
          meta: { nurBreit: true },
        }),
        spalte.accessor((z) => z.bestellen_bis ?? '9999', {
          id: 'bis',
          header: t('einkauf.zu.bis'),
          cell: (c) => {
            const z = c.row.original
            const d = dringlichkeit(z.bestellen_bis, heute)
            if (!z.bestellen_bis) return <span className="text-muted-foreground">{t('einkauf.zu.ohneTermin')}</span>
            return (
              <Badge ton={d === 'vorbei' ? 'kritisch' : d === 'bald' ? 'warnung' : 'neutral'}>
                {formatDatum(z.bestellen_bis)}
              </Badge>
            )
          },
        }),
        spalte.accessor('zeilen_fehlen', {
          header: t('einkauf.zu.fehlen'),
          cell: (c) => (
            <span className="zahlen">
              {c.getValue()}
              {c.row.original.zeilen_ohne_artikel > 0 && (
                <span className="text-muted-foreground ml-1 text-xs">
                  {t('einkauf.zu.ohneArtikel', { count: c.row.original.zeilen_ohne_artikel })}
                </span>
              )}
            </span>
          ),
        }),
      ]),
    [t, heute],
  )

  return (
    <div className="flex flex-col gap-3">
      <Werkzeugleiste
        rechts={
          <>
            {sammel.length > 0 && (
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
                {t('einkauf.zu.sammeln', { liste: sammel.map((g) => g.lieferant).join(', ') })}
              </Button>
            )}
            {(liste.data ?? []).length > 0 && (
              <Button
                laedt={laeuft}
                onClick={() => {
                  void aus(
                    async () => {
                      for (const z of liste.data ?? []) await bestellvorschlag(z.projekt_id)
                    },
                    {
                      de: 'Entwürfe angelegt, bitte prüfen und freigeben',
                      fr: 'Brouillons créés, à vérifier et valider',
                    },
                  )
                }}
              >
                <Wand2 />
                {t('einkauf.zu.alleVorschlagen')}
              </Button>
            )}
          </>
        }
      >
        <p className="text-muted-foreground text-sm">{t('einkauf.zu.hinweis')}</p>
      </Werkzeugleiste>
      {liste.error ? (
        <Fehlerzustand details={String(liste.error)} onNochmal={() => void liste.refetch()} />
      ) : (
        <Datentabelle
          daten={liste.data ?? []}
          spalten={spalten}
          laedt={liste.isPending}
          kennung={(z) => z.projekt_id}
          onOeffnen={(z) => {
            onProjekt(z.projekt_id)
          }}
          beschriftung={t('einkauf.reiter.zubestellen')}
          leer={<Leerzustand icon={ClipboardList} titel={t('einkauf.zu.leer')} text={t('einkauf.zu.leerText')} />}
        />
      )}
    </div>
  )
}
