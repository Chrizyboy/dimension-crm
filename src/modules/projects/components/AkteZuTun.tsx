import { Check } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { formatDatum } from '@/lib/format'
import { useUi } from '@/stores/ui'
import { useAktion } from '../hooks/useAktion'
import { fertig } from '../lib/fahrplan'
import { heuteIso, tageBis } from '../lib/leitstand'
import { schrittSetzen } from '../services/projekte'
import type { FahrplanSchritt, Projekt } from '../types'
import { SchrittDialog } from './SchrittDialog'
import { Box } from './AkteBox'

const ZEIGE = 6

/** Offene Schritte von Hand: überfällige zuerst, dann nach Frist, ohne Frist zuletzt. */
function zuTun(schritte: FahrplanSchritt[]): FahrplanSchritt[] {
  return schritte
    .filter((s) => !s.automatisch && !fertig(s.stand))
    .sort(
      (a, b) =>
        Number(b.ueberfaellig) - Number(a.ueberfaellig) ||
        (a.frist ?? '9999').localeCompare(b.frist ?? '9999') ||
        a.reihenfolge - b.reihenfolge,
    )
}

/**
 * «Jetzt zu tun»: die nächsten offenen Schritte des Fahrplans mit Frist. Haken setzt erledigt (mit Rückgängig im
 * Fahrplan), Klick auf den Namen öffnet Datum, Frist und Notiz.
 */
export function ZuTun({
  projekt,
  schritte,
  onAlle,
}: {
  projekt: Projekt
  schritte: FahrplanSchritt[]
  onAlle: () => void
}) {
  const { t } = useTranslation()
  const sprache = useUi((z) => z.sprache)
  const { aus } = useAktion()
  const [offen, setOffen] = useState<FahrplanSchritt | null>(null)
  const heute = heuteIso()
  const liste = zuTun(schritte)
  const name = (s: FahrplanSchritt) => (sprache === 'fr' ? s.name_fr : s.name_de)

  return (
    <Box
      titel={t('projekte.seite.zuTun')}
      rechts={
        liste.length > ZEIGE ? (
          <button type="button" className="underline" onClick={onAlle}>
            {t('projekte.seite.alleSchritte', { anzahl: liste.length })}
          </button>
        ) : undefined
      }
    >
      {liste.length === 0 ? (
        <p className="text-muted-foreground">{t('projekte.fahrplan.alleErledigt')}</p>
      ) : (
        <ul className="flex flex-col divide-y">
          {liste.slice(0, ZEIGE).map((s) => (
            <li key={s.schluessel} className="flex items-start gap-2 py-2">
              <button
                type="button"
                aria-label={t('projekte.seite.erledigt', { name: name(s) })}
                onClick={() => {
                  void aus(() => schrittSetzen(projekt.id, s.schluessel, { stand: 'erledigt' }), {
                    de: `Erledigt: ${s.name_de}`,
                    fr: `Terminé : ${s.name_fr}`,
                  })
                }}
                className="hover:border-ok hover:text-ok focus-visible:ring-ring mt-0.5 grid size-4 shrink-0 place-items-center rounded border outline-none focus-visible:ring-2"
              >
                <Check className="size-3 opacity-0 hover:opacity-100" aria-hidden="true" />
              </button>
              <button
                type="button"
                className="min-w-0 flex-1 text-left"
                onClick={() => {
                  setOffen(s)
                }}
              >
                <span className="font-medium">{name(s)}</span>
                {(s.notiz || s.eingereicht_am) && (
                  <span className="text-muted-foreground block text-xs">
                    {[
                      s.eingereicht_am && t('projekte.seite.eingereicht', { datum: formatDatum(s.eingereicht_am) }),
                      s.notiz,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                )}
              </button>
              {s.frist && (
                <Badge ton={s.ueberfaellig ? 'kritisch' : s.bald ? 'warnung' : 'neutral'} className="shrink-0">
                  {s.ueberfaellig
                    ? t('projekte.woche.seit', { tage: tageBis(s.frist, heute) })
                    : t('projekte.fahrplan.bis', { datum: formatDatum(s.frist) })}
                </Badge>
              )}
            </li>
          ))}
        </ul>
      )}
      {offen && (
        <SchrittDialog
          schritt={offen}
          titel={`${projekt.nummer} · ${projekt.kunde}`}
          onSchliessen={() => {
            setOffen(null)
          }}
        />
      )}
    </Box>
  )
}
