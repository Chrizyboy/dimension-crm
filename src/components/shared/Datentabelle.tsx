import { useTable, type RowData, type SortingState } from '@tanstack/react-table'
import { ArrowDown, ArrowUp } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Fehlerzustand } from '@/components/shared/Zustaende'
import { Button } from '@/components/ui/button'
import { Skelett } from '@/components/ui/diverses'
import { Kopfzelle, Tabelle, TabelleKoerper, TabelleKopf, Zelle, Zeile } from '@/components/ui/tabelle'
import { tabellenFunktionen, type Spalten } from '@/lib/tabelle'
import { cn } from '@/lib/utils'

interface DatentabelleProps<T extends RowData> {
  daten: T[]
  spalten: Spalten<T>
  /** Eindeutige Kennung je Zeile (für React und die aktive Zeile). */
  kennung: (zeile: T) => string
  onOeffnen?: (zeile: T) => void
  aktiveId?: string | null
  sortierung?: SortingState
  laedt?: boolean
  /** Wird statt der Tabelle gezeigt, wenn keine Zeilen da sind. */
  leer?: ReactNode
  /** Fehler der Abfrage: dann erscheint der Fehlerzustand statt «leer», sonst sähe ein Fehler wie «nichts da» aus. */
  fehler?: unknown
  onNochmal?: () => void
  beschriftung: string
}

const KEINE_SORTIERUNG: SortingState = []

/** So viele Zeilen erscheinen zuerst und kommen beim Scrollen dazu (700 Kunden auf einmal bremsen das Handy). */
const SCHRITT = 150

/** Lädt die nächsten Zeilen, sobald das Ende der Liste fast im Bild ist; der Knopf bleibt für die Tastatur. */
function MehrZeilen({ rest, onMehr }: { rest: number; onMehr: () => void }) {
  const { t } = useTranslation()
  const anker = useRef<HTMLDivElement>(null)
  const aktuell = useRef(onMehr)
  useEffect(() => {
    aktuell.current = onMehr
  })
  useEffect(() => {
    if (!anker.current || typeof IntersectionObserver === 'undefined') return
    const beobachter = new IntersectionObserver(
      (e) => {
        if (e.some((x) => x.isIntersecting)) aktuell.current()
      },
      { rootMargin: '400px' },
    )
    beobachter.observe(anker.current)
    return () => {
      beobachter.disconnect()
    }
  }, [rest])
  return (
    <div ref={anker} className="flex justify-center py-3">
      <Button variant="secondary" onClick={onMehr}>
        {t('tabelle.mehr', { anzahl: Math.min(rest, SCHRITT) })}
      </Button>
    </div>
  )
}

/**
 * Datentabelle für alle Listen: Klick auf den Spaltentitel sortiert, Klick oder Enter auf
 * eine Zeile öffnet die Details. Beim Laden erscheinen graue Zeilen in der Form der Tabelle.
 */
