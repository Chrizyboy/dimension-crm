import { CheckCircle2, Link2, Unlink } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skelett } from '@/components/ui/diverses'
import { Karte, KarteInhalt, KarteKopf, KarteTitel } from '@/components/ui/karte'
import { formatDatumZeit } from '@/lib/format'
import {
  fehlerText,
  IntegrationsFehler,
  meldeIntegrationsFehler,
  microsoft,
  mitMicrosoftVerbinden,
  useMeineMicrosoftVerbindung,
  useMicrosoftNeuLaden,
} from '@/services/integrationen'
import { melde } from '@/services/meldungen'
import { useUi } from '@/stores/ui'

/**
 * «Mit Microsoft verbinden» in «Mein Konto» (Entscheid 22.10.2026: jede Person verbindet sich selbst).
 * Danach nutzt das CRM das eigene Postfach und den eigenen Kalender: Mails senden, Termine eintragen,
 * Kalender und Mail-Verlauf laden. Das Passwort sieht das CRM nie; Microsoft fragt selbst danach.
 * `ergebnis` kommt nach der Rückkehr von Microsoft aus der Adresse (?microsoft=ok|<fehler>).
 */
export function MicrosoftKarte({ ergebnis, onErgebnisGelesen }: { ergebnis?: string; onErgebnisGelesen: () => void }) {
  const { t } = useTranslation()
  const sprache = useUi((z) => z.sprache)
  const verbindung = useMeineMicrosoftVerbindung()
  const neuLaden = useMicrosoftNeuLaden()
  const [laeuft, setLaeuft] = useState<'verbinden' | 'testen' | 'trennen' | null>(null)

  // Rückmeldung nach der Rückkehr von Microsoft einmal zeigen, dann aus der Adresse nehmen
  useEffect(() => {
    if (!ergebnis) return
    if (ergebnis === 'ok') melde('ok', { de: 'Microsoft ist verbunden', fr: 'Microsoft est connecté' })
    else meldeIntegrationsFehler(new IntegrationsFehler(ergebnis))
    void neuLaden()
    onErgebnisGelesen()
  }, [ergebnis, neuLaden, onErgebnisGelesen])

  async function mache(was: 'verbinden' | 'testen' | 'trennen') {
    setLaeuft(was)
    try {
      if (was === 'verbinden') await mitMicrosoftVerbinden(sprache)
      if (was === 'testen') {
        const r = await microsoft.testen()
        melde('ok', { de: `Verbindung funktioniert (${r.konto})`, fr: `La connexion fonctionne (${r.konto})` })
      }
      if (was === 'trennen') {
        await microsoft.trennen()
        melde('ok', { de: 'Microsoft getrennt', fr: 'Microsoft déconnecté' })
      }
    } catch (f) {
      meldeIntegrationsFehler(f)
    } finally {
      setLaeuft(null)
      void neuLaden()
    }
  }

  const v = verbindung.data
  return (
    <Karte>
      <KarteKopf>
        <KarteTitel>{t('konto.microsoft.titel')}</KarteTitel>
        {v && !v.fehler && (
          <Badge ton="ok" punkt>
            {t('konto.microsoft.verbunden')}
          </Badge>
        )}
        {v?.fehler && (
          <Badge ton="kritisch" punkt>
            {t('konto.microsoft.neuVerbinden')}
          </Badge>
        )}
      </KarteKopf>
      <KarteInhalt className="flex flex-col gap-4">
        {verbindung.isPending ? (
          <Skelett className="h-16" />
        ) : v ? (
          <div className="flex flex-col gap-1 text-sm">
            <p className="flex items-center gap-2 font-medium">
              <CheckCircle2 className="text-ok size-4" aria-hidden="true" />
              {v.konto}
            </p>
            <p className="text-muted-foreground">
              {t('konto.microsoft.seit', { datum: formatDatumZeit(v.verbunden_am) })}
              {v.genutzt_am && ` · ${t('konto.microsoft.genutzt', { datum: formatDatumZeit(v.genutzt_am) })}`}
            </p>
            {v.fehler && <p className="text-bad">{fehlerText(new Error(v.fehler))}</p>}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">{t('konto.microsoft.erklaerung')}</p>
        )}
        <div className="flex flex-wrap gap-2">
          {(!v || v.fehler) && (
            <Button onClick={() => void mache('verbinden')} laedt={laeuft === 'verbinden'}>
              <Link2 />
              {t('konto.microsoft.verbinden')}
            </Button>
          )}
          {v && (
            <>
              <Button variant="secondary" onClick={() => void mache('testen')} laedt={laeuft === 'testen'}>
                {t('konto.microsoft.testen')}
              </Button>
              <Button variant="ghost" onClick={() => void mache('trennen')} laedt={laeuft === 'trennen'}>
                <Unlink />
                {t('konto.microsoft.trennen')}
              </Button>
            </>
          )}
        </div>
      </KarteInhalt>
    </Karte>
  )
}
