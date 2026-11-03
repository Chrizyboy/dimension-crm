import { X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatDatum } from '@/lib/format'
import { useAktion } from '../hooks/useAktion'
import { useBelegung, useGeraete, useNamen, useSchaeden } from '../hooks/useRessourcen'
import { plusTage } from '../lib/belegung'
import { heuteZuerich } from '../lib/fristen'
import { reservierungAufheben } from '../services/belegung'
import type { Schaden } from '../types'
import { Box } from './Box'
import { FristBadge } from './FristBadge'

type Bezug = { fahrzeug?: string; geraet?: string }

/** Offene Schäden mit Stand; Klick öffnet «Stand setzen» (Garage, Versicherungsfall, Kosten). */
export function SchaedenBox({ bezug, onWaehlen }: { bezug: Bezug; onWaehlen: (s: Schaden) => void }) {
  const { t } = useTranslation()
  const liste = (useSchaeden().data ?? []).filter((s) =>
    bezug.fahrzeug ? s.fahrzeug_id === bezug.fahrzeug : s.geraet_id === bezug.geraet,
  )
  if (liste.length === 0) return null
  return (
    <Box titel={t('fuhrpark.akte.schaeden')} rechts={liste.length} className="border-bad/40">
      <ul className="flex flex-col gap-2">
        {liste.map((s) => (
          <li key={s.id}>
            <button
              type="button"
              className="hover:bg-muted flex w-full items-start gap-2 rounded p-1 text-left"
              onClick={() => {
                onWaehlen(s)
              }}
            >
              <Badge ton={s.stand === 'offen' ? 'kritisch' : 'warnung'}>
                {t(`fuhrpark.schaden.stand.${s.stand ?? 'offen'}`)}
              </Badge>
              <span className="min-w-0 flex-1">
                <span className="block">{s.text ?? t('fuhrpark.schaden.ohneText')}</span>
                <span className="text-muted-foreground block text-xs">
                  {[formatDatum(s.datum), s.person, s.erledigung].filter(Boolean).join(' · ')}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </Box>
  )
}

/** Belegung der nächsten 14 Tage: Einsätze aus dem Zeitplan, Reservierungen, Werkstatt. */
export function BelegungBox({ bezug, onReservieren }: { bezug: Bezug; onReservieren: () => void }) {
  const { t } = useTranslation()
  const heute = heuteZuerich()
  const namen = useNamen()
  const { aus } = useAktion()
  const liste = (useBelegung(heute, plusTage(heute, 13)).data ?? []).filter((b) =>
    bezug.fahrzeug ? b.fahrzeug_id === bezug.fahrzeug : b.geraet_id === bezug.geraet,
  )
  const zeit = (von: string, bis: string) =>
    von === bis ? formatDatum(von) : `${formatDatum(von)} – ${formatDatum(bis)}`
  return (
    <Box
      titel={t('fuhrpark.akte.belegung')}
      rechts={
        <Button variant="ghost" size="sm" onClick={onReservieren}>
          {t('fuhrpark.reservieren.knopf')}
        </Button>
      }
    >
      {liste.length === 0 ? (
        <p className="text-muted-foreground">{t('fuhrpark.akte.belegungLeer')}</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {liste.map((b) => (
            <li key={b.reservierung_id ?? `${b.einsatz_id ?? ''}${b.von}`} className="flex items-start gap-2">
              <span className="zahlen text-muted-foreground w-36 shrink-0 text-xs">{zeit(b.von, b.bis)}</span>
              <span className="min-w-0 flex-1">
                {b.projekt ?? b.zweck ?? t(`fuhrpark.belegung.art.${b.art}`)}
                <span className="text-muted-foreground block text-xs">
                  {[namen.person(b.person_id), b.quelle === 'auto' ? t('fuhrpark.belegung.folgtTeam') : null]
                    .filter((x) => x && x !== '–')
                    .join(' · ')}
                </span>
              </span>
              {b.reservierung_id && (
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={t('fuhrpark.reservieren.aufheben')}
                  onClick={() => void aus(() => reservierungAufheben(b.reservierung_id ?? ''))}
                >
                  <X />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </Box>
  )
}

/** Geräte, die im Fahrzeug liegen, mit nächster Prüfung. */
export function AnBordBox({ fahrzeugId }: { fahrzeugId: string }) {
  const { t } = useTranslation()
  const liste = (useGeraete().data ?? []).filter((g) => g.fahrzeug_id === fahrzeugId && !g.ausgemustert_am)
  if (liste.length === 0) return null
  return (
    <Box titel={t('fuhrpark.akte.anBord')} rechts={liste.length}>
      <ul className="flex flex-col gap-1.5">
        {liste.map((g) => (
          <li key={g.id} className="flex items-center gap-2">
            <span className="zahlen text-muted-foreground w-16 shrink-0 text-xs">{g.inventar_nr ?? ''}</span>
            <a href={`#/fleet?ansicht=geraete&geraet=${g.id}`} className="text-accent-ink min-w-0 flex-1 underline">
              {g.bezeichnung}
            </a>
            <FristBadge datum={g.naechste_pruefung} />
          </li>
        ))}
      </ul>
    </Box>
  )
}
