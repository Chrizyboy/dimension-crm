import { FileText, Pencil, Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { AkteAbschnitt, Angabe } from '@/components/shared/AkteAbschnitt'
import { Button } from '@/components/ui/button'
import { useAuswahl } from '@/hooks/useAuswahl'
import { formatDatum } from '@/lib/format'
import type { AkteDaten } from '../types'
import type { PersonAktion } from './PersonAkte'

/**
 * Mitarbeitergespräche (mit Notiz und nächstem Termin, der als Frist in die Glocke kommt), Dokumente und am Schluss
 * die Notiz von GL und Buchhaltung (nur Sicht «personal»).
 * Gespräche erfassen Recht «personal» und Vorgesetzte; Dokumente legen Recht «personal» und die Person selbst ab.
 * Vertrauliche Dokumente (Vertrag, Lohn) liefert die Datenbank Vorgesetzten nicht.
 */
export function AkteGespraeche({
  daten,
  onAktion,
  onDatei,
}: {
  daten: AkteDaten
  onAktion: (a: PersonAktion) => void
  onDatei: (pfad: string) => void
}) {
  const { t } = useTranslation()
  const art = useAuswahl('personal_gespraech')
  const dokArt = useAuswahl('personal_dokument')
  const fuehrt = daten.sicht !== 'selbst'
  const ablegen = daten.sicht !== 'vorgesetzt'

  return (
    <>
      <AkteAbschnitt titel={t('team.gespraech.titel')} zusatz={daten.gespraeche.length || undefined}>
        <dl>
          <Angabe label={t('team.gespraech.naechstes')}>
            {daten.akte.naechstes_gespraech ? formatDatum(daten.akte.naechstes_gespraech) : null}
          </Angabe>
        </dl>
        <ul className="mt-1 flex flex-col divide-y text-sm">
          {daten.gespraeche.map((g) => (
            <li key={g.id} className="flex items-start justify-between gap-2 py-2">
              <span className="flex min-w-0 flex-col">
                <span className="font-medium">
                  {formatDatum(g.datum)} · {art.text(g.art)}
                </span>
                {g.notiz && <span className="line-clamp-3 whitespace-pre-line">{g.notiz}</span>}
                {g.gefuehrt_von && (
                  <span className="text-muted-foreground text-xs">
                    {t('team.gespraech.gefuehrtVon', { name: g.gefuehrt_von })}
                  </span>
                )}
              </span>
              {fuehrt && (
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={t('team.gespraech.bearbeiten')}
                  onClick={() => {
                    onAktion({ gespraech: g })
                  }}
                >
                  <Pencil />
                </Button>
              )}
            </li>
          ))}
          {daten.gespraeche.length === 0 && <li className="text-muted-foreground py-2">{t('team.gespraech.leer')}</li>}
        </ul>
        {fuehrt && (
          <Button
            variant="ghost"
            size="sm"
            className="mt-1"
            onClick={() => {
              onAktion({ gespraech: null })
            }}
          >
            <Plus />
            {t('team.gespraech.neu')}
          </Button>
        )}
      </AkteAbschnitt>

      <AkteAbschnitt titel={t('team.dokument.titel')} zusatz={daten.dokumente.length || undefined}>
        <ul className="flex flex-col divide-y text-sm">
          {daten.dokumente.map((d) => (
            <li key={d.id} className="py-1">
              <button
                type="button"
                className="hover:bg-muted focus-visible:ring-ring flex w-full items-center gap-2 rounded px-1 py-1 text-left outline-none focus-visible:ring-2"
                onClick={() => {
                  onDatei(d.datei_pfad)
                }}
              >
                <FileText className="text-muted-foreground size-4 shrink-0" aria-hidden="true" />
                <span className="flex min-w-0 flex-col">
                  <span className="truncate font-medium">{d.titel}</span>
                  <span className="text-muted-foreground text-xs">
                    {[dokArt.text(d.art), d.datum ? formatDatum(d.datum) : null].filter(Boolean).join(' · ')}
                  </span>
                </span>
              </button>
            </li>
          ))}
          {daten.dokumente.length === 0 && <li className="text-muted-foreground py-2">{t('team.dokument.leer')}</li>}
        </ul>
        {ablegen && (
          <Button
            variant="ghost"
            size="sm"
            className="mt-1"
            onClick={() => {
              onAktion({ dokument: true })
            }}
          >
            <Plus />
            {t('team.dokument.neu')}
          </Button>
        )}
      </AkteAbschnitt>
      {daten.sicht === 'personal' && (
        <AkteAbschnitt titel={t('team.akte.notiz')} offen={Boolean(daten.akte.notiz)}>
          <p className="text-sm whitespace-pre-line">{daten.akte.notiz ?? '–'}</p>
        </AkteAbschnitt>
      )}
    </>
  )
}
