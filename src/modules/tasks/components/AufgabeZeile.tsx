import { CalendarClock, MessageSquare, Repeat, Workflow } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/diverses'
import { Checkbox } from '@/components/ui/schalter'
import { formatDatum } from '@/lib/format'
import { cn } from '@/lib/utils'
import { meldeFehler } from '@/services/fehler'
import { melde } from '@/services/meldungen'
import { useNeuLaden } from '../hooks/useAufgaben'
import { dringlichkeit, heuteZuerich, naechsterArbeitstag } from '../lib/faelligkeit'
import { aendere, erledige, oeffneWieder } from '../services/aufgaben'
import type { Aufgabe, Person } from '../types'

const TON = {
  ueberfaellig: 'kritisch',
  heute: 'warnung',
  bald: 'neutral',
  spaeter: 'neutral',
  ohne: 'neutral',
} as const

/** Fälligkeit als Abzeichen: «Heute», «Morgen» oder das Datum; rot, wenn überfällig. */
export function Faellig({ datum, erledigt }: { datum: string | null; erledigt?: boolean }) {
  const { t } = useTranslation()
  if (!datum) return null
  const d = erledigt ? 'ohne' : dringlichkeit(datum)
  const heute = heuteZuerich()
  const text =
    d === 'heute'
      ? t('aufgaben.heute')
      : datum === naechsterArbeitstag(heute) && datum !== heute
        ? t('aufgaben.morgen')
        : formatDatum(datum)
  return (
    <Badge ton={TON[d]} className="tabular-nums">
      {text}
    </Badge>
  )
}

/**
 * Eine Zeile: Haken (erledigt ohne Notiz), Titel, Bezug mit Namen, Herkunft, Teilschritte, Kommentare, Datum
 * und Person. «Morgen» verschiebt mit einem Klick, ohne die Akte zu öffnen.
 */
export function AufgabeZeile({
  aufgabe: a,
  personen,
  zeigePerson,
  aktiv,
  onOeffnen,
}: {
  aufgabe: Aufgabe
  personen: Person[]
  zeigePerson: boolean
  aktiv: boolean
  onOeffnen: () => void
}) {
  const { t } = useTranslation()
  const neuLaden = useNeuLaden()
  const person = personen.find((p) => p.id === a.person_id)
  const schritte = a.teilschritte.length
  const fertig = a.teilschritte.filter((s) => s.erledigt).length

  async function haken(an: boolean) {
    try {
      if (an) await erledige(a.id)
      else await oeffneWieder(a.id)
      if (an) melde('ok', { de: 'Erledigt', fr: 'Terminée' })
    } catch (f) {
      meldeFehler(f, 'aufgaben')
    }
    neuLaden()
  }

  async function morgen() {
    try {
      await aendere(a.id, { faellig_am: naechsterArbeitstag() })
      melde('ok', { de: 'Auf den nächsten Arbeitstag verschoben', fr: 'Reportée au prochain jour ouvrable' })
    } catch (f) {
      meldeFehler(f, 'aufgaben')
    }
    neuLaden()
  }

  return (
    <li className={cn('group hover:bg-surface-2 flex items-start gap-3 px-3 py-2.5', aktiv && 'bg-info-soft/60')}>
      <Checkbox
        className={cn('mt-0.5', a.wichtig && !a.erledigt_am && 'border-bad')}
        checked={a.erledigt_am !== null}
        aria-label={t('aufgaben.erledigtSetzen', { titel: a.titel })}
        onCheckedChange={(an) => void haken(an === true)}
      />
      <button
        type="button"
        onClick={onOeffnen}
        className="focus-visible:ring-ring flex min-w-0 flex-1 flex-col gap-0.5 rounded text-left outline-none focus-visible:ring-2"
      >
        <span className={cn('line-clamp-2', a.erledigt_am ? 'text-muted-foreground line-through' : 'font-medium')}>
          {a.wichtig && !a.erledigt_am && <span className="text-bad mr-1 font-semibold">!</span>}
          {a.titel}
        </span>
        <span className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs">
          {a.bezug_tabelle && (
            <span className="text-info font-medium">
              {t(`aufgaben.bezug.${a.bezug_tabelle}`, { defaultValue: a.bezug_tabelle })}
              {a.bezug_name && ` · ${a.bezug_name}`}
            </span>
          )}
          <span className="inline-flex items-center gap-1">
            {a.herkunft === 'automation' && <Workflow className="size-3" aria-hidden="true" />}
            {a.vertretung
              ? t('aufgaben.vertretungFuer', { name: person?.name ?? '' })
              : t(`aufgaben.herkunft.${a.herkunft}`)}
          </span>
          {schritte > 0 && <span className="tabular-nums">{t('aufgaben.schritteZahl', { fertig, schritte })}</span>}
          {a.kommentare > 0 && (
            <span className="inline-flex items-center gap-1 tabular-nums">
              <MessageSquare className="size-3" aria-hidden="true" />
              {a.kommentare}
            </span>
          )}
          {a.wiederholung && (
            <span className="inline-flex items-center gap-1">
              <Repeat className="size-3" aria-hidden="true" />
              {t(`aufgaben.wiederholung.${a.wiederholung}`)}
            </span>
          )}
          {a.erledigt_notiz && <span className="line-clamp-1 italic">{a.erledigt_notiz}</span>}
        </span>
      </button>
      <div className="flex shrink-0 items-center gap-2">
        {!a.erledigt_am && (
          <button
            type="button"
            onClick={() => void morgen()}
            title={t('aufgaben.morgenVerschieben')}
            aria-label={t('aufgaben.morgenVerschiebenFuer', { titel: a.titel })}
            className="text-muted-foreground hover:text-foreground focus-visible:ring-ring hidden rounded p-1 outline-none group-hover:inline-flex focus-visible:inline-flex focus-visible:ring-2 md:inline-flex md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100"
          >
            <CalendarClock className="size-4" />
          </button>
        )}
        <Faellig datum={a.erledigt_am ? null : a.faellig_am} />
        {a.erledigt_am && (
          <span className="text-muted-foreground text-xs tabular-nums">{formatDatum(a.erledigt_am)}</span>
        )}
        {zeigePerson && person && (
          <Avatar name={person.name} className={cn(a.vertretung && 'ring-accent ring-dashed ring-2')} />
        )}
      </div>
    </li>
  )
}
