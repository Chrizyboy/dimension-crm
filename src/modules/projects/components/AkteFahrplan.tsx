import { Bot } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AkteAbschnitt } from '@/components/shared/AkteAbschnitt'
import { Badge } from '@/components/ui/badge'
import { formatDatum } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useUi } from '@/stores/ui'
import { useAktion } from '../hooks/useAktion'
import { fertig, NAECHSTER_STAND, schrittDatum, schrittTon } from '../lib/fahrplan'
import { schrittSetzen } from '../services/projekte'
import { PHASEN, type FahrplanSchritt, type Projekt } from '../types'
import { SchrittDialog } from './SchrittDialog'

/**
 * Projekt-Fahrplan (V108): sechs Phasen mit ihren Schritten. Klick auf den Stand schaltet weiter
 * (offen → in Arbeit → erledigt → nicht nötig), Klick auf den Namen öffnet Datum, Frist und Notiz.
 * Darunter die Checkliste Elektriker, die dieselben Schritte aus Sicht des Elektrikers zeigt.
 */
export function AkteFahrplan({ projekt, schritte }: { projekt: Projekt; schritte: FahrplanSchritt[] }) {
  const { t } = useTranslation()
  const sprache = useUi((z) => z.sprache)
  const { aus } = useAktion()
  const [offen, setOffen] = useState<FahrplanSchritt | null>(null)
  const name = (s: FahrplanSchritt) => (sprache === 'fr' ? s.name_fr : s.name_de)
  const titel = `${projekt.nummer} · ${projekt.kunde}`

  const zeile = (s: FahrplanSchritt) => {
    const datum = schrittDatum(s)
    return (
      <li key={s.schluessel} className="flex items-start gap-2 py-1.5">
        <button
          type="button"
          disabled={s.automatisch}
          title={s.automatisch ? t(`projekte.fahrplan.auto.${s.auto ?? 'vertrag'}`) : t('projekte.fahrplan.weiter')}
          className="focus-visible:ring-ring shrink-0 rounded-full outline-none focus-visible:ring-2 disabled:cursor-default"
          onClick={() => {
            void aus(() => schrittSetzen(s.projekt_id, s.schluessel, { stand: NAECHSTER_STAND[s.stand] }))
          }}
        >
          <Badge ton={schrittTon(s)} punkt className="w-24 justify-start">
            {t(`projekte.stand.${s.stand}`)}
          </Badge>
        </button>
        <button
          type="button"
          className="focus-visible:ring-ring flex min-w-0 flex-1 flex-col rounded text-left outline-none focus-visible:ring-2"
          onClick={() => {
            setOffen(s)
          }}
        >
          <span className={cn('flex items-center gap-1 text-sm', fertig(s.stand) && 'text-muted-foreground')}>
            {name(s)}
            {s.automatisch && (
              <Bot className="text-muted-foreground size-3.5" aria-label={t('projekte.fahrplan.automatisch')} />
            )}
          </span>
          <span className="text-muted-foreground text-xs">
            {[
              datum ? formatDatum(datum) : null,
              s.frist && !fertig(s.stand) ? t('projekte.fahrplan.bis', { datum: formatDatum(s.frist) }) : null,
              s.notiz,
            ]
              .filter(Boolean)
              .join(' · ')}
            {s.ueberfaellig && <span className="text-bad ml-1 font-medium">{t('projekte.fahrplan.ueberfaellig')}</span>}
          </span>
        </button>
      </li>
    )
  }

  const elektriker = schritte.filter((s) => s.elektriker)

  return (
    <div className="flex flex-col">
      {PHASEN.map((ph) => {
        const liste = schritte.filter((s) => s.phase === ph)
        if (liste.length === 0) return null
        const erledigt = liste.filter((s) => fertig(s.stand)).length
        return (
          <AkteAbschnitt
            key={ph}
            titel={t(`projekte.phase.${ph}`)}
            zusatz={`${String(erledigt)}/${String(liste.length)}`}
            offen={erledigt < liste.length}
          >
            <ul>{liste.map(zeile)}</ul>
          </AkteAbschnitt>
        )
      })}
      {elektriker.length > 0 && (
        <AkteAbschnitt
          titel={t('projekte.fahrplan.checkliste')}
          zusatz={`${String(elektriker.filter((s) => fertig(s.stand)).length)}/${String(elektriker.length)}`}
          offen={false}
        >
          <p className="text-muted-foreground pb-1 text-xs">
            {projekt.elektriker
              ? t('projekte.fahrplan.elektrikerIst', { name: projekt.elektriker })
              : t('projekte.fahrplan.elektrikerFehlt')}
          </p>
          <ul>{elektriker.map(zeile)}</ul>
        </AkteAbschnitt>
      )}
      {offen && (
        <SchrittDialog
          schritt={offen}
          titel={titel}
          onSchliessen={() => {
            setOffen(null)
          }}
        />
      )}
    </div>
  )
}
