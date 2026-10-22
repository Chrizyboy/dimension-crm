import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Feld } from '@/components/ui/feld'
import { Input } from '@/components/ui/input'
import { Karte, KarteInhalt, KarteKopf, KarteTitel } from '@/components/ui/karte'
import { meldeFehler } from '@/services/fehler'
import { melde } from '@/services/meldungen'
import { speichereIntegration } from '../services/verbindungen'
import type { Dienst, Integration } from '../types'

type Art = 'text' | 'liste' | 'zahl'

/** Welche Einstellungen man hier ändern kann. Alles andere (Schlüssel, Passwörter) liegt nur auf dem Server. */
const FELDER: { dienst: Dienst; name: string; art: Art; platzhalter?: string }[] = [
  { dienst: 'microsoft', name: 'postfach_anfragen', art: 'text', platzhalter: 'info@dimension-solaire.ch' },
  { dienst: 'microsoft', name: 'team_postfaecher', art: 'liste', platzhalter: 'muri@…, bulle@…' },
  { dienst: 'microsoft', name: 'eigene_domains', art: 'liste', platzhalter: 'dimension-solaire.ch' },
  { dienst: 'microsoft', name: 'kalender_tage', art: 'zahl', platzhalter: '21' },
  { dienst: 'microsoft', name: 'mail_tage', art: 'zahl', platzhalter: '7' },
  { dienst: 'microsoft', name: 'anfragen_tage', art: 'zahl', platzhalter: '14' },
  { dienst: 'microsoft', name: 'sharepoint_website', art: 'text' },
  { dienst: 'microsoft', name: 'sharepoint_bibliothek', art: 'text', platzhalter: 'Administration' },
  { dienst: 'microsoft', name: 'sharepoint_ordner', art: 'text' },
  { dienst: 'sms', name: 'absender', art: 'text', platzhalter: 'DimSolaire' },
  { dienst: 'abaninja', name: 'anreden.herr', art: 'text', platzhalter: 'mr' },
  { dienst: 'abaninja', name: 'anreden.frau', art: 'text', platzhalter: 'mrs' },
  { dienst: 'abaninja', name: 'anreden.standard', art: 'text', platzhalter: 'unknown' },
]

function lies(e: Record<string, unknown>, name: string): unknown {
  return name
    .split('.')
    .reduce<unknown>((o, k) => (o && typeof o === 'object' ? (o as Record<string, unknown>)[k] : undefined), e)
}

function alsText(w: unknown): string {
  if (Array.isArray(w)) return w.join(', ')
  return typeof w === 'string' || typeof w === 'number' ? String(w) : ''
}

/** Eingabe zurück in den gespeicherten Wert (Liste, Zahl oder Text; leer = Feld entfernen). */
function alsWert(text: string, art: Art): unknown {
  const s = text.trim()
  if (!s) return undefined
  if (art === 'liste') return s.split(/[,;\s]+/).filter(Boolean)
  if (art === 'zahl') return Math.max(1, Math.min(90, Number.parseInt(s, 10) || 1))
  return s
}

/** Nicht geheime Einstellungen der Verbindungen: Postfächer, Zeiträume, SharePoint-Ablage, SMS-Absender. */
export function VerbindungenEinstellungen({
  dienste,
  onGespeichert,
}: {
  dienste: Integration[]
  onGespeichert: () => void
}) {
  const { t } = useTranslation()
  const start = Object.fromEntries(
    FELDER.map((f) => [
      `${f.dienst}.${f.name}`,
      alsText(lies(dienste.find((d) => d.dienst === f.dienst)?.einstellungen ?? {}, f.name)),
    ]),
  )
  const [werte, setWerte] = useState<Record<string, string>>(start)
  const [speichert, setSpeichert] = useState(false)
  const geaendert = FELDER.some((f) => werte[`${f.dienst}.${f.name}`] !== start[`${f.dienst}.${f.name}`])

  async function sichern() {
    setSpeichert(true)
    try {
      for (const d of dienste) {
        const felder = FELDER.filter((f) => f.dienst === d.dienst)
        if (!felder.some((f) => werte[`${f.dienst}.${f.name}`] !== start[`${f.dienst}.${f.name}`])) continue
        const neu: Record<string, unknown> = structuredClone(d.einstellungen)
        for (const f of felder) {
          const [a, b] = f.name.split('.') as [string, string | undefined]
          const w = alsWert(werte[`${f.dienst}.${f.name}`] ?? '', f.art)
          const ziel = b ? ((neu[a] ??= {}) as Record<string, unknown>) : neu
          const k = b ?? a
          if (w === undefined) Reflect.deleteProperty(ziel, k)
          else ziel[k] = w
        }
        await speichereIntegration(d.dienst, neu)
      }
      melde('ok', { de: 'Einstellungen gespeichert', fr: 'Paramètres enregistrés' })
      onGespeichert()
    } catch (f) {
      meldeFehler(f, 'verbindungen')
      melde('kritisch', { de: 'Nicht gespeichert', fr: 'Non enregistré' })
    } finally {
      setSpeichert(false)
    }
  }

  return (
    <Karte>
      <KarteKopf>
        <KarteTitel>{t('verbindungen.einstellungen')}</KarteTitel>
        <Button size="sm" disabled={!geaendert} laedt={speichert} onClick={() => void sichern()}>
          {t('allgemein.speichern')}
        </Button>
      </KarteKopf>
      <KarteInhalt className="flex flex-col gap-5">
        {(['microsoft', 'sms', 'abaninja'] as const).map((d) => (
          <fieldset key={d} className="grid gap-3 sm:grid-cols-2">
            <legend className="text-muted-foreground mb-2 text-xs font-medium tracking-wider uppercase">
              {t(`verbindungen.dienst.${d}`)}
            </legend>
            {FELDER.filter((f) => f.dienst === d).map((f) => {
              const id = `vb-${d}-${f.name.replace('.', '-')}`
              const k = `${d}.${f.name}`
              return (
                <Feld key={k} id={id} label={t(`verbindungen.feld.${d}_${f.name.replace('.', '_')}`)}>
                  <Input
                    id={id}
                    inputMode={f.art === 'zahl' ? 'numeric' : undefined}
                    value={werte[k] ?? ''}
                    placeholder={f.platzhalter}
                    maxLength={d === 'sms' ? 11 : undefined}
                    onChange={(e) => {
                      setWerte({ ...werte, [k]: e.target.value })
                    }}
                  />
                </Feld>
              )
            })}
          </fieldset>
        ))}
      </KarteInhalt>
    </Karte>
  )
}
