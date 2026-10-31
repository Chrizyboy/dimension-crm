import type { TFunction } from 'i18next'
import { Badge } from '@/components/ui/badge'
import { spaltenHelfer, type Spalten } from '@/lib/tabelle'
import { groesse, investition, STAND_TON, zahl } from '../lib/anzeige'
import type { Grossprojekt } from '../types'
import { PunkteMarke } from './PunkteMarke'

const spalte = spaltenHelfer<Grossprojekt>()

/**
 * Spalten der Liste: Punkte, Projekt (mit Ort und Bauherrschaft darunter, damit am Handy alles Wichtige sichtbar
 * bleibt), Contracting (PV, Wärme, Grösse), Investition, Bauherrschaft, Stand.
 */
export function grossprojektSpalten(t: TFunction): Spalten<Grossprojekt> {
  return spalte.columns([
    spalte.accessor((g) => (g.ausschluss ? -1 : g.punkte), {
      id: 'punkte',
      header: t('grossprojekte.spalte.punkte'),
      cell: (c) => <PunkteMarke g={c.row.original} t={t} />,
      meta: { breite: 'w-28' },
    }),
    spalte.accessor('titel', {
      header: t('grossprojekte.spalte.projekt'),
      cell: (c) => {
        const g = c.row.original
        return (
          <span className="flex max-w-[28rem] min-w-0 flex-col">
            <span className="line-clamp-2 font-medium">{c.getValue()}</span>
            <span className="text-muted-foreground line-clamp-2 text-xs">
              {[
                g.gemeinde,
                g.fahrzeit_min != null ? t('grossprojekte.fahrzeit', { min: g.fahrzeit_min }) : null,
                g.bauherr,
              ]
                .filter(Boolean)
                .join(' · ')}
            </span>
          </span>
        )
      },
    }),
    spalte.accessor((g) => g.schaetzung.kwp ?? g.schaetzung.waerme_kw ?? 0, {
      id: 'groesse',
      header: t('grossprojekte.spalte.contracting'),
      cell: (c) => {
        const g = c.row.original
        return (
          <span className="flex flex-col items-start gap-1">
            {g.art ? <Badge ton="marke">{t(`grossprojekte.art.${g.art}`)}</Badge> : <span>–</span>}
            <span className="text-muted-foreground zahlen text-xs">{groesse(g, t('grossprojekte.waerme'))}</span>
          </span>
        )
      },
      meta: { breite: 'w-40' },
    }),
    spalte.accessor((g) => investition(g), {
      id: 'investition',
      header: t('grossprojekte.spalte.investition'),
      cell: (c) =>
        c.getValue() > 0 ? (
          <span className="zahlen whitespace-nowrap">CHF {zahl(c.getValue() / 100)}</span>
        ) : (
          <span className="text-muted-foreground">–</span>
        ),
      meta: { zahl: true, nurBreit: true, breite: 'w-36' },
    }),
    spalte.accessor((g) => g.bauherr_art ?? 'unbekannt', {
      id: 'bauherr',
      header: t('grossprojekte.spalte.bauherr'),
      cell: (c) => <span className="text-sm">{t(`grossprojekte.bauherrArt.${c.getValue()}`)}</span>,
      meta: { nurBreit: true, breite: 'w-36' },
    }),
    spalte.accessor('stand', {
      header: t('grossprojekte.spalte.stand'),
      cell: (c) => (
        <Badge ton={STAND_TON[c.getValue()]} punkt>
          {t(`grossprojekte.stand.${c.getValue()}`)}
        </Badge>
      ),
      meta: { nurBreit: true, breite: 'w-32' },
    }),
  ])
}
