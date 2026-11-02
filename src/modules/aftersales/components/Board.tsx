import { DndContext, DragOverlay, PointerSensor, useDroppable, useSensor, useSensors } from '@dnd-kit/core'
import { useMemo, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { reaktion } from '../lib/reaktion'
import { BOARD, type ServiceFall } from '../types'
import { FallKarte } from './FallKarte'

type Spalte = (typeof BOARD)[number]

function Spalte({ spalte, anzahl, children }: { spalte: Spalte; anzahl: number; children: ReactNode }) {
  const { t } = useTranslation()
  const { setNodeRef, isOver } = useDroppable({ id: spalte.id, data: spalte })
  return (
    <section
      ref={setNodeRef}
      aria-label={t(`service.board.${spalte.id}`)}
      className={cn(
        'bg-muted/50 flex w-72 shrink-0 flex-col rounded-xl border',
        isOver && 'border-accent bg-accent-soft/40',
      )}
    >
      <header className="flex items-center justify-between gap-2 border-b px-3 py-2">
        <h2 className="text-sm font-semibold">{t(`service.board.${spalte.id}`)}</h2>
        <span className="zahlen text-muted-foreground font-mono text-xs">{anzahl}</span>
      </header>
      <div className="flex max-h-[calc(100vh-24rem)] min-h-24 flex-col gap-2 overflow-y-auto p-2">{children}</div>
    </section>
  )
}

/** Reihenfolge in einer Spalte: zuerst überfällig, dann Anlage steht, dann nach Termin bzw. Reaktionszeit. */
function sortiere(a: ServiceFall, b: ServiceFall): number {
  const ra = reaktion(a)
  const rb = reaktion(b)
  if (ra.ueberfaellig !== rb.ueberfaellig) return ra.ueberfaellig ? -1 : 1
  if ((a.auswirkung === 'steht') !== (b.auswirkung === 'steht')) return a.auswirkung === 'steht' ? -1 : 1
  const za = a.termin_am ?? a.reaktion_bis ?? a.erstellt_am
  const zb = b.termin_am ?? b.reaktion_bis ?? b.erstellt_am
  return za.localeCompare(zb)
}

/**
 * Board des Leitstands: eine Spalte je Arbeitsschritt (Eingang, In Arbeit, Geplant, Teile, Erledigt). Karte ziehen
 * setzt den Stand der Spalte; was brennt, steht oben.
 */
export function Board({
  faelle,
  aktiveId,
  onOeffnen,
  onStand,
}: {
  faelle: ServiceFall[]
  aktiveId: string | null
  onOeffnen: (id: string) => void
  onStand: (f: ServiceFall, status: string) => void
}) {
  const { t } = useTranslation()
  const [ziehe, setZiehe] = useState<ServiceFall | null>(null)
  const sensoren = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))
  const spalten = useMemo(
    () =>
      BOARD.map((s) => ({
        spalte: s,
        karten: faelle.filter((f) => (s.status as readonly string[]).includes(f.status)).sort(sortiere),
      })),
    [faelle],
  )
  return (
    <DndContext
      sensors={sensoren}
      onDragStart={(e) => {
        setZiehe((e.active.data.current as ServiceFall | undefined) ?? null)
      }}
      onDragCancel={() => {
        setZiehe(null)
      }}
      onDragEnd={(e) => {
        setZiehe(null)
        const f = e.active.data.current as ServiceFall | undefined
        const s = e.over?.data.current as Spalte | undefined
        if (f && s && !(s.status as readonly string[]).includes(f.status)) onStand(f, s.status[0])
      }}
    >
      <div
        role="region"
        aria-label={t('service.leitstand.board')}
        tabIndex={0}
        className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-3 sm:-mx-6 sm:px-6"
      >
        {spalten.map(({ spalte, karten }) => (
          <Spalte key={spalte.id} spalte={spalte} anzahl={karten.length}>
            {karten.map((f) => (
              <FallKarte key={f.id} f={f} aktiv={f.id === aktiveId} onOeffnen={onOeffnen} onStand={onStand} />
            ))}
            {karten.length === 0 && (
              <p className="text-muted-foreground px-1 py-4 text-center text-xs">{t('service.board.leer')}</p>
            )}
          </Spalte>
        ))}
      </div>
      <DragOverlay dropAnimation={null}>
        {ziehe && <FallKarte f={ziehe} aktiv={false} onOeffnen={() => undefined} onStand={() => undefined} schwebend />}
      </DragOverlay>
    </DndContext>
  )
}
