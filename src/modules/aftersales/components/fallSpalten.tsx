import type { TFunction } from 'i18next'
import { Badge } from '@/components/ui/badge'
import { tonVonFarbe } from '@/lib/kontakt'
import { spaltenHelfer, type Spalten } from '@/lib/tabelle'
import type { ServiceFall } from '../types'
import { DatumZelle, NummerZelle } from '@/components/shared/Zellen'

const spalte = spaltenHelfer<ServiceFall>()
type Text = (liste: string, wert: string | null) => { text: string; farbe: string | null }

/** Ganze Tage seit dem Erfassen, nur für offene Fälle (null = erledigt). */
export function offenSeitTagen(f: Pick<ServiceFall, 'status' | 'erstellt_am'>, heute = new Date()): number | null {
  if (f.status === 'erledigt' || !f.erstellt_am) return null
  return Math.max(0, Math.floor((heute.getTime() - new Date(f.erstellt_am).getTime()) / 86_400_000))
}

/** Spalten der Fall-Liste: Nummer, Fall, Kunde, Kategorie, Priorität, Status, Zuständig, offen seit, Termin. */
export function fallSpalten(t: TFunction, auswahl: Text): Spalten<ServiceFall> {
  return spalte.columns([
    spalte.accessor('nummer', {
      header: t('service.spalte.nummer'),
      cell: (c) => <NummerZelle>{c.getValue()}</NummerZelle>,
      // Am Handy steht die Nummer in der Zeile darunter.
      meta: { breite: 'w-20', nurBreit: true },
    }),
    spalte.accessor('titel', {
      header: t('service.spalte.fall'),
      cell: (c) => (
        <span className="flex max-w-[22rem] min-w-0 flex-col">
          <span className="line-clamp-2 font-medium">{c.getValue()}</span>
          <span className="text-muted-foreground truncate text-xs">
            <span className="zahlen font-mono md:hidden">{c.row.original.nummer} · </span>
            {[c.row.original.kunde, c.row.original.ort].filter(Boolean).join(' · ')}
          </span>
        </span>
      ),
    }),
    // Text erst beim Zeichnen holen: Die Tabelle merkt sich Zugriffswerte, bis die Daten wechseln. Kommt die
    // Auswahlliste nach den Fällen, bliebe sonst der Schlüssel («stoerung») statt «Störung» stehen.
    spalte.accessor('kategorie', {
      id: 'kategorie',
      header: t('service.spalte.kategorie'),
      cell: (c) => (
        <span className="flex flex-wrap gap-1">
          {auswahl('servicekategorie', c.getValue()).text}
          {c.row.original.garantie && <Badge ton="info">{t('service.garantie')}</Badge>}
        </span>
      ),
      meta: { nurBreit: true },
    }),
    spalte.accessor((f) => ({ hoch: 0, normal: 1, tief: 2 })[f.prioritaet ?? 'normal'] ?? 1, {
      id: 'prio',
      header: t('service.spalte.prio'),
      cell: (c) => {
        const a = auswahl('prioritaet', c.row.original.prioritaet)
        return <Badge ton={tonVonFarbe(a.farbe)}>{a.text}</Badge>
      },
    }),
    spalte.accessor('status', {
      header: t('service.spalte.status'),
      cell: (c) => {
        const a = auswahl('servicestatus', c.getValue())
        return (
          <Badge ton={tonVonFarbe(a.farbe)} punkt>
            {a.text}
          </Badge>
        )
      },
    }),
    spalte.accessor((f) => f.person ?? '', {
      id: 'zustaendig',
      header: t('service.spalte.zustaendig'),
      cell: (c) => c.getValue() || <span className="text-muted-foreground">{t('service.niemand')}</span>,
      meta: { nurBreit: true },
    }),
    // Sortiert nach Alter; erledigte ganz unten. Ab 7 Tagen als Warnung, damit liegen gebliebene Fälle auffallen.
    spalte.accessor((f) => offenSeitTagen(f) ?? -1, {
      id: 'offenSeit',
      header: t('service.spalte.offenSeit'),
      cell: (c) => {
        const tage = c.getValue()
        if (tage < 0) return null
        return tage >= 7 ? (
          <Badge ton="warnung">{t('service.tage', { count: tage })}</Badge>
        ) : (
          <span className="zahlen">{t('service.tage', { count: tage })}</span>
        )
      },
      meta: { nurBreit: true },
    }),
    spalte.accessor((f) => f.termin_am ?? '', {
      id: 'termin',
      header: t('service.spalte.termin'),
      cell: (c) => <DatumZelle wert={c.getValue()} />,
      meta: { nurBreit: true },
    }),
  ])
}
