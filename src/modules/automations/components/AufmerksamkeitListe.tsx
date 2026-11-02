import { CheckCircle2, RotateCcw } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Karte, KarteKopf, KarteTitel } from '@/components/ui/karte'
import { formatDatumZeit } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useAktion } from '../hooks/useAutomationen'
import { schrittWiederholen } from '../services/ausbau'
import type { Aufmerksamkeit, ProtokollEintrag } from '../types'
import { AKTION_ICON } from './symbole'
import { meldungText } from './texte'
import { ZielLink } from './ZielLink'

/**
 * «Braucht Aufmerksamkeit»: Fehler und Schritte, die ohne Adresse oder Verbindung nichts tun konnten (7 Tage).
 * Nach dem Beheben (Adresse ergänzt, Konto verbunden) lässt sich der Schritt einzeln wiederholen.
 */
export function AufmerksamkeitListe({
  eintraege,
  onLauf,
}: {
  eintraege: Aufmerksamkeit[]
  onLauf: (id: string) => void
}) {
  const { t } = useTranslation()
  const { laeuft, aus } = useAktion()
  return (
    <Karte>
      <KarteKopf>
        <KarteTitel>{t('automationen.uebersicht.aufmerksamkeit')}</KarteTitel>
        <span className="text-muted-foreground text-xs">{t('automationen.uebersicht.siebenTage')}</span>
      </KarteKopf>
      {eintraege.length === 0 ? (
        <p className="text-ok flex items-center gap-2 p-4 text-sm">
          <CheckCircle2 className="size-4" aria-hidden="true" />
          {t('automationen.uebersicht.allesGut')}
        </p>
      ) : (
        <ul data-testid="aufmerksamkeit">
          {eintraege.map((e) => {
            const Icon = (AKTION_ICON as Partial<Record<string, typeof CheckCircle2>>)[e.art] ?? RotateCcw
            const zeile: ProtokollEintrag = {
              nr: Number(e.nr),
              art: e.art,
              zeit: e.zeit,
              ergebnis: e.ergebnis,
              ...(e.meldung ? { meldung: e.meldung } : {}),
              ...(e.werte ? { werte: e.werte } : {}),
            }
            return (
              <li key={`${e.lauf_id}-${e.nr}`} className="flex items-start gap-3 border-t px-4 py-3 first:border-t-0">
                <span
                  className={cn(
                    'flex size-7 shrink-0 items-center justify-center rounded-md',
                    e.ergebnis === 'fehler' ? 'bg-bad-soft text-bad' : 'bg-warn-soft text-warn',
                  )}
                >
                  <Icon className="size-3.5" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{e.titel ?? t('automationen.protokoll.ohneTitel')}</p>
                  <p className="text-muted-foreground text-xs break-words">
                    {t(`automationen.aktion.${e.art}`, { defaultValue: e.art })}: {meldungText(t, zeile)}
                  </p>
                  <p className="text-muted-foreground text-xs">{formatDatumZeit(e.zeit)}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  {e.ziel && <ZielLink ziel={e.ziel}>{t('automationen.uebersicht.beheben')}</ZielLink>}
                  <span className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        onLauf(e.lauf_id)
                      }}
                    >
                      {t('automationen.protokoll.oeffnen')}
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={laeuft}
                      onClick={() =>
                        void aus(() => schrittWiederholen(e.lauf_id, Number(e.nr)), {
                          de: 'Schritt wird wiederholt',
                          fr: 'Étape relancée',
                        })
                      }
                    >
                      <RotateCcw />
                      {t('automationen.uebersicht.wiederholen')}
                    </Button>
                  </span>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </Karte>
  )
}
