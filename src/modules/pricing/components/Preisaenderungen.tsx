import { useQueryClient } from '@tanstack/react-query'
import { FileUp, History } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Leerzustand, Fehlerzustand } from '@/components/shared/Zustaende'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skelett } from '@/components/ui/diverses'
import { formatDatum } from '@/lib/format'
import { cn } from '@/lib/utils'
import { meldeFehler } from '@/services/fehler'
import { fachFehlerSchluessel, zweisprachig } from '@/services/fachfehler'
import { melde } from '@/services/meldungen'
import { PREIS_SCHLUESSEL, useImporte } from '../hooks/usePreise'
import { uebernimmImport, verwirfImport } from '../services/importe'
import type { PreisImport } from '../types'
import { ImportTabelle } from './ImportTabelle'

const STATUS_TON = { offen: 'warnung', uebernommen: 'ok', verworfen: 'neutral' } as const

/**
 * Preisänderungen (P2): jede eingelesene Preisliste mit alt/neu, Änderung in Prozent, neuem Verkaufspreis und den
 * offenen Offerten, die den Artikel enthalten. Übernommen wird mit einem Klick (alle oder die gewählten), neue
 * Artikel brauchen eine Kategorie. Erledigte Listen bleiben zum Nachschauen.
 */
export default function Preisaenderungen({
  onDatei,
  onArtikel,
}: {
  onDatei: () => void
  onArtikel: (id: string) => void
}) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const importe = useImporte(true)
  const [offenId, setOffenId] = useState<string | null>(null)
  const [gewaehlt, setGewaehlt] = useState<Set<number> | null>(null)
  const [kategorien, setKategorien] = useState<Record<number, string>>({})
  const [arbeitet, setArbeitet] = useState(false)
  // Für welche Liste Auswahl und Kategorien gelten; wechselt die Liste (auch nach «Übernehmen»), beginnen sie neu.
  const [fuer, setFuer] = useState<string | null>(null)

  if (importe.error) return <Fehlerzustand details={String(importe.error)} onNochmal={() => void importe.refetch()} />
  if (importe.isPending) return <Skelett className="h-80" />
  const liste = importe.data
  if (liste.length === 0) {
    return (
      <Leerzustand
        icon={History}
        titel={t('preise.aenderungen.leer')}
        text={t('preise.aenderungen.leerText')}
        aktion={
          <Button onClick={onDatei}>
            <FileUp />
            {t('preise.datei.knopf')}
          </Button>
        }
      />
    )
  }
  const imp: PreisImport | undefined =
    liste.find((i) => i.id === offenId) ?? liste.find((i) => i.status === 'offen') ?? liste[0]
  if (!imp) return null
  if (imp.id !== fuer) {
    setFuer(imp.id)
    setGewaehlt(null)
    setKategorien({})
  }
  const geaendert = imp.ergebnis.filter((z) => z.art === 'geaendert')
  const auswahl = gewaehlt ?? new Set(geaendert.map((z) => z.i))

  function waehle(i: PreisImport) {
    setOffenId(i.id)
    setGewaehlt(null)
    setKategorien({})
  }

  async function mit(aktion: () => Promise<{ de: string; fr: string }>) {
    setArbeitet(true)
    try {
      const ok = await aktion()
      await Promise.all([
        qc.invalidateQueries({ queryKey: PREIS_SCHLUESSEL }),
        qc.invalidateQueries({ queryKey: ['offerten'] }),
        // Neue Lieferanten aus der Datei erscheinen sonst erst nach 30 Minuten in der Auswahl.
        qc.invalidateQueries({ queryKey: ['lieferanten'] }),
      ])
      melde('ok', ok)
      setGewaehlt(null)
    } catch (e) {
      const s = fachFehlerSchluessel(e)
      if (!s) meldeFehler(e, 'preise.aenderungen')
      melde('kritisch', zweisprachig(s ?? 'fachfehler.allgemein'))
    } finally {
      setArbeitet(false)
    }
  }

  const neu = Object.entries(kategorien).map(([i, kategorie]) => ({ i: Number(i), kategorie }))
  const z = imp.zaehlung
  return (
    <div className="grid gap-4 lg:grid-cols-[17rem_1fr]">
      <nav aria-label={t('preise.aenderungen.listen')} className="flex flex-col gap-1">
        {liste.map((i) => (
          <button
            key={i.id}
            type="button"
            aria-current={i.id === imp.id ? 'true' : undefined}
            onClick={() => {
              waehle(i)
            }}
            className={cn(
              'focus-visible:ring-ring flex flex-col items-start gap-0.5 rounded-lg border p-2.5 text-left text-sm outline-none focus-visible:ring-2',
              i.id === imp.id ? 'border-accent bg-accent-soft/40' : 'hover:border-border-strong',
            )}
          >
            <span className="flex w-full items-center justify-between gap-2 font-medium">
              {i.quelle}
              <Badge ton={STATUS_TON[i.status]}>{t(`preise.aenderungen.status.${i.status}`)}</Badge>
            </span>
            <span className="text-muted-foreground line-clamp-1 text-xs">{i.dateiname}</span>
            <span className="text-muted-foreground text-xs">
              {formatDatum(i.erstelltAm)} ·{' '}
              {t('preise.aenderungen.kurz', { geaendert: i.zaehlung.geaendert ?? 0, neu: i.zaehlung.neu ?? 0 })}
            </span>
          </button>
        ))}
      </nav>

      <section className="flex min-w-0 flex-col gap-3" aria-label={imp.quelle}>
        <p role="status" className="bg-muted rounded-md p-3 text-sm">
          {t('preise.aenderungen.zaehlung', {
            gelesen: z.gelesen ?? 0,
            teurer: z.teurer ?? 0,
            guenstiger: z.guenstiger ?? 0,
            neu: z.neu ?? 0,
            gleich: z.gleich ?? 0,
            fehlt: z.fehlt ?? 0,
            offerten: z.offerten ?? 0,
          })}
          {imp.status !== 'offen' && (
            <span className="text-muted-foreground block text-xs">
              {t(`preise.aenderungen.erledigt.${imp.status}`, {
                von: imp.erledigtVon ?? '–',
                datum: imp.erledigtAm ? formatDatum(imp.erledigtAm) : '',
              })}
            </span>
          )}
        </p>
        <ImportTabelle
          imp={imp}
          auswahl={auswahl}
          kategorien={kategorien}
          onAuswahl={setGewaehlt}
          onKategorie={(i, k) => {
            setKategorien((x) => ({ ...x, [i]: k }))
          }}
          onArtikel={onArtikel}
        />
        {imp.status === 'offen' && (
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              variant="secondary"
              disabled={arbeitet}
              onClick={() =>
                void mit(async () => {
                  await verwirfImport(imp.id)
                  return zweisprachig('preise.aenderungen.verworfen')
                })
              }
            >
              {t('preise.aenderungen.verwerfen')}
            </Button>
            <Button
              laedt={arbeitet}
              disabled={auswahl.size + neu.length === 0}
              onClick={() =>
                void mit(async () => {
                  const r = await uebernimmImport(imp.id, [...auswahl], neu)
                  return zweisprachig('preise.aenderungen.fertig', r)
                })
              }
            >
              {t('preise.aenderungen.uebernehmen', { n: auswahl.size + neu.length })}
            </Button>
          </div>
        )}
      </section>
    </div>
  )
}
