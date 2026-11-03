import { Send, SunMedium } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Datentabelle } from '@/components/shared/Datentabelle'
import { Filterchips } from '@/components/shared/Filterchips'
import { Suchfeld, Werkzeugleiste } from '@/components/shared/Werkzeugleiste'
import { BetragZelle } from '@/components/shared/Zellen'
import { Fehlerzustand, Leerzustand } from '@/components/shared/Zustaende'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/schalter'
import { formatDatum } from '@/lib/format'
import { spaltenHelfer } from '@/lib/tabelle'
import { useAktion } from '../hooks/useAktion'
import { useOhneVertrag } from '../hooks/useVertraege'
import { OHNE_FILTER, ohneFiltern, type OhneFilter } from '../lib/ohne'
import { findePaket } from '../lib/tarif'
import { angebotSenden, angebotStand } from '../services/vertraege'
import type { Katalog, OhneVertrag as Zeile } from '../types'

const spalte = spaltenHelfer<Zeile>()

/**
 * Eigene Anlagen ohne Wartungsvertrag: passendes Paket mit Tarif der Website, letztes Angebot. «Angebot senden»
 * einzeln oder für alle markierten (Serie), jede Mail mit eigenem Paket und Preis, über den Ausgangskorb.
 */
export function OhneVertrag({ katalog, onNeuerVertrag }: { katalog: Katalog | undefined; onNeuerVertrag: () => void }) {
  const { t } = useTranslation()
  const liste = useOhneVertrag()
  const { laeuft, aus } = useAktion()
  const [heute] = useState(() => new Date())
  const [filter, setFilter] = useState<OhneFilter>('nie')
  const [suche, setSuche] = useState('')
  const [markiert, setMarkiert] = useState<Set<string>>(new Set())
  const daten = useMemo(() => {
    const s = suche.trim().toLowerCase()
    return ohneFiltern(liste.data ?? [], filter, heute).filter(
      (z) => !s || `${z.kunde} ${z.ort ?? ''} ${z.projekt_nummer ?? ''}`.toLowerCase().includes(s),
    )
  }, [liste.data, filter, suche, heute])
  const sendbar = daten.filter((z) => z.email && z.tarif_rappen != null)

  const senden = useCallback(
    (ids: string[]) => {
      void aus(
        async () => {
          const n = await angebotSenden(ids)
          setMarkiert(new Set())
          return n
        },
        {
          de: ids.length === 1 ? 'Angebot im Ausgangskorb' : 'Angebote im Ausgangskorb',
          fr: ids.length === 1 ? 'Offre dans la corbeille de sortie' : 'Offres dans la corbeille de sortie',
        },
      )
    },
    [aus],
  )

  const spalten = useMemo(
    () =>
      spalte.columns([
        spalte.display({
          id: 'wahl',
          header: () => (
            <Checkbox
              aria-label={t('wartung.ohne.alleMarkieren')}
              checked={sendbar.length > 0 && sendbar.every((z) => markiert.has(z.anlage_id))}
              onCheckedChange={(v) => {
                setMarkiert(v ? new Set(sendbar.map((z) => z.anlage_id)) : new Set())
              }}
            />
          ),
          cell: (c) => {
            const z = c.row.original
            return (
              <span
                onClick={(e) => {
                  e.stopPropagation()
                }}
              >
                <Checkbox
                  aria-label={t('wartung.ohne.markieren', { kunde: z.kunde })}
                  disabled={!z.email || z.tarif_rappen == null}
                  checked={markiert.has(z.anlage_id)}
                  onCheckedChange={(v) => {
                    const neu = new Set(markiert)
                    if (v) neu.add(z.anlage_id)
                    else neu.delete(z.anlage_id)
                    setMarkiert(neu)
                  }}
                />
              </span>
            )
          },
          meta: { breite: 'w-10' },
        }),
        spalte.accessor('kunde', {
          header: t('wartung.spalte.kunde'),
          cell: (c) => {
            const z = c.row.original
            return (
              <span className="flex min-w-0 flex-col">
                <a
                  href={`#/customers?kunde=${z.kontakt_id}`}
                  className="font-medium hover:underline"
                  onClick={(e) => {
                    e.stopPropagation()
                  }}
                >
                  {c.getValue()}
                </a>
                <span className="text-muted-foreground truncate text-xs">
                  {[z.ort, z.projekt_nummer, z.email ? null : t('wartung.ohne.keineMail')].filter(Boolean).join(' · ')}
                </span>
              </span>
            )
          },
        }),
        spalte.accessor((z) => z.leistung_kwp ?? 0, {
          id: 'anlage',
          header: t('wartung.spalte.anlage'),
          cell: (c) => (
            <span className="zahlen whitespace-nowrap">
              {c.row.original.leistung_kwp != null ? `${String(c.row.original.leistung_kwp)} kWp` : '–'}
            </span>
          ),
        }),
        spalte.accessor('ibn_am', {
          header: t('wartung.ohne.ibn'),
          cell: (c) => <span className="zahlen">{formatDatum(c.getValue())}</span>,
          meta: { nurBreit: true },
        }),
        spalte.accessor('paket', {
          header: t('wartung.ohne.paket'),
          cell: (c) => {
            const p = findePaket(katalog, c.getValue())
            return <Badge ton={c.getValue() === 'premium' ? 'info' : 'marke'}>{p?.name ?? c.getValue()}</Badge>
          },
        }),
        spalte.accessor((z) => z.tarif_rappen ?? 0, {
          id: 'preis',
          header: t('wartung.spalte.preis'),
          cell: (c) =>
            c.row.original.tarif_rappen == null ? (
              <span className="text-muted-foreground text-xs">{t('wartung.paket.aufAnfrage')}</span>
            ) : (
              <BetragZelle rappen={c.row.original.tarif_rappen} />
            ),
          meta: { zahl: true, nurBreit: true },
        }),
        spalte.accessor((z) => z.angebot_am ?? '', {
          id: 'angebot',
          header: t('wartung.ohne.angebot'),
          cell: (c) => {
            const z = c.row.original
            if (!z.angebot_am) return <span className="text-muted-foreground text-xs">{t('wartung.ohne.nie')}</span>
            const ton = z.angebot_stand === 'angenommen' ? 'ok' : z.angebot_stand === 'abgelehnt' ? 'kritisch' : 'info'
            return (
              <Badge ton={ton}>
                {t(`wartung.ohne.stand.${z.angebot_stand ?? 'offen'}`, { datum: formatDatum(z.angebot_am) })}
              </Badge>
            )
          },
        }),
        spalte.display({
          id: 'aktion',
          header: () => <span className="sr-only">{t('wartung.insp.spalte.aktion')}</span>,
          cell: (c) => {
            const z = c.row.original
            if (z.angebot_am && z.angebot_stand === 'offen') {
              return (
                <span className="flex gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation()
                      void aus(() => angebotStand(z.anlage_id, 'abgelehnt'))
                    }}
                  >
                    {t('wartung.ohne.abgelehnt')}
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={(e) => {
                      e.stopPropagation()
                      void aus(() => angebotStand(z.anlage_id, 'angenommen')).then((ok) => {
                        if (ok) onNeuerVertrag()
                      })
                    }}
                  >
                    {t('wartung.ohne.angenommen')}
                  </Button>
                </span>
              )
            }
            return (
              <Button
                size="sm"
                variant="secondary"
                disabled={!z.email || z.tarif_rappen == null || laeuft}
                onClick={(e) => {
                  e.stopPropagation()
                  senden([z.anlage_id])
                }}
              >
                <Send />
                {t('wartung.ohne.senden')}
              </Button>
            )
          },
        }),
      ]),
    [t, katalog, markiert, sendbar, laeuft, aus, onNeuerVertrag, senden],
  )

  return (
    <div className="flex flex-col gap-3">
      <p className="text-muted-foreground text-sm">{t('wartung.ohne.hinweis')}</p>
      <Werkzeugleiste
        suche={
          <Suchfeld
            beschriftung={t('wartung.ohne.suche')}
            value={suche}
            onChange={(e) => {
              setSuche(e.target.value)
            }}
          />
        }
        rechts={
          <Button
            disabled={markiert.size === 0 || laeuft}
            onClick={() => {
              senden([...markiert])
            }}
          >
            <Send />
            {t('wartung.ohne.serie', { count: markiert.size })}
          </Button>
        }
      >
        <Filterchips
          einzeln
          beschriftung={t('wartung.ohne.filter')}
          optionen={OHNE_FILTER.map((f) => ({ wert: f, text: t(`wartung.ohne.filterwert.${f}`) }))}
          gewaehlt={[filter]}
          onChange={([f]) => {
            if (f) setFilter(f as OhneFilter)
          }}
        />
      </Werkzeugleiste>
      {liste.error ? (
        <Fehlerzustand details={String(liste.error)} onNochmal={() => void liste.refetch()} />
      ) : (
        <Datentabelle
          daten={daten}
          spalten={spalten}
          laedt={liste.isPending}
          kennung={(z) => z.anlage_id}
          beschriftung={t('wartung.ohne.titel')}
          leer={<Leerzustand icon={SunMedium} titel={t('wartung.ohne.leer')} text={t('wartung.ohne.leerText')} />}
        />
      )}
    </div>
  )
}
