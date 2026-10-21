import { Mail, MapPin, Phone } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Auswahl } from '@/components/ui/auswahl'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/input'
import { useAuswahl } from '@/hooks/useAuswahl'
import { formatDatum, formatTelefon } from '@/lib/format'
import { cn } from '@/lib/utils'
import { meldeFehler } from '@/services/fehler'
import { melde } from '@/services/meldungen'
import { useAussendienst, useRegionen, useVerkaufAenderung } from '../hooks/useVerkauf'
import { aendereLead, type LeadFelder } from '../services/leads'
import type { Geschaeft } from '../types'
import { AkteAbschnitt, Angabe } from '@/components/shared/AkteAbschnitt'

const LEER = '_leer'

interface LeadAngabenProps {
  g: Geschaeft
  details:
    | {
        finanzierung: string | null
        zeithorizont: string | null
        foerderung: string | null
        notiz_intern: string | null
      }
    | undefined
}

/** Auswahl, die sofort speichert (Liste aus den Auswahlwerten). */
function SofortAuswahl({
  liste,
  wert,
  label,
  onWert,
}: {
  liste: string
  wert: string | null
  label: string
  onWert: (w: string | null) => void
}) {
  const a = useAuswahl(liste)
  return (
    <Auswahl
      aria-label={label}
      className="h-7"
      value={wert ?? LEER}
      onValueChange={(w) => {
        onWert(w === LEER ? null : w)
      }}
      optionen={[
        { wert: LEER, text: '–' },
        ...a.werte.map((x) => ({ wert: x.schluessel, text: a.text(x.schluessel) })),
      ]}
    />
  )
}

/**
 * Abschnitte Kontakt, Objekt, Interesse und Termin der Lead-Akte. Auswahlfelder speichern sofort,
 * Texte beim Verlassen des Felds; jede Änderung steht im Protokoll.
 */
