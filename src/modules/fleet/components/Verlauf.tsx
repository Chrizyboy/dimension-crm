import {
  ArrowRightLeft,
  CircleAlert,
  ClipboardCheck,
  Gauge,
  Ruler,
  ShieldCheck,
  StickyNote,
  Wrench,
  type LucideIcon,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Zeitachse } from '@/components/shared/Zeitachse'
import { Fehlerzustand } from '@/components/shared/Zustaende'
import { Skelett } from '@/components/ui/diverses'
import { useAuswahl } from '@/hooks/useAuswahl'
import { formatChf, formatDatum } from '@/lib/format'
import { useUi } from '@/stores/ui'
import { useEintraege } from '../hooks/useRessourcen'

const ICON: Record<string, LucideIcon> = {
  km_stand: Gauge,
  mfk: ShieldCheck,
  service: Wrench,
  pruefung: ClipboardCheck,
  kalibrierung: Ruler,
  reparatur: Wrench,
  schaden: CircleAlert,
  uebergabe: ArrowRightLeft,
  notiz: StickyNote,
}

/** Verlauf eines Fahrzeugs oder Geräts: MFK, Service, Prüfungen, Schäden und Übergaben, neueste oben. */
export function Verlauf({ bezug }: { bezug: { fahrzeug?: string; geraet?: string } }) {
  const { t } = useTranslation()
  const sprache = useUi((z) => z.sprache)
  const art = useAuswahl('ressourcen_eintrag')
  const daten = useEintraege(bezug)
  if (daten.error) return <Fehlerzustand details={String(daten.error)} onNochmal={() => void daten.refetch()} />
  if (!daten.data) return <Skelett className="h-32" />
  if (daten.data.length === 0) return <p className="text-muted-foreground text-sm">{t('fuhrpark.verlauf.leer')}</p>
  return (
    <Zeitachse
      sprache={sprache}
      nachMonat={false}
      eintraege={daten.data.map((e) => ({
        id: e.id,
        // Datum ohne Uhrzeit: Mittag, damit die Zeitachse keine Uhrzeit zeigt.
        zeitpunkt: e.art === 'uebergabe' ? e.erstellt_am : `${e.datum}T12:00:00Z`,
        icon: ICON[e.art] ?? StickyNote,
        titel: [
          art.text(e.art),
          e.ergebnis ? t(`fuhrpark.ergebnis.${e.ergebnis}`) : null,
          e.km !== null ? `${e.km.toLocaleString('de-CH')} km` : null,
        ]
          .filter(Boolean)
          .join(' · '),
        text: [e.text, e.naechste_am ? t('fuhrpark.verlauf.naechste', { datum: formatDatum(e.naechste_am) }) : null]
          .filter(Boolean)
          .join(' · '),
        meta: [e.person, e.kosten_rappen !== null ? formatChf(e.kosten_rappen, { mitWaehrung: true }) : null]
          .filter(Boolean)
          .join(' · '),
        ton:
          e.art === 'schaden' || e.ergebnis === 'maengel'
            ? 'bg-bad-soft text-bad'
            : e.ergebnis === 'ok'
              ? 'bg-ok-soft text-ok'
              : undefined,
      }))}
    />
  )
}
