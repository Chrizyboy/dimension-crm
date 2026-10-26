import {
  DndContext,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { CalendarArrowUp, ChevronLeft, ChevronRight } from 'lucide-react'
import { Suspense, lazy, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Auswahl } from '@/components/ui/auswahl'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { meldeFehler } from '@/services/fehler'
import { melde } from '@/services/meldungen'
import { useAnmeldung } from '@/stores/anmeldung'
import { useAussendienst, useKalender, useVerkaufAenderung } from '../hooks/useVerkauf'
import { heuteIso } from '../lib/geschaeft'
import { hm } from '../lib/route'
import { freieFenster, minutenAm, tagVon } from '../lib/stopps'
import { setzeStand } from '../services/geschaefte'
import type { Geschaeft } from '../types'

const KalenderLaden = lazy(() => import('./KalenderLaden'))
const SlotPlanen = lazy(() => import('./SlotPlanen'))

const VON = 7 * 60
const BIS = 19 * 60
const SCHRITT = 30
const ZEILE_PX = 24
const TAGE = 6

/** Montag der Woche (ISO). */
function montag(iso: string): string {
  const d = new Date(`${iso}T12:00:00`)
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  return heuteIso(d)
}
function plusTage(iso: string, n: number): string {
  const d = new Date(`${iso}T12:00:00`)
  d.setDate(d.getDate() + n)
  return heuteIso(d)
}

interface Block {
  id: string
  tag: string
  start: number
  ende: number
  titel: string
  art: 'crm' | 'kalender' | 'abwesend'
  g?: Geschaeft
}

function Zelle({ tag, minute }: { tag: string; minute: number }) {
  const { setNodeRef, isOver } = useDroppable({ id: `${tag}|${minute}`, data: { tag, minute } })
  return (
    <div
      ref={setNodeRef}
      className={cn('border-b border-dashed', minute % 60 === 0 && 'border-solid', isOver && 'bg-accent-soft')}
      style={{ height: ZEILE_PX }}
    />
  )
}

function Termin({ b, onOeffnen }: { b: Block; onOeffnen: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: b.id,
    data: b,
    disabled: b.art !== 'crm',
  })
  return (
    <button
      ref={setNodeRef}
      type="button"
      {...listeners}
      {...attributes}
      onClick={() => {
        if (b.g) onOeffnen(b.g.id)
      }}
      title={`${hm(b.start)}–${hm(b.ende)} ${b.titel}`}
      className={cn(
        'absolute inset-x-0.5 z-[2] overflow-hidden rounded-md px-1.5 py-0.5 text-left text-xs leading-tight shadow-xs',
        b.art === 'crm' && 'bg-primary text-primary-foreground cursor-grab',
        b.art === 'kalender' && 'bg-info-soft text-info border-info/30 border',
        b.art === 'abwesend' && 'bg-muted text-muted-foreground',
        isDragging && 'opacity-60',
      )}
      style={{
        top: ((b.start - VON) / SCHRITT) * ZEILE_PX,
        height: Math.max(ZEILE_PX, ((b.ende - b.start) / SCHRITT) * ZEILE_PX - 2),
        transform: transform ? `translate(${transform.x}px, ${transform.y}px)` : undefined,
      }}
    >
      <span className="font-mono">{hm(b.start)}</span> {b.titel}
    </button>
  )
}

/**
 * Wochenkalender (V233 «Kalender»): Termine einer Person aus dem CRM und aus ihrem Kalender,
 * freie Fenster grün. Klick auf ein freies Fenster schlägt Leads in der Nähe vor; ein CRM-Termin
 * lässt sich auf eine andere Zeit ziehen. Den Kalender lädt man als .ics/.csv oder aus Outlook eingefügt.
 */
