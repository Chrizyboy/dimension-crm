import { FlaskConical } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Auswahl } from '@/components/ui/auswahl'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatDatum, formatDatumZeit } from '@/lib/format'
import { useAktion } from '../hooks/useAutomationen'
import { useProbeDatensaetze } from '../hooks/useAusbau'
import type { Entwurf } from '../lib/entwurf'
import { probelauf } from '../services/ausbau'
import type { Probelauf, ProtokollEintrag } from '../types'
import { AKTION_ICON } from './symbole'
import { meldungText } from './texte'

const TON = { ok: 'ok', fehler: 'kritisch', uebersprungen: 'neutral', wartet: 'marke', server: 'info' } as const

/**
 * Probelauf im Editor: die (auch ungespeicherte) Automation für einen echten Datensatz durchrechnen. Zeigt, wann
 * welche Mail mit welchem Text an wen ginge, ohne etwas anzulegen oder zu senden, damit man vor dem Einschalten
 * sieht, ob Platzhalter, Wartezeiten und Versandfenster stimmen.
 */
export function ProbelaufPanel({ entwurf, tabelle }: { entwurf: Entwurf; tabelle: string }) {
  const { t } = useTranslation()
  const datensaetze = useProbeDatensaetze(tabelle)
  const { laeuft, aus } = useAktion()
  const [id, setId] = useState<string>('')
  const [ergebnis, setErgebnis] = useState<Probelauf | null>(null)
  if (tabelle === 'keine') return <p className="text-muted-foreground text-xs">{t('automationen.probe.ohneTabelle')}</p>
  const gewaehlt = id || datensaetze.data?.[0]?.id || ''
  return (
    <div className="flex flex-col gap-3" data-testid="probelauf">
      <div className="flex flex-wrap items-center gap-2">
        <Auswahl
          className="w-72"
          aria-label={t('automationen.probe.datensatz')}
          value={gewaehlt}
          platzhalter={t('automationen.probe.keinDatensatz')}
          optionen={(datensaetze.data ?? []).map((d) => ({ wert: d.id, text: d.titel }))}
          onValueChange={(v) => {
            setId(v)
            setErgebnis(null)
          }}
        />
        <Button
          variant="secondary"
          disabled={laeuft || !gewaehlt || entwurf.aktionen.length === 0}
          onClick={() =>
            void aus(() => probelauf(entwurf, tabelle, gewaehlt)).then((r) => {
              if (r) setErgebnis(r)
            })
          }
        >
          <FlaskConical />
          {t('automationen.probe.starten')}
        </Button>
      </div>
      <p className="text-muted-foreground text-xs">{t('automationen.probe.hinweis')}</p>
      {ergebnis && (
        <ol className="flex flex-col gap-2">
          {ergebnis.schritte.map((s) => {
            const Icon = (AKTION_ICON as Partial<Record<string, typeof FlaskConical>>)[s.art] ?? FlaskConical
            const zeile: ProtokollEintrag = {
              nr: s.nr,
              art: s.art,
              zeit: s.wann,
              ergebnis: s.ergebnis,
              ...(s.meldung
                ? { meldung: `probe_${s.meldung}` }
                : s.werte && s.ergebnis === 'uebersprungen'
                  ? { meldung: 'bedingung' }
                  : {}),
              ...(s.werte ? { werte: s.werte } : {}),
            }
            const art =
              s.art === 'bedingungen'
                ? t('automationen.schritt.bedingungen')
                : t(`automationen.aktion.${s.art}`, { defaultValue: s.art })
            return (
              <li key={s.nr} className="bg-muted/50 flex gap-3 rounded-lg p-3 text-sm">
                <Icon className="text-accent-ink mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="zahlen text-muted-foreground text-xs">{formatDatumZeit(s.wann)}</span>
                    <span className="font-medium">{art}</span>
                    <Badge ton={TON[s.ergebnis]}>{t(`automationen.ergebnis.${s.ergebnis}`)}</Badge>
                  </span>
                  {(s.personen || s.an) && (
                    <span className="text-xs">
                      {s.an ? t('automationen.probe.an', { an: s.an }) : ''}
                      {s.an && s.personen ? ' · ' : ''}
                      {s.personen ? t('automationen.probe.personen', { personen: s.personen }) : ''}
                    </span>
                  )}
                  {s.betreff && <span className="font-medium break-words">{s.betreff}</span>}
                  {s.text && <span className="text-muted-foreground text-xs whitespace-pre-line">{s.text}</span>}
                  {s.faellig && (
                    <span className="text-xs">{t('automationen.probe.faellig', { am: formatDatum(s.faellig) })}</span>
                  )}
                  {meldungText(t, zeile) && <span className="text-warn text-xs">{meldungText(t, zeile)}</span>}
                </div>
              </li>
            )
          })}
        </ol>
      )}
    </div>
  )
}
