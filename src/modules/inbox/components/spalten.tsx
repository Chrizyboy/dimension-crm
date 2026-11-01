import type { TFunction } from 'i18next'
import { Paperclip } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { formatDatumZeit } from '@/lib/format'
import { spaltenHelfer, type Spalten } from '@/lib/tabelle'
import { absender, ART_TON } from '../lib/anzeige'
import type { Mail } from '../types'
import { FristMarke } from './FristMarke'

const spalte = spaltenHelfer<Mail>()

/** Kurzfassung der KI oder die Vorschau aus Outlook. */
const worum = (m: Mail) => m.zusammenfassung ?? m.vorschau ?? ''

/**
 * Spalten: Absender mit Betreff und Kurzfassung darunter (am Handy steht so alles Wichtige untereinander), Art,
 * Zuständig, Frist und Eingang. Die Frist steht vorne in der Zeile, wenn wenig Platz ist.
 */
export function mailSpalten(t: TFunction, sprache: 'de' | 'fr'): Spalten<Mail> {
  return spalte.columns([
    spalte.accessor((m) => absender(m), {
      id: 'mail',
      header: t('posteingang.spalte.mail'),
      cell: (c) => {
        const m = c.row.original
        return (
          <span className="flex max-w-[40rem] min-w-0 flex-col gap-0.5">
            <span className="flex items-center gap-2">
              <span className="line-clamp-1 font-medium">{c.getValue()}</span>
              {m.dringend && m.stand === 'offen' && <Badge ton="kritisch">{t('posteingang.dringend')}</Badge>}
            </span>
            <span className="line-clamp-2">
              {m.hat_anhang && (
                <Paperclip
                  className="text-muted-foreground mr-1 inline size-3.5"
                  aria-label={t('posteingang.anhang')}
                />
              )}
              {m.betreff || t('posteingang.ohneBetreff')}
            </span>
            {worum(m) && <span className="text-muted-foreground line-clamp-1 text-xs">{worum(m)}</span>}
            {/* Am Handy: Art, Frist und Zuständig in der Zeile unter dem Namen statt in eigenen Spalten. */}
            <span className="flex flex-wrap items-center gap-1.5 pt-1 md:hidden">
              {m.art && <Badge ton={ART_TON[m.art]}>{t(`posteingang.art.${m.art}`)}</Badge>}
              <FristMarke m={m} t={t} sprache={sprache} />
              {m.zustaendig && <span className="text-muted-foreground text-xs">{m.zustaendig}</span>}
            </span>
          </span>
        )
      },
    }),
    spalte.accessor((m) => m.art ?? '', {
      id: 'art',
      header: t('posteingang.spalte.art'),
      cell: (c) => {
        const a = c.row.original.art
        return a ? (
          <Badge ton={ART_TON[a]}>{t(`posteingang.art.${a}`)}</Badge>
        ) : (
          <span className="text-muted-foreground text-xs">{t('posteingang.wirdEingeordnet')}</span>
        )
      },
      meta: { nurBreit: true, breite: 'w-36' },
    }),
    spalte.accessor((m) => m.zustaendig ?? '', {
      id: 'zustaendig',
      header: t('posteingang.spalte.zustaendig'),
      cell: (c) => {
        const m = c.row.original
        return (
          <span className="flex flex-col text-sm">
            <span>{m.zustaendig ?? '–'}</span>
            {m.vertretung_fuer && (
              <span className="text-muted-foreground text-xs">
                {t('posteingang.fuer', { name: m.vertretung_fuer })}
              </span>
            )}
          </span>
        )
      },
      meta: { nurBreit: true, breite: 'w-36' },
    }),
    spalte.accessor((m) => (m.stand === 'offen' && m.frist_am ? Date.parse(m.frist_am) : Number.MAX_SAFE_INTEGER), {
      id: 'frist',
      header: t('posteingang.spalte.frist'),
      cell: (c) => <FristMarke m={c.row.original} t={t} sprache={sprache} />,
      meta: { nurBreit: true, breite: 'w-44' },
    }),
    spalte.accessor('eingang_am', {
      header: t('posteingang.spalte.eingang'),
      cell: (c) => (
        <span className="zahlen text-muted-foreground text-sm whitespace-nowrap">{formatDatumZeit(c.getValue())}</span>
      ),
      meta: { nurBreit: true, breite: 'w-36' },
    }),
  ])
}
