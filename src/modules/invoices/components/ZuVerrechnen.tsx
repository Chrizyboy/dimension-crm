import { FilePlus2, Wrench } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { AkteAbschnitt } from '@/components/shared/AkteAbschnitt'
import { Fehlerzustand, Leerzustand } from '@/components/shared/Zustaende'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skelett } from '@/components/ui/diverses'
import { Kopfzelle, Tabelle, TabelleKoerper, TabelleKopf, Zelle, Zeile } from '@/components/ui/tabelle'
import { formatChf, formatDatum } from '@/lib/format'
import { useAktion } from '../hooks/useAktion'
import { useZuVerrechnen } from '../hooks/useRechnungen'
import { heuteZuerich, plusTage } from '../lib/rechnung'
import { entwurfAnlegen } from '../services/rechnungen'

/**
 * Was zu verrechnen ist: Tranchen aus dem Zahlungsplan ohne Rechnung (V233 «geplant», fällige zuerst) und
 * abgeschlossene, kostenpflichtige Service-Rapporte. Ein Klick legt den Entwurf an und öffnet ihn.
 */
export function ZuVerrechnen({ onRechnung }: { onRechnung: (id: string) => void }) {
  const { t } = useTranslation()
  const daten = useZuVerrechnen()
  const { laeuft, aus } = useAktion()
  const bald = plusTage(heuteZuerich(), 14)

  const erstellen = (vorgabe: { zahlungsplan_id: string } | { rapport_id: string }) =>
    void aus(async () => {
      onRechnung(await entwurfAnlegen(vorgabe))
    })

  if (daten.error) return <Fehlerzustand details={String(daten.error)} onNochmal={() => void daten.refetch()} />
  if (!daten.data) return <Skelett className="h-64" />
  const { tranchen, rapporte } = daten.data
  if (tranchen.length === 0 && rapporte.length === 0)
    return (
      <Leerzustand
        icon={FilePlus2}
        titel={t('rechnungen.verrechnen.leer')}
        text={t('rechnungen.verrechnen.leerText')}
      />
    )

  return (
    <div className="flex flex-col">
      <AkteAbschnitt titel={t('rechnungen.verrechnen.tranchen')} zusatz={String(tranchen.length)}>
        <Tabelle aria-label={t('rechnungen.verrechnen.tranchen')}>
          <TabelleKopf>
            <tr>
              <Kopfzelle>{t('rechnungen.spalte.projekt')}</Kopfzelle>
              <Kopfzelle>{t('rechnungen.verrechnen.tranche')}</Kopfzelle>
              <Kopfzelle>{t('rechnungen.spalte.faellig')}</Kopfzelle>
              <Kopfzelle className="text-right">{t('rechnungen.spalte.total')}</Kopfzelle>
              <Kopfzelle />
            </tr>
          </TabelleKopf>
          <TabelleKoerper>
            {tranchen.map((z) => (
              <Zeile key={z.id}>
                <Zelle>
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate font-medium">{z.kunde ?? '–'}</span>
                    <span className="text-muted-foreground truncate text-xs">
                      {[z.projekt_nummer, z.projekt_titel].filter(Boolean).join(' · ')}
                    </span>
                  </span>
                </Zelle>
                <Zelle>{z.bezeichnung}</Zelle>
                <Zelle>
                  {z.faellig_am ? (
                    <Badge ton={z.faellig_am <= bald ? 'warnung' : 'neutral'}>{formatDatum(z.faellig_am)}</Badge>
                  ) : (
                    <span className="text-muted-foreground text-xs">{t('rechnungen.verrechnen.nachBau')}</span>
                  )}
                </Zelle>
                <Zelle className="zahlen text-right">{formatChf(z.betrag_rappen)}</Zelle>
                <Zelle className="text-right">
                  <Button
                    size="sm"
                    variant="secondary"
                    laedt={laeuft}
                    onClick={() => {
                      erstellen({ zahlungsplan_id: z.id })
                    }}
                  >
                    <FilePlus2 />
                    {t('rechnungen.verrechnen.erstellen')}
                  </Button>
                </Zelle>
              </Zeile>
            ))}
          </TabelleKoerper>
        </Tabelle>
      </AkteAbschnitt>
      <AkteAbschnitt titel={t('rechnungen.verrechnen.rapporte')} zusatz={String(rapporte.length)}>
        {rapporte.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t('rechnungen.verrechnen.keineRapporte')}</p>
        ) : (
          <ul className="flex flex-col divide-y">
            {rapporte.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span className="flex min-w-0 items-center gap-2">
                  <Wrench className="text-muted-foreground size-4 shrink-0" aria-hidden="true" />
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate font-medium">
                      {r.nummer} · {r.kunde ?? '–'}
                    </span>
                    <span className="text-muted-foreground truncate text-xs">
                      {[formatDatum(r.datum), r.service_nummer, r.service_titel, r.projekt_nummer]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                  </span>
                </span>
                <Button
                  size="sm"
                  variant="secondary"
                  laedt={laeuft}
                  onClick={() => {
                    erstellen({ rapport_id: r.id })
                  }}
                >
                  <FilePlus2 />
                  {t('rechnungen.verrechnen.erstellen')}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </AkteAbschnitt>
    </div>
  )
}
