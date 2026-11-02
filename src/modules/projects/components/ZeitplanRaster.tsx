import { useState, type MouseEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { BAU_TON } from '../lib/fahrplan'
import { alsDatum, alsIso, monate, monatName, plusTage, type Woche, type WochenAuslastung } from '../lib/zeitplan'
import type { PlanBalken, PlanGruppe, PlanZeile } from '../lib/zeitplanAnsicht'
import type { Projekt } from '../types'
import { SPUR, ZeitplanBalken } from './ZeitplanBalken'

/** Auslastung einer Woche mit der Zahl verfügbarer Monteure (Team ohne Abwesende). */
export type Auslastung = WochenAuslastung & { verfuegbar: number }

/**
 * Das Raster des Zeitplans am PC: Kopf mit Monat, KW und (bis sechs Wochen) jedem Tag; Wochenenden grau,
 * heute hervorgehoben; links feste Spalte mit Baustelle oder Person. Überlappende Einsätze liegen auf
 * eigenen Spuren. Klick auf eine leere Stelle einer Baustelle plant dort einen neuen Einsatz.
 */
export function ZeitplanRaster({
  wochen,
  gruppen,
  auslastung,
  team,
  onOeffnen,
  onLeer,
  onZiehen,
}: {
  wochen: Woche[]
  gruppen: PlanGruppe[]
  auslastung: Auslastung[]
  team: boolean
  onOeffnen: (p: Projekt) => void
  onLeer: (p: Projekt, tag: string) => void
  onZiehen: (b: PlanBalken, tage: number, nurEnde: boolean) => void
}) {
  const { t, i18n } = useTranslation()
  const [heute] = useState(() => alsIso(new Date()))
  const sp = i18n.language === 'fr' ? 'fr' : 'de'
  const start = wochen[0]?.montag ?? heute
  const tage = wochen.length * 7
  const tagListe = Array.from({ length: tage }, (_, i) => plusTage(alsDatum(start), i))
  const mitTagen = wochen.length <= 6
  const breit = wochen.length <= 2
  const spalte = 'grid grid-cols-[15rem_1fr]'
  const links = 'bg-surface sticky left-0 z-20 border-r'

  const hintergrund = (
    <div aria-hidden className="pointer-events-none absolute inset-0 flex">
      {tagListe.map((d) => {
        const iso = alsIso(d)
        return (
          <span
            key={iso}
            className={cn(
              'flex-1',
              d.getDay() === 1 && 'border-border border-l',
              (d.getDay() === 0 || d.getDay() === 6) && 'bg-muted/60',
              iso === heute && 'bg-accent-soft/70',
            )}
          />
        )
      })}
    </div>
  )

  const leer = (z: PlanZeile) => (e: MouseEvent<HTMLDivElement>) => {
    if (!z.projekt || e.target !== e.currentTarget) return
    const r = e.currentTarget.getBoundingClientRect()
    const i = Math.floor(((e.clientX - r.left) / r.width) * tage)
    onLeer(z.projekt, alsIso(plusTage(alsDatum(start), i)))
  }

  return (
    <div className="bg-surface max-h-[calc(100dvh-16rem)] min-h-64 overflow-auto rounded-xl border">
      <div className={cn('text-xs', mitTagen ? 'min-w-[56rem]' : 'min-w-[72rem]')}>
        <div className={cn(spalte, 'bg-surface sticky top-0 z-30 border-b shadow-xs')}>
          <span className={cn(links, 'text-muted-foreground z-40 flex items-end px-3 py-1.5 font-medium')}>
            {t(team ? 'projekte.zeitplan.person' : 'projekte.zeitplan.baustelle')}
          </span>
          <div>
            <div className="flex border-b">
              {monate(wochen).map((m) => (
                <span
                  key={`${String(m.jahr)}-${String(m.monat)}`}
                  className="truncate border-l px-2 py-1 font-semibold first:border-l-0"
                  style={{ width: `${(m.wochen / wochen.length) * 100}%` }}
                >
                  {monatName(m.jahr, m.monat, sp)}
                </span>
              ))}
            </div>
            <div className={cn('flex', mitTagen && 'border-b')}>
              {wochen.map((w) => (
                <span key={w.montag} className="text-muted-foreground zahlen flex-1 border-l px-1 py-0.5 text-center">
                  {t('projekte.zeitplan.kw', { kw: w.kw })}
                </span>
              ))}
            </div>
            {mitTagen && (
              <div className="flex">
                {tagListe.map((d) => {
                  const iso = alsIso(d)
                  return (
                    <span
                      key={iso}
                      className={cn(
                        'zahlen flex flex-1 flex-col items-center py-0.5 leading-tight',
                        d.getDay() === 1 && 'border-l',
                        (d.getDay() === 0 || d.getDay() === 6) && 'text-muted-foreground bg-muted/60',
                        iso === heute && 'bg-accent text-accent-foreground rounded-sm font-semibold',
                      )}
                    >
                      {breit && (
                        <span>{d.toLocaleDateString(sp === 'fr' ? 'fr-CH' : 'de-CH', { weekday: 'short' })}</span>
                      )}
                      <span>{d.getDate()}</span>
                    </span>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {gruppen.map((g) => (
          <section key={g.id} aria-label={g.titel}>
            <h3 className={cn(spalte, 'bg-muted/40 border-b text-xs font-semibold')}>
              <span className="bg-muted sticky left-0 z-20 px-3 py-1">
                {g.titel} <span className="text-muted-foreground zahlen font-normal">{g.zeilen.length}</span>
              </span>
              <span />
            </h3>
            {g.zeilen.map((z) => (
              <div key={z.id} className={cn(spalte, 'group hover:bg-muted/30 border-b')}>
                <Kopf z={z} team={team} links={links} onOeffnen={onOeffnen} />
                <div
                  className={cn('relative', z.projekt && 'cursor-cell')}
                  style={{ height: z.spuren * SPUR + 6 }}
                  onClick={leer(z)}
                >
                  {hintergrund}
                  {z.balken.map((b) => (
                    <ZeitplanBalken
                      key={b.id}
                      b={b}
                      start={start}
                      tage={tage}
                      ziehbar={Boolean(b.einsatz && b.projekt?.bau_status && b.projekt.bau_status !== 'fertig')}
                      onOeffnen={(x) => {
                        if (x.projekt) onOeffnen(x.projekt)
                      }}
                      onZiehen={onZiehen}
                    />
                  ))}
                </div>
              </div>
            ))}
          </section>
        ))}

        <div className={cn(spalte, 'bg-muted/40 sticky bottom-0 z-30 border-t')}>
          <span className={cn(links, 'bg-muted text-muted-foreground px-3 py-1.5 font-medium')}>
            {t('projekte.zeitplan.auslastung')}
          </span>
          <div className="flex">
            {auslastung.map((a, i) => (
              <Last key={wochen[i]?.montag ?? i} a={a} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/** Linke Spalte einer Zeile: Kunde mit Stand und Ort, oder Person mit Kürzel. */
function Kopf({
  z,
  team,
  links,
  onOeffnen,
}: {
  z: PlanZeile
  team: boolean
  links: string
  onOeffnen: (p: Projekt) => void
}) {
  const { t } = useTranslation()
  const p = z.projekt
  if (!p || team)
    return (
      <div className={cn(links, 'flex min-w-0 flex-col justify-center px-3 py-1')}>
        <span className="truncate font-medium">{z.titel}</span>
        {z.unter && <span className="text-muted-foreground truncate">{z.unter}</span>}
      </div>
    )
  const bau = p.bau_status ?? 'ausstehend'
  return (
    <button
      type="button"
      onClick={() => {
        onOeffnen(p)
      }}
      className={cn(
        links,
        'focus-visible:ring-ring group-hover:bg-muted/30 flex min-w-0 flex-col items-start justify-center gap-0.5 px-3 py-1 text-left outline-none focus-visible:ring-2 focus-visible:ring-inset',
      )}
    >
      <span className="w-full truncate font-medium">{p.kunde}</span>
      <span className="flex w-full min-w-0 items-center gap-1.5">
        <Badge ton={BAU_TON[bau] ?? 'neutral'} punkt>
          {t(`projekte.bauStatus.${bau}`)}
        </Badge>
        <span className="text-muted-foreground truncate">{z.unter}</span>
      </span>
    </button>
  )
}

/** Eine Woche Auslastung: Baustellen, Monteure eingeplant von verfügbar als Balken, Abwesende. */
function Last({ a }: { a: Auslastung }) {
  const { t } = useTranslation()
  const anteil = a.verfuegbar > 0 ? Math.min(1, a.personen.length / a.verfuegbar) : a.personen.length > 0 ? 1 : 0
  const doppelt = a.abwesend.some((x) => a.personen.includes(x))
  return (
    <span className="zahlen flex flex-1 flex-col gap-0.5 border-l px-1.5 py-1 leading-tight">
      <span className="flex justify-between gap-1">
        <span>{t('projekte.zeitplan.baustellenKurz', { n: a.baustellen.length })}</span>
        <span className="text-muted-foreground">
          {a.personen.length}/{a.verfuegbar}
        </span>
      </span>
      <span className="bg-border h-1.5 overflow-hidden rounded-full">
        <span
          className={cn('block h-full rounded-full', doppelt ? 'bg-bad' : anteil >= 1 ? 'bg-warn' : 'bg-ok')}
          style={{ width: `${String(anteil * 100)}%` }}
        />
      </span>
      {a.abwesend.length > 0 && (
        <span className={cn(doppelt ? 'text-bad' : 'text-muted-foreground')}>
          {t('projekte.zeitplan.abwesendKurz', { n: a.abwesend.length })}
        </span>
      )}
    </span>
  )
}
