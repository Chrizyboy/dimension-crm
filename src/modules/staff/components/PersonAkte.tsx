import { Lock, Paperclip, Pencil, Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { AkteAbschnitt } from '@/components/shared/AkteAbschnitt'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { Skelett } from '@/components/ui/diverses'
import { useAuswahl } from '@/hooks/useAuswahl'
import { formatDatum } from '@/lib/format'
import { meldeFehler } from '@/services/fehler'
import { useUi } from '@/stores/ui'
import { useAkte } from '../hooks/useTeam'
import { akteFristen } from '../lib/akte'
import { istPflicht, zellenStand } from '../lib/matrix'
import { dateiAdresse } from '../services/personal'
import type { AusweisArt, Gespraech, Lohn, Mitglied, Qualifikation } from '../types'
import { AkteAnstellung } from './AkteAnstellung'
import { AkteGespraeche } from './AkteGespraeche'
import { AktePersoenlich } from './AktePersoenlich'
import { ZellenBadge } from './ZellenBadge'

/** Was im Seitenpanel angestossen wird: Ausweis, Teil der Akte, Lohn, Gespräch oder Dokument. */
export type PersonAktion =
  | { ausweis: Qualifikation | null; art?: string }
  | { akte: 'anstellung' | 'persoenlich' }
  | { lohn: Lohn | null }
  | { gespraech: Gespraech | null }
  | { dokument: true }

/**
 * Person als Seitenpanel: Kurse und Ausweise (fehlende Pflicht zuerst, mit Bestätigung als Datei) und die
 * Personal-Akte mit Fristen, Anstellung, Lohn, Persönlichem, Gesprächen und Dokumenten. Was davon erscheint,
 * entscheidet die Datenbank (Recht «personal», die Person selbst, Vorgesetzte); alle anderen sehen einen Hinweis.
 */
export function PersonAkte({
  person,
  ausweise,
  arten,
  heute,
  darfAendern,
  onAktion,
  onSchliessen,
}: {
  person: Mitglied
  ausweise: Qualifikation[]
  arten: AusweisArt[]
  heute: string
  darfAendern: boolean
  onAktion: (a: PersonAktion) => void
  onSchliessen: () => void
}) {
  const { t } = useTranslation()
  const sprache = useUi((z) => z.sprache)
  const quali = useAuswahl('qualifikation')
  const akte = useAkte(person.id)
  const fehlend = arten.filter((a) => istPflicht(a, person.rolle) && !ausweise.some((q) => q.art === a.schluessel))
  const fristen = akte.data ? akteFristen(akte.data.akte, heute) : []

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
        beschreibung={sprache === 'fr' ? person.rolle_fr : person.rolle_de}
        {...(darfAendern
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
        <div className="flex flex-col">
          <AkteAbschnitt titel={t('team.ausweise')} zusatz={ausweise.length}>
            <ul className="flex flex-col divide-y text-sm">
              {fehlend.map((f) => (
                <li key={f.schluessel} className="flex items-center justify-between gap-2 py-2">
                  <span className="font-medium">{quali.text(f.schluessel)}</span>
                  <span className="flex items-center gap-1">
                    <ZellenBadge stand="fehlt" bis={null} />
                    {darfAendern && (
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={t('team.ausweis.nachtragen', { art: quali.text(f.schluessel) })}
                        onClick={() => {
                          onAktion({ ausweis: null, art: f.schluessel })
                        }}
                      >
                        <Plus />
                      </Button>
                    )}
                  </span>
                </li>
              ))}
              {ausweise.map((q) => {
                const art = arten.find((x) => x.schluessel === q.art)
                const stand = zellenStand(q, art ? istPflicht(art, person.rolle) : false, heute)
                return (
                  <li key={q.id} className="flex items-center justify-between gap-2 py-2">
                    <span className="flex min-w-0 flex-col">
                      <span className="line-clamp-2 font-medium">{quali.text(q.art)}</span>
                      <span className="text-muted-foreground line-clamp-2 text-xs">
                        {[q.bezeichnung, q.aussteller, q.erworben_am ? formatDatum(q.erworben_am) : null]
                          .filter(Boolean)
                          .join(' · ')}
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-1">
                      <ZellenBadge stand={stand} bis={q.gueltig_bis} />
                      {q.datei_pfad && darfAendern && (
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={t('team.ausweis.dateiAnsehen')}
                          onClick={() => void oeffnen(q.datei_pfad ?? '')}
                        >
                          <Paperclip />
                        </Button>
                      )}
                      {darfAendern && (
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={t('team.ausweis.bearbeiten')}
                          onClick={() => {
                            onAktion({ ausweis: q })
                          }}
                        >
                          <Pencil />
                        </Button>
                      )}
                    </span>
                  </li>
                )
              })}
              {ausweise.length === 0 && fehlend.length === 0 && (
                <li className="text-muted-foreground py-2">{t('team.keineAusweise')}</li>
              )}
            </ul>
          </AkteAbschnitt>
          {akte.isPending ? (
            <Skelett className="mt-3 h-32" />
          ) : !akte.data ? (
            <p className="text-muted-foreground flex items-center gap-2 py-3 text-sm">
              <Lock className="size-4" aria-hidden="true" />
              {t('team.akte.privat')}
            </p>
          ) : (
            <>
              {fristen.length > 0 && (
                <div className="flex flex-wrap gap-1.5 py-3">
                  {fristen.map((f) => (
                    <Badge
                      key={f.art}
                      ton={
                        f.stand === 'vorbei' && f.art !== 'probezeit'
                          ? 'kritisch'
                          : f.stand === 'bald'
                            ? 'warnung'
                            : f.art === 'probezeit'
                              ? 'ok'
                              : 'neutral'
                      }
                    >
                      {t(`team.frist.${f.art}${f.stand === 'vorbei' ? 'Vorbei' : ''}`, { datum: formatDatum(f.datum) })}
                    </Badge>
                  ))}
                </div>
              )}
              <AkteAnstellung daten={akte.data} onAktion={onAktion} />
              <AktePersoenlich daten={akte.data} onAktion={onAktion} />
              <AkteGespraeche daten={akte.data} onAktion={onAktion} onDatei={(p) => void oeffnen(p)} />
            </>
          )}
        </div>
      </DialogInhalt>
    </Dialog>
  )
}
