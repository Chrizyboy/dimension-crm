import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { formatDatum } from '@/lib/format'
import { cn } from '@/lib/utils'
import { BAU_TON } from '../lib/fahrplan'
import { alsIso, balken, monate, monatName, type Woche, type WochenAuslastung } from '../lib/zeitplan'
import type { Einsatz, Person, Projekt } from '../types'

/** Eine Zeile im Zeitplan: Baustelle mit ihren Einsätzen. */
export interface ZeitplanGruppe {
  standort: string
  zeilen: { projekt: Projekt; einsaetze: Einsatz[] }[]
}

/** Farbe eines Einsatz-Balkens: intern dunkelblau, extern orange, voraussichtlich gestrichelt. */
const BALKEN: Record<Einsatz['art'], string> = {
  intern: 'bg-primary text-primary-foreground',
  extern: 'bg-accent text-accent-foreground',
  geplant: 'border-primary text-foreground border border-dashed bg-surface',
}

/**
 * Das Raster des Zeitplans: Kopf mit Monaten und Kalenderwochen, Wochenenden grau, eine Linie für heute,
 * je Baustelle eine Zeile mit Balken, unten die Auslastung. Läuft am Handy seitwärts.
 */
export function ZeitplanRaster({
  wochen,
  gruppen,
  auslastung,
  personen,
  onZeile,
}: {
  wochen: Woche[]
  gruppen: ZeitplanGruppe[]
  auslastung: WochenAuslastung[]
  personen: Person[]
  onZeile: (p: Projekt) => void
}) {
  const { t, i18n } = useTranslation()
  const [heute] = useState(() => alsIso(new Date()))
  const start = wochen[0]?.montag ?? heute
  const tage = wochen.length * 7
  const heuteLage = balken(heute, heute, start, tage)
  const kurz = (ids: string[]) => ids.map((id) => personen.find((p) => p.id === id)?.kuerzel ?? '?').join(', ') || '–'
  const sp = i18n.language === 'fr' ? 'fr' : 'de'

  const hintergrund = (
    <>
      {wochen.map((w, i) => (
        <span
          key={w.montag}
          aria-hidden="true"
          className="bg-muted/70 absolute inset-y-0"
          style={{ left: `${((i * 7 + 5) / tage) * 100}%`, width: `${(2 / tage) * 100}%` }}
        />
      ))}
      {heuteLage && (
        <span
          aria-hidden="true"
          className="bg-bad absolute inset-y-0 w-px"
          style={{ left: `${heuteLage.links + heuteLage.breite / 2}%` }}
        />
      )}
    </>
  )

  return (
    <div className="bg-surface overflow-x-auto rounded-xl border">
      <div className="min-w-[64rem] text-xs">
        <div className="bg-muted/40 sticky top-0 grid grid-cols-[16rem_1fr] border-b">
          <span className="text-muted-foreground row-span-2 self-end px-3 py-1.5 font-medium">
            {t('projekte.zeitplan.baustelle')}
          </span>
          <div className="flex border-b">
            {monate(wochen).map((m) => (
              <span
                key={`${String(m.jahr)}-${String(m.monat)}`}
                className="truncate border-l px-1.5 py-1 font-medium"
                style={{ width: `${(m.wochen / wochen.length) * 100}%` }}
              >
                {monatName(m.jahr, m.monat, sp)}
              </span>
            ))}
          </div>
          <div className="flex">
            {wochen.map((w) => (
              <span
                key={w.montag}
                title={formatDatum(w.montag)}
                className="text-muted-foreground zahlen flex-1 border-l px-1 py-1 text-center font-mono"
              >
                {t('projekte.zeitplan.kw', { kw: w.kw })}
              </span>
            ))}
          </div>
        </div>

        {gruppen.map((g) => (
          <section key={g.standort} aria-label={g.standort}>
            <h2 className="bg-muted/30 border-b px-3 py-1 text-xs font-semibold">
              {g.standort} <span className="text-muted-foreground zahlen font-mono">{g.zeilen.length}</span>
            </h2>
            {g.zeilen.length === 0 && (
              <p className="text-muted-foreground border-b px-3 py-2">{t('projekte.zeitplan.leer')}</p>
            )}
            {g.zeilen.map(({ projekt: p, einsaetze }) => (
              <div key={p.id} className="hover:bg-muted/30 grid grid-cols-[16rem_1fr] border-b">
                <button
                  type="button"
                  onClick={() => {
                    onZeile(p)
                  }}
                  className="focus-visible:ring-ring flex min-w-0 flex-col items-start px-3 py-1.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-inset"
                >
                  <span className="line-clamp-2 w-full font-medium">{p.kunde}</span>
                  <span className="flex w-full flex-wrap items-center gap-x-1.5 gap-y-0.5">
                    <Badge ton={BAU_TON[p.bau_status ?? 'ausstehend'] ?? 'neutral'} punkt>
                      {t(`projekte.bauStatus.${p.bau_status ?? 'ausstehend'}`)}
                    </Badge>
                    <span className="text-muted-foreground">{p.ort}</span>
                  </span>
                </button>
                <div className="relative">
                  {hintergrund}
                  {einsaetze.map((e) => {
                    const l = balken(e.von, e.bis, start, tage)
                    if (!l) return null
                    // Ohne eingeteilte Personen steht die Art im Balken (statt «–»), damit er etwas sagt.
                    const wer =
                      (e.art === 'extern' ? e.notiz : e.personen.length > 0 ? kurz(e.personen) : '') ||
                      t(`projekte.einsatz.${e.art}`)
                    return (
                      <span
                        key={e.id}
                        title={`${t(`projekte.einsatz.${e.art}`)}: ${formatDatum(e.von)} – ${formatDatum(e.bis)} · ${wer}`}
                        className={cn(
                          'absolute top-1/2 flex h-6 -translate-y-1/2 items-center overflow-hidden rounded px-1.5 text-xs whitespace-nowrap',
                          BALKEN[e.art],
                        )}
                        style={{ left: `${l.links}%`, width: `max(${l.breite}%, 4px)` }}
                      >
                        {wer}
                      </span>
                    )
                  })}
                </div>
              </div>
            ))}
          </section>
        ))}

        <div className="bg-muted/40 grid grid-cols-[16rem_1fr]">
          <span className="text-muted-foreground px-3 py-1.5 font-medium">{t('projekte.zeitplan.auslastung')}</span>
          <div className="flex">
            {auslastung.map((a, i) => (
              <span
                key={wochen[i]?.montag ?? i}
                className="zahlen flex flex-1 flex-col border-l px-1 py-1 text-center font-mono leading-tight"
                title={`${t('projekte.zeitplan.personen')}: ${kurz(a.personen)}\n${t('projekte.zeitplan.abwesendLabel')}: ${kurz(a.abwesend)}`}
              >
                <span>{t('projekte.zeitplan.baustellenKurz', { n: a.baustellen.length })}</span>
                <span className="text-muted-foreground">
                  {t('projekte.zeitplan.personenKurz', { n: a.personen.length })}
                </span>
                {a.abwesend.length > 0 && (
                  <span className={cn(a.abwesend.some((x) => a.personen.includes(x)) ? 'text-bad' : 'text-warn')}>
                    {t('projekte.zeitplan.abwesendKurz', { n: a.abwesend.length })}
                  </span>
                )}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