export default function Wochenkalender({
  geschaefte,
  onOeffnen,
}: {
  geschaefte: Geschaeft[]
  onOeffnen: (id: string) => void
}) {
  const { t } = useTranslation()
  const personen = useAussendienst()
  const ich = useAnmeldung((z) => z.ich?.id ?? '')
  const [personWahl, setPerson] = useState<string | null>(null)
  const person = personWahl ?? (personen.data?.some((p) => p.id === ich) ? ich : (personen.data?.[0]?.id ?? ''))
  const [woche, setWoche] = useState(montag(heuteIso()))
  const [laden, setLaden] = useState(false)
  const [slot, setSlot] = useState<{ tag: string; start: number } | null>(null)
  const tage = Array.from({ length: TAGE }, (_, i) => plusTage(woche, i))
  const kalender = useKalender(`${woche}T00:00:00`, `${plusTage(woche, 7)}T00:00:00`)
  const verschieben = useVerkaufAenderung(({ g, am }: { g: Geschaeft; am: string }) =>
    setzeStand(g.id, 'termin', {
      termin_am: am,
      dauer_min: g.terminDauerMin ?? 60,
      person_id: g.terminPersonId ?? person,
    }),
  )
  const sensoren = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  const bloecke = useMemo(() => {
    const b: Block[] = []
    for (const g of geschaefte) {
      if (!g.terminAm || (g.terminPersonId ?? g.personId) !== person) continue
      const tag = tagVon(g.terminAm)
      if (!tage.includes(tag)) continue
      const start = minutenAm(g.terminAm)
      b.push({
        id: g.id,
        tag,
        start,
        ende: start + (g.terminDauerMin ?? 60),
        titel: `${g.name} · ${g.ort ?? ''}`,
        art: 'crm',
        g,
      })
    }
    for (const k of kalender.data ?? []) {
      if (k.personId !== person || k.anzeige_als === 'free') continue
      const tag = tagVon(k.beginn)
      if (k.ganztags) {
        b.push({ id: k.id, tag, start: VON, ende: BIS, titel: k.betreff, art: 'abwesend' })
        continue
      }
      const start = minutenAm(k.beginn)
      b.push({
        id: k.id,
        tag,
        start,
        ende: Math.max(start + 15, minutenAm(k.ende)),
        titel: k.betreff,
        art: k.anzeige_als === 'oof' ? 'abwesend' : 'kalender',
      })
    }
    return b
  }, [geschaefte, kalender.data, person, tage])

  async function abgelegt(e: DragEndEvent) {
    const b = e.active.data.current as Block | undefined
    const ziel = e.over?.data.current as { tag: string; minute: number } | undefined
    if (!b?.g || !ziel) return
    const am = new Date(`${ziel.tag}T${hm(ziel.minute)}:00`).toISOString()
    try {
      await verschieben.mutateAsync({ g: b.g, am })
      melde('ok', { de: `Termin ${b.g.name} verschoben`, fr: `Rendez-vous ${b.g.name} déplacé` })
    } catch (f) {
      meldeFehler(f, 'kalender')
      melde('kritisch', { de: 'Nicht verschoben', fr: 'Non déplacé' })
    }
  }

  const heute = heuteIso()
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Auswahl
          aria-label={t('verkauf.person')}
          className="w-48"
          value={person}
          onValueChange={setPerson}
          optionen={(personen.data ?? []).map((p) => ({ wert: p.id, text: p.name }))}
        />
        <Button
          size="icon"
          variant="secondary"
          aria-label={t('verkauf.kalender.zurueck')}
          onClick={() => {
            setWoche(plusTage(woche, -7))
          }}
        >
          <ChevronLeft />
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => {
            setWoche(montag(heute))
          }}
        >
          {t('verkauf.kalender.heute')}
        </Button>
        <Button
          size="icon"
          variant="secondary"
          aria-label={t('verkauf.kalender.vor')}
          onClick={() => {
            setWoche(plusTage(woche, 7))
          }}
        >
          <ChevronRight />
        </Button>
        <span className="text-sm font-medium">
          {t('verkauf.kalender.woche', {
            von: tage[0]?.split('-').reverse().join('.'),
            bis: tage.at(-1)?.split('-').reverse().join('.'),
          })}
        </span>
        <Button
          size="sm"
          variant="secondary"
          className="ml-auto"
          onClick={() => {
            setLaden(true)
          }}
        >
          <CalendarArrowUp />
          {t('verkauf.kalender.laden')}
        </Button>
      </div>
      <p className="text-muted-foreground text-xs">{t('verkauf.kalender.hinweis')}</p>
      <DndContext sensors={sensoren} onDragEnd={(e) => void abgelegt(e)}>
        <div className="bg-surface overflow-x-auto rounded-xl border">
          <div className="grid min-w-[52rem]" style={{ gridTemplateColumns: `3.5rem repeat(${TAGE}, minmax(0, 1fr))` }}>
            <div className="border-b" />
            {tage.map((tag) => (
              <div
                key={tag}
                className={cn(
                  'border-b border-l px-2 py-1.5 text-xs font-medium',
                  tag === heute && 'text-accent-ink bg-accent-soft/50',
                )}
              >
                {new Date(`${tag}T12:00:00`).toLocaleDateString('de-CH', {
                  weekday: 'short',
                  day: '2-digit',
                  month: '2-digit',
                })}
              </div>
            ))}
            <div>
              {Array.from({ length: (BIS - VON) / SCHRITT }, (_, i) => VON + i * SCHRITT).map((m) => (
                <div
                  key={m}
                  className="text-muted-foreground pr-1 text-right font-mono text-xs"
                  style={{ height: ZEILE_PX }}
                >
                  {m % 60 === 0 ? hm(m) : ''}
                </div>
              ))}
            </div>
            {tage.map((tag) => {
              const anTag = bloecke.filter((b) => b.tag === tag)
              const frei = anTag.some((b) => b.art === 'abwesend')
                ? []
                : freieFenster(anTag.map((b) => ({ start: b.start - 30, ende: b.ende + 30 })))
              return (
                <div key={tag} className="relative border-l">
                  {Array.from({ length: (BIS - VON) / SCHRITT }, (_, i) => VON + i * SCHRITT).map((m) => (
                    <Zelle key={m} tag={tag} minute={m} />
                  ))}
                  {frei.map((f) => (
                    <button
                      key={f.start}
                      type="button"
                      onClick={() => {
                        setSlot({ tag, start: f.start })
                      }}
                      className="bg-ok-soft/70 text-ok hover:bg-ok-soft focus-visible:ring-ring absolute inset-x-1 z-[1] rounded-md text-xs font-medium outline-none focus-visible:ring-2"
                      style={{
                        top: ((f.start - VON) / SCHRITT) * ZEILE_PX + 2,
                        height: ((f.ende - f.start) / SCHRITT) * ZEILE_PX - 4,
                      }}
                    >
                      {t('verkauf.kalender.frei', { von: hm(f.start), bis: hm(f.ende) })}
                    </button>
                  ))}
                  {anTag.map((b) => (
                    <Termin key={b.id} b={b} onOeffnen={onOeffnen} />
                  ))}
                </div>
              )
            })}
          </div>
        </div>
      </DndContext>
      <Suspense>
        {laden && (
          <KalenderLaden
            personId={person}
            onSchliessen={() => {
              setLaden(false)
            }}
          />
        )}
        {slot && (
          <SlotPlanen
            geschaefte={geschaefte}
            personId={person}
            tag={slot.tag}
            start={slot.start}
            nachbarn={bloecke.filter((b) => b.tag === slot.tag && b.g).map((b) => b.g as Geschaeft)}
            onSchliessen={() => {
              setSlot(null)
            }}
          />
        )}
      </Suspense>
    </div>
  )
}
