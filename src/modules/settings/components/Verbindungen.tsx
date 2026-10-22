import { Copy, PlugZap } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skelett } from '@/components/ui/diverses'
import { Karte, KarteInhalt, KarteKopf, KarteTitel } from '@/components/ui/karte'
import { formatDatumZeit } from '@/lib/format'
import { fehlerText, meldeIntegrationsFehler, useVerbindungsStatus, verbindungTesten } from '@/services/integrationen'
import { melde } from '@/services/meldungen'
import { useVerbindungen, useVerbindungenNeuLaden } from '../hooks/useVerbindungen'
import type { Integration } from '../types'
import { VerbindungenEinstellungen } from './VerbindungenEinstellungen'
import { VerbindungenProtokoll } from './VerbindungenProtokoll'

const DIENSTE = ['microsoft', 'abaninja', 'sms'] as const

/**
 * Einstellungen › Verbindungen: ob Microsoft 365, AbaNinja und SMS auf dem Server eingerichtet sind,
 * ein echter Test pro Dienst, wer mit Microsoft verbunden ist, die nicht geheimen Einstellungen und
 * was zuletzt passiert ist. Schlüssel stehen nie hier, nur in den Supabase-Secrets (docs/integrationen.md).
 */
export function Verbindungen() {
  const { t } = useTranslation()
  const status = useVerbindungsStatus()
  const { dienste, personen, zeitplan, protokoll } = useVerbindungen()
  const neuLaden = useVerbindungenNeuLaden()
  const [testet, setTestet] = useState<string | null>(null)

  async function testen(d: (typeof DIENSTE)[number]) {
    setTestet(d)
    try {
      const { meldung } = await verbindungTesten(d)
      const info = meldung.replace(/^credits:/, 'Guthaben ')
      melde('ok', { de: `Verbindung funktioniert (${info})`, fr: `La connexion fonctionne (${info})` })
    } catch (f) {
      meldeIntegrationsFehler(f)
    } finally {
      setTestet(null)
      void neuLaden()
    }
  }

  const eingerichtet = status.data?.eingerichtet
  const zeile = (d: string): Integration | undefined => dienste.data?.find((x) => x.dienst === d)

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 md:grid-cols-3">
        {DIENSTE.map((d) => {
          const z = zeile(d)
          const ein = eingerichtet?.[d]
          return (
            <Karte key={d}>
              <KarteKopf>
                <KarteTitel className="flex items-center gap-2">
                  <PlugZap className="text-muted-foreground size-4" aria-hidden="true" />
                  {t(`verbindungen.dienst.${d}`)}
                </KarteTitel>
                {status.isPending ? (
                  <Skelett className="h-5 w-24" />
                ) : (
                  <Badge ton={ein ? 'ok' : 'warnung'} punkt>
                    {ein ? t('verbindungen.eingerichtet') : t('verbindungen.nichtEingerichtet')}
                  </Badge>
                )}
              </KarteKopf>
              <KarteInhalt className="flex flex-col gap-3 text-sm">
                <p className="text-muted-foreground">{t(`verbindungen.zweck.${d}`)}</p>
                {z?.zuletzt_geprueft_am ? (
                  <p className={z.zuletzt_ok ? 'text-ok' : 'text-bad'}>
                    {t(z.zuletzt_ok ? 'verbindungen.testOk' : 'verbindungen.testFehler', {
                      datum: formatDatumZeit(z.zuletzt_geprueft_am),
                    })}
                    {!z.zuletzt_ok && z.meldung && ` (${fehlerText(new Error(z.meldung))})`}
                  </p>
                ) : (
                  <p className="text-muted-foreground">{t('verbindungen.nieGetestet')}</p>
                )}
                <Button
                  variant="secondary"
                  className="self-start"
                  disabled={!ein}
                  laedt={testet === d}
                  onClick={() => void testen(d)}
                >
                  {t('verbindungen.testen')}
                </Button>
              </KarteInhalt>
            </Karte>
          )
        })}
      </div>

      {status.data?.rueckruf && (
        <Karte>
          <KarteInhalt className="flex flex-col gap-2 pt-4 text-sm">
            <p className="font-medium">{t('verbindungen.rueckruf')}</p>
            <p className="text-muted-foreground">{t('verbindungen.rueckrufHinweis')}</p>
            <div className="flex items-center gap-2">
              <code className="bg-muted min-w-0 flex-1 truncate rounded-md px-2 py-1.5 font-mono text-xs">
                {status.data.rueckruf}
              </code>
              <Button
                variant="ghost"
                size="icon"
                aria-label={t('verbindungen.kopieren')}
                onClick={() => {
                  void navigator.clipboard.writeText(status.data.rueckruf)
                  melde('ok', { de: 'Kopiert', fr: 'Copié' })
                }}
              >
                <Copy />
              </Button>
            </div>
          </KarteInhalt>
        </Karte>
      )}

      <Karte>
        <KarteKopf>
          <KarteTitel>{t('verbindungen.teamMicrosoft')}</KarteTitel>
          <span className="text-muted-foreground text-xs">
            {t('verbindungen.verbundenAnzahl', {
              count: (personen.data ?? []).filter((p) => p.verbunden).length,
              total: personen.data?.length ?? 0,
            })}
          </span>
        </KarteKopf>
        <KarteInhalt>
          {personen.isPending ? (
            <Skelett className="h-24" />
          ) : (
            <ul className="divide-y text-sm">
              {(personen.data ?? []).map((p) => (
                <li key={p.person_id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <span className="flex min-w-0 flex-col">
                    <span className="font-medium">{p.name}</span>
                    {p.konto && <span className="text-muted-foreground truncate text-xs">{p.konto}</span>}
                  </span>
                  {p.verbunden && !p.fehler ? (
                    <Badge ton="ok" punkt>
                      {t('verbindungen.personVerbunden', { datum: formatDatumZeit(p.genutzt_am ?? p.verbunden_am) })}
                    </Badge>
                  ) : p.fehler ? (
                    <Badge ton="kritisch" punkt>
                      {fehlerText(new Error(p.fehler))}
                    </Badge>
                  ) : (
                    <Badge>{t('verbindungen.personNicht')}</Badge>
                  )}
                </li>
              ))}
            </ul>
          )}
        </KarteInhalt>
      </Karte>

      {dienste.data && <VerbindungenEinstellungen dienste={dienste.data} onGespeichert={() => void neuLaden()} />}
      <VerbindungenProtokoll zeitplan={zeitplan.data ?? []} protokoll={protokoll.data ?? []} />
    </div>
  )
}
