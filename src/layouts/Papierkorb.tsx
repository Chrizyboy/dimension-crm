import { useQuery, useQueryClient } from '@tanstack/react-query'
import { RotateCcw, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Filterchips } from '@/components/shared/Filterchips'
import { Seitenkopf } from '@/components/shared/Seitenkopf'
import { Suchfeld, Werkzeugleiste } from '@/components/shared/Werkzeugleiste'
import { Fehlerzustand, Leerzustand } from '@/components/shared/Zustaende'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skelett } from '@/components/ui/diverses'
import { Karte } from '@/components/ui/karte'
import { formatDatumZeit, unterzeile } from '@/lib/format'
import { zeigePapierkorbFehler } from '@/components/shared/papierkorb/usePapierkorb'
import { zweisprachig } from '@/services/fachfehler'
import { melde } from '@/services/meldungen'
import { holeAusPapierkorb, ladePapierkorb, type PapierkorbEintrag } from '@/services/papierkorb'

/**
 * Ein Papierkorb für alle Bereiche (Chris 3.11.2026): alles, was jemand weggelegt hat und
 * die Person sehen darf, mit «Wiederherstellen». Erreichbar über das Konto-Menü oben rechts.
 * Endgültig gelöscht wird nie (CLAUDE.md Regel 5).
 */
export function Papierkorb() {
  const { t, i18n } = useTranslation()
  const qc = useQueryClient()
  const abfrage = useQuery({ queryKey: ['papierkorb'], queryFn: ladePapierkorb })
  const [suche, setSuche] = useState('')
  const [bereich, setBereich] = useState('alle')
  const [laeuft, setLaeuft] = useState<string | null>(null)

  const bereichName = (tabelle: string) =>
    i18n.exists(`papierkorb.tabellen.${tabelle}`) ? t(`papierkorb.tabellen.${tabelle}`) : tabelle.replaceAll('_', ' ')
  const titelVon = (e: PapierkorbEintrag) => e.titel ?? t('papierkorb.ohneTitel')

  const daten = abfrage.data ?? []
  const bereiche = useMemo(() => {
    const zahl = new Map<string, number>()
    for (const e of abfrage.data ?? []) zahl.set(e.tabelle, (zahl.get(e.tabelle) ?? 0) + 1)
    return [...zahl.entries()]
  }, [abfrage.data])
  const s = suche.trim().toLowerCase()
  const gefiltert = daten.filter(
    (e) =>
      (bereich === 'alle' || e.tabelle === bereich) &&
      (!s || `${e.titel ?? ''} ${bereichName(e.tabelle)} ${e.geloescht_von ?? ''}`.toLowerCase().includes(s)),
  )

  async function zurueck(e: PapierkorbEintrag) {
    setLaeuft(e.id)
    try {
      await holeAusPapierkorb(e.tabelle, e.id)
      await qc.invalidateQueries()
      melde('ok', zweisprachig('papierkorb.zurueck', { name: titelVon(e) }))
    } catch (f) {
      zeigePapierkorbFehler(f)
    } finally {
      setLaeuft(null)
    }
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6">
      <Seitenkopf titel={t('papierkorb.titel')} beschreibung={t('papierkorb.beschreibung')} />
      <Werkzeugleiste
        suche={
          <Suchfeld
            beschriftung={t('papierkorb.suche')}
            value={suche}
            onChange={(e) => {
              setSuche(e.target.value)
            }}
          />
        }
        rechts={t('papierkorb.anzahl', { count: gefiltert.length })}
      >
        {bereiche.length > 1 && (
          <Filterchips
            einzeln
            beschriftung={t('papierkorb.bereich')}
            gewaehlt={[bereich]}
            optionen={[
              { wert: 'alle', text: t('papierkorb.alle'), anzahl: daten.length },
              ...bereiche.map(([wert, anzahl]) => ({ wert, text: bereichName(wert), anzahl })),
            ]}
            onChange={([b]) => {
              setBereich(b ?? 'alle')
            }}
          />
        )}
      </Werkzeugleiste>
      {abfrage.isLoading ? (
        <Skelett className="h-48" />
      ) : abfrage.error ? (
        <Fehlerzustand details={String(abfrage.error)} onNochmal={() => void abfrage.refetch()} />
      ) : gefiltert.length === 0 ? (
        <Leerzustand icon={Trash2} titel={t('papierkorb.leer')} text={t('papierkorb.leerText')} />
      ) : (
        <Karte className="divide-y overflow-hidden">
          {gefiltert.map((e) => (
            <div key={`${e.tabelle}:${e.id}`} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center">
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex min-w-0 items-center gap-2">
                  <Badge>{bereichName(e.tabelle)}</Badge>
                  <span className="truncate text-sm font-medium">{titelVon(e)}</span>
                </div>
                <span className="text-muted-foreground text-xs">
                  {unterzeile(
                    t('papierkorb.weggelegt', { wann: formatDatumZeit(e.geloescht_am) }),
                    e.geloescht_von && t('papierkorb.von', { name: e.geloescht_von }),
                  )}
                </span>
              </div>
              <Button variant="secondary" size="sm" laedt={laeuft === e.id} onClick={() => void zurueck(e)}>
                <RotateCcw />
                {t('papierkorb.wiederherstellen')}
              </Button>
            </div>
          ))}
        </Karte>
      )}
    </div>
  )
}
