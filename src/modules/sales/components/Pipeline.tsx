import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { useQueryClient } from '@tanstack/react-query'
import { Suspense, lazy, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/schalter'
import { formatChf } from '@/lib/format'
import { cn } from '@/lib/utils'
import { meldeFehler } from '@/services/fehler'
import { melde } from '@/services/meldungen'
import { useAussendienst, VERKAUF_SCHLUESSEL } from '../hooks/useVerkauf'
import { fachFehlerSchluessel, zweisprachig } from '@/services/fachfehler'
import { erlaubteZiele, standBedarf, summe } from '../lib/geschaeft'
import { verteile, zielInSpalte, type PipelineSpalte } from '../lib/spalten'
import { setzeStand } from '../services/geschaefte'
import type { Geschaeft } from '../types'
import { PipelineKarte } from './PipelineKarte'

const StandWechselDialog = lazy(() => import('./StandWechselDialog'))

interface PipelineProps {
  geschaefte: Geschaeft[]
  aktiveId: string | null
  onOeffnen: (id: string) => void
}

/** So viele Karten zeigt eine Spalte zuerst; der Rest kommt mit «weitere zeigen». */
const ERSTE_KARTEN = 40

function Spalte({
  spalte,
  karten,
  ziehe,
  children,
}: {
  spalte: PipelineSpalte
  karten: Geschaeft[]
  ziehe: Geschaeft | null
  children: React.ReactNode
}) {
  const { t } = useTranslation()
  const { setNodeRef, isOver } = useDroppable({ id: spalte.id, data: spalte })
  const s = summe(karten)
  const ziel = ziehe ? zielInSpalte(spalte, ziehe) : null
  const erlaubt = ziehe !== null && ziel !== null && erlaubteZiele(ziehe).has(ziel)
  return (
    <section
      ref={setNodeRef}
      aria-label={t(`verkauf.spalte.${spalte.id}`)}
      className={cn(
        'bg-muted/50 flex w-72 shrink-0 flex-col rounded-xl border',
        ziehe && !erlaubt && 'opacity-50',
        isOver && erlaubt && 'border-accent bg-accent-soft/40',
      )}
    >
      <header className="flex flex-col gap-0.5 border-b px-3 py-2">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">{t(`verkauf.spalte.${spalte.id}`)}</h2>
          <span className="zahlen text-muted-foreground font-mono text-xs">{s.anzahl}</span>
        </div>
        {/* Leads haben noch keinen Betrag; «CHF 0.00» wäre nur Lärm. */}
        <p className="zahlen text-muted-foreground font-mono text-xs">
          {s.rappen || s.kwp ? `${formatChf(s.rappen, { mitWaehrung: true })} · ${String(s.kwp)} kWp` : ' '}
        </p>
      </header>
      <div className="flex max-h-[calc(100vh-22rem)] min-h-24 flex-col gap-2 overflow-y-auto p-2">{children}</div>
    </section>
  )
}

/**
 * Pipeline als Kanban: eine Spalte pro Stand mit Summen (Anzahl, CHF, kWp). Karte ziehen ändert den
 * Stand sofort; braucht der neue Stand Angaben (Grund, Termin …), fragt ein Dialog danach.
 */
export default function Pipeline({ geschaefte, aktiveId, onOeffnen }: PipelineProps) {
  const { t } = useTranslation()
  const client = useQueryClient()
  const personen = useAussendienst()
  const [abgeschlossen, setAbgeschlossen] = useState(false)
  const [mehr, setMehr] = useState<Record<string, boolean>>({})
  const [ziehe, setZiehe] = useState<Geschaeft | null>(null)
  const [wechsel, setWechsel] = useState<{ g: Geschaeft; ziel: string } | null>(null)
  const sensoren = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))
  const spalten = useMemo(() => verteile(geschaefte, abgeschlossen), [geschaefte, abgeschlossen])
  const kuerzel = useMemo(
    () => new Map((personen.data ?? []).map((p) => [p.id, p.kuerzel.slice(0, 3)])),
    [personen.data],
  )

  /** Stand ohne Rückfrage setzen: sofort verschieben, bei einem Fehler zurück. */
  async function direkt(g: Geschaeft, ziel: string) {
    const schluessel = [...VERKAUF_SCHLUESSEL, 'geschaefte']
    const vorher = client.getQueryData<Geschaeft[]>(schluessel)
    client.setQueryData<Geschaeft[]>(schluessel, (alt) =>
      alt?.map((x) => (x.id === g.id ? { ...x, stand: ziel, standDatum: new Date().toISOString() } : x)),
    )
    try {
      await setzeStand(g.id, ziel)
      melde('ok', { de: `${g.name} verschoben`, fr: `${g.name} déplacé` })
    } catch (f) {
      client.setQueryData(schluessel, vorher)
      const s = fachFehlerSchluessel(f)
      if (!s) meldeFehler(f, 'pipeline')
      melde('kritisch', { de: 'Nicht verschoben', fr: 'Non déplacé' }, s ? { text: zweisprachig(s) } : {})
    } finally {
      void client.invalidateQueries({ queryKey: VERKAUF_SCHLUESSEL })
    }
  }

  function waehle(g: Geschaeft, ziel: string) {
    if (ziel === g.stand || !erlaubteZiele(g).has(ziel)) return
    if (standBedarf(g.stand, ziel) === 'nichts') void direkt(g, ziel)
    else setWechsel({ g, ziel })
  }

  function abgelegt(e: DragEndEvent) {
    setZiehe(null)
    const g = e.active.data.current as Geschaeft | undefined
    const spalte = e.over?.data.current as PipelineSpalte | undefined
    if (!g || !spalte || spalte.staende.includes(g.stand)) return
    const ziel = zielInSpalte(spalte, g)
    if (ziel) waehle(g, ziel)
  }

  return (
    <div className="flex flex-col gap-3">
      <label className="text-muted-foreground flex items-center gap-2 self-end text-sm">
        <Switch checked={abgeschlossen} onCheckedChange={setAbgeschlossen} />
        {t('verkauf.pipeline.abgeschlossene')}
      </label>
      <DndContext
        sensors={sensoren}
        onDragStart={(e) => {
          setZiehe((e.active.data.current as Geschaeft | undefined) ?? null)
        }}
        onDragCancel={() => {
          setZiehe(null)
        }}
        onDragEnd={abgelegt}
      >
        {/* Fokussierbar, damit man die Spalten auch ohne Maus waagrecht durchblättern kann (auch wenn keine Karte offen ist). */}
        <div
          role="region"
          aria-label={t('verkauf.ansicht.pipeline')}
          tabIndex={0}
          className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-3 sm:-mx-6 sm:px-6"
        >
          {spalten.map(({ spalte, karten }) => {
            const alle = mehr[spalte.id] === true
            const sichtbar = alle ? karten : karten.slice(0, ERSTE_KARTEN)
            return (
              <Spalte key={spalte.id} spalte={spalte} karten={karten} ziehe={ziehe}>
                {sichtbar.map((g) => (
                  <PipelineKarte
                    key={g.id}
                    g={g}
                    aktiv={g.id === aktiveId}
                    kuerzel={kuerzel.get(g.terminPersonId ?? g.personId ?? '') ?? null}
                    onOeffnen={onOeffnen}
                    onZiel={waehle}
                  />
                ))}
                {karten.length === 0 && (
                  <p className="text-muted-foreground px-1 py-4 text-center text-xs">{t('verkauf.pipeline.leer')}</p>
                )}
                {karten.length > sichtbar.length && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setMehr((m) => ({ ...m, [spalte.id]: true }))
                    }}
                  >
                    {t('verkauf.pipeline.weitere', { count: karten.length - sichtbar.length })}
                  </Button>
                )}
              </Spalte>
            )
          })}
        </div>
        <DragOverlay dropAnimation={null}>
          {ziehe && (
            <PipelineKarte
              g={ziehe}
              aktiv={false}
              kuerzel={null}
              onOeffnen={() => undefined}
              onZiel={() => undefined}
              schwebend
            />
          )}
        </DragOverlay>
      </DndContext>
      <Suspense>
        {wechsel && (
          <StandWechselDialog
            geschaeft={wechsel.g}
            ziel={wechsel.ziel}
            onSchliessen={() => {
              setWechsel(null)
            }}
          />
        )}
      </Suspense>
    </div>
  )
}
