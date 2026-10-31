import { useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Ban, FileText, Mail, Printer, RefreshCw, Send, Signature, Undo2 } from 'lucide-react'
import { Suspense, lazy, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Knopfleiste } from '@/components/shared/Knopfleiste'
import { AkteAbschnitt, Angabe } from '@/components/shared/AkteAbschnitt'
import { MailDialog } from '@/components/shared/MailDialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { useDrucken } from '@/hooks/useDrucken'
import { formatChf, formatDatum } from '@/lib/format'
import { formatKundennummer } from '@/lib/kontakt'
import i18n from '@/i18n'
import { useAnmeldung } from '@/stores/anmeldung'
import { meldeFehler } from '@/services/fehler'
import { fachFehlerSchluessel, zweisprachig } from '@/services/fachfehler'
import { melde } from '@/services/meldungen'
import { useVertragAenderung } from '../hooks/useWerkvertraege'
import { NAECHSTE, VERTRAG_TON } from '../lib/status'
import { werkvertragAbschnitte } from '../lib/werkvertragText'
import { ladeVertragDateien, setzeVertragStatus } from '../services/werkvertraege'
import type { Werkvertrag, WerkvertragStatus } from '../types'
import { WerkvertragDruck } from './WerkvertragDruck'
import { Zahlungsplan } from './Zahlungsplan'

const StatusDialog = lazy(() => import('./StatusDialog'))

/**
 * Ein Werkvertrag (V232): Angaben, Zahlungsplan, Vertragstext in der Vertragssprache und die Schritte
 * Versendet, Unterschrieben (mit Datum) und Storniert (mit Grund). «Drucken / PDF» erstellt das Blatt;
 * «Neu erstellen» öffnet «Auftrag erstellen» noch einmal (neue Version mit geänderten Angaben).
 */
