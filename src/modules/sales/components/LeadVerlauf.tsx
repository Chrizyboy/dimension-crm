import { FileText, Mail, MessageSquare, NotebookPen, Phone, Smartphone, Users, type LucideIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Zeitachse, type Zeitpunkt } from '@/components/shared/Zeitachse'
import { useAuswahl } from '@/hooks/useAuswahl'
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
