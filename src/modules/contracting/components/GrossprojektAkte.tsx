import { Check, Eye, ExternalLink, MapPin, Pencil, RefreshCw, RotateCcw, X } from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AkteAbschnitt, Angabe } from '@/components/shared/AkteAbschnitt'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { formatDatum } from '@/lib/format'
import { hatRecht } from '@/lib/rechte'
import { zweisprachig } from '@/services/fachfehler'
import { melde } from '@/services/meldungen'
import { useAnmeldung } from '@/stores/anmeldung'
import { useUi } from '@/stores/ui'
import { useAktion } from '../hooks/useAktion'
import { useGrossprojekte, useNeuLaden, useRegeln } from '../hooks/useGrossprojekte'
import { adresse, kartenLink, STAND_TON } from '../lib/anzeige'
import { anreichern, entscheiden } from '../services/grossprojekte'
import type { Grossprojekt } from '../types'
import { PunkteMarke } from './PunkteMarke'
import { PunkteAufschluesselung, SchaetzungAngaben } from './Bewertung'
import { RechercheAbschnitt } from './RechercheAbschnitt'
import { VerantwortlichWahl } from './VerantwortlichWahl'
import { Verlauf } from './Verlauf'

export type AkteAktion = 'bearbeiten' | 'verwerfen' | 'beobachten'

const istLink = (s: string) => /^https?:\/\//i.test(s)

/**
 * Akte eines Grossprojekts als Seitenpanel: warum es passt (Punkte), grobe Schätzung, Gebäude, Bauherrschaft und
 * Verlauf, dazu die Recherche (Eigentümer, Ansprechperson, nächste Schritte) und wer bei uns verantwortlich ist.
 * Unten der Entscheid: Verwerfen, Beobachten oder Bewilligen (legt den Lead an; nur Andy und Vertretung).
 */
