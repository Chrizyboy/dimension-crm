import { ExternalLink, Monitor, RefreshCw } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/feld'
import { Karte, KarteInhalt, KarteKopf, KarteTitel } from '@/components/ui/karte'
import { Switch } from '@/components/ui/schalter'
import { istDesktopApp } from '@/lib/plattform'
import { autostartAn, DOWNLOAD_SEITE, setzeAutostart, updatesEingerichtet } from '@/services/aktualisierung'
import { meldeFehler } from '@/services/fehler'
import { melde } from '@/services/meldungen'
import { useAktualisierung } from '@/stores/aktualisierung'

/**
 * «Diese App» in Mein Konto: Version, nach Updates suchen und Autostart (nur Desktop, gilt pro PC).
 * Im Browser stattdessen der Weg zur Desktop-App.
 */
export function AppKarte() {
  const { t } = useTranslation()
  const desktop = istDesktopApp()
  const { stand, neu, pruefe, setOffen } = useAktualisierung()
  const [autostart, setAutostart] = useState<boolean | null>(null)

  useEffect(() => {
    if (!desktop) return
    autostartAn()
      .then(setAutostart)
      .catch(() => {
        setAutostart(false)
      })
  }, [desktop])

  const schalten = async (an: boolean) => {
    try {
      await setzeAutostart(an)
      setAutostart(an)
    } catch (f) {
      meldeFehler(f, 'autostart')
      melde('kritisch', { de: 'Autostart nicht geändert', fr: 'Démarrage automatique non modifié' })
    }
  }

  const standText =
    stand === 'pruefe'
      ? t('update.pruefe')
      : stand === 'aktuell'
        ? t('update.aktuell')
        : stand === 'fehler'
          ? t('update.fehler')
          : null

  return (
    <Karte>
      <KarteKopf>
        <KarteTitel>{t('update.karte')}</KarteTitel>
      </KarteKopf>
      <KarteInhalt className="flex flex-col gap-4 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <Monitor className="text-muted-foreground size-4" aria-hidden="true" />
          <span>{desktop ? t('update.desktop') : t('update.browser')}</span>
          <Badge ton="neutral">
            <span className="zahlen font-mono">{__APP_VERSION__}</span>
          </Badge>
        </div>

        {desktop && updatesEingerichtet() && (
          <div className="flex flex-wrap items-center gap-3">
            {stand === 'bereit' && neu ? (
              <Button
                variant="accent"
                onClick={() => {
                  setOffen(true)
                }}
              >
                {t('update.knopf', { version: neu.version })}
              </Button>
            ) : (
              <Button variant="secondary" laedt={stand === 'pruefe'} onClick={() => void pruefe()}>
                <RefreshCw />
                {t('update.suchen')}
              </Button>
            )}
            {standText && (
              <span className="text-muted-foreground" role="status">
                {standText}
              </span>
            )}
          </div>
        )}
        {desktop && !updatesEingerichtet() && <p className="text-muted-foreground">{t('update.testversion')}</p>}

        {desktop && (
          <div className="flex items-center justify-between gap-4 border-t pt-4">
            <div className="flex flex-col gap-1">
              <Label htmlFor="app-autostart">{t('update.autostart')}</Label>
              <span className="text-muted-foreground text-xs">{t('update.autostartText')}</span>
            </div>
            <Switch
              id="app-autostart"
              checked={autostart === true}
              disabled={autostart === null}
              onCheckedChange={(an) => void schalten(an)}
            />
          </div>
        )}

        {!desktop && (
          <p className="text-muted-foreground">
            {t('update.downloadText')}{' '}
            <a
              href={DOWNLOAD_SEITE}
              target="_blank"
              rel="noreferrer"
              className="text-primary dark:text-accent inline-flex items-center gap-1 font-medium underline-offset-4 hover:underline"
            >
              {t('update.download')}
              <ExternalLink className="size-3.5" aria-hidden="true" />
            </a>
          </p>
        )}
      </KarteInhalt>
    </Karte>
  )
}
