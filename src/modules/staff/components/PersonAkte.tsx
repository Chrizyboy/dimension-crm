import { Lock, Paperclip, Pencil, Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { AkteAbschnitt, Angabe } from '@/components/shared/AkteAbschnitt'
import { Button } from '@/components/ui/button'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { Skelett } from '@/components/ui/diverses'
import { useAuswahl } from '@/hooks/useAuswahl'
import { formatDatum, formatTelefon } from '@/lib/format'
import { meldeFehler } from '@/services/fehler'
import { useUi } from '@/stores/ui'
import { useAkte } from '../hooks/useTeam'
import { istPflicht, zellenStand } from '../lib/matrix'
import { dateiAdresse } from '../services/personal'
import type { AusweisArt, Mitglied, PersonalAkte, Qualifikation } from '../types'
import { ZellenBadge } from './ZellenBadge'

export type PersonAktion = { ausweis: Qualifikation | null; art?: string } | { akte: PersonalAkte | null }

/**
 * Person als Seitenpanel: Kurse und Ausweise (fehlende Pflicht zuerst, mit Bestätigung als Datei) und die
 * Personal-Akte. Die Akte sehen nur die Administration und die Person selbst; für alle anderen steht ein Hinweis.
 */
export function PersonAkte({
  person,
  ausweise,
  arten,
  heute,
  darfAendern,
  admin,
  onAktion,
  onSchliessen,
}: {
  person: Mitglied
  ausweise: Qualifikation[]
  arten: AusweisArt[]
  heute: string
  darfAendern: boolean
  admin: boolean
  onAktion: (a: PersonAktion) => void
  onSchliessen: () => void
}) {
  const { t } = useTranslation()
  const sprache = useUi((z) => z.sprache)
  const quali = useAuswahl('qualifikation')
  const akte = useAkte(person.id, darfAendern)
  const fehlend = arten.filter((a) => istPflicht(a, person.rolle) && !ausweise.some((q) => q.art === a.schluessel))
  const a = akte.data

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
        className="md:w-[32rem]"
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
                      <span className="truncate font-medium">{quali.text(q.art)}</span>
                      <span className="text-muted-foreground truncate text-xs">
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
          <AkteAbschnitt titel={t('team.akte.titel')}>
            {!darfAendern ? (
              <p className="text-muted-foreground flex items-center gap-2 text-sm">
                <Lock className="size-4" aria-hidden="true" />
                {t('team.akte.privat')}
              </p>
            ) : akte.isPending ? (
              <Skelett className="h-32" />
            ) : (
              <>
                <dl>
                  <Angabe label={t('team.akte.notfall')}>
                    {a?.notfall_name
                      ? `${a.notfall_name}${a.notfall_telefon ? `, ${formatTelefon(a.notfall_telefon)}` : ''}`
                      : '–'}
                  </Angabe>
                  <Angabe label={t('team.akte.telefon_privat')}>
                    {a?.telefon_privat ? formatTelefon(a.telefon_privat) : '–'}
                  </Angabe>
                  <Angabe label={t('team.akte.geburtsdatum')}>
                    {a?.geburtsdatum ? formatDatum(a.geburtsdatum) : '–'}
                  </Angabe>
                  <Angabe label={t('team.akte.groessen')}>
                    {[a?.kleidergroesse, a?.schuhgroesse ? t('team.akte.schuh', { groesse: a.schuhgroesse }) : null]
                      .filter(Boolean)
                      .join(' · ') || '–'}
                  </Angabe>
                  <Angabe label={t('team.akte.eintritt')}>
                    {[
                      a?.eintritt ? formatDatum(a.eintritt) : null,
                      a?.pensum ? `${String(a.pensum)} %` : null,
                      a?.austritt ? t('team.akte.bis', { datum: formatDatum(a.austritt) }) : null,
                    ]
                      .filter(Boolean)
                      .join(' · ') || '–'}
                  </Angabe>
                  {admin && <Angabe label={t('team.akte.notiz')}>{a?.notiz ?? '–'}</Angabe>}
                </dl>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-1"
                  onClick={() => {
                    onAktion({ akte: a ?? null })
                  }}
                >
                  <Pencil />
                  {t('allgemein.bearbeiten')}
                </Button>
              </>
            )}
          </AkteAbschnitt>
        </div>
      </DialogInhalt>
    </Dialog>
  )
}
