import { CalendarClock, CircleStop, Play, Send, Workflow } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AkteAbschnitt } from '@/components/shared/AkteAbschnitt'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatDatumZeit } from '@/lib/format'
import { useGeplantFuer, useLaufSteuerung, type GeplanterSchritt } from '@/services/automatik'
import { useUi } from '@/stores/ui'
import { StoppDialog } from './StoppDialog'

/**
 * «Automatisch geplant» in einer Akte (Lead, Offerte, Projekt): was die Automationen als Nächstes tun und wann.
 * Wer zuständig ist (oder GL/Administration), kann für diesen Datensatz stoppen, verschieben und fortsetzen,
 * z. B. wenn der Kunde am Telefon gesagt hat, er melde sich nach den Ferien. Ohne Plan bleibt der Abschnitt weg.
 */
export function AutomatischGeplant({ tabelle, id }: { tabelle: string; id: string | null | undefined }) {
  const { t } = useTranslation()
  const geplant = useGeplantFuer(tabelle, id)
  const [stopp, setStopp] = useState<GeplanterSchritt | null>(null)
  const steuerung = useLaufSteuerung()
  const liste = geplant.data ?? []
  if (!liste.length) return null
  return (
    <AkteAbschnitt titel={t('automatik.titel')} zusatz={t('automatik.anzahl', { count: liste.length })}>
      <ul className="flex flex-col gap-2" data-testid="automatisch-geplant">
        {liste.map((g) => (
          <Zeile
            key={g.lauf_id}
            g={g}
            laeuft={steuerung.laeuft}
            onStoppen={() => {
              setStopp(g)
            }}
            onFortsetzen={() => void steuerung.fortsetzen(g.lauf_id)}
            onVerschieben={() => void steuerung.verschieben(g.lauf_id, 7)}
          />
        ))}
      </ul>
      <p className="text-muted-foreground mt-2 text-xs">{t('automatik.hinweis')}</p>
      {stopp && (
        <StoppDialog
          name={stopp.name_de}
          laeuft={steuerung.laeuft}
          onSchliessen={() => {
            setStopp(null)
          }}
          onStoppen={(grund) => {
            void steuerung.stoppen(stopp.lauf_id, grund).then((ok) => {
              if (ok) setStopp(null)
            })
          }}
        />
      )}
    </AkteAbschnitt>
  )
}

function Zeile({
  g,
  laeuft,
  onStoppen,
  onFortsetzen,
  onVerschieben,
}: {
  g: GeplanterSchritt
  laeuft: boolean
  onStoppen: () => void
  onFortsetzen: () => void
  onVerschieben: () => void
}) {
  const { t } = useTranslation()
  const sprache = useUi((z) => z.sprache)
  const text = sprache === 'fr' ? g.text_fr : g.text_de
  const gestoppt = g.stand === 'gestoppt'
  return (
    <li className="bg-muted/50 flex flex-col gap-1.5 rounded-lg p-3 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        {gestoppt ? (
          <CircleStop className="text-muted-foreground size-4" aria-hidden="true" />
        ) : (
          <CalendarClock className="text-info size-4" aria-hidden="true" />
        )}
        <span className="font-medium">{gestoppt ? t('automatik.gestopptAm') : formatDatumZeit(g.weiter_am)}</span>
        <span className="text-muted-foreground">
          {g.art ? t(`automationen.aktion.${g.art}`, { defaultValue: g.art }) : ''}
          {text ? ` «${text}»` : ''}
        </span>
        {g.nach_aussen && (
          <Badge ton={g.modus === 'automatisch' ? 'warnung' : 'info'}>
            <Send />
            {t(g.modus === 'automatisch' ? 'automationen.modus.automatisch' : 'automationen.mitFreigabe')}
          </Badge>
        )}
      </div>
      <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
        <Workflow className="size-3.5" aria-hidden="true" />
        {sprache === 'fr' ? g.name_fr : g.name_de}
        {' · '}
        {t('automatik.schrittVon', { schritt: g.schritt, schritte: g.schritte })}
      </p>
      {gestoppt && g.grund && <p className="text-xs">{t('automatik.grundIst', { grund: g.grund })}</p>}
      {g.darf && (
        <div className="flex flex-wrap gap-1.5">
          {gestoppt ? (
            <Button size="sm" variant="secondary" disabled={laeuft} onClick={onFortsetzen}>
              <Play />
              {t('automatik.fortsetzen')}
            </Button>
          ) : (
            <>
              <Button size="sm" variant="secondary" disabled={laeuft} onClick={onVerschieben}>
                {t('automatik.plus7')}
              </Button>
              <Button size="sm" variant="ghost" disabled={laeuft} onClick={onStoppen}>
                <CircleStop />
                {t('automatik.stoppenKurz')}
              </Button>
            </>
          )}
        </div>
      )}
    </li>
  )
}
