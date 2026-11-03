import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ModulIcon } from '@/components/shared/ModulIcon'
import { Kbd } from '@/components/ui/diverses'
import { Karte } from '@/components/ui/karte'
import { Switch } from '@/components/ui/schalter'
import { useSichtbareModule } from '@/hooks/useSichtbareModule'
import { formatDatum } from '@/lib/format'
import { GRUPPEN, MODULE } from '@/lib/navigation'
import { SPRUENGE } from '@/lib/spruenge'
import { kuerzelText } from '@/lib/tastenkuerzel'
import { useKuerzel } from '@/stores/kuerzel'
import { useUi } from '@/stores/ui'
import { useAlleKapitel } from '../hooks/useKapitel'

/**
 * Alle Kapitel nach Gruppen der Seitenleiste (V233 Helpdesk › Anleitung, jetzt mit ganzem Kapitel je Bereich).
 * Standard: nur die Bereiche, die die Person sieht; auf Wunsch alle, damit man auch die Arbeit der anderen versteht.
 */
export function KapitelListe({ onKapitel }: { onKapitel: (id: string) => void }) {
  const { t } = useTranslation()
  const sprache = useUi((z) => z.sprache)
  const sichtbar = useSichtbareModule()
  const [alle, setAlle] = useState(false)
  const kapitel = useAlleKapitel()
  const module = alle ? MODULE : sichtbar
  const zuId = new Map((kapitel.data ?? []).map((k) => [k.id, k]))

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted-foreground max-w-prose text-sm">{t('handbuch.kapitel.intro')}</p>
        {sichtbar.length < MODULE.length && (
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={alle} onCheckedChange={setAlle} />
            {t('handbuch.kapitel.alleBereiche')}
          </label>
        )}
      </div>

      {GRUPPEN.map((g) => {
        const liste = module.filter((m) => m.gruppe === g)
        if (!liste.length) return null
        return (
          <section key={g} aria-labelledby={`kapitel-${g}`} className="flex flex-col gap-2">
            <h2 id={`kapitel-${g}`} className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
              {t(`nav.${g}`)}
            </h2>
            <ul className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
              {liste.map((m) => {
                const k = zuId.get(m.id)
                const anleitungen = k?.abschnitte.find((a) => a.schluessel === 'so')?.unter.length ?? 0
                const sprung = SPRUENGE.find((s) => s.modul === m.id)
                return (
                  <li key={m.id}>
                    <button
                      type="button"
                      onClick={() => {
                        onKapitel(m.id)
                      }}
                      className="bg-surface hover:bg-muted focus-visible:ring-ring flex h-full w-full items-start gap-3 rounded-lg border p-3 text-left outline-none focus-visible:ring-2"
                    >
                      <span className="bg-muted flex size-9 shrink-0 items-center justify-center rounded-md">
                        <ModulIcon name={m.icon} className="text-muted-foreground size-4" />
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className="font-medium">{m.titel[sprache]}</span>
                        <span className="text-muted-foreground text-sm">{m.untertitel[sprache]}</span>
                        <span className="text-muted-foreground text-xs">
                          {[
                            anleitungen ? t('handbuch.kapitel.anleitungen', { count: anleitungen }) : null,
                            k?.stand ? t('handbuch.kapitel.stand', { datum: formatDatum(k.stand) }) : null,
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                        </span>
                      </span>
                      {sprung && (
                        <span className="hidden shrink-0 gap-1 sm:flex" aria-hidden="true">
                          <Kbd>G</Kbd>
                          <Kbd>{sprung.taste.toUpperCase()}</Kbd>
                        </span>
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>
          </section>
        )
      })}

      <Karte className="flex flex-col gap-3 p-4">
        <h2 className="font-display text-base font-semibold">{t('handbuch.anleitung.schneller')}</h2>
        <ul className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
          <li className="flex items-center justify-between gap-3">
            {t('handbuch.anleitung.tippHilfe')} <Kbd>F1</Kbd>
          </li>
          <li className="flex items-center justify-between gap-3">
            {t('handbuch.anleitung.tippSuche')} <Kbd>{kuerzelText('k')}</Kbd>
          </li>
          <li className="flex items-center justify-between gap-3">
            {t('handbuch.anleitung.tippSprung')}
            <span className="flex gap-1">
              <Kbd>G</Kbd>
              <Kbd>K</Kbd>
            </span>
          </li>
          <li className="flex items-center justify-between gap-3">
            {t('handbuch.anleitung.tippNeu')} <Kbd>N</Kbd>
          </li>
          <li className="flex items-center justify-between gap-3">
            {t('handbuch.anleitung.tippFilter')} <Kbd>/</Kbd>
          </li>
        </ul>
        <button
          type="button"
          className="text-primary dark:text-accent self-start text-sm underline-offset-4 hover:underline"
          onClick={() => {
            useKuerzel.getState().setHilfe(true)
          }}
        >
          {t('handbuch.anleitung.alleKuerzel')}
        </button>
      </Karte>
    </div>
  )
}