export function GrossprojektAkte({
  id,
  onAktion,
  onSchliessen,
}: {
  id: string
  onAktion: (a: AkteAktion) => void
  onSchliessen: () => void
}) {
  const { t } = useTranslation()
  const sprache = useUi((z) => z.sprache)
  const ich = useAnmeldung((z) => z.ich)
  const regeln = useRegeln().data
  const { laeuft, aus } = useAktion()
  const navigate = useNavigate()
  const neuLaden = useNeuLaden()
  const [holt, setHolt] = useState(false)
  const g = useGrossprojekte().data?.find((x) => x.id === id)
  const darfBewilligen =
    hatRecht(ich, 'admin') ||
    [...(regeln?.bewilligen ?? []), ...(regeln?.bewilligen_vertretung ?? [])].includes(ich?.kuerzel ?? '')

  // Gebäudedaten jetzt holen. Ist der Dienst des Bundes nicht erreichbar, holt der Zeitplan sie später.
  async function holen(projekt: string) {
    setHolt(true)
    try {
      melde('ok', zweisprachig('grossprojekte.akte.geholt', { text: await anreichern(projekt) }))
    } catch {
      melde('info', zweisprachig('grossprojekte.akte.spaeter'))
    } finally {
      setHolt(false)
      void neuLaden()
    }
  }

  // Nach dem Bewilligen gleich zum neuen Lead, damit der Verkauf dort weitermacht.
  async function bewilligen(x: Grossprojekt) {
    const ergebnis: { lead: string | null } = { lead: null }
    const ok = await aus(
      async () => {
        ergebnis.lead = await entscheiden(x.id, 'bewilligen')
      },
      { de: 'Bewilligt: Lead angelegt', fr: 'Approuvé : lead créé' },
    )
    if (ok && ergebnis.lead) void navigate({ to: '/sales', search: { lead: ergebnis.lead } })
  }

  const fuss = (x: Grossprojekt) => {
    if (x.stand === 'bewilligt') {
      return x.verkaufschance_id ? (
        <a href={`#/sales?lead=${x.verkaufschance_id}`} className={buttonVariants()}>
          <ExternalLink />
          {t('grossprojekte.akte.zumLead')}
        </a>
      ) : null
    }
    if (x.stand === 'verworfen') {
      return (
        <Button variant="secondary" laedt={laeuft} onClick={() => void aus(() => entscheiden(x.id, 'zurueck'))}>
          <RotateCcw />
          {t('grossprojekte.entscheid.zurueck')}
        </Button>
      )
    }
    return (
      <>
        <Button
          variant="ghost"
          onClick={() => {
            onAktion('verwerfen')
          }}
        >
          <X />
          {t('grossprojekte.entscheid.verwerfen')}
        </Button>
        {x.stand === 'pruefen' && (
          <Button
            variant="secondary"
            onClick={() => {
              onAktion('beobachten')
            }}
          >
            <Eye />
            {t('grossprojekte.entscheid.beobachten')}
          </Button>
        )}
        {darfBewilligen ? (
          <Button laedt={laeuft} onClick={() => void bewilligen(x)}>
            <Check />
            {t('grossprojekte.entscheid.bewilligen')}
          </Button>
        ) : (
          <span className="text-muted-foreground text-xs">{t('grossprojekte.akte.bewilligtAndy')}</span>
        )}
      </>
    )
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
        className="md:w-[34rem]"
        titel={g ? g.titel : t('grossprojekte.akte.titel')}
        {...(g
          ? {
              beschreibung: [g.nummer, adresse(g), g.standort].filter(Boolean).join(' · '),
              fuss: fuss(g),
            }
          : {})}
      >
        {!g ? (
          <p className="text-muted-foreground py-6 text-sm">{t('grossprojekte.akte.weg')}</p>
        ) : (
          <div className="flex flex-col">
            <div className="flex flex-wrap items-center gap-2 pb-2">
              <PunkteMarke g={g} t={t} />
              {g.art && <Badge ton="marke">{t(`grossprojekte.art.${g.art}`)}</Badge>}
              <Badge ton={STAND_TON[g.stand]} punkt>
                {t(`grossprojekte.stand.${g.stand}`)}
              </Badge>
              {g.stand === 'beobachten' && g.wiedervorlage_am && (
                <span className="text-muted-foreground text-xs">
                  {t('grossprojekte.akte.bis', { datum: formatDatum(g.wiedervorlage_am) })}
                </span>
              )}
            </div>
            {g.grund && <p className="text-muted-foreground pb-2 text-sm">{g.grund}</p>}
            <VerantwortlichWahl g={g} />

            <AkteAbschnitt titel={t('grossprojekte.akte.warum')} zusatz={t('grossprojekte.punkte', { n: g.punkte })}>
              <PunkteAufschluesselung g={g} />
            </AkteAbschnitt>
            <AkteAbschnitt titel={t('grossprojekte.recherche.titel')}>
              <RechercheAbschnitt g={g} />
            </AkteAbschnitt>
            <AkteAbschnitt titel={t('grossprojekte.akte.schaetzung')}>
              <SchaetzungAngaben g={g} />
            </AkteAbschnitt>
            <AkteAbschnitt titel={t('grossprojekte.akte.gebaeude')}>
              <dl>
                <Angabe label={t('grossprojekte.feld.dachflaeche')}>
                  {g.dachflaeche_m2 != null
                    ? t('grossprojekte.akte.dach', {
                        m2: g.dachflaeche_m2.toLocaleString('de-CH'),
                        klasse: g.dach_klasse ? t(`grossprojekte.klasse.${g.dach_klasse}`) : '–',
                      })
                    : '–'}
                </Angabe>
                <Angabe label={t('grossprojekte.feld.heizung')}>
                  {g.heizung
                    ? [
                        t(`grossprojekte.heizung.${g.heizung}`),
                        g.heizung_jahr ? t('grossprojekte.akte.seit', { jahr: g.heizung_jahr }) : null,
                        g.waermeleistung_kw ? `${g.waermeleistung_kw} kW` : null,
                      ]
                        .filter(Boolean)
                        .join(' · ')
                    : '–'}
                  {g.heizungsersatz && (
                    <Badge ton="info" className="ml-2">
                      {t('grossprojekte.feld.heizungsersatz')}
                    </Badge>
                  )}
                </Angabe>
                <Angabe label={t('grossprojekte.feld.nutzung')}>
                  {g.nutzung ? t(`grossprojekte.nutzung.${g.nutzung}`) : '–'}
                  {g.geschuetzt && (
                    <Badge ton="warnung" className="ml-2">
                      {t('grossprojekte.feld.geschuetzt')}
                    </Badge>
                  )}
                </Angabe>
                <Angabe label={t('grossprojekte.feld.wohnungen')}>{g.wohnungen ?? '–'}</Angabe>
                <Angabe label={t('grossprojekte.feld.baujahr')}>{g.baujahr ?? '–'}</Angabe>
                <Angabe label={t('grossprojekte.feld.egid')}>
                  <span className="zahlen font-mono text-xs">{g.egid ?? '–'}</span>
                </Angabe>
              </dl>
              <p className="text-muted-foreground mt-2 text-xs">
                {g.angereichert_am
                  ? t('grossprojekte.akte.angereichert', {
                      datum: formatDatum(g.angereichert_am),
                      text: g.anreicherung ?? '',
                    })
                  : g.strasse || g.parzelle
                    ? t('grossprojekte.akte.anreichernBald')
                    : t('grossprojekte.akte.ohneAdresse')}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {(g.strasse || g.parzelle) && (
                  <Button variant="ghost" size="sm" laedt={holt} onClick={() => void holen(g.id)}>
                    <RefreshCw />
                    {t('grossprojekte.akte.anreichern')}
                  </Button>
                )}
                {kartenLink(g, sprache) && (
                  <a
                    href={kartenLink(g, sprache) ?? undefined}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="text-accent-ink inline-flex items-center gap-1 text-sm underline"
                  >
                    <MapPin className="size-4" aria-hidden="true" />
                    {t('grossprojekte.akte.karte')}
                  </a>
                )}
              </div>
            </AkteAbschnitt>
            <AkteAbschnitt titel={t('grossprojekte.akte.bauherrschaft')}>
              <dl>
                <Angabe label={t('grossprojekte.feld.bauherr')}>{g.bauherr ?? '–'}</Angabe>
                <Angabe label={t('grossprojekte.feld.bauherrArt')}>
                  {t(`grossprojekte.bauherrArt.${g.bauherr_art ?? 'unbekannt'}`)}
                </Angabe>
                {g.ansprechperson && (
                  <Angabe label={t('grossprojekte.recherche.ansprechperson')}>
                    {[
                      g.ansprechperson.name,
                      g.ansprechperson.funktion,
                      g.ansprechperson.telefon,
                      g.ansprechperson.email,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </Angabe>
                )}
                <Angabe label={t('grossprojekte.feld.quelle')}>
                  {istLink(g.quell_url) ? (
                    <a
                      href={g.quell_url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="text-accent-ink underline"
                    >
                      {t(`grossprojekte.quelle.${g.quelle}`, { defaultValue: g.quelle })}
                    </a>
                  ) : (
                    g.quell_url
                  )}
                  {g.ausschreibung_id && (
                    <a href={`#/tenders?dossier=${g.ausschreibung_id}`} className="text-accent-ink ml-2 underline">
                      {t('grossprojekte.akte.dossier')}
                    </a>
                  )}
                </Angabe>
                {g.entschieden_am && (
                  <Angabe label={t('grossprojekte.akte.entschieden')}>
                    {[g.entschieden_von, formatDatum(g.entschieden_am)].filter(Boolean).join(' · ')}
                  </Angabe>
                )}
                <Angabe label={t('grossprojekte.feld.notiz')}>{g.notiz ?? '–'}</Angabe>
              </dl>
              {g.stand !== 'bewilligt' && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-1"
                  onClick={() => {
                    onAktion('bearbeiten')
                  }}
                >
                  <Pencil />
                  {t('grossprojekte.akte.bearbeiten')}
                </Button>
              )}
            </AkteAbschnitt>
            <AkteAbschnitt titel={t('grossprojekte.akte.verlauf')} offen={false}>
              <Verlauf id={g.id} />
            </AkteAbschnitt>
          </div>
        )}
      </DialogInhalt>
    </Dialog>
  )
}
