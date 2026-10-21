import {
  CalendarCheck,
  FileSignature,
  FileText,
  Gavel,
  Hammer,
  History,
  Inbox,
  Mail,
  MessageSquare,
  NotebookPen,
  Paperclip,
  Phone,
  Send,
  Users,
  Wrench,
  type LucideIcon,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Filterchips } from '@/components/shared/Filterchips'
import { Zeitachse, type Zeitpunkt } from '@/components/shared/Zeitachse'
import { Leerzustand } from '@/components/shared/Zustaende'
import { Skelett } from '@/components/ui/diverses'
import { useAuswahl } from '@/hooks/useAuswahl'
import { useUi } from '@/stores/ui'
import { chfOderLeer, kwpText } from '../lib/anzeige'
import type { Zeitachseneintrag } from '../types'

const ICONS: Record<string, LucideIcon> = {
  'aktivitaet:anruf': Phone,
  'aktivitaet:mail': Mail,
  'aktivitaet:besuch': Users,
  'aktivitaet:brief': Send,
  'aktivitaet:notiz': NotebookPen,
  'aktivitaet:sms': MessageSquare,
  'aktivitaet:aenderung': History,
  anfrage: Inbox,
  termin: CalendarCheck,
  offerte: FileText,
  entscheid: Gavel,
  werkvertrag: FileSignature,
  baubeginn: Hammer,
  service: Wrench,
  dokument: Paperclip,
}

const FILTER = ['alle', 'kontakte', 'geschaeft', 'dokumente', 'aenderungen'] as const
type Filter = (typeof FILTER)[number]

function gruppeVon(art: string): Exclude<Filter, 'alle'> {
  if (art === 'aktivitaet:aenderung' || art.startsWith('aenderung:')) return 'aenderungen'
  if (art.startsWith('aktivitaet:')) return 'kontakte'
  if (art === 'dokument') return 'dokumente'
  return 'geschaeft'
}

const TON: Record<string, string> = {
  kontakte: 'bg-info-soft text-info',
  geschaeft: 'bg-accent-soft text-accent-ink',
  dokumente: 'bg-muted text-muted-foreground',
  aenderungen: 'bg-muted text-muted-foreground',
}

/**
 * Reiter «Zeitachse»: Anrufe, Mails, Notizen, Offerten, Entscheide, Werkvertrag, Baubeginn,
 * Service, Dokumente und Änderungen chronologisch (Bau-Auftrag 3.2). Filter oben.
 */
export function AkteZeitachse({ eintraege, laedt }: { eintraege: Zeitachseneintrag[] | undefined; laedt: boolean }) {
  const { t } = useTranslation()
  const sprache = useUi((z) => z.sprache)
  const ergebnis = useAuswahl('kontaktergebnis')
  const [filter, setFilter] = useState<Filter>('alle')

  const punkte = useMemo<Zeitpunkt[]>(
    () =>
      (eintraege ?? [])
        .filter((e) => filter === 'alle' || gruppeVon(e.art) === filter)
        .map((e, i) => {
          const d = e.daten
          const art = e.art.startsWith('aenderung:') ? 'aenderung' : e.art
          const felder = Array.isArray(d.felder) ? d.felder.filter((f) => typeof f === 'string') : []
          const titel = t(`zeitachse.art.${art.replace(':', '_')}`, {
            nummer: typeof d.nummer === 'string' ? d.nummer : '',
            entscheid:
              typeof d.entscheid === 'string' ? t(`akte.entscheid.${d.entscheid}`, { defaultValue: d.entscheid }) : '',
            defaultValue: art,
          })
          const meta = [
            e.wer,
            typeof d.betrag_rappen === 'number' ? chfOderLeer(d.betrag_rappen) : null,
            typeof d.kwp === 'number' ? kwpText(d.kwp) : null,
            typeof d.ergebnis === 'string' ? ergebnis.text(d.ergebnis) : null,
            typeof d.ordner === 'string' ? t(`dokument.ordner.${d.ordner}`, { defaultValue: d.ordner }) : null,
            felder.length ? felder.map((f) => t(`zeitachse.feld.${f}`, { defaultValue: f })).join(', ') : null,
          ].filter(Boolean)
          return {
            id: `${e.bezugId}-${e.art}-${i}`,
            zeitpunkt: e.zeitpunkt,
            icon: ICONS[e.art] ?? History,
            titel,
            text: e.text || undefined,
            meta: meta.length ? meta.map((m) => <span key={m}>{m}</span>) : undefined,
            ton: TON[gruppeVon(e.art)],
          }
        }),
    [eintraege, filter, t, ergebnis],
  )

  if (laedt) {
    return (
      <div className="flex flex-col gap-4">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="flex gap-3">
            <Skelett className="size-7 rounded-full" />
            <div className="flex flex-1 flex-col gap-1.5">
              <Skelett className="h-4 w-1/2" />
              <Skelett className="h-3 w-3/4" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <Filterchips
        einzeln
        beschriftung={t('zeitachse.filter')}
        gewaehlt={[filter]}
        onChange={([f]) => {
          if (f) setFilter(f as Filter)
        }}
        optionen={FILTER.map((f) => ({
          wert: f,
          text: t(`zeitachse.filter_${f}`),
          anzahl:
            f === 'alle' ? (eintraege ?? []).length : (eintraege ?? []).filter((e) => gruppeVon(e.art) === f).length,
        }))}
      />
      {punkte.length === 0 ? (
        <Leerzustand icon={History} titel={t('zeitachse.leer')} text={t('zeitachse.leerText')} />
      ) : (
        <Zeitachse eintraege={punkte} sprache={sprache} />
      )}
    </div>
  )
}
