import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { formatChf, formatDatum } from '@/lib/format'
import { cn } from '@/lib/utils'
import { fristTon, ortKurz, PRIO_TON } from '../lib/anzeige'
import { naechsteFrist } from '../lib/board'
import type { Dossier } from '../types'

const RAND = { kritisch: 'border-l-bad', warnung: 'border-l-warn', neutral: 'border-l-border' } as const

/** Karte im Leitstand: Nummer, Prio, Titel, Ort, nächste Frist, Betrag und wer dran ist. Klick öffnet die Akte. */
export function DossierKarte({ d, onOeffnen }: { d: Dossier; onOeffnen: (id: string) => void }) {
  const { t } = useTranslation()
  const frist = naechsteFrist(d)
  const ton = frist ? fristTon(frist.am) : 'neutral'
  const betrag = d.zuschlag_rappen ?? d.angebot_rappen ?? d.schaetzung_rappen
  return (
    <button
      type="button"
      onClick={() => {
        onOeffnen(d.id)
      }}
      className={cn(
        'bg-surface hover:border-accent focus-visible:ring-ring flex w-full flex-col gap-1 rounded-lg border border-l-4 p-2.5 text-left text-sm outline-none focus-visible:ring-2',
        RAND[ton === 'kritisch' ? 'kritisch' : ton === 'warnung' ? 'warnung' : 'neutral'],
      )}
    >
      <span className="text-muted-foreground flex items-center justify-between gap-2 text-xs">
        <span className="zahlen font-mono">{d.nummer}</span>
        {d.prioritaet && (
          <Badge ton={PRIO_TON[d.prioritaet]}>{t('ausschreibungen.prio', { prio: d.prioritaet })}</Badge>
        )}
      </span>
      <span className="line-clamp-2 font-medium">{d.titel}</span>
      <span className="text-muted-foreground truncate text-xs">
        {[
          d.vergabestelle ?? d.bauherr,
          ortKurz(d),
          d.fahrzeit_min != null ? t('ausschreibungen.fahrzeit', { min: d.fahrzeit_min }) : null,
          d.leistung_kwp ? `${d.leistung_kwp} kWp` : null,
        ]
          .filter(Boolean)
          .join(' · ')}
      </span>
      <span className="flex flex-wrap items-center gap-1">
        {frist && (
          <Badge ton={ton}>
            {t(`ausschreibungen.fristArt.${frist.art}`)} {formatDatum(frist.am)}
          </Badge>
        )}
        {betrag ? <Badge>{formatChf(betrag, { mitWaehrung: true })}</Badge> : null}
        {d.rang && d.anbieter_anzahl ? (
          <Badge ton="info">{t('ausschreibungen.leitstand.rang', { rang: d.rang, von: d.anbieter_anzahl })}</Badge>
        ) : null}
        {d.status === 'zuschlag' && <Badge ton="ok">{t('ausschreibungen.status.zuschlag')}</Badge>}
        {d.status === 'absage' && <Badge ton="kritisch">{t('ausschreibungen.status.absage')}</Badge>}
        {d.status === 'nicht_teilnehmen' && <Badge>{t('ausschreibungen.status.nicht_teilnehmen')}</Badge>}
        {d.gng_vorschlag && d.status === 'pruefen' && (
          <Badge ton={d.gng_vorschlag.empfehlung === 'go' ? 'ok' : 'warnung'}>{d.gng_vorschlag.punkte}/100</Badge>
        )}
        {d.verantwortlich && <span className="text-muted-foreground ml-auto text-xs">{d.verantwortlich}</span>}
      </span>
    </button>
  )
}