export function Datentabelle<T extends RowData>({
  daten,
  spalten,
  kennung,
  onOeffnen,
  aktiveId,
  sortierung = KEINE_SORTIERUNG,
  laedt = false,
  leer,
  fehler,
  onNochmal,
  beschriftung,
}: DatentabelleProps<T>) {
  const { t } = useTranslation()
  const tabelle = useTable({
    features: tabellenFunktionen,
    data: daten,
    columns: spalten,
    initialState: { sorting: sortierung },
    getRowId: kennung,
  })
  const [zeigen, setZeigen] = useState(SCHRITT)

  if (fehler)
    return (
      <Fehlerzustand
        details={fehler instanceof Error ? fehler.message : JSON.stringify(fehler)}
        {...(onNochmal ? { onNochmal } : {})}
      />
    )
  if (!laedt && daten.length === 0 && leer) return <>{leer}</>

  const zeilen = tabelle.getRowModel().rows

  return (
    <>
      {/* Jede Liste steht auf einer weissen Fläche mit Rahmen, damit alle Bereiche gleich aussehen. */}
      <div className="bg-surface overflow-hidden rounded-xl border">
        <Tabelle aria-label={beschriftung} aria-rowcount={daten.length}>
          <TabelleKopf>
            {tabelle.getHeaderGroups().map((gruppe) => (
              <tr key={gruppe.id}>
                {gruppe.headers.map((kopf) => {
                  const meta = kopf.column.columnDef.meta
                  const richtung = kopf.column.getIsSorted()
                  return (
                    <Kopfzelle
                      key={kopf.id}
                      zahl={meta?.zahl ?? false}
                      className={cn(meta?.nurBreit && 'hidden md:table-cell', meta?.breite)}
                      aria-sort={richtung === 'asc' ? 'ascending' : richtung === 'desc' ? 'descending' : 'none'}
                    >
                      {kopf.column.getCanSort() ? (
                        <button
                          type="button"
                          onClick={kopf.column.getToggleSortingHandler()}
                          className="hover:text-foreground focus-visible:ring-ring inline-flex items-center gap-1 rounded uppercase outline-none focus-visible:ring-2"
                          title={t('tabelle.sortieren')}
                        >
                          <tabelle.FlexRender header={kopf} />
                          {richtung === 'asc' && <ArrowUp className="size-3" aria-hidden="true" />}
                          {richtung === 'desc' && <ArrowDown className="size-3" aria-hidden="true" />}
                        </button>
                      ) : (
                        <tabelle.FlexRender header={kopf} />
                      )}
                    </Kopfzelle>
                  )
                })}
              </tr>
            ))}
          </TabelleKopf>
          <TabelleKoerper>
            {laedt
              ? Array.from({ length: 8 }, (_, i) => (
                  <Zeile key={i}>
                    {spalten.map((s, j) => (
                      <Zelle key={j} className={cn(s.meta?.nurBreit && 'hidden md:table-cell')}>
                        <Skelett className="h-4 w-3/4" />
                      </Zelle>
                    ))}
                  </Zeile>
                ))
              : zeilen.slice(0, zeigen).map((zeile) => (
                  <Zeile
                    key={zeile.id}
                    data-aktiv={zeile.id === aktiveId}
                    tabIndex={onOeffnen ? 0 : undefined}
                    className={cn(onOeffnen && 'focus-visible:bg-muted cursor-pointer outline-none')}
                    onClick={
                      onOeffnen
                        ? () => {
                            onOeffnen(zeile.original)
                          }
                        : undefined
                    }
                    onKeyDown={
                      onOeffnen
                        ? (e) => {
                            if (e.key === 'Enter') onOeffnen(zeile.original)
                            // Pfeiltasten springen zur nächsten Zeile, wie in einer Tabellenkalkulation.
                            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                              e.preventDefault()
                              const ziel =
                                e.key === 'ArrowDown'
                                  ? e.currentTarget.nextElementSibling
                                  : e.currentTarget.previousElementSibling
                              if (ziel instanceof HTMLElement) ziel.focus()
                            }
                          }
                        : undefined
                    }
                  >
                    {zeile.getAllCells().map((zelle) => {
                      const meta = zelle.column.columnDef.meta
                      return (
                        <Zelle
                          key={zelle.id}
                          zahl={meta?.zahl ?? false}
                          className={cn(meta?.nurBreit && 'hidden md:table-cell')}
                        >
                          <tabelle.FlexRender cell={zelle} />
                        </Zelle>
                      )
                    })}
                  </Zeile>
                ))}
          </TabelleKoerper>
        </Tabelle>
      </div>
      {!laedt && zeilen.length > zeigen && (
        <MehrZeilen
          rest={zeilen.length - zeigen}
          onMehr={() => {
            setZeigen((z) => z + SCHRITT)
          }}
        />
      )}
    </>
  )
}
