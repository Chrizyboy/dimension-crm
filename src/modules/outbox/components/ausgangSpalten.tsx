import { Bot, Mail, MessageSquareText, Paperclip } from 'lucide-react'
import type { TFunction } from 'i18next'
import { Badge } from '@/components/ui/badge'
import { spaltenHelfer, type Spalten } from '@/lib/tabelle'
import { STATUS_TON, vorschau, zeitpunkt } from '../lib/anzeige'
import type { AusgangEintrag } from '../types'

const spalte = spaltenHelfer<AusgangEintrag>()

/** Spalten des Ausgangskorbs: Kanal, Empfänger, Inhalt, Status, Zeit. */
export function ausgangSpalten(t: TFunction): Spalten<AusgangEintrag> {
  return spalte.columns([
    spalte.accessor('kanal', {
      header: t('ausgang.spalte.kanal'),
      cell: (c) =>
        c.getValue() === 'sms' ? (
          <MessageSquareText className="text-muted-foreground size-4" aria-label="SMS" />
        ) : (
          <Mail className="text-muted-foreground size-4" aria-label={t('ausgang.mail')} />
        ),
      meta: { breite: 'w-10' },
    }),
    spalte.accessor('an', {
      header: t('ausgang.spalte.an'),
      cell: (c) => (
        <span className="flex max-w-[9.5rem] min-w-0 flex-col sm:max-w-[15rem]">
          <span className="line-clamp-2 font-medium">{c.row.original.kunde ?? c.getValue()}</span>
          {c.row.original.kunde && <span className="text-muted-foreground truncate text-xs">{c.getValue()}</span>}
        </span>
      ),
    }),
    spalte.accessor((e) => vorschau(e), {
      id: 'inhalt',
      header: t('ausgang.spalte.inhalt'),
      enableSorting: false,
      cell: (c) => (
        <span className="flex max-w-[22rem] items-center gap-1.5 2xl:max-w-[30rem]">
          {c.row.original.automatisch && (
            <Bot className="text-muted-foreground size-3.5 shrink-0" aria-label={t('ausgang.automatisch')} />
          )}
          {c.row.original.anhaenge.length > 0 && (
            <Paperclip className="text-muted-foreground size-3.5 shrink-0" aria-label={t('ausgang.anhaenge')} />
          )}
          <span className="line-clamp-2">{c.getValue()}</span>
        </span>
      ),
      meta: { nurBreit: true },
    }),
    spalte.accessor('status', {
      header: t('ausgang.spalte.status'),
      cell: (c) => (
        <Badge ton={STATUS_TON[c.getValue()]} punkt>
          {t(`ausgang.status.${c.getValue()}`)}
        </Badge>
      ),
      meta: { breite: 'w-40' },
    }),
    spalte.accessor((e) => e.gesendet_am ?? e.erstellt_am, {
      id: 'zeit',
      header: t('ausgang.spalte.zeit'),
      cell: (c) => (
        <span className="zahlen text-muted-foreground font-mono text-[13px] whitespace-nowrap">
          {zeitpunkt(c.getValue())}
        </span>
      ),
      meta: { nurBreit: true, breite: 'w-36' },
    }),
  ])
}