export function LeadAngaben({ g, details }: LeadAngabenProps) {
  const { t } = useTranslation()
  const personen = useAussendienst()
  const regionen = useRegionen()
  const interessen = useAuswahl('interesse')
  const speichern = useVerkaufAenderung((f: LeadFelder) => aendereLead(g.verkaufschanceId ?? '', f))
  const lead = g.verkaufschanceId !== null

  async function setze(f: LeadFelder) {
    try {
      await speichern.mutateAsync(f)
      melde('ok', { de: 'Gespeichert', fr: 'Enregistré' })
    } catch (e) {
      meldeFehler(e, 'lead')
      melde('kritisch', { de: 'Nicht gespeichert', fr: 'Non enregistré' })
    }
  }

  const termin = g.terminAm ? new Date(g.terminAm) : null
  const terminPerson = personen.data?.find((p) => p.id === g.terminPersonId)

  return (
    <>
      <AkteAbschnitt titel={t('verkauf.akte.kontakt')}>
        <dl>
          <Angabe label={t('verkauf.akte.telefon')}>
            {g.telefon ? (
              <a
                href={`tel:${g.telefon}`}
                className="text-primary dark:text-accent inline-flex items-center gap-1.5 hover:underline"
              >
                <Phone className="size-3.5" aria-hidden="true" />
                {formatTelefon(g.telefon)}
              </a>
            ) : (
              '–'
            )}
          </Angabe>
          <Angabe label={t('verkauf.akte.email')}>
            {g.email ? (
              <a
                href={`mailto:${g.email}`}
                className="text-primary dark:text-accent inline-flex items-center gap-1.5 break-all hover:underline"
              >
                <Mail className="size-3.5 shrink-0" aria-hidden="true" />
                {g.email}
              </a>
            ) : (
              '–'
            )}
          </Angabe>
          <Angabe label={t('verkauf.akte.sprache')}>{g.sprache.toUpperCase()}</Angabe>
          {g.werbesperre && (
            <Angabe label={t('verkauf.akte.werbung')}>
              <Badge ton="warnung">{t('verkauf.akte.werbesperre')}</Badge>
            </Angabe>
          )}
        </dl>
      </AkteAbschnitt>

      <AkteAbschnitt titel={t('verkauf.akte.objekt')}>
        <dl>
          <Angabe label={t('verkauf.akte.adresse')}>
            <span className="inline-flex items-start gap-1.5">
              <MapPin className="text-muted-foreground mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
              <span>
                {[g.strasse, [g.plz, g.ort].filter(Boolean).join(' ')].filter(Boolean).join(', ') || '–'}
                {!g.lageGenau && g.breite !== null && (
                  <span className="text-muted-foreground block text-xs">{t('verkauf.akte.lageUngefaehr')}</span>
                )}
              </span>
            </span>
          </Angabe>
          <Angabe label={t('verkauf.akte.hoehe')}>{g.hoehe ? `${g.hoehe} m ü. M.` : '–'}</Angabe>
          <Angabe label={t('verkauf.standort')}>{g.standort ? (g.standort === 'muri' ? 'Muri' : 'Bulle') : '–'}</Angabe>
          {lead && (
            <Angabe label={t('verkauf.region')}>
              <Auswahl
                aria-label={t('verkauf.region')}
                className="h-7"
                value={g.regionId ?? LEER}
                onValueChange={(w) => void setze({ region_id: w === LEER ? null : w })}
                optionen={[
                  { wert: LEER, text: '–' },
                  ...(regionen.data ?? []).map((r) => ({ wert: r.id, text: `${r.nummer ?? ''} ${r.name}`.trim() })),
                ]}
              />
            </Angabe>
          )}
        </dl>
      </AkteAbschnitt>

      <AkteAbschnitt titel={t('verkauf.akte.interesse')}>
        <div className="flex flex-col gap-2">
          <div role="group" aria-label={t('verkauf.akte.interesse')} className="flex flex-wrap gap-1.5">
            {interessen.werte.map((w) => {
              const an = g.interesse.includes(w.schluessel)
              return (
                <button
                  key={w.schluessel}
                  type="button"
                  aria-pressed={an}
                  disabled={!lead}
                  onClick={() =>
                    void setze({
                      interesse: an ? g.interesse.filter((x) => x !== w.schluessel) : [...g.interesse, w.schluessel],
                    })
                  }
                  className={cn(
                    'focus-visible:ring-ring h-7 rounded-full border px-3 text-xs font-medium outline-none focus-visible:ring-2',
                    an ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted',
                  )}
                >
                  {interessen.text(w.schluessel)}
                </button>
              )
            })}
          </div>
          {lead && (
            <dl>
              <Angabe label={t('verkauf.quelle')}>
                <SofortAuswahl
                  liste="quelle"
                  label={t('verkauf.quelle')}
                  wert={g.quelle}
                  onWert={(w) => void setze({ quelle: w })}
                />
              </Angabe>
              <Angabe label={t('verkauf.akte.eingang')}>{g.eingangAm ? formatDatum(g.eingangAm) : '–'}</Angabe>
              <Angabe label={t('verkauf.akte.erreichbarkeit')}>
                <SofortAuswahl
                  liste="erreichbarkeit"
                  label={t('verkauf.akte.erreichbarkeit')}
                  wert={g.erreichbarkeit}
                  onWert={(w) => void setze({ erreichbarkeit: w })}
                />
              </Angabe>
              <Angabe label={t('verkauf.akte.finanzierung')}>
                <SofortAuswahl
                  liste="finanzierung"
                  label={t('verkauf.akte.finanzierung')}
                  wert={details?.finanzierung ?? null}
                  onWert={(w) => void setze({ finanzierung: w })}
                />
              </Angabe>
              <Angabe label={t('verkauf.akte.zeithorizont')}>
                <SofortAuswahl
                  liste="zeithorizont"
                  label={t('verkauf.akte.zeithorizont')}
                  wert={details?.zeithorizont ?? null}
                  onWert={(w) => void setze({ zeithorizont: w })}
                />
              </Angabe>
              <Angabe label={t('verkauf.akte.foerderung')}>
                <SofortAuswahl
                  liste="foerderung"
                  label={t('verkauf.akte.foerderung')}
                  wert={details?.foerderung ?? null}
                  onWert={(w) => void setze({ foerderung: w })}
                />
              </Angabe>
            </dl>
          )}
          {g.kommentarKunde && (
            <blockquote className="bg-muted/60 rounded-md p-2 text-sm whitespace-pre-wrap">
              <span className="text-muted-foreground block text-[11px] uppercase">
                {t('verkauf.akte.kommentarKunde')}
              </span>
              {g.kommentarKunde}
            </blockquote>
          )}
          {lead && (
            <label className="flex flex-col gap-1 text-xs">
              <span className="text-muted-foreground">{t('verkauf.akte.notizIntern')}</span>
              <Textarea
                key={details?.notiz_intern ?? ''}
                rows={3}
                defaultValue={details?.notiz_intern ?? ''}
                onBlur={(e) => {
                  if (e.target.value !== (details?.notiz_intern ?? ''))
                    void setze({ notiz_intern: e.target.value || null })
                }}
              />
            </label>
          )}
        </div>
      </AkteAbschnitt>

      <AkteAbschnitt titel={t('verkauf.akte.termin')} zusatz={termin ? formatDatum(termin) : undefined}>
        <dl>
          <Angabe label={t('verkauf.akte.terminAm')}>
            {termin
              ? `${formatDatum(termin)} ${termin.toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' })} · ${g.terminDauerMin ?? 60} Min`
              : '–'}
          </Angabe>
          {lead && (
            <Angabe label={t('verkauf.terminBei')}>
              <Auswahl
                aria-label={t('verkauf.terminBei')}
                className="h-7"
                value={g.terminPersonId ?? LEER}
                onValueChange={(w) => void setze({ tour_person_id: w === LEER ? null : w })}
                optionen={[
                  { wert: LEER, text: '–' },
                  ...(personen.data ?? []).map((p) => ({ wert: p.id, text: p.name })),
                ]}
              />
            </Angabe>
          )}
          {!lead && terminPerson && <Angabe label={t('verkauf.terminBei')}>{terminPerson.name}</Angabe>}
          {g.wiedervorlageAm && (
            <Angabe label={t('verkauf.akte.wiedervorlage')}>
              {formatDatum(g.wiedervorlageAm)}
              {g.wiedervorlageGrund && (
                <span className="text-muted-foreground block text-xs">{g.wiedervorlageGrund}</span>
              )}
            </Angabe>
          )}
          {g.verlustgrund && <Angabe label={t('verkauf.wechsel.grund')}>{g.verlustgrund}</Angabe>}
        </dl>
      </AkteAbschnitt>
    </>
  )
}
