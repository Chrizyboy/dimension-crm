import type { TFunction } from 'i18next'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/schalter'
import { spaltenHelfer } from '@/lib/tabelle'
import { ekAlter, hinweise } from '../lib/hinweise'
import type { Artikel, PreisRegeln } from '../types'

const spalte = spaltenHelfer<Artikel>()
const TON = { marge: 'kritisch', ekAlt: 'warnung', ohneEk: 'warnung', datenblatt: 'neutral', lager: 'ok' } as const

/** Ankreuzfeld je Zeile (Mehrfach-Ändern). Klicks gehen nicht an die Zeile, damit sich die Akte nicht öffnet. */
export function auswahlSpalte(t: TFunction, gewaehlt: ReadonlySet<string>, onWahl: (id: string, an: boolean) => void) {
  return spalte.display({
    id: 'wahl',
    header: () => <span className="sr-only">{t('preise.mehrfach.wahl')}</span>,
    cell: (c) => (
      <span
        onClick={(e) => {
          e.stopPropagation()
        }}
        onKeyDown={(e) => {
          e.stopPropagation()
        }}
      >
        <Checkbox
          aria-label={t('preise.mehrfach.waehle', { name: c.row.original.name })}
          checked={gewaehlt.has(c.row.original.id)}
          onCheckedChange={(v) => {
            onWahl(c.row.original.id, v === true)
          }}
        />
      </span>
    ),
    meta: { breite: 'w-8' },
  })
}

/** Lager Bulle: frei, darunter reserviert und bestellt. */
export function lagerSpalte(t: TFunction) {
  return spalte.accessor((a) => a.lagerFrei, {
    id: 'lager',
    header: t('preise.spalte.lager'),
    cell: (c) => {
      const a = c.row.original
      return (
        <span className="zahlen flex flex-col text-right font-mono text-[13px]">
          <span>{a.lagerFrei || '–'}</span>
          {(a.lagerReserviert > 0 || a.lagerUnterwegs > 0) && (
            <span className="text-muted-foreground font-sans text-xs">
              {[
                a.lagerReserviert ? t('preise.lager.reserviert', { n: a.lagerReserviert }) : null,
                a.lagerUnterwegs ? t('preise.lager.bestellt', { n: a.lagerUnterwegs }) : null,
              ]
                .filter(Boolean)
                .join(' · ')}
            </span>
          )}
        </span>
      )
    },
    meta: { nurBreit: true, breite: 'w-24' },
  })
}

/** Handlungsbedarf als Marken (ohne «am Lager», das steht in der eigenen Spalte). */
export function hinweisSpalte(t: TFunction, regeln: PreisRegeln | undefined) {
  return spalte.display({
    id: 'hinweis',
    header: t('preise.spalte.hinweis'),
    cell: (c) => {
      const h = hinweise(c.row.original, regeln).filter((x) => x !== 'lager')
      const alter = ekAlter(c.row.original)
      return (
        <span className="flex flex-wrap gap-1">
          {h.map((x) => (
            <Badge key={x} ton={TON[x]}>
              {t(`preise.hinweis.${x}`, { tage: alter ?? 0 })}
            </Badge>
          ))}
          {c.row.original.lieferantenAnzahl !== null && c.row.original.lieferantenAnzahl > 1 && (
            <Badge ton="info">{t('preise.hinweis.lieferanten', { n: c.row.original.lieferantenAnzahl })}</Badge>
          )}
        </span>
      )
    },
    meta: { nurBreit: true },
  })
}
