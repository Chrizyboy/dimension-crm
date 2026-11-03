import { Keyboard } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Auswahl } from '@/components/ui/auswahl'
import { Kbd, Skelett } from '@/components/ui/diverses'
import { Karte, KarteInhalt, KarteKopf, KarteTitel } from '@/components/ui/karte'
import { useAnmeldung } from '@/stores/anmeldung'
import { useInhalt } from '../hooks/useKapitel'
import { stuecke } from '../lib/kapitel'
import { rollenAbschnitt } from '../lib/neuigkeiten'
import { Bloecke, Zeile } from './KapitelText'
import { Neuigkeiten } from './Neuigkeiten'

/**
 * «Für dich»: der Arbeitstag der eigenen Rolle in Schritten, jeder mit dem passenden Kapitel; andere Rollen lassen
 * sich anschauen (Geschäftsleitung, Einarbeitung). Daneben, was neu ist, und der Hinweis auf F1.
 */
export function FuerDich({ onKapitel }: { onKapitel: (id: string) => void }) {
  const { t } = useTranslation()
  const ich = useAnmeldung((z) => z.ich)
  const rollen = useInhalt('rollen')
  const abschnitte = rollen.data?.abschnitte ?? []
  const [gewaehlt, setGewaehlt] = useState<string | null>(null)
  const schluessel =
    gewaehlt ??
    rollenAbschnitt(
      ich?.rolle,
      abschnitte.map((a) => a.schluessel),
    )
  const rolle = abschnitte.find((a) => a.schluessel === schluessel)
  const schritte = rolle?.bloecke.find((b) => b.art === 'liste')

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
      <Karte>
        <KarteKopf className="flex flex-row flex-wrap items-center justify-between gap-2">
          <KarteTitel>
            {rolle ? t('handbuch.fuerDich.titel', { rolle: rolle.titel }) : t('handbuch.reiter.fuerdich')}
          </KarteTitel>
          {abschnitte.length > 1 && (
            <Auswahl
              aria-label={t('handbuch.fuerDich.rolle')}
              className="w-56"
              value={schluessel}
              onValueChange={setGewaehlt}
              optionen={abschnitte.map((a) => ({ wert: a.schluessel, text: a.titel }))}
            />
          )}
        </KarteKopf>
        <KarteInhalt className="flex flex-col gap-3">
          {rollen.isPending && <Skelett className="h-64 w-full" />}
          {rolle && (
            <Bloecke bloecke={rolle.bloecke.filter((b) => b.art === 'absatz')} className="text-muted-foreground" />
          )}
          {schritte?.art === 'liste' && (
            <ol className="flex flex-col gap-2">
              {schritte.punkte.map((p, i) => {
                const teile = stuecke(p)
                const kopf = teile[0]?.art === 'fett' ? teile[0].text : null
                const rest = kopf ? p.replace(/^\*\*[^*]+\*\*[:\s–-]*/, '') : p
                const ziel = teile.find((s) => s.art === 'link' && s.ziel.startsWith('kapitel:'))
                return (
                  <li key={i} className="flex items-start gap-3 rounded-lg border p-3">
                    <span
                      aria-hidden="true"
                      className="bg-primary text-primary-foreground flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
                    >
                      {i + 1}
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5 text-sm">
                      {kopf && <span className="font-semibold">{kopf}</span>}
                      <span className="text-muted-foreground">
                        <Zeile text={rest.replace(/\s*\[[^\]]+\]\(kapitel:[^)]+\)\s*$/, '')} />
                      </span>
                    </span>
                    {ziel?.art === 'link' && (
                      <button
                        type="button"
                        className="text-primary dark:text-accent shrink-0 text-sm font-medium hover:underline"
                        onClick={() => {
                          onKapitel(ziel.ziel.slice(8).split('#')[0] ?? '')
                        }}
                      >
                        {ziel.text}
                      </button>
                    )}
                  </li>
                )
              })}
            </ol>
          )}
        </KarteInhalt>
      </Karte>
      <div className="flex flex-col gap-4">
        <Karte>
          <KarteKopf>
            <KarteTitel>{t('handbuch.fuerDich.neu')}</KarteTitel>
          </KarteKopf>
          <KarteInhalt>
            <Neuigkeiten max={5} onKapitel={onKapitel} />
          </KarteInhalt>
        </Karte>
        <div className="bg-accent-soft flex gap-3 rounded-lg p-4">
          <Keyboard className="text-accent-ink mt-0.5 size-5 shrink-0" aria-hidden="true" />
          <div className="flex flex-col gap-1 text-sm">
            <h2 className="text-accent-ink font-semibold">{t('handbuch.fuerDich.hilfeTitel')}</h2>
            <p>
              {t('handbuch.fuerDich.hilfeText1')} <Kbd>F1</Kbd> {t('handbuch.fuerDich.hilfeText2')}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