export default function VertragAkte({
  vertrag: w,
  onNeuErstellen,
  onSchliessen,
}: {
  vertrag: Werkvertrag | null
  onNeuErstellen: (offerteId: string) => void
  onSchliessen: () => void
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const druck = useDrucken()
  const [dialog, setDialog] = useState<'unterschrieben' | 'storniert' | 'mail' | null>(null)
  const ich = useAnmeldung((z) => z.ich)
  const dateien = useQuery({
    queryKey: ['werkvertraege', 'dateien', w?.id],
    queryFn: () => (w ? ladeVertragDateien(w) : []),
    enabled: dialog === 'mail',
  })
  const schritt = useVertragAenderung((ziel: WerkvertragStatus) => setzeVertragStatus(w?.id ?? '', ziel))

  async function setze(ziel: WerkvertragStatus) {
    try {
      await schritt.mutateAsync(ziel)
      melde('ok', zweisprachig(`werkvertraege.status.${ziel}`))
    } catch (f) {
      const s = fachFehlerSchluessel(f)
      if (!s) meldeFehler(f, 'werkvertraege.status')
      melde('kritisch', zweisprachig(s ?? 'fachfehler.allgemein'))
    }
  }

  const moeglich = w ? NAECHSTE[w.status] : []
  return (
    <Dialog
      open
      onOpenChange={(offen) => {
        if (!offen) onSchliessen()
      }}
    >
      <DialogInhalt
        art="seite"
        titel={w ? `${t('werkvertraege.akte.titel')} ${w.nummer}` : t('werkvertraege.titel')}
        {...(w ? { beschreibung: `${w.name} · ${formatKundennummer(w.kundennummer)}` } : {})}
      >
        {!w ? (
          <p className="text-muted-foreground text-sm">{t('werkvertraege.akte.nichtMehr')}</p>
        ) : (
          <div className="flex flex-col">
            <div className="flex flex-wrap items-center gap-1.5 pb-3">
              <Badge ton={VERTRAG_TON[w.status]} punkt>
                {t(`werkvertraege.status.${w.status}`)}
              </Badge>
              <Badge ton="neutral">{w.sprache === 'fr' ? 'FR' : 'DE'}</Badge>
              {w.version > 1 && <Badge ton="neutral">V{w.version}</Badge>}
            </div>
            <Knopfleiste haupt="erste" className="border-b pb-3">
              <Button size="sm" onClick={druck.drucke}>
                <Printer />
                {t('werkvertraege.akte.drucken')}
              </Button>
              {w.email && w.status !== 'storniert' && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setDialog('mail')
                  }}
                >
                  <Mail />
                  {t('mail.perMail')}
                </Button>
              )}
              {moeglich.includes('versendet') && (
                <Button size="sm" variant="secondary" laedt={schritt.isPending} onClick={() => void setze('versendet')}>
                  <Send />
                  {t('werkvertraege.akte.versendet')}
                </Button>
              )}
              {moeglich.includes('unterschrieben') && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setDialog('unterschrieben')
                  }}
                >
                  <Signature />
                  {t('werkvertraege.akte.unterschrieben')}
                </Button>
              )}
              {w.status === 'storniert' && (
                <Button size="sm" variant="secondary" laedt={schritt.isPending} onClick={() => void setze('erstellt')}>
                  <Undo2 />
                  {t('werkvertraege.akte.reaktivieren')}
                </Button>
              )}
              {w.offerteId && w.status !== 'unterschrieben' && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    onNeuErstellen(w.offerteId ?? '')
                  }}
                >
                  <RefreshCw />
                  {t('werkvertraege.akte.neuErstellen')}
                </Button>
              )}
              {w.offerteId && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    void navigate({
                      to: '/quotes',
                      search: { offerte: w.offerteId ?? '', ansicht: w.standort ?? 'muri' },
                    })
                  }}
                >
                  <FileText />
                  {t('werkvertraege.akte.offerte')}
                </Button>
              )}
              {moeglich.includes('storniert') && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setDialog('storniert')
                  }}
                >
                  <Ban />
                  {t('werkvertraege.akte.stornieren')}
                </Button>
              )}
            </Knopfleiste>
            <AkteAbschnitt titel={t('werkvertraege.akte.angaben')}>
              <dl>
                <Angabe label={t('werkvertraege.akte.betrag')}>
                  {w.betragRappen ? formatChf(w.betragRappen, { mitWaehrung: true }) : '–'}
                </Angabe>
                <Angabe label={t('werkvertraege.akte.anlage')}>
                  {[
                    w.kwp ? `${w.kwp} kWp` : null,
                    w.anzahlModule ? `${w.anzahlModule} ${t('werkvertraege.akte.module')}` : null,
                    w.batterie,
                  ]
                    .filter(Boolean)
                    .join(' · ') || '–'}
                </Angabe>
                <Angabe label={t('werkvertraege.akte.objekt')}>
                  {[w.objekt.strasse, [w.objekt.plz, w.objekt.ort].filter(Boolean).join(' ')]
                    .filter(Boolean)
                    .join(', ') || '–'}
                </Angabe>
                <Angabe label={t('werkvertraege.akte.firma')}>{w.firma.name ?? '–'}</Angabe>
                <Angabe label={t('werkvertraege.akte.offerte')}>
                  {[w.offerteNummer, w.angebotAm ? formatDatum(w.angebotAm) : null].filter(Boolean).join(' · ') || '–'}
                </Angabe>
                <Angabe label={t('werkvertraege.akte.erstellt')}>
                  {w.erstelltDatum ? formatDatum(w.erstelltDatum) : '–'}
                </Angabe>
                {w.versendetAm && (
                  <Angabe label={t('werkvertraege.akte.versendetAm')}>{formatDatum(w.versendetAm)}</Angabe>
                )}
                {w.unterschriebenAm && (
                  <Angabe label={t('werkvertraege.akte.unterschriebenAm')}>{formatDatum(w.unterschriebenAm)}</Angabe>
                )}
                {w.notiz && (
                  <Angabe label={t('werkvertraege.akte.notiz')}>
                    <span className="whitespace-pre-line">{w.notiz}</span>
                  </Angabe>
                )}
              </dl>
            </AkteAbschnitt>
            <AkteAbschnitt titel={t('werkvertraege.akte.zahlungsplan')} zusatz={w.zahlungsplan.length || undefined}>
              <Zahlungsplan tranchen={w.zahlungsplan} />
            </AkteAbschnitt>
            <AkteAbschnitt titel={t('werkvertraege.akte.text')} offen={false}>
              <div className="flex flex-col gap-3 text-sm">
                {werkvertragAbschnitte(w).map(([titel, text]) => (
                  <section key={titel}>
                    <h4 className="font-medium">{titel}</h4>
                    <p className="text-muted-foreground whitespace-pre-line">{text}</p>
                  </section>
                ))}
              </div>
            </AkteAbschnitt>
          </div>
        )}
        {w && dialog === 'mail' && dateien.isSuccess && (
          <MailDialog
            titel={t('mail.vertragTitel', { nummer: w.nummer })}
            vorlage={{
              an: w.email ?? '',
              betreff: i18n.getFixedT(w.sprache)('mail.werkvertrag.betreff', { nummer: w.nummer }),
              text: i18n.getFixedT(w.sprache)('mail.werkvertrag.text', { absender: ich?.name ?? '' }),
              sprache: w.sprache,
              art: 'werkvertrag',
              kontakt_id: w.kontaktId,
              bezug_tabelle: 'werkvertraege',
              bezug_id: w.id,
              ...(w.offerteId ? { offerte_id: w.offerteId } : {}),
            }}
            dateien={dateien.data}
            onSchliessen={() => {
              setDialog(null)
            }}
            onGesendet={() => {
              if (moeglich.includes('versendet')) void setze('versendet')
            }}
          />
        )}
        <Suspense>
          {w && dialog && dialog !== 'mail' && (
            <StatusDialog
              vertrag={w}
              ziel={dialog}
              onSchliessen={() => {
                setDialog(null)
              }}
            />
          )}
        </Suspense>
        {w && druck.aktiv && <WerkvertragDruck w={w} />}
      </DialogInhalt>
    </Dialog>
  )
}
