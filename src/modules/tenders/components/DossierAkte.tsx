import { ExternalLink, FileSearch, History } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { AkteAbschnitt, Angabe } from '@/components/shared/AkteAbschnitt'
import { Zeitachse } from '@/components/shared/Zeitachse'
import { Fehlerzustand } from '@/components/shared/Zustaende'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { Skelett } from '@/components/ui/diverses'
import { formatDatum, formatDatumZeit } from '@/lib/format'
import { useUi } from '@/stores/ui'
import { useDossier } from '../hooks/useAusschreibungen'
import { fristTon, ortKurz, PRIO_TON, STATUS_TON, tageBis } from '../lib/anzeige'
import { DossierAktionen } from './DossierAktionen'
import { DossierKontakte } from './DossierKontakte'

/**
 * Akte eines Dossiers als Seitenblatt: worum es geht, Fristen, Kontakte, Anschreiben, Verlauf und die
 * Entscheide, die gerade möglich sind. Texte aus der Quelle werden nur angezeigt, nie ausgeführt.
 */
export function DossierAkte({ id, onSchliessen }: { id: string; onSchliessen: () => void }) {
  const { t } = useTranslation()
  const sprache = useUi((z) => z.sprache)
  const { dossier, kontakte, anschreiben, verlauf } = useDossier(id)
  const d = dossier.data?.dossier

  const frist = (label: string, wert: string | null, zeit = false) =>
    wert && (
      <Angabe label={label}>
        <span className="flex items-center gap-2">
          {zeit ? formatDatumZeit(wert) : formatDatum(wert)}
          <Badge ton={fristTon(wert)}>
            {(tageBis(wert) ?? 0) < 0
              ? t('ausschreibungen.abgelaufen')
              : t('ausschreibungen.inTagen', { count: tageBis(wert) ?? 0 })}
          </Badge>
        </span>
      </Angabe>
    )

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
        titel={d?.titel ?? t('ausschreibungen.akte.titel')}
        {...(d ? { beschreibung: `${d.nummer} · ${ortKurz(d)}`, fuss: <DossierAktionen dossier={d} /> } : {})}
      >
        {dossier.error ? (
          <Fehlerzustand details={String(dossier.error)} onNochmal={() => void dossier.refetch()} />
        ) : !d ? (
          <Skelett className="h-80" />
        ) : (
          <div className="flex flex-col">
            <div className="flex flex-wrap items-center gap-2 pb-2">
              {d.prioritaet && (
                <Badge ton={PRIO_TON[d.prioritaet]}>{t('ausschreibungen.prio', { prio: d.prioritaet })}</Badge>
              )}
              <Badge ton={STATUS_TON[d.status]} punkt>
                {t(`ausschreibungen.status.${d.status}`)}
              </Badge>
              <Badge>{t(`ausschreibungen.spur.${d.spur}`)}</Badge>
              {d.korrigiert_am && <Badge ton="warnung">{t('ausschreibungen.akte.korrigiert')}</Badge>}
            </div>
            <p className="text-muted-foreground pb-2 text-sm">{t(`ausschreibungen.spurHilfe.${d.spur}`)}</p>

            <AkteAbschnitt titel={t('ausschreibungen.akte.angaben')}>
              <dl>
                <Angabe label={t('ausschreibungen.feld.quelle')}>
                  {d.quell_url && /^https?:\/\//.test(d.quell_url) ? (
                    <a
                      href={d.quell_url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="text-accent-ink inline-flex items-center gap-1 underline"
                    >
                      {t(`ausschreibungen.quelle.${d.quelle}`, { defaultValue: d.quelle })}
                      <ExternalLink className="size-3.5" aria-hidden="true" />
                    </a>
                  ) : (
                    t(`ausschreibungen.quelle.${d.quelle}`, { defaultValue: d.quelle })
                  )}
                </Angabe>
                <Angabe label={t('ausschreibungen.feld.art')}>{t(`ausschreibungen.art.${d.art}`)}</Angabe>
                {d.vergabestelle && <Angabe label={t('ausschreibungen.feld.vergabestelle')}>{d.vergabestelle}</Angabe>}
                {d.bauherr && (
                  <Angabe label={t('ausschreibungen.feld.bauherr')}>
                    {d.bauherr}
                    {d.bauherr_art ? ` (${t(`ausschreibungen.bauherrArt.${d.bauherr_art}`)})` : ''}
                  </Angabe>
                )}
                {d.parzelle && <Angabe label={t('ausschreibungen.feld.parzelle')}>{d.parzelle}</Angabe>}
                <Angabe label={t('ausschreibungen.feld.standort')}>
                  {[d.standort, d.fahrzeit_min != null ? t('ausschreibungen.fahrzeit', { min: d.fahrzeit_min }) : null]
                    .filter(Boolean)
                    .join(' · ') || '–'}
                </Angabe>
                <Angabe label={t('ausschreibungen.feld.bewertung')}>
                  {t('ausschreibungen.punkte', { count: d.punkte })}
                  {d.begruendung ? `: ${d.begruendung}` : ''}
                </Angabe>
                {d.grund && <Angabe label={t('ausschreibungen.feld.grund')}>{d.grund}</Angabe>}
                {d.wiedervorlage_am && (
                  <Angabe label={t('ausschreibungen.feld.wiedervorlage')}>{formatDatum(d.wiedervorlage_am)}</Angabe>
                )}
                {d.eingereicht_am && (
                  <Angabe label={t('ausschreibungen.feld.eingereicht')}>
                    {formatDatum(d.eingereicht_am)}
                    {d.eingereicht_form ? ` · ${t(`ausschreibungen.form.${d.eingereicht_form}`)}` : ''}
                  </Angabe>
                )}
              </dl>
              {d.beschreibung && (
                <p className="bg-muted/60 mt-2 max-h-48 overflow-y-auto rounded-md p-3 text-sm whitespace-pre-wrap">
                  {d.beschreibung}
                </p>
              )}
            </AkteAbschnitt>

            {(d.frist_fragen || d.frist_begehung || d.frist_eingabe || d.frist || d.ausloeser) && (
              <AkteAbschnitt titel={t('ausschreibungen.akte.fristen')}>
                <dl>
                  {frist(t('ausschreibungen.feld.fristFragen'), d.frist_fragen)}
                  {frist(t('ausschreibungen.feld.fristBegehung'), d.frist_begehung, true)}
                  {d.frist_eingabe
                    ? frist(
                        t(
                          d.art === 'baugesuch'
                            ? 'ausschreibungen.feld.einsprache'
                            : 'ausschreibungen.feld.fristEingabe',
                        ),
                        d.frist_eingabe,
                        true,
                      )
                    : frist(
                        t(
                          d.art === 'baugesuch'
                            ? 'ausschreibungen.feld.einsprache'
                            : 'ausschreibungen.feld.fristEingabe',
                        ),
                        d.frist,
                      )}
                  {d.ausloeser && (
                    <Angabe label={t('ausschreibungen.feld.ausloeser')}>
                      {t(`ausschreibungen.ausloeser.${d.ausloeser}`)}
                      {d.ausloeser_am ? ` · ${formatDatum(d.ausloeser_am)}` : ''}
                    </Angabe>
                  )}
                </dl>
                {d.spur === 'angebot' && (
                  <p className="text-muted-foreground pt-1 text-xs">{t('ausschreibungen.akte.forum')}</p>
                )}
              </AkteAbschnitt>
            )}

            <DossierKontakte dossier={d} kontakte={kontakte.data ?? []} anschreiben={anschreiben.data ?? []} />

            {(dossier.data?.doppelte.length ?? 0) > 0 && (
              <AkteAbschnitt titel={t('ausschreibungen.akte.doppelte')} zusatz={dossier.data?.doppelte.length}>
                <ul className="flex flex-col gap-1 text-sm">
                  {dossier.data?.doppelte.map((x) => (
                    <li key={x.id} className="flex gap-2">
                      <span className="zahlen text-muted-foreground font-mono text-xs">{x.nummer}</span>
                      <span className="truncate">{x.titel}</span>
                    </li>
                  ))}
                </ul>
              </AkteAbschnitt>
            )}

            <AkteAbschnitt titel={t('ausschreibungen.akte.verlauf')} offen={false}>
              <Zeitachse
                sprache={sprache}
                eintraege={(verlauf.data ?? []).map((v) => ({
                  id: v.id,
                  zeitpunkt: v.zeitpunkt,
                  icon: v.art === 'ausschreibung' ? History : FileSearch,
                  titel: (v.text ?? '').split('\n')[0] ?? '',
                  text: (v.text ?? '').split('\n').slice(1).join('\n') || undefined,
                  meta: v.person?.name,
                }))}
              />
            </AkteAbschnitt>
          </div>
        )}
      </DialogInhalt>
    </Dialog>
  )
}
