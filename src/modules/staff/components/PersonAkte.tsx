import { Copy, Plus } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { Reiter, ReiterInhalt, ReiterKnopf, ReiterListe } from '@/components/ui/reiter'
import { formatDatum, formatTelefon } from '@/lib/format'
import { meldeFehler } from '@/services/fehler'
import { melde } from '@/services/meldungen'
import { useUi } from '@/stores/ui'
import { dateiAdresse } from '../services/personal'
import type { AusweisArt, Gespraech, Kurs, Lohn, Qualifikation, TeamPerson } from '../types'
import { HeuteBadge } from './HeuteBadge'
import { PersonAkteTeil } from './PersonAkteTeil'
import { PersonAusruestung } from './PersonAusruestung'
import { PersonAusweise } from './PersonAusweise'
import { PersonKurse } from './PersonKurse'

/** Was im Seitenpanel angestossen wird: Ausweis, Teil der Akte, Lohn, Gespräch oder Dokument. */
export type PersonAktion =
  | { ausweis: Qualifikation | null; art?: string }
  | { akte: 'anstellung' | 'persoenlich' }
  | { lohn: Lohn | null }
  | { gespraech: Gespraech | null }
  | { dokument: true }

const PANEL_REITER = ['ausweise', 'kurse', 'ausruestung', 'akte'] as const

/**
 * Person als Seitenpanel: oben Kontakt (Telefon und Mail zum Kopieren), Vorgesetzt und was die Person heute tut,
 * darunter die Reiter Ausweise, Kurse, Ausrüstung (aus Fahrzeuge & Geräte) und Personal-Akte.
 */
export function PersonAkte({
  person,
  ausweise,
  arten,
  kurse,
  heute,
  darfAendern,
  darfPlanen,
  eigene,
  onAktion,
  onKurs,
  onNeuKurs,
  onSchliessen,
}: {
  person: TeamPerson
  ausweise: Qualifikation[]
  arten: AusweisArt[]
  /** Kurse dieser Person im laufenden Jahr. */
  kurse: Kurs[]
  heute: string
  darfAendern: boolean
  darfPlanen: boolean
  eigene: boolean
  onAktion: (a: PersonAktion) => void
  onKurs: (k: Kurs) => void
  onNeuKurs: () => void
  onSchliessen: () => void
}) {
  const { t } = useTranslation()
  const sprache = useUi((z) => z.sprache)
  const [reiter, setReiter] = useState<string>('ausweise')
  const geplant = new Map<string, Kurs>()
  for (const k of kurse) {
    if (k.art && (k.stand === 'bewilligt' || k.stand === 'angemeldet') && !geplant.has(k.art)) geplant.set(k.art, k)
  }

  async function oeffnen(pfad: string) {
    const fenster = window.open('', '_blank')
    try {
      const adresse = await dateiAdresse(pfad)
      if (fenster) fenster.location.href = adresse
    } catch (f) {
      fenster?.close()
      meldeFehler(f, 'team')
    }
  }
  function kopieren(text: string) {
    void navigator.clipboard.writeText(text).then(() => {
      melde('ok', { de: 'Kopiert', fr: 'Copié' })
    })
  }
  const kontakt = [
    person.telefon ? { label: t('team.spalte.telefon'), wert: formatTelefon(person.telefon) } : null,
    person.email ? { label: t('team.mail'), wert: person.email } : null,
  ].filter((x): x is { label: string; wert: string } => x !== null)

  return (
    <Dialog
      open
      onOpenChange={(o) => {
        if (!o) onSchliessen()
      }}
    >
      <DialogInhalt
        art="seite"
        titel={person.name}
        beschreibung={[
          person.funktion ?? (sprache === 'fr' ? person.rolle_fr : person.rolle_de),
          person.standort,
          person.eintritt ? t('team.seit', { datum: formatDatum(person.eintritt) }) : null,
        ]
          .filter(Boolean)
          .join(' · ')}
        {...(darfAendern && reiter === 'ausweise'
          ? {
              fuss: (
                <Button
                  onClick={() => {
                    onAktion({ ausweis: null })
                  }}
                >
                  <Plus />
                  {t('team.ausweis.neu')}
                </Button>
              ),
            }
          : {})}
      >
        <div className="flex flex-col gap-4">
          <dl className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-4 gap-y-1.5 text-sm">
            {kontakt.map((k) => (
              <div key={k.label} className="contents">
                <dt className="text-muted-foreground text-xs">{k.label}</dt>
                <dd className="flex min-w-0 items-center gap-1.5">
                  <span className="zahlen truncate">{k.wert}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-6"
                    aria-label={t('team.kopieren', { was: k.label })}
                    onClick={() => {
                      kopieren(k.wert)
                    }}
                  >
                    <Copy />
                  </Button>
                </dd>
              </div>
            ))}
            {person.vorgesetzt_name && (
              <>
                <dt className="text-muted-foreground text-xs">{t('team.spalte.vorgesetzt')}</dt>
                <dd>{person.vorgesetzt_name}</dd>
              </>
            )}
            <dt className="text-muted-foreground text-xs">{t('team.spalte.heute')}</dt>
            <dd>
              <HeuteBadge heute={person.heute} lang />
            </dd>
          </dl>
          <Reiter value={reiter} onValueChange={setReiter}>
            <ReiterListe>
              {PANEL_REITER.map((r) => (
                <ReiterKnopf key={r} value={r}>
                  {t(`team.panel.${r}`)}
                </ReiterKnopf>
              ))}
            </ReiterListe>
            <ReiterInhalt value="ausweise">
              <PersonAusweise
                person={person}
                ausweise={ausweise}
                arten={arten}
                geplant={geplant}
                heute={heute}
                darfAendern={darfAendern}
                onAktion={onAktion}
                onDatei={(p) => void oeffnen(p)}
              />
            </ReiterInhalt>
            <ReiterInhalt value="kurse">
              <PersonKurse
                kurse={kurse}
                heute={heute}
                eigene={eigene}
                darfPlanen={darfPlanen}
                onKurs={onKurs}
                onNeu={onNeuKurs}
              />
            </ReiterInhalt>
            <ReiterInhalt value="ausruestung">
              <PersonAusruestung personId={person.id} heute={heute} />
            </ReiterInhalt>
            <ReiterInhalt value="akte">
              <PersonAkteTeil personId={person.id} heute={heute} onAktion={onAktion} onDatei={(p) => void oeffnen(p)} />
            </ReiterInhalt>
          </Reiter>
        </div>
      </DialogInhalt>
    </Dialog>
  )
}
