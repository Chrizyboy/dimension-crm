import { useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Karte, KarteKopf, KarteTitel } from '@/components/ui/karte'
import { Skelett } from '@/components/ui/diverses'
import { Switch } from '@/components/ui/schalter'
import { formatDatumZeit } from '@/lib/format'
import { hatRecht } from '@/lib/rechte'
import { useAnmeldung } from '@/stores/anmeldung'
import { useAktion } from '../hooks/useAktion'
import { useSucheStand } from '../hooks/useGrossprojekte'
import { zahl } from '../lib/anzeige'
import { setzeSucheAktiv } from '../services/grossprojekte'

/**
 * Stand der Dachsuche: Der Zeitplan geht die Regionen von Muri und Bulle stündlich ein Stück weiter durch, die nächsten
 * Gebiete zuerst; pro Woche kommen nur die besten Treffer aus dem Vorrat in die Liste. Hier sieht man, wie weit er ist; die Administration kann die Suche anhalten.
 */
export function DachsucheKarte() {
  const { t } = useTranslation()
  const stand = useSucheStand()
  const admin = hatRecht(
    useAnmeldung((z) => z.ich),
    'admin',
  )
  const { laeuft, aus } = useAktion()
  const qc = useQueryClient()
  const s = stand.data
  const anteil = s && s.gebiete > 0 ? Math.round((s.durchsucht / s.gebiete) * 100) : 0

  return (
    <Karte>
      <KarteKopf className="flex items-center justify-between gap-3">
        <KarteTitel>{t('grossprojekte.suche.titel')}</KarteTitel>
        {s && (
          <label className="flex items-center gap-2 text-sm">
            <Switch
              checked={s.aktiv}
              disabled={!admin || laeuft}
              aria-label={t('grossprojekte.suche.aktiv')}
              onCheckedChange={(an) =>
                void aus(
                  async () => {
                    await setzeSucheAktiv(an)
                    await qc.invalidateQueries({ queryKey: ['grossprojekte', 'suche'] })
                  },
                  an
                    ? { de: 'Dachsuche läuft', fr: 'Recherche activée' }
                    : { de: 'Dachsuche angehalten', fr: 'Recherche suspendue' },
                )
              }
            />
            {t(s.aktiv ? 'grossprojekte.suche.an' : 'grossprojekte.suche.aus')}
          </label>
        )}
      </KarteKopf>
      <div className="flex flex-col gap-3 px-4 pb-4 text-sm">
        <p>{t('grossprojekte.suche.text')}</p>
        {!s ? (
          <Skelett className="h-16" />
        ) : (
          <>
            <div
              className="bg-surface-2 h-2 overflow-hidden rounded-full"
              role="progressbar"
              aria-valuenow={anteil}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={t('grossprojekte.suche.fortschritt')}
            >
              <div className="bg-reihe-1 h-full" style={{ width: `${anteil}%` }} />
            </div>
            <p className="zahlen">
              {t('grossprojekte.suche.stand', {
                durchsucht: zahl(s.durchsucht),
                gebiete: zahl(s.gebiete),
                gebaeude: zahl(s.gebaeude),
                treffer: s.treffer,
              })}
            </p>
            <p className="zahlen">
              {t('grossprojekte.suche.woche', { diese: s.diese_woche, pro: s.pro_woche, vorrat: zahl(s.vorrat) })}
            </p>
            {s.zuletzt && (
              <p className="text-muted-foreground text-xs">
                {t('grossprojekte.suche.zuletzt', { zeit: formatDatumZeit(s.zuletzt) })}
              </p>
            )}
          </>
        )}
        {!admin && <p className="text-muted-foreground text-xs">{t('grossprojekte.annahmen.nurAdmin')}</p>}
      </div>
    </Karte>
  )
}
