import { CalendarPlus, HardHat } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Fehlerzustand, Leerzustand } from '@/components/shared/Zustaende'
import { Button } from '@/components/ui/button'
import { Skelett } from '@/components/ui/diverses'
import { Input } from '@/components/ui/input'
import { formatDatum } from '@/lib/format'
import { useProjekte, useStandorte } from '../hooks/useProjekte'
import { anlageKurz, ortZeile } from '../lib/anzeige'
import type { Projekt } from '../types'
import { BauDialog } from './BauDialog'
import { ProjektKarte } from './ProjektKarte'

const STATUS = ['im_bau', 'auftrag'] as const
const REIHE: Record<string, number> = { ausstehend: 0, terminiert: 1, ibn: 2, fertig: 3 }

/** Baustellen zuerst nach Status (ausstehend oben, braucht einen Termin), dann nach Baubeginn. */
function nachBau(a: Projekt, b: Projekt): number {
  return (
    (REIHE[a.bau_status ?? 'ausstehend'] ?? 0) - (REIHE[b.bau_status ?? 'ausstehend'] ?? 0) ||
    (a.baubeginn ?? '9999').localeCompare(b.baubeginn ?? '9999')
  )
}

/**
 * Board der Baustellen wie in V233: je Standort (Muri, Bulle) eine Spalte mit allen Projekten im Bau.
 * Darunter die neuen Aufträge, die noch keinen Bautermin haben, mit «Bautermin» (V126).
 */
export function Baustellen({ aktiveId, onOeffnen }: { aktiveId: string | null; onOeffnen: (id: string) => void }) {
  const { t } = useTranslation()
  const projekte = useProjekte([...STATUS])
  const standorte = useStandorte()
  const [suche, setSuche] = useState('')
  const [planen, setPlanen] = useState<Projekt | null>(null)

  const { spalten, auftraege } = useMemo(() => {
    const alle = projekte.data ?? []
    const imBau = alle.filter((p) => p.status === 'im_bau').sort(nachBau)
    const s = suche.trim().toLowerCase()
    const neu = alle
      .filter((p) => p.status === 'auftrag')
      .filter((p) => !s || `${p.kunde} ${p.nummer} ${p.ort ?? ''} ${p.plz ?? ''}`.toLowerCase().includes(s))
      .sort((a, b) => (b.unterzeichnet_am ?? '').localeCompare(a.unterzeichnet_am ?? ''))
    return {
      spalten: (standorte.data ?? []).map((st) => ({ st, liste: imBau.filter((p) => p.standort_id === st.id) })),
      auftraege: neu,
    }
  }, [projekte.data, standorte.data, suche])

  if (projekte.error)
    return <Fehlerzustand details={String(projekte.error)} onNochmal={() => void projekte.refetch()} />
  if (projekte.isPending || standorte.isPending) return <Skelett className="h-96" />

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 md:grid-cols-2">
        {spalten.map(({ st, liste }) => (
          <section key={st.id} aria-label={st.name} className="bg-muted/40 flex flex-col gap-2 rounded-xl border p-3">
            <h2 className="flex items-center justify-between px-1 text-sm font-semibold">
              {st.name}
              <span className="text-muted-foreground zahlen font-mono text-xs">{liste.length}</span>
            </h2>
            {liste.length === 0 ? (
              <p className="text-muted-foreground px-1 py-6 text-center text-sm">{t('projekte.board.leer')}</p>
            ) : (
              liste.map((p) => (
                <ProjektKarte
                  key={p.id}
                  p={p}
                  aktiv={p.id === aktiveId}
                  onOeffnen={() => {
                    onOeffnen(p.id)
                  }}
                />
              ))
            )}
          </section>
        ))}
      </div>

      <section aria-labelledby="pj-auftraege" className="flex flex-col gap-2">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 id="pj-auftraege" className="text-sm font-semibold">
              {t('projekte.board.auftraege', { count: auftraege.length })}
            </h2>
            <p className="text-muted-foreground text-xs">{t('projekte.board.auftraegeHilfe')}</p>
          </div>
          <Input
            type="search"
            className="w-full sm:w-64"
            aria-label={t('projekte.suche')}
            placeholder={t('projekte.suche')}
            value={suche}
            onChange={(e) => {
              setSuche(e.target.value)
            }}
          />
        </div>
        {auftraege.length === 0 ? (
          <Leerzustand icon={HardHat} titel={t('projekte.board.keineAuftraege')} />
        ) : (
          <ul className="bg-surface divide-y rounded-xl border">
            {auftraege.slice(0, 40).map((p) => (
              <li key={p.id} className="flex items-center gap-3 px-3 py-2">
                <button
                  type="button"
                  className="focus-visible:ring-ring flex min-w-0 flex-1 flex-col rounded text-left outline-none focus-visible:ring-2"
                  onClick={() => {
                    onOeffnen(p.id)
                  }}
                >
                  <span className="truncate text-sm font-medium">
                    {p.kunde} <span className="text-muted-foreground zahlen font-mono text-xs">{p.nummer}</span>
                  </span>
                  <span className="text-muted-foreground truncate text-xs">
                    {[
                      p.unterzeichnet_am
                        ? t('projekte.unterzeichnet', { datum: formatDatum(p.unterzeichnet_am) })
                        : null,
                      ortZeile(p),
                      anlageKurz(p, t),
                      p.standort,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                </button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setPlanen(p)
                  }}
                >
                  <CalendarPlus />
                  <span className="max-sm:sr-only">{t('projekte.bau.knopf')}</span>
                </Button>
              </li>
            ))}
          </ul>
        )}
        {auftraege.length > 40 && (
          <p className="text-muted-foreground text-xs">{t('projekte.board.mehr', { count: auftraege.length - 40 })}</p>
        )}
      </section>

      {planen && (
        <BauDialog
          projekt={planen}
          onSchliessen={() => {
            setPlanen(null)
          }}
          onGeplant={() => {
            onOeffnen(planen.id)
            setPlanen(null)
          }}
        />
      )}
    </div>
  )
}
