import { FileText, Mail, MessageSquare, NotebookPen, Phone, Smartphone, Users, type LucideIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Zeitachse, type Zeitpunkt } from '@/components/shared/Zeitachse'
import { useAuswahl } from '@/hooks/useAuswahl'
import { formatDatum } from '@/lib/format'
import { dokumentAdresse } from '@/services/dokumente'
import { meldeFehler } from '@/services/fehler'
import { melde } from '@/services/meldungen'
import { useUi } from '@/stores/ui'

const ICONS: Partial<Record<string, LucideIcon>> = {
  anruf: Phone,
  mail: Mail,
  besuch: Users,
  brief: FileText,
  notiz: NotebookPen,
  sms: Smartphone,
}

interface Aktivitaet {
  id: string
  art: string
  richtung: string | null
  zeitpunkt: string
  text: string | null
  ergebnis: string | null
  personen: { name: string } | null
}

/** Kontaktverlauf des Leads als Zeitachse (Anrufe, Mails, Besuche mit Ergebnis). */
export function LeadVerlauf({ eintraege, altText }: { eintraege: Aktivitaet[]; altText: string | null }) {
  const { t } = useTranslation()
  const sprache = useUi((z) => z.sprache)
  const arten = useAuswahl('aktivitaet')
  const ergebnisse = useAuswahl('kontaktergebnis')
  const punkte: Zeitpunkt[] = eintraege.map((a) => ({
    id: a.id,
    zeitpunkt: a.zeitpunkt,
    icon: ICONS[a.art] ?? MessageSquare,
    titel: [arten.text(a.art), a.ergebnis ? ergebnisse.text(a.ergebnis) : null].filter(Boolean).join(' · '),
    text: a.text ?? undefined,
    meta: a.personen?.name,
    ton:
      a.ergebnis === 'termin'
        ? 'bg-ok-soft text-ok'
        : a.ergebnis === 'kein_interesse'
          ? 'bg-bad-soft text-bad'
          : undefined,
  }))
  if (!punkte.length && !altText)
    return <p className="text-muted-foreground text-sm">{t('verkauf.akte.keinVerlauf')}</p>
  return (
    <div className="flex flex-col gap-3">
      {punkte.length > 0 && <Zeitachse eintraege={punkte} sprache={sprache} nachMonat={false} />}
      {altText && (
        <details className="text-sm">
          <summary className="text-muted-foreground cursor-pointer text-xs">{t('verkauf.akte.verlaufV233')}</summary>
          <p className="bg-muted/60 mt-2 rounded-md p-2 text-xs whitespace-pre-wrap">{altText}</p>
        </details>
      )}
    </div>
  )
}

interface Datei {
  id: string
  name: string
  bytes: number | null
  hochgeladen_am: string | null
  sharepoint_url: string | null
  speicher_pfad: string | null
}

/** Öffnet eine Datei in einem neuen Fenster; das Fenster geht sofort auf, damit der Browser es nicht blockiert. */
async function oeffne(d: Datei) {
  const fenster = window.open('', '_blank')
  if (fenster) fenster.opener = null
  try {
    const adresse = await dokumentAdresse(d)
    if (!adresse) {
      fenster?.close()
      melde('warnung', { de: 'Datei nicht gefunden', fr: 'Fichier introuvable' })
      return
    }
    if (fenster) fenster.location.href = adresse
  } catch (f) {
    fenster?.close()
    meldeFehler(f, 'datei')
    melde('kritisch', { de: 'Datei konnte nicht geöffnet werden', fr: "Impossible d'ouvrir le fichier" })
  }
}

/** Dateien des Leads (Fotos, Stromrechnung, Pläne). Hochladen nach SharePoint folgt in Phase 8. */
export function LeadDateien({ dateien }: { dateien: Datei[] }) {
  const { t } = useTranslation()
  if (!dateien.length) return <p className="text-muted-foreground text-sm">{t('verkauf.akte.keineDateien')}</p>
  return (
    <ul className="flex flex-col gap-1">
      {dateien.map((d) => (
        <li key={d.id}>
          <button
            type="button"
            onClick={() => void oeffne(d)}
            className="hover:bg-muted focus-visible:ring-ring flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm outline-none focus-visible:ring-2"
          >
            <FileText className="text-muted-foreground size-4 shrink-0" aria-hidden="true" />
            <span className="min-w-0 flex-1 truncate">{d.name}</span>
            <span className="text-muted-foreground zahlen font-mono text-xs">
              {d.hochgeladen_am ? formatDatum(d.hochgeladen_am) : ''}
            </span>
          </button>
        </li>
      ))}
    </ul>
  )
}
