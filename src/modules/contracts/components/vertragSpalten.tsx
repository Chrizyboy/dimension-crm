import type { TFunction } from 'i18next'
import { Badge } from '@/components/ui/badge'
import { formatDatum } from '@/lib/format'
import { tonVonFarbe } from '@/lib/kontakt'
import { spaltenHelfer, type Spalten } from '@/lib/tabelle'
import { inTagen, wartungTon } from '../lib/anzeige'
import { laufzeit, naechsteRechnung } from '../lib/liste'
import { findePaket, rabattProzent } from '../lib/tarif'
import type { Katalog, Vertrag } from '../types'
import { BetragZelle, NummerZelle } from '@/components/shared/Zellen'

const spalte = spaltenHelfer<Vertrag>()
type Text = (wert: string) => { text: string; farbe: string | null }

/** Ton des Paket-Abzeichens: Comfort (empfohlen) in der Markenfarbe, Premium blau, sonst neutral. */
function paketTon(id: string | null): 'marke' | 'info' | 'neutral' {
  return id === 'comfort' ? 'marke' : id === 'premium' ? 'info' : 'neutral'
}

/**
 * Spalten der Vertragsliste: Nummer, Kunde, Paket, Anlage, Jahrespreis exkl. MWST, nächste Inspektion,
 * nächste Rechnung, Laufzeit (kündbar bis / endet am) und Stand.
 */
export function vertragSpalten(t: TFunction, status: Text, heute: Date, katalog?: Katalog): Spalten<Vertrag> {
  const iso = inTagen(heute, 0)
  const monate = katalog?.bedingungen.kuendigung_monate ?? 3
  return spalte.columns([
    spalte.accessor((v) => v.nummer ?? '', {
      id: 'nummer',
      header: t('wartung.spalte.nummer'),
      cell: (c) => <NummerZelle>{c.getValue()}</NummerZelle>,
      // Am Handy steht die Nummer in der Zeile darunter.
      meta: { breite: 'w-20', nurBreit: true },
    }),
    spalte.accessor('kunde', {
      header: t('wartung.spalte.kunde'),
      cell: (c) => (
        <span className="flex max-w-[20rem] min-w-0 flex-col">
          <span className="line-clamp-2 font-medium">{c.getValue()}</span>
          <span className="text-muted-foreground truncate text-xs">
            <span className="zahlen font-mono md:hidden">{c.row.original.nummer} · </span>
            {[c.row.original.ort, c.row.original.projekt].filter(Boolean).join(' · ')}
          </span>
        </span>
      ),
    }),
    spalte.accessor((v) => v.paket ?? '', {
      id: 'paket',
      header: t('wartung.spalte.paket'),
      cell: (c) => {
        const v = c.row.original
        const p = findePaket(katalog, v.paket)
        return p ? <Badge ton={paketTon(v.paket)}>{p.name}</Badge> : <span className="text-muted-foreground">–</span>
      },
    }),
    spalte.accessor((v) => v.anlage_kwp ?? 0, {
      id: 'anlage',
      header: t('wartung.spalte.anlage'),
      cell: (c) => {
        const v = c.row.original
        return (
          <span className="flex flex-col text-sm">
            <span className="zahlen whitespace-nowrap">
              {[
                v.anlage_kwp != null ? `${String(v.anlage_kwp)} kWp` : null,
                v.speicher_kwh ? `${String(v.speicher_kwh)} kWh` : null,
              ]
                .filter(Boolean)
                .join(' · ') || '–'}
            </span>
            {v.wechselrichter && <span className="text-muted-foreground truncate text-xs">{v.wechselrichter}</span>}
          </span>
        )
      },
      meta: { nurBreit: true },
    }),
    spalte.accessor((v) => v.preis_netto_rappen ?? 0, {
      id: 'preis',
      header: t('wartung.spalte.preis'),
      cell: (c) => {
        const v = c.row.original
        const r = rabattProzent(v.tarif_netto_rappen, v.preis_netto_rappen)
        return (
          <span className="flex flex-col items-end">
            <BetragZelle rappen={v.preis_netto_rappen ?? v.preis_rappen} />
            {r > 0 && <Badge ton="warnung">{t('wartung.preis.abweichung', { prozent: r })}</Badge>}
          </span>
        )
      },
      meta: { nurBreit: true, zahl: true },
    }),
    spalte.accessor((v) => v.naechste_wartung ?? '9999', {
      id: 'naechste',
      header: t('wartung.spalte.naechste'),
      cell: (c) => {
        const v = c.row.original
        if (v.status === 'beendet') return '–'
        if (!v.naechste_wartung) {
          return v.paket ? (
            <span className="text-muted-foreground text-xs">{t('wartung.paket.keineInspektion')}</span>
          ) : (
            '–'
          )
        }
        return <Badge ton={wartungTon(v.naechste_wartung, heute)}>{formatDatum(v.naechste_wartung)}</Badge>
      },
    }),
    spalte.accessor((v) => naechsteRechnung(v) ?? '9999', {
      id: 'rechnung',
      header: t('wartung.spalte.rechnung'),
      cell: (c) => {
        const r = naechsteRechnung(c.row.original)
        return r ? <span className="zahlen">{formatDatum(r)}</span> : '–'
      },
      meta: { nurBreit: true },
    }),
    spalte.accessor((v) => laufzeit(v, iso, monate).bis ?? '', {
      id: 'laufzeit',
      header: t('wartung.spalte.laufzeit'),
      cell: (c) => {
        const v = c.row.original
        const l = laufzeit(v, iso, monate)
        if (v.status === 'gekuendigt' && l.bis) {
          return <Badge ton="kritisch">{`${t('wartung.laufzeit.gekuendigt')} ${formatDatum(l.bis)}`}</Badge>
        }
        if (!l.bis) return '–'
        const bald = l.kuendbar != null && l.kuendbar >= iso && l.kuendbar <= inTagen(heute, 90)
        return (
          <span className="flex flex-col text-xs whitespace-nowrap">
            <span>{`${t('wartung.laufzeit.laeuft')} ${formatDatum(l.bis)}`}</span>
            {l.kuendbar && (
              <span className={bald ? 'text-warn font-medium' : 'text-muted-foreground'}>
                {`${t('wartung.laufzeit.kuendbar')} ${formatDatum(l.kuendbar)}`}
              </span>
            )}
          </span>
        )
      },
      meta: { nurBreit: true },
    }),
    spalte.accessor('status', {
      header: t('wartung.spalte.status'),
      cell: (c) => {
        const a = status(c.getValue())
        return (
          <Badge ton={tonVonFarbe(a.farbe)} punkt>
            {a.text}
          </Badge>
        )
      },
    }),
  ])
}
