import { Inbox, Paperclip } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Fehlerzustand, Leerzustand } from '@/components/shared/Zustaende'
import { Badge } from '@/components/ui/badge'
import { Skelett } from '@/components/ui/diverses'
import { formatDatumZeit } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useUi } from '@/stores/ui'
import { absender, ART_TON, gruppe, istZurueck, GRUPPEN, MIT_GRUPPEN, type Gruppe } from '../lib/anzeige'
import type { Ansicht, Mail } from '../types'
import { FristMarke } from './FristMarke'

/**
 * Liste des Arbeitsplatzes: in «Für mich», «Zu verteilen» und «Alle offenen» nach Dringlichkeit gruppiert (über der
 * Frist, heute, später, ohne Frist), sonst neueste zuerst. Jede Zeile hat ein Häkchen für die Mehrfachauswahl; ein
 * Klick öffnet die Mail rechts (am schmalen Bildschirm als Seitenpanel).
 */
export function MailListe({
  ansicht,
  liste,
  aktiveId,
  markiert,
  laedt,
  fehler,
  onNochmal,
  onOeffnen,
  onMarkieren,
}: {
  ansicht: Ansicht
  liste: Mail[]
  aktiveId: string | null
  markiert: Set<string>
  laedt: boolean
  fehler: unknown
  onNochmal: () => void
  onOeffnen: (id: string) => void
  onMarkieren: (id: string) => void
}) {
  const { t } = useTranslation()
  if (fehler)
    return <Fehlerzustand {...(fehler instanceof Error ? { details: fehler.message } : {})} onNochmal={onNochmal} />
  if (laedt)
    return (
      <div className="bg-surface flex flex-col gap-2 rounded-xl border p-3">
        {[1, 2, 3, 4].map((i) => (
          <Skelett key={i} className="h-14" />
        ))}
      </div>
    )
  if (!liste.length)
    return (
      <div className="bg-surface rounded-xl border">
        <Leerzustand icon={Inbox} titel={t(`posteingang.leer.${ansicht}`)} text={t('posteingang.leer.text')} />
      </div>
    )
  const jetzt = new Date()
  const gruppen: [Gruppe | null, Mail[]][] = MIT_GRUPPEN.has(ansicht)
    ? GRUPPEN.map((g) => [g, liste.filter((m) => gruppe(m, jetzt) === g)] as [Gruppe, Mail[]]).filter(
        ([, l]) => l.length > 0,
      )
    : [[null, liste]]
  return (
    <div
      className="bg-surface overflow-hidden rounded-xl border"
      role="list"
      aria-label={t(`posteingang.ansicht.${ansicht}`)}
    >
      {gruppen.map(([g, l]) => (
        <div key={g ?? 'alle'} role="presentation">
          {g && (
            <h3 className="bg-surface-2 text-muted-foreground flex justify-between border-b px-3.5 py-1.5 text-xs font-medium tracking-wide uppercase">
              <span>{t(`posteingang.gruppe.${g}`)}</span>
              <span className="zahlen">{l.length}</span>
            </h3>
          )}
          {l.map((m) => (
            <MailZeile
              key={m.id}
              m={m}
              aktiv={m.id === aktiveId}
              markiert={markiert.has(m.id)}
              onOeffnen={onOeffnen}
              onMarkieren={onMarkieren}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

/** Eine Zeile: Häkchen, Absender mit Kundennummer und Art, Betreff, Kurzfassung; rechts Frist, Eingang, Postfach. */
function MailZeile({
  m,
  aktiv,
  markiert,
  onOeffnen,
  onMarkieren,
}: {
  m: Mail
  aktiv: boolean
  markiert: boolean
  onOeffnen: (id: string) => void
  onMarkieren: (id: string) => void
}) {
  const { t } = useTranslation()
  const sprache = useUi((z) => z.sprache)
  const worum = m.zusammenfassung ?? m.vorschau ?? ''
  return (
    <div
      role="listitem"
      data-mail={m.id}
      className={cn(
        'hover:bg-surface-2 grid grid-cols-[auto_minmax(0,1fr)] gap-3 border-b px-3.5 py-2.5 last:border-b-0',
        aktiv && 'bg-accent-soft hover:bg-accent-soft',
      )}
    >
      <input
        type="checkbox"
        className="accent-accent mt-1 size-4"
        checked={markiert}
        aria-label={t('posteingang.auswaehlen', { name: absender(m) })}
        onChange={() => {
          onMarkieren(m.id)
        }}
      />
      <button
        type="button"
        className="focus-visible:ring-ring flex min-w-0 flex-col gap-0.5 rounded text-left outline-none focus-visible:ring-2 sm:flex-row sm:gap-3"
        aria-current={aktiv ? 'true' : undefined}
        onClick={() => {
          onOeffnen(m.id)
        }}
      >
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="flex min-w-0 items-center gap-1.5">
            <span className={cn('truncate', m.stand !== 'erledigt' && 'font-semibold')}>{absender(m)}</span>
            {m.art && <Badge ton={ART_TON[m.art]}>{t(`posteingang.art.${m.art}`)}</Badge>}
            {m.dringend && m.stand === 'offen' && <Badge ton="kritisch">{t('posteingang.dringend')}</Badge>}
            {m.nachfassen && m.stand === 'offen' && <Badge ton="warnung">{t('posteingang.nachfassen')}</Badge>}
          </span>
          <span className="truncate text-sm">
            {m.hat_anhang && (
              <Paperclip className="text-muted-foreground mr-1 inline size-3.5" aria-label={t('posteingang.anhang')} />
            )}
            {m.betreff || t('posteingang.ohneBetreff')}
          </span>
          {worum && <span className="text-muted-foreground truncate text-xs">{worum}</span>}
        </span>
        <span className="text-muted-foreground flex shrink-0 flex-wrap items-center gap-1.5 text-xs sm:flex-col sm:items-end">
          {m.warten_bis && m.stand === 'erledigt' ? (
            <Badge ton="info">{t('posteingang.wartetBis', { datum: formatDatumZeit(m.warten_bis) })}</Badge>
          ) : m.zurueck_am && istZurueck(m) ? (
            <Badge>{t('posteingang.zurueckBis', { datum: formatDatumZeit(m.zurueck_am) })}</Badge>
          ) : (
            <FristMarke m={m} t={t} sprache={sprache} />
          )}
          <span className="zahlen">{formatDatumZeit(m.eingang_am)}</span>
          <span>
            {m.postfach === 'me'
              ? t('posteingang.eigenesPostfach')
              : [`${m.postfach.split('@')[0] ?? ''}@`, m.zustaendig ?? t('posteingang.nichtVerteilt')].join(' · ')}
          </span>
        </span>
      </button>
    </div>
  )
}
