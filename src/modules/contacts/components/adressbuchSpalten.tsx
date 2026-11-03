import type { TFunction } from 'i18next'
import { Badge } from '@/components/ui/badge'
import { formatDatum, formatTelefon, unterzeile } from '@/lib/format'
import { tonVonFarbe } from '@/lib/kontakt'
import { spaltenHelfer, type Spalten } from '@/lib/tabelle'
import { EinzeilerZelle } from '@/components/shared/Zellen'
import { bewertungText, nachweisStand } from '../lib/rollen'
import type { Partnerzeile } from '../types'

/** Zeile der Liste: ein Partner, oder mit «auch Kunden zeigen» ein Kunde (Rolle «kunde»). */
export type Listenzeile = Partnerzeile & { kunde?: boolean }

const spalte = spaltenHelfer<Listenzeile>()

/** Das Wichtigste je Rolle in einer Zeile, z. B. offene Gesuche beim Netzbetreiber, Bewertung beim Subunternehmer. */
export function wichtigText(p: Listenzeile, t: TFunction): string {
  const teile: string[] = []
  if (p.rollen.includes('netzbetreiber')) {
    if (p.gesucheOffen > 0)
      teile.push(t('adressbuch.liste.gesuche', { count: p.gesucheOffen, tage: p.gesucheTage ?? 0 }))
    if (p.gemeinden > 0) teile.push(t('adressbuch.liste.gemeinden', { count: p.gemeinden }))
  }
  if (p.rollen.includes('lieferant') && p.kundennummerBei)
    teile.push(t('adressbuch.liste.kdNr', { nr: p.kundennummerBei }))
  if (p.rollen.includes('subunternehmer')) {
    if (p.gewerk) teile.push(p.gewerk)
    const b = bewertungText(p.bewertung)
    if (b) teile.push(b)
    if (p.auftraegeLaufend > 0) teile.push(t('adressbuch.liste.auftraege', { count: p.auftraegeLaufend }))
  }
  if (p.rollen.includes('vermittler') && p.provisionProzent !== null) {
    teile.push(t('adressbuch.liste.provision', { prozent: p.provisionProzent }))
  }
  return unterzeile(...teile)
}

/** Spalten der Partnerliste: wer (mit Rollen), wo, wen anrufen, das Wichtigste je Rolle, zuletzt. */
export function adressbuchSpalten(
  t: TFunction,
  rolle: (schluessel: string) => { text: string; farbe: string | null },
  heute: string,
): Spalten<Listenzeile> {
  return spalte.columns([
    spalte.accessor('name', {
      header: t('kunden.spalte.name'),
      sortFn: (a, b) => a.original.name.localeCompare(b.original.name, 'de-CH'),
      cell: (c) => {
        const p = c.row.original
        const stand = nachweisStand(p.nachweisBis, heute)
        return (
          <div className="flex min-w-0 flex-col gap-1">
            <span className="line-clamp-2 max-w-[18rem] font-medium lg:max-w-[22rem]">{c.getValue()}</span>
            <span className="flex flex-wrap gap-1">
              {p.kunde ? (
                <Badge>{t('adressbuch.kunde')}</Badge>
              ) : (
                p.rollen.map((r) => (
                  <Badge key={r} ton={tonVonFarbe(rolle(r).farbe)}>
                    {rolle(r).text}
                  </Badge>
                ))
              )}
              {(stand === 'abgelaufen' || stand === 'bald') && (
                <Badge ton={stand === 'abgelaufen' ? 'kritisch' : 'warnung'} punkt>
                  {t(`adressbuch.nachweis.${stand}`)}
                </Badge>
              )}
              {p.gesucheAlt > 0 && (
                <Badge ton="warnung" punkt>
                  {t('adressbuch.liste.gesucheAlt', { count: p.gesucheAlt })}
                </Badge>
              )}
            </span>
          </div>
        )
      },
    }),
    spalte.accessor('ort', {
      header: t('kunden.spalte.ort'),
      cell: (c) => (
        <EinzeilerZelle>{[c.row.original.plz, c.getValue()].filter(Boolean).join(' ') || '–'}</EinzeilerZelle>
      ),
      meta: { nurBreit: true },
    }),
    spalte.accessor((p) => p.hauptkontakt ?? '', {
      id: 'ansprechperson',
      header: t('adressbuch.spalte.ansprechperson'),
      enableSorting: false,
      cell: (c) => {
        const p = c.row.original
        const tel = p.hauptkontaktTelefon ?? p.telefon
        return (
          <div className="flex min-w-0 flex-col">
            <span className="truncate">{p.hauptkontakt ?? '–'}</span>
            {tel && <span className="zahlen text-muted-foreground text-xs">{formatTelefon(tel)}</span>}
          </div>
        )
      },
      meta: { nurBreit: true },
    }),
    spalte.accessor((p) => wichtigText(p, t), {
      id: 'wichtig',
      header: t('adressbuch.spalte.wichtig'),
      enableSorting: false,
      cell: (c) => (
        <span className="text-muted-foreground line-clamp-2 max-w-[20rem] text-xs">{c.getValue() || '–'}</span>
      ),
      meta: { nurBreit: true },
    }),
    spalte.accessor((p) => p.zuletzt ?? '', {
      id: 'zuletzt',
      header: t('adressbuch.spalte.zuletzt'),
      cell: (c) => (
        <span className="zahlen text-muted-foreground text-xs">{c.getValue() ? formatDatum(c.getValue()) : '–'}</span>
      ),
      meta: { nurBreit: true },
    }),
  ])
}
